import mongoose from 'mongoose';

const viewHistorySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  views: {
    type: Number,
    required: true
  },
  change: {
    type: Number,
    required: true
  }
});

const taskSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true,
    trim: true
  },
  personName: {
    type: String,
    required: true,
    trim: true
  },
  keywords: {
    type: String,
    required: true,
    trim: true
  },
  dateAdded: {
    type: Date,
    default: Date.now
  },
  lastChecked: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'paused'],
    default: 'active'
  },
  viewHistory: [viewHistorySchema]
});

// Clear the model if it exists to prevent the "Cannot overwrite model once compiled" error
mongoose.models = {};

const Task = mongoose.model('Task', taskSchema);
export default Task; 