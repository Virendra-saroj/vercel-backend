const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 mins
    
    user = new User({ name, email, password: hashedPassword, otp, otpExpiry });
    await user.save();
    
    console.log(`[DEV OTP for ${email}]: ${otp}`); // For testing
    
    // Return OTP directly in response for the frontend to show it
    res.status(201).json({ message: 'User registered, OTP sent', userId: user._id, otp });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (user.otpExpiry < new Date()) return res.status(400).json({ message: 'OTP expired' });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    
    res.status(200).json({ message: 'Account verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    if (!user.isVerified) {
      // resend OTP logic could be here
      return res.status(403).json({ message: 'Account not verified. Please verify your OTP.', userId: user._id });
    }
    
    const payload = { userId: user._id, name: user.name, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    
    res.json({ token, user: payload });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/resend-otp', async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' });
    
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60000);
    await user.save();
    
    console.log(`[DEV Resend OTP for ${user.email}]: ${otp}`); // For testing
    
    res.status(200).json({ message: 'OTP resent successfully', otp });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
