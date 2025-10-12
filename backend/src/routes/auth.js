const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const router = express.Router();

// Public routes (no authentication required)
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected routes (authentication required)
router.post('/logout', authenticateToken, logout);
router.post('/logout-all', authenticateToken, logoutAll);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

// Test protected route
router.get('/test-protected', authenticateToken, (req, res) => {
  res.status(200).json({
    message: 'Protected route access successful',
    user: {
      id: req.user._id,
      email: req.user.email,
      fullName: req.user.fullName
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
