const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  biography: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', DoctorSchema);
