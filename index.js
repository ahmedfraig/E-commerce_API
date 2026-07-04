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
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);
app.use('/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 requests per 15 mins for auth
  message: 'Too many auth requests from this IP, please try again later.'
}));

// Stripe Webhook MUST be before express.json()
const { stripeWebhook } = require('./controllers/order.controller');
app.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json()); // Parses incoming JSON requests
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize()); // Prevent NoSQL injection
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

// Error Handling Middleware
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the Express API for Vercel Serverless Functions
module.exports = app;
