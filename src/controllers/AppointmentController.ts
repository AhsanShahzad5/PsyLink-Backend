import { Request, Response } from 'express';
import Appointment from '../models/AppointmentModel';

// Get appointment details by appointmentId
export const getAppointmentDetails = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'Appointment ID is required' });
    }

    const appointment = await Appointment.findOne({ appointmentId });
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    return res.status(200).json({
      success: true,
      data: appointment
    });
    
  } catch (error:any) {
    console.error('Error fetching appointment details:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching appointment details',
      error: error.message
    });
  }
};