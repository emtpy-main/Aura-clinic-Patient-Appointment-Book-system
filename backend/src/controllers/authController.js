const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');

const register = async (req, res) => {
  const { email, password, role, name, specialization, biography } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role && ['patient', 'doctor', 'admin'].includes(role) ? role : 'patient';

    const user = new User({
      email,
      password: hashedPassword,
      role: userRole
    });

    await user.save();

    if (userRole === 'doctor') {
      const doctor = new Doctor({
        user: user._id,
        name: name || 'Doctor Name',
        specialization: specialization || 'General Practitioner',
        biography: biography || ''
      });
      await doctor.save();
    }

    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret_key_123',
      { expiresIn: '7d' }
    );

    let profile = { email: user.email, role: user.role, id: user._id };
    if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: user._id });
      if (doctor) {
        profile.doctorProfile = doctor;
      }
    }

    res.status(200).json({
      message: 'Login successful',
      token,
      user: profile
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

const me = async (req, res) => {
  try {
    let profile = {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    };

    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (doctor) {
        profile.doctorProfile = doctor;
      }
    }

    res.status(200).json({ user: profile });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve profile', error: error.message });
  }
};

module.exports = {
  register,
  login,
  me
};
