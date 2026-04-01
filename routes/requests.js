const express = require('express');
const auth = require('../middleware/auth');
const ScheduleRequest = require('../models/ScheduleRequest');
const router = express.Router();

// Create new schedule request
router.post('/', auth, async (req, res) => {
  const { receiver, message, dateTime } = req.body;
  try {
    const request = new ScheduleRequest({
      sender: req.user.userId,
      receiver,
      message,
      dateTime
    });
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get user's requests (inbox/outbox)
router.get('/', auth, async (req, res) => {
  try {
    const requests = await ScheduleRequest.find({
      $or: [{ sender: req.user.userId }, { receiver: req.user.userId }]
    })
    .populate('sender', 'name email')
    .populate('receiver', 'name email')
    .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Respond to a schedule request
router.post('/:id/respond', auth, async (req, res) => {
  const { status, rejectReason, newDateTime } = req.body; 
  // status: 'accepted', 'rejected', 'rescheduled'
  try {
    const request = await ScheduleRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    
    if (request.receiver.toString() !== req.user.userId && status !== 'rescheduled') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = status;
    if (status === 'rejected') {
      request.rejectReason = rejectReason;
    } else if (status === 'rescheduled' && newDateTime) {
      request.dateTime = newDateTime;
      request.status = 'pending'; // Needs re-approval
      // swap sender and receiver to simulate counter-proposal structurally?
      // simple handling: just change date and set to pending.
    }
    
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
