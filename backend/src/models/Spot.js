const mongoose = require('mongoose');

const spotSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Spot name is required'],
    trim: true,
    maxlength: [100, 'Spot name cannot exceed 100 characters']
  },
  windguruUrl: {
    type: String,
    required: [true, 'Windguru URL is required'],
    trim: true,
    validate: {
      validator: function(url) {
        // Validate Windguru URL format
        const windguruRegex = /^https?:\/\/(www\.)?windguru\.cz\/\d+\/?$/;
        return windguruRegex.test(url);
      },
      message: 'Please provide a valid Windguru URL (e.g., https://www.windguru.cz/81565)'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  notificationCriteria: {
    minWindSpeed: {
      type: Number,
      min: [0, 'Minimum wind speed cannot be negative'],
      max: [100, 'Wind speed cannot exceed 100 knots'],
      default: 10
    },
    maxWindSpeed: {
      type: Number,
      min: [0, 'Maximum wind speed cannot be negative'],
      max: [100, 'Wind speed cannot exceed 100 knots'],
      default: 50,
      validate: {
        validator: function(value) {
          return value >= this.notificationCriteria.minWindSpeed;
        },
        message: 'Maximum wind speed must be greater than or equal to minimum wind speed'
      }
    },
    preferredDirections: [{
      type: String,
      enum: {
        values: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
        message: 'Wind direction must be one of: N, NE, E, SE, S, SW, W, NW'
      }
    }],
    daysOfWeek: [{
      type: Number,
      min: [0, 'Day of week must be between 0 (Sunday) and 6 (Saturday)'],
      max: [6, 'Day of week must be between 0 (Sunday) and 6 (Saturday)']
    }],
    timeRange: {
      start: {
        type: String,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'],
        default: '06:00'
      },
      end: {
        type: String,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'],
        default: '20:00'
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastChecked: {
    type: Date,
    default: null
  },
  lastNotificationSent: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for efficient queries
spotSchema.index({ userId: 1, isActive: 1 });
spotSchema.index({ userId: 1, createdAt: -1 });

// Virtual for Windguru spot ID extraction
spotSchema.virtual('windguruSpotId').get(function() {
  const match = this.windguruUrl.match(/windguru\.cz\/(\d+)/);
  return match ? match[1] : null;
});

// Instance method to check if notification should be sent
spotSchema.methods.shouldNotify = function(windData) {
  const { speed, direction } = windData;
  const criteria = this.notificationCriteria;
  
  // Check wind speed
  if (speed < criteria.minWindSpeed || speed > criteria.maxWindSpeed) {
    return false;
  }
  
  // Check wind direction if specified
  if (criteria.preferredDirections.length > 0 && !criteria.preferredDirections.includes(direction)) {
    return false;
  }
  
  // Check day of week if specified
  const today = new Date().getDay();
  if (criteria.daysOfWeek.length > 0 && !criteria.daysOfWeek.includes(today)) {
    return false;
  }
  
  // Check time range
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  if (currentTime < criteria.timeRange.start || currentTime > criteria.timeRange.end) {
    return false;
  }
  
  return true;
};

// Instance method to update last checked time
spotSchema.methods.updateLastChecked = function() {
  this.lastChecked = new Date();
  return this.save();
};

// Instance method to update last notification sent time
spotSchema.methods.updateLastNotificationSent = function() {
  this.lastNotificationSent = new Date();
  return this.save();
};

// Static method to find user's active spots
spotSchema.statics.findActiveByUser = function(userId) {
  return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};

// Static method to find spots that need checking
spotSchema.statics.findSpotsToCheck = function() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  return this.find({
    isActive: true,
    $or: [
      { lastChecked: null },
      { lastChecked: { $lt: thirtyMinutesAgo } }
    ]
  }).populate('userId', 'email firstName lastName');
};

// Pre-save middleware to validate time range
spotSchema.pre('save', function(next) {
  const startTime = this.notificationCriteria.timeRange.start;
  const endTime = this.notificationCriteria.timeRange.end;
  
  if (startTime >= endTime) {
    const error = new Error('End time must be after start time');
    error.name = 'ValidationError';
    return next(error);
  }
  
  next();
});

module.exports = mongoose.model('Spot', spotSchema);
