<div align="center">
  <h1>🛒 SEF E-Commerce RESTful API</h1>
  
  <p>
    <strong>A production-ready, feature-rich backend API for modern E-commerce applications.</strong>
  </p>
  
  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white" alt="JWT" />
  </p>
</div>

---

## 📖 Overview

This project is a comprehensive backend REST API tailored for E-commerce platforms. Built using the **MVC (Model-View-Controller)** architecture, it handles the entire lifecycle of an online store: from highly secure OTP-based user authentication and complex product inventory management (with Cloudinary integrations) to atomic order processing and an Admin analytics dashboard.

## ✨ Key Features

- **🔐 Robust Authentication:**
  - OTP-based email verification via Nodemailer.
  - Dual-token system (JSON Access Token + HttpOnly Cookie Refresh Token).
  - Secure password reset flow and Role-Based Access Control (Admin vs. Customer).
- **📦 Product Management:**
  - Full-text search, pagination, and advanced filtering (by price, category, brand).
  - Dynamic image uploads utilizing `Multer` and `Cloudinary`.
  - Built-in review and rating calculation system.
- **🛒 Cart & Checkout:**
  - Real-time stock deduction and restoration upon cart manipulation.
  - Coupon application engine (Percentage and Fixed discounts).
- **💳 Order Processing:**
  - Protected with **Mongoose Transactions** to guarantee data integrity during checkout.
  - Order status tracking and automated email updates to customers.
- **⚙️ Admin Dashboard:**
  - Aggregation pipelines to generate complex stats: Total Revenue, Top 5 Products, Daily Sales over 7 Days.
- **🛡️ Security & Performance Enhancements:**
  - Database queries optimized with `.lean()` for up to 5x faster read operations.
  - Rate limiting to block brute force and spam attacks.
  - Protected against NoSQL injections (`express-mongo-sanitize`) and HTTP header vulnerabilities (`helmet`).
  - Concurrent background processing using `Promise.all` for tasks like stock restoration and bulk image deletion.

---

## 🛠️ Tech Stack

| Category         | Technologies Used                                                              |
| ---------------- | ------------------------------------------------------------------------------ |
| **Core**         | Node.js, Express.js                                                            |
| **Database**     | MongoDB, Mongoose ODM                                                          |
| **Security**     | bcryptjs, jsonwebtoken (JWT), express-rate-limit, helmet, express-mongo-sanitize |
| **File Storage** | Cloudinary, Multer                                                             |
| **Utilities**    | Nodemailer (Emails), Joi (Validation), Slugify, Morgan (Logging)               |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- Cloudinary Account (for image hosting)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/ecommerce-api.git
   cd ecommerce-api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following keys:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ecommerce-api
   
   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=15m
   
   # Cloudinary Keys
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Nodemailer Credentials
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. **Start the server:**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

---

## 📡 API Endpoints Overview

*All requests and responses use `application/json` format. Protected routes require an `Authorization: Bearer <token>` header.*

### Authentication (`/auth`)
- `POST /register/send-otp` - Register and receive verification code
- `POST /verify-otp` - Activate account
- `POST /login` - Login to receive tokens
- `POST /logout` - Clear refresh token cookie

### Users (`/users`)
- `GET /all` - Get all users (Admin)
- `PATCH /:id` - Update user profile

### Products (`/products`)
- `GET /` - List products with pagination/filters
- `GET /search` - Advanced text/category search
- `POST /` - Create product (Admin, supports `multipart/form-data`)
- `POST /:id/reviews` - Add a review/rating

### Carts (`/carts`)
- `GET /` - Get or auto-create cart
- `POST /items` - Add item to cart
- `POST /coupon` - Apply discount code (e.g. `SAVE50`, `OFF50`)

### Orders (`/orders`)
- `POST /` - Place an order (Clears cart)
- `GET /my` - View your order history
- `PATCH /my/:id/cancel` - Cancel a pending order

### Admin Analytics (`/admin`)
- `GET /dashboard` - Get full sales and customer statistics
- `PATCH /orders/:id/status` - Update order status (triggers email)

---

## 📂 Project Architecture

```text
ecommerce-api/
├── config/             # Third-party configurations (Cloudinary)
├── controllers/        # Business logic for endpoints
├── DB/                 # MongoDB connection setup
├── middleware/         # Auth guards, upload handling, error catching, Joi validation
├── models/             # Mongoose Schemas (User, Product, Order, Cart, OTP)
├── routes/             # Express Router definitions
├── utils/              # Helper functions (Nodemailer)
├── validation/         # Joi validation schemas
├── .env                # Environment variables
└── index.js            # Main application entry point
```

---

<div align="center">
  <i>Built as part of an Advanced Backend Engineering Training Program.</i>
</div>
