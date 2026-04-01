const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    // List verified users excluding self
    const users = await User.find({ isVerified: true, _id: { $ne: req.user.userId } })
      .select('-password -otp -otpExpiry');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
