

import express, { Request, Response } from 'express';
import Doctor from '../models/DoctorModel';
import AdminNotification from '../models/AdminNotification';

const test = (req: Request, res: Response) => {
    res.json({ message: 'welcome to doctor' });
}




const submitPersonalDetails = async (req: any, res: any) => {
    try {
        const { fullName, dateOfBirth, gender, country, city, phoneNo, image } = req.body;
        const userId = req.user._id;

        // Check if the authenticated user has the "doctor" role
        if (req.user.role.toLowerCase() !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can submit personal details' });
        }

        // Find or create the doctor record
        let doctor = await Doctor.findOne({ userId });

        if (!doctor) {
            doctor = new Doctor({ userId }); // Create a new doctor record
        }

        // Update personal details
        doctor.personalDetails = { fullName, dateOfBirth, gender, country, city, phoneNo, image };
        doctor.status = 'pending'; // Set status to pending for admin verification
        await doctor.save();

        // Notify admin about the update
        await AdminNotification.create({
            type: 'doctor_verification',
            doctorId: doctor._id,
            message: `Doctor ${fullName} has submitted personal details for verification.`,
        });

        res.status(200).json({ message: 'Personal details submitted successfully' });
    } catch (error) {
        console.error('Error in submitPersonalDetails:', error);
        res.status(500).json({ message: 'An error occurred while submitting personal details' });
    }
};


// Professional Details
const submitProfessionalDetails = async (req: any, res: any) => {
    const { specialisation, pmdcNumber, educationalBackground, licenseImage, cnicNumber, availableHours, consultationFee, bankDetails } = req.body;
    
    const userId = req.user._id;

    if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can submit personal details' });
    }

    // Find or create the doctor record
    let doctor = await Doctor.findOne({ userId });

    if (!doctor) {
        doctor = new Doctor({ userId }); 
    }

    const fullName = doctor.personalDetails?.fullName || '';

    //if not new then update current record
    doctor.professionalDetails = { specialisation, pmdcNumber, educationalBackground, licenseImage, cnicNumber, availableHours, consultationFee, bankDetails };
    doctor.status = 'pending';
    await doctor.save();


    await AdminNotification.create({
        type: 'doctor_verification',
        doctorId: doctor._id,
        message: `${specialisation} Doctor ${fullName} has submitted personal details for verification.`,
    });

    res.status(200).json({ message: 'Professional details submitted successfully' });
};

// Check verification status
const checkVerificationStatus = async (req: any, res: any) => {
    const userId = req.user._id;

    if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can check their status' });
    }

    // Find or create the doctor record
    let doctor = await Doctor.findOne({ userId });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    res.status(200).json({ status: doctor.status });
};

const setupClinic = async (req: any, res: any) => {
    const userId = req.user._id;

    if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can setup clinic' });
    }

   
    let doctor = await Doctor.findOne({ userId });
    // console.log(doctor);
    if (!doctor || doctor.status !== 'verified') {
        return res.status(400).json({ message: 'Doctor must be verified to set up a clinic' });
    }
        const fullName = doctor.personalDetails?.fullName || '';
        const image = doctor.personalDetails?.fullName || '';
        const specialisation = doctor.professionalDetails?.specialisation || '';
        const educationBackground = doctor.professionalDetails?.educationalBackground || '';

        if (!fullName || !specialisation || !educationBackground || !image) {
            return res.status(400).json({
                message: 'Doctor profile details are incomplete. Please complete your profile before setting up a clinic.',
            });
        }

        // Use availableHours and consultationFee from professionalDetails if present
        const consultationFee = doctor.professionalDetails?.consultationFee || 0;


    doctor.clinic = { fullName, specialisation, educationBackground, image, consultationFee };
    await doctor.save();

    res.status(200).json({ message: 'Clinic setup successfully' });
};


const setAvailableSlots = async (req:any, res:any) => {
    try {
        const userId = req.user._id;

        const { date, slots } = req.body; // slots: [{ time: "09:00-10:00", status: "available" }]

        if (req.user.role.toLowerCase() !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can set availability' });
        }

        const doctor = await Doctor.findOne({ userId });
        if (!doctor || doctor.status !== 'verified') {
            return res.status(400).json({ message: 'Doctor must be verified to set availability' });
        }

        // Find or create availability for the date
        const existingAvailability = doctor.availability.find(avail => avail.date === date);
        if (existingAvailability) {
            existingAvailability.slots = slots; // Update slots
        } else {
            doctor.availability.push({ date, slots });
        }

        await doctor.save();
        res.status(200).json({ message: 'Availability updated successfully' });
    } catch (error) {
        console.error('Error in setAvailableSlots:', error);
        res.status(500).json({ message: 'An error occurred while setting availability' });
    }
};


const markSlotsAsBusy = async (req: any, res: any) => {
    try {
        const userId = req.user._id;
        const schedules = req.body; // Array of schedules { date, times }

        if (req.user.role.toLowerCase() !== 'doctor') {
            res.status(403).json({ message: 'Only doctors can mark slots as busy' });
            return;
        }

        const doctor = await Doctor.findOne({ userId });
        if (!doctor) {
            res.status(404).json({ message: 'Doctor not found' });
            return;
        }

        const results = [];

        for (const schedule of schedules) {
            const date = schedule.date;
            const times = schedule.times;

            const availability = doctor.availability.find((avail: any) => avail.date === date);
            if (!availability) {
                results.push({ date, markedBusy: [], alreadyBooked: [], notFound: times });
                continue;
            }

            const dateResults: any = {
                date,
                markedBusy: [] as any[],
                alreadyBooked: [] as any[],
                notFound: [] as any[]
            };

            for (const time of times) {
                const slot = availability.slots.find((slot: any) => slot.time === time);
                if (!slot) {
                    dateResults.notFound.push(time);
                } else if (slot.status === 'booked') {
                    dateResults.alreadyBooked.push(time);
                } else {
                    slot.status = 'busy';
                    dateResults.markedBusy.push(time);
                }
            }

            results.push(dateResults);
        }

        await doctor.save();

        res.status(200).json({
            message: 'Slots processed',
            results
        });
    } catch (error) {
        console.error('Error in markSlotsAsBusy:', error);
        res.status(500).json({ message: 'An error occurred while marking slots as busy' });
    }
};




export {test, submitPersonalDetails, submitProfessionalDetails,checkVerificationStatus,setupClinic, setAvailableSlots, markSlotsAsBusy }