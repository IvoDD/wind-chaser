const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./utils/database');

// Import routes
const authRoutes = require('./routes/auth');
const spotsRoutes = require('./routes/spots');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors());

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.status(200).json({
    status: 'OK',
    message: 'Wind Chaser API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: {
      status: dbStatusMap[dbStatus],
      name: mongoose.connection.name || 'wind-chaser',
      host: mongoose.connection.host || 'localhost:27017'
    }
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({
    message: 'Backend API is working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      auth: '/api/auth/*',
      spots: '/api/spots/*'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/spots', spotsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, async () => {
  // Connect to database
  await connectDB();
  
  console.log(`🚀 Wind Chaser API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});

module.exports = app;
