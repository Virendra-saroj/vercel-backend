const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String },
  dateTime: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'rescheduled'], default: 'pending' },
  rejectReason: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('ScheduleRequest', requestSchema);
