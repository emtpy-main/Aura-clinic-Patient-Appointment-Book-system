const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');
const Doctor = require('../models/Doctor');

const bookAppointment = async (req, res) => {
  const { slotId, reason } = req.body;
  const patientId = req.user._id;

  if (!slotId) {
    return res.status(400).json({ message: 'Slot ID is required' });
  }

  try {
    // Atomically lock and update slot status from available to booked
    const slot = await Slot.findOneAndUpdate(
      { _id: slotId, status: 'available' },
      { status: 'booked' },
      { new: true }
    );

    if (!slot) {
      return res.status(409).json({ message: 'Slot is no longer available or does not exist' });
    }

    const appointment = new Appointment({
      patient: patientId,
      doctor: slot.doctor,
      slot: slot._id,
      status: 'pending',
      reason: reason || ''
    });

    await appointment.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('slots-changed');
      io.emit('appointments-changed');
    }

    res.status(201).json({
      message: 'Appointment requested successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: 'Booking appointment failed', error: error.message });
  }
};

const getPatientAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user._id })
      .populate({
        path: 'doctor',
        select: 'name specialization'
      })
      .populate('slot')
      .sort({ createdAt: -1 });

    res.status(200).json({ appointments });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve patient appointments', error: error.message });
  }
};

const getDoctorAppointments = async (req, res) => {
  try {
    const doctorProfile = await Doctor.findOne({ user: req.user._id });
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const appointments = await Appointment.find({ doctor: doctorProfile._id })
      .populate({
        path: 'patient',
        select: 'email'
      })
      .populate('slot')
      .sort({ createdAt: -1 });

    res.status(200).json({ appointments });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve doctor appointments', error: error.message });
  }
};

const updateAppointmentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Valid status (approved/rejected) is required' });
  }

  try {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify doctor permissions (doctor can only update their own appointments)
    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: req.user._id });
      if (!doctorProfile || appointment.doctor.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to modify this appointment' });
      }
    }

    appointment.status = status;
    await appointment.save();

    // If rejected, free up the slot so another patient can book
    if (status === 'rejected') {
      await Slot.findByIdAndUpdate(appointment.slot, { status: 'available' });
    } else if (status === 'approved') {
      // Re-ensure slot is marked booked if it was previously set back
      await Slot.findByIdAndUpdate(appointment.slot, { status: 'booked' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('slots-changed');
      io.emit('appointments-changed');
    }

    res.status(200).json({
      message: `Appointment successfully ${status}`,
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update appointment status', error: error.message });
  }
};

module.exports = {
  bookAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus
};
