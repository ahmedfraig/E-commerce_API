require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const connectDB = require('./DB/connection');
const errorHandler = require('./middleware/error.middleware');
const AppError = require('./utils/AppError');
const logger = require('./utils/logger');

// Route files
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const adminRoutes = require('./routes/admin.routes');

// Initialize App
const app = express();

// Connect to Database
connectDB();

// Middlewares
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Global rate limiter — protects all routes from general abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use(limiter);
// Note: Sensitive auth endpoints (login, OTP) have their own strict limiters
// applied directly in routes/auth.routes.js

// Stripe Webhook MUST be before express.json()
const { stripeWebhook } = require('./controllers/order.controller');
app.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json()); // Parses incoming JSON requests
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Mount Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/carts', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/wishlists', wishlistRoutes);
app.use('/admin', adminRoutes);

// Base Route
app.get('/', (req, res) => {
  res.send('Ecommerce API is running...');
});

// 404 handler — catch all unknown routes and return a clean JSON response
app.use((req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

// Error Handling Middleware
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the Express API for Vercel Serverless Functions
module.exports = app;

// Process-level error handlers for graceful shutdown
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED PROMISE REJECTION', { name: err.name, message: err.message, stack: err.stack });
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION', { name: err.name, message: err.message, stack: err.stack });
  process.exit(1);
});
