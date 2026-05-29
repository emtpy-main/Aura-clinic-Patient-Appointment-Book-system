const Slot = require('../models/Slot');
const Doctor = require('../models/Doctor');

const generateSlots = async (req, res) => {
  let doctorId = req.body.doctorId;

  // If role is doctor, enforce their own doctor ID
  if (req.user.role === 'doctor') {
    const docProfile = await Doctor.findOne({ user: req.user._id });
    if (!docProfile) {
      return res.status(404).json({ message: 'Doctor profile not found for this user' });
    }
    doctorId = docProfile._id;
  }

  if (!doctorId) {
    return res.status(400).json({ message: 'Doctor ID is required' });
  }

  const { startDate, endDate, intervalMinutes, startTimeStr, endTimeStr } = req.body;

  try {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const startDay = new Date(startDate);
    const endDay = new Date(endDate);
    const interval = parseInt(intervalMinutes, 10) || 30;

    if (isNaN(startDay.getTime()) || isNaN(endDay.getTime())) {
      return res.status(400).json({ message: 'Invalid start or end date' });
    }

    const [startH, startM] = (startTimeStr || '09:00').split(':').map(Number);
    const [endH, endM] = (endTimeStr || '17:00').split(':').map(Number);

    const slotsToCreate = [];

    // Loop through each day from startDay to endDay
    for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
      let current = new Date(d);
      current.setHours(startH, startM, 0, 0);

      let limit = new Date(d);
      limit.setHours(endH, endM, 0, 0);

      while (current.getTime() + (interval * 60 * 1000) <= limit.getTime()) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current.getTime() + (interval * 60 * 1000));

        slotsToCreate.push({
          doctor: doctorId,
          startTime: slotStart,
          endTime: slotEnd,
          status: 'available'
        });

        current = new Date(slotEnd);
      }
    }

    if (slotsToCreate.length === 0) {
      return res.status(400).json({ message: 'No slots could be generated with the given schedule inputs' });
    }

    // Filter out slots that overlap in start times
    const startRange = new Date(startDay);
    startRange.setHours(0, 0, 0, 0);
    const endRange = new Date(endDay);
    endRange.setHours(23, 59, 59, 999);

    const existingSlots = await Slot.find({
      doctor: doctorId,
      startTime: { $gte: startRange, $lte: endRange }
    });

    const existingTimes = new Set(existingSlots.map(s => s.startTime.getTime()));
    const uniqueSlots = slotsToCreate.filter(s => !existingTimes.has(s.startTime.getTime()));

    if (uniqueSlots.length > 0) {
      await Slot.insertMany(uniqueSlots);
    }

    res.status(201).json({
      message: 'Slots generated successfully',
      count: uniqueSlots.length,
      ignoredCount: slotsToCreate.length - uniqueSlots.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate slots', error: error.message });
  }
};

const getAvailableSlots = async (req, res) => {
  const { doctorId, date } = req.query;

  if (!doctorId || !date) {
    return res.status(400).json({ message: 'Doctor ID and Date are required' });
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const slots = await Slot.find({
      doctor: doctorId,
      status: 'available',
      startTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ startTime: 1 });

    res.status(200).json({ slots });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch available slots', error: error.message });
  }
};

const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().populate('user', 'email');
    res.status(200).json({ doctors });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch doctors list', error: error.message });
  }
};

module.exports = {
  generateSlots,
  getAvailableSlots,
  getDoctors
};
