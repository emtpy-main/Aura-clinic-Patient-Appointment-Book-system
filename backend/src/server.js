const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const { register, login, me } = require('./controllers/authController');
const { generateSlots, getAvailableSlots, getDoctors } = require('./controllers/slotController');
const { bookAppointment, getPatientAppointments, getDoctorAppointments, updateAppointmentStatus } = require('./controllers/appointmentController');
const { authenticateToken, requireRole } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});
app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200 // Returns 200 OK for OPTIONS preflight instead of 204
}));

app.use(express.json());

// Auth routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authenticateToken, me);

// Doctor & Slot routes
app.get('/api/doctors', getDoctors);
app.get('/api/slots/available', getAvailableSlots);
app.post('/api/slots/generate', authenticateToken, requireRole(['doctor', 'admin']), generateSlots);

// Appointment routes
app.post('/api/appointments', authenticateToken, requireRole(['patient']), bookAppointment);
app.get('/api/appointments/patient', authenticateToken, requireRole(['patient']), getPatientAppointments);
app.get('/api/appointments/doctor', authenticateToken, requireRole(['doctor', 'admin']), getDoctorAppointments);
app.patch('/api/appointments/:id/status', authenticateToken, requireRole(['doctor', 'admin']), updateAppointmentStatus);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Clinic Appointment System API running' });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinic-booking';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });
