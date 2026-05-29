const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');
const Doctor = require('../models/Doctor');
const Notification = require('../models/Notification');

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

const rescheduleAppointment = async (req, res) => {
  const { id } = req.params;
  const { newSlotId, reason } = req.body;

  if (!newSlotId) {
    return res.status(400).json({ message: 'New Slot ID is required' });
  }

  try {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify doctor permissions
    const doctorProfile = await Doctor.findOne({ user: req.user._id });
    if (req.user.role === 'doctor') {
      if (!doctorProfile || appointment.doctor.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to modify this appointment' });
      }
    }

    const oldSlotId = appointment.slot;

    // Atomically lock and update new slot status from available to booked
    const newSlot = await Slot.findOneAndUpdate(
      { _id: newSlotId, status: 'available' },
      { status: 'booked' },
      { new: true }
    );

    if (!newSlot) {
      return res.status(409).json({ message: 'The selected new slot is no longer available' });
    }

    // Free up old slot
    await Slot.findByIdAndUpdate(oldSlotId, { status: 'available' });

    // Update appointment
    appointment.slot = newSlot._id;
    appointment.status = 'approved'; // Rescheduled visits are approved by default
    await appointment.save();

    // Create a live notification for the patient
    const docName = doctorProfile ? doctorProfile.name : 'Your doctor';
    const startTimeStr = new Date(newSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const startDateStr = new Date(newSlot.startTime).toLocaleDateString([], { dateStyle: 'medium' });
    
    const notification = new Notification({
      patient: appointment.patient,
      appointment: appointment._id,
      message: `${docName} rescheduled your consultation to ${startDateStr} at ${startTimeStr}`,
      reason: reason || 'Clinical scheduling adjustment'
    });
    await notification.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('slots-changed');
      io.emit('appointments-changed');
      io.emit('notifications-changed');
    }

    res.status(200).json({
      message: 'Appointment rescheduled successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reschedule appointment', error: error.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ patient: req.user._id })
      .populate({
        path: 'appointment',
        populate: { path: 'doctor', select: 'name' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve notifications', error: error.message });
  }
};

const markNotificationAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, patient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('notifications-changed');
    }

    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notification', error: error.message });
  }
};

const deleteNotification = async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await Notification.findOne({ _id: id, patient: req.user._id });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Verify notification is read before allowing deletion
    if (!notification.read) {
      return res.status(400).json({ message: 'Only read notifications can be deleted' });
    }

    await Notification.findByIdAndDelete(id);

    const io = req.app.get('io');
    if (io) {
      io.emit('notifications-changed');
    }

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
};

module.exports = {
  bookAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
  rescheduleAppointment,
  getNotifications,
  markNotificationAsRead,
  deleteNotification
};
