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
        if (req.user.role.toLowerCase() !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can submit personal details' });
        }
        let doctor = await Doctor.findOne({ userId });
        if (!doctor) {
            const userEmail = req.user.email;
            doctor = new Doctor({ userId, email: userEmail });
        }
        doctor.personalDetails = { fullName, dateOfBirth, gender, country, city, phoneNo, image };
        doctor.status = 'pending';
        await doctor.save();
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

const submitProfessionalDetails = async (req: any, res: any) => {
    const { specialisation, pmdcNumber, educationalBackground, licenseImage, cnicNumber, availableHours, consultationFee, bankDetails } = req.body;
    const userId = req.user._id;
    if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can submit personal details' });
    }
    let doctor = await Doctor.findOne({ userId });
    if (!doctor) {
            const userEmail = req.user.email;
            doctor = new Doctor({ userId, email: userEmail });
        }
    const fullName = doctor.personalDetails?.fullName || '';
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

const checkVerificationStatus = async (req: any, res: any) => {
    const userId = req.user._id;
    if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can check their status' });
    }
    let doctor = await Doctor.findOne({ userId });
    if (!doctor) {
        const userEmail = req.user.email;
        doctor = new Doctor({ userId, email: userEmail });
    }
    res.status(200).json({ status: doctor.status });
};


const setupClinic = async (req: any, res: any) => {
    const userId = req.user._id;
    if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can setup clinic' });
    }
    let doctor = await Doctor.findOne({ userId });
    if (!doctor || doctor.status !== 'verified') {
        return res.status(400).json({ message: 'Doctor must be verified to set up a clinic' });
    }
        const fullName = doctor.personalDetails?.fullName || '';
        const image = doctor.personalDetails?.fullName || '';
        const city = doctor.personalDetails?.city || '';
        const country = doctor.personalDetails?.country || '';
        const specialisation = doctor.professionalDetails?.specialisation || '';
        const educationBackground = doctor.professionalDetails?.educationalBackground || '';
        const startTime = doctor.professionalDetails?.availableHours?.[0]?.startTime || '';
        const endTime = doctor.professionalDetails?.availableHours?.[0]?.endTime || '';
        const consultationFee = doctor.professionalDetails?.consultationFee || 0;
        if (!fullName || !specialisation || !educationBackground || !image) {
            return res.status(400).json({
                message: 'Doctor profile details are incomplete. Please complete your profile before setting up a clinic.',
            });
        }
    doctor.clinic = { fullName, specialisation, educationBackground, image, consultationFee, city, country, startTime, endTime };
    await doctor.save();

    res.status(200).json({ message: 'Clinic setup successfully' });
};

const getClinicDetails = async (req: any, res: any) => {
    try {
        const userId = req.user._id;
        if (req.user.role.toLowerCase() !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can access clinic data' });
        }
        const doctor = await Doctor.findOne({ userId }).select("clinic availability");
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        if (!doctor.clinic) {
            return res.status(400).json({ message: 'Clinic data is not set up yet' });
        }
        const { fullName, specialisation, educationBackground, image, consultationFee, city, country, startTime, endTime } =
            doctor.clinic;
        res.status(200).json({
            clinic: {
                fullName,
                specialisation,
                educationBackground,
                image,
                consultationFee,
                city,
                country,
                startTime,
                endTime,
            },
            availability: doctor.availability || []
        });
    } catch (error) {
        console.error("Error fetching clinic details:", error);
        res.status(500).json({ message: "An error occurred while fetching clinic details." });
    }
};

const setAvailableSlots = async (req: any, res: any) => {
    try {
        const userId = req.user._id;
        const { availability } = req.body;
        if (req.user.role.toLowerCase() !== "doctor") {
            return res.status(403).json({ message: "Only doctors can set availability" });
        }
        const doctor = await Doctor.findOne({ userId });
        if (!doctor || doctor.status !== "verified") {
            return res.status(400).json({ message: "Doctor must be verified to set availability" });
        }
        if (!Array.isArray(availability)) {
            return res.status(400).json({ message: "Invalid data format. Expected an array of availability objects." });
        }
        availability.forEach(({ date, slots }) => {
            const existingAvailability = doctor.availability.find(avail => avail.date === date);
            if (existingAvailability) {
                existingAvailability.slots = slots.map((slot:any) => ({
                    time: slot.time,
                    status: "available",
                }));
            } else {
                doctor.availability.push({
                    date,
                    slots: slots.map((slot:any) => ({
                        time: slot.time,
                        status: "available",
                    })),
                });
            }
        });
        await doctor.save();
        res.status(200).json({ message: "Availability updated successfully" });
    } catch (error) {
        console.error("Error in setAvailableSlots:", error);
        res.status(500).json({ message: "An error occurred while setting availability" });
    }
};

const markSlotsAsBusy = async (req: any, res: any) => {
    try {
        const userId = req.user._id;
        const { schedules } = req.body;
        if (req.user.role.toLowerCase() !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can mark slots as busy' });
        }
        const doctor = await Doctor.findOne({ userId });
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        const results = [];
        for (const schedule of schedules) {
            const { date, times } = schedule;
            const availability = doctor.availability.find((avail: any) => avail.date === date);
            if (!availability) {
                results.push({ date, markedBusy: [], alreadyBooked: [], notFound: times });
                continue;
            }
            const dateResults: any = {
                date,
                markedBusy: [],
                alreadyBooked: [],
                notFound: []
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
            message: 'Slots marked as busy successfully',
            results
        });
    } catch (error) {
        console.error('Error in markSlotsAsBusy:', error);
        res.status(500).json({ message: 'An error occurred while marking slots as busy' });
    }
};

const updateDoctorPersonalDetails = async (req: any, res: any) => {
    try {
      const { fullName, dateOfBirth, gender, country, city, phoneNo, image } = req.body;
      const userId = req.user._id;
  
      if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can update personal details' });
      }
  
      const doctor = await Doctor.findOne({ userId });
  
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found. Please complete registration first.' });
      }
  
      doctor.personalDetails = {
        ...doctor.personalDetails, // Preserve existing fields not being updated
        fullName,
        dateOfBirth,
        gender,
        country,
        city,
        phoneNo,
        image,
      };
  
      await doctor.save();
  
      res.status(200).json({ message: 'Personal details updated successfully' });
    } catch (error) {
      console.error('Error in updateDoctorPersonalDetails:', error);
      res.status(500).json({ message: 'An error occurred while updating personal details' });
    }
  };

 const getDoctorDetails = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;

    const doctor = await Doctor.findOne({ userId });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const personalDetails = doctor.personalDetails;

    if (!personalDetails) {
      return res.status(200).json({ message: "No personal details found yet", personalDetails: null });
    }

    res.status(200).json({
      message: "Doctor personal details fetched successfully",
      personalDetails,
    });
  } catch (error) {
    console.error("Error fetching doctor details:", error);
    res.status(500).json({ message: "An error occurred while fetching doctor details" });
  }
};


export {test, submitPersonalDetails, submitProfessionalDetails,checkVerificationStatus,setupClinic, setAvailableSlots, markSlotsAsBusy, getClinicDetails 
    , updateDoctorPersonalDetails , getDoctorDetails
}

