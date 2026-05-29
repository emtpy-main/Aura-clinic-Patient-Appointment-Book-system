const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['available', 'booked'], default: 'available' }
}, { timestamps: true });

module.exports = mongoose.model('Slot', SlotSchema);
