const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true, unique: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
