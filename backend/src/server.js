const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { register, login, me } = require('./controllers/authController');
const { generateSlots, getAvailableSlots, getDoctors } = require('./controllers/slotController');
const { bookAppointment, getPatientAppointments, getDoctorAppointments, updateAppointmentStatus, rescheduleAppointment, getNotifications, markNotificationAsRead, deleteNotification } = require('./controllers/appointmentController');
const { authenticateToken, requireRole } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  }
});

// Middleware
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});
app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Socket.io connection setup
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Share io with Express routers
app.set('io', io);

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
app.patch('/api/appointments/:id/reschedule', authenticateToken, requireRole(['doctor', 'admin']), rescheduleAppointment);

// Notification routes
app.get('/api/notifications', authenticateToken, requireRole(['patient']), getNotifications);
app.patch('/api/notifications/:id/read', authenticateToken, requireRole(['patient']), markNotificationAsRead);
app.delete('/api/notifications/:id', authenticateToken, requireRole(['patient']), deleteNotification);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Clinic Appointment System API running' });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinic-booking';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} with WebSockets enabled`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });
