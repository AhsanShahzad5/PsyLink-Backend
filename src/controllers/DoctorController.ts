import express, { Request, Response } from 'express';
import Doctor from '../models/DoctorModel';
import AdminNotification from '../models/AdminNotification';
import { v2 as cloudinary } from "cloudinary";
import mongoose from 'mongoose';
import User from '../models/UserModel'; // Assuming you have a User model
import Patient from '../models/PatientModel'; // Assuming you have a Patient model

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

      // Update profileCompleted status on User model
      await User.findByIdAndUpdate(userId, { profileCompleted: true });
    
      // Return user data with updated profileCompleted status
      const updatedUser = await User.findById(userId).select('-password');
    
        res.status(200).json({ message: 'Personal details submitted successfully' ,
          user: updatedUser
         });
    } catch (error) {
        console.error('Error in submitPersonalDetails:', error);
        res.status(500).json({ message: 'An error occurred while submitting personal details' });
    }
};

const getDoctorProfessionalDetails = async (req: any, res: any) => {
    try {
      const userId = req.user._id;
  
      if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: "Only doctors can access professional details" });
      }
  
      const doctor = await Doctor.findOne({ userId });
  
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
  
      const professionalDetails = doctor.professionalDetails;
  
      if (!professionalDetails) {
        return res.status(200).json({ 
          message: "No professional details found yet", 
          professionalDetails: null 
        });
      }
  
      res.status(200).json({
        message: "Doctor professional details fetched successfully",
        professionalDetails,
      });
    } catch (error) {
      console.error("Error fetching doctor professional details:", error);
      res.status(500).json({ message: "An error occurred while fetching doctor professional details" });
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


const getClinicDetails = async (req: any, res: any) => {
    try {
      const doctorId = req.user._id; // Corrected from req.user.id -> req.user._id
      const doctor = await Doctor.findOne({ userId: doctorId });
  
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
  
      return res.status(200).json({ success: true, clinic: doctor.clinic || {} });
    } catch (error) {
      console.error('Error in getClinicDetails:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  
  const saveClinicDetails = async (req: any, res: any) => {
    try {
      const doctorId = req.user._id;
      const {
        fullName,
        specialisation,
        educationBackground,
        description,
        image, // yeh aa raha req.body se
        consultationFee,
        city,
        country,
        startTime,
        endTime,
      } = req.body;
  
      let doctor = await Doctor.findOne({ userId: doctorId });
  
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
  
      let uploadedImageUrl = "";
  
      // 🔹 If image provided, upload to Cloudinary
      if (image) {
        const uploadedResponse = await cloudinary.uploader.upload(image);
        uploadedImageUrl = uploadedResponse.secure_url;
      }
  
      // 🔹 Update clinic details
      doctor.clinic = {
        fullName,
        specialisation,
        educationBackground,
        description,
        image: uploadedImageUrl || doctor.clinic?.image || "", // agar naya image nahi mila toh purana rahe
        consultationFee,
        city,
        country,
        startTime,
        endTime,
      };
  
      await doctor.save();
  
      return res.status(200).json({ success: true, clinic: doctor.clinic });
    } catch (error) {
      console.error('Error in saveClinicDetails:', error);
      return res.status(500).json({ message: 'Failed to save clinic details' });
    }
  };

  const getAvailability = async (req: any, res: any) => {
    try {
      const userId = req.user._id;
  
      if (req.user.role.toLowerCase() !== "doctor") {
        return res.status(403).json({ message: "Only doctors can view availability" });
      }
  
      const doctor = await Doctor.findOne({ userId });
  
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
  
      const currentDate = new Date(); // Current Date and Time
  
      const availabilityDetails = doctor.availability
        .filter((day: any) => {
          const slotDate = new Date(day.date);
          // Only include slots with date today or future
          return slotDate >= new Date(currentDate.toDateString());
        })
        .map((day: any) => {
          const availableSlots = day.slots.filter((slot: any) => slot.status === "available").map((slot: any) => slot.time);
          const busySlots = day.slots.filter((slot: any) => slot.status === "busy").map((slot: any) => slot.time);
          const bookedSlots = day.slots.filter((slot: any) => slot.status === "booked").map((slot: any) => slot.time);
  
          return {
            date: day.date,
            availableSlots,
            busySlots,
            bookedSlots
          };
        });
  
      return res.status(200).json({ success: true, availability: availabilityDetails });
    } catch (error) {
      console.error("Error in getAvailability:", error);
      return res.status(500).json({ message: "Failed to fetch availability" });
    }
  };
    
  



export {test, submitPersonalDetails, submitProfessionalDetails,checkVerificationStatus, setAvailableSlots, markSlotsAsBusy,getClinicDetails, saveClinicDetails,getAvailability }

