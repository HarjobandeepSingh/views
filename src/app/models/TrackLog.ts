import mongoose from 'mongoose';

const keywordMetricsSchema = new mongoose.Schema({
  keyword: {
    type: String,
    required: true
  },
  metrics: {
    views: {
      type: Number,
      required: true
    },
    totalGifs: {
      type: Number,
      required: true
    },
    difficulty: {
      type: Number,
      required: true
    },
    cpc: {
      type: Number,
      required: true
    },
    volume: {
      type: String,
      required: true
    }
  }
});

const trackLogSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  keywordMetrics: [keywordMetricsSchema]
});

// Index for efficient querying
trackLogSchema.index({ taskId: 1, date: 1 });

// Clear existing model to prevent overwrite error
mongoose.models = {};

const TrackLog = mongoose.model('TrackLog', trackLogSchema);
export default TrackLog; 