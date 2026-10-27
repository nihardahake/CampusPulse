const router = require('express').Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../validators/authValidators');

// POST /register - Register a new user
router.post('/register', validate(registerSchema), authController.register);

// POST /login - Login with rate limiting
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

// GET /me - Get current authenticated user
router.get('/me', authenticate, authController.getMe);

module.exports = router;
