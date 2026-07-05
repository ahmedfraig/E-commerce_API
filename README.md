<div align="center">
  <h1>SEF E-Commerce RESTful API</h1>
  
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

## Overview

This project is a comprehensive backend REST API tailored for E-commerce platforms. Built using the **MVC (Model-View-Controller)** architecture, it handles the entire lifecycle of an online store: from highly secure OTP-based user authentication and complex product inventory management (with Cloudinary integrations) to atomic order processing and an Admin analytics dashboard.

## Key Features

- **Robust Authentication:**
  - OTP-based email verification via Nodemailer.
  - Dual-token system (JSON Access Token + HttpOnly Cookie Refresh Token).
  - Secure password reset flow and Role-Based Access Control (Admin vs. Customer).
- **Product Management:**
  - Full-text search, pagination, and advanced filtering (by price, category, brand).
  - Dynamic image uploads utilizing `Multer` and `Cloudinary`.
  - Built-in review and rating calculation system.
- **Cart & Checkout:**
  - Real-time stock deduction and restoration upon cart manipulation.
  - Coupon application engine (Percentage and Fixed discounts).
### Orders (`/orders`)
- Protected with **Mongoose Transactions** to guarantee data integrity during checkout.
- Stripe Payment integration with secure Webhooks (`payment_intent.succeeded`).
- Order status tracking and automated email updates to customers.
- **Admin Dashboard:**
  - Aggregation pipelines to generate complex stats: Total Revenue, Top 5 Products, Daily Sales over 7 Days.
- **Security & Performance Enhancements:**
  - Database queries optimized with `.lean()` for up to 5x faster read operations.
  - Rate limiting to block brute force and spam attacks.
  - Protected against HTTP header vulnerabilities (`helmet`).
  - Concurrent background processing using `Promise.all` for tasks like stock restoration and bulk image deletion.
  - Fully configured for Serverless deployment on platforms like Vercel (`vercel.json` included).

---

## Tech Stack

| Category         | Technologies Used                                                              |
| ---------------- | ------------------------------------------------------------------------------ |
| **Core**         | Node.js, Express.js                                                            |
| **Database**     | MongoDB, Mongoose ODM                                                          |
| **Security**     | bcryptjs, jsonwebtoken (JWT), express-rate-limit, helmet |
| **File Storage** | Cloudinary, Multer                                                             |
| **Payments**     | Stripe API                                                                     |
| **Utilities**    | Nodemailer (Emails), Joi (Validation), Slugify, Morgan (Logging)               |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- Cloudinary Account (for image hosting)
- Stripe Account (for payment processing)

### Postman Collection
A complete `Ecommerce_Postman_Collection.json` is included in the root directory. Import it into Postman to instantly test all endpoints. It features automatic token management via pre-request scripts, so you never have to manually copy and paste your JWT!

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

   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Start the server:**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

---

## API Endpoints Reference

*All requests and responses use `application/json` format. Protected routes require an `Authorization: Bearer <token>` header.*

### 1. Authentication (`/auth`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/register/send-otp` | Register a new user and send OTP to email | Public |
| POST | `/auth/verify-otp` | Verify OTP and activate account | Public |
| POST | `/auth/login` | Login user and return JWT | Public |
| POST | `/auth/logout` | Logout user (clears cookie) | User |
| POST | `/auth/forgot-password/send-otp` | Send password reset link to email | Public |
| POST | `/auth/forgot-password/verify-otp` | Set new password using token | Public |
| GET | `/auth/me` | Get current logged in user profile | User |

### 2. Users (`/users`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/users/add` | Add a new user manually | Admin |
| GET | `/users/all` | Get a list of all users | Admin |
| GET | `/users/:id` | Get details of a single user | Admin |
| PATCH | `/users/:id` | Update user profile | User/Admin |
| DELETE | `/users/:id` | Delete a user | Admin |

### 3. Products (`/products`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/products` | Get all products (supports pagination & filters) | Public |
| GET | `/products/search` | Advanced search for products | Public |
| GET | `/products/:id` | Get single product by ID | Public |
| POST | `/products` | Create a new product (supports image upload) | Admin |
| PUT | `/products/update/:id`| Update product details | Admin |
| DELETE | `/products/:id` | Delete a product | Admin |
| POST | `/products/:id/reviews` | Add a review to a product | User |
| DELETE | `/products/:id/reviews/:rid`| Delete a review | User/Admin |
| GET | `/products/:id/reviews` | Get all reviews for a product | Public |

### 4. Carts (`/carts`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/carts` | Get user's cart (creates one if it doesn't exist)| User |
| POST | `/carts/items` | Add a new item to the cart | User |
| PATCH | `/carts/items` | Update item quantity in the cart | User |
| DELETE | `/carts/items/:productId`| Remove an item from the cart | User |
| POST | `/carts/coupon` | Apply a discount coupon to the cart | User |
| DELETE | `/carts/coupon` | Remove a coupon from the cart | User |
| DELETE | `/carts/clear` | Empty the entire cart | User |

### 5. Orders (`/orders`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/orders` | Create a cash/regular order from cart | User |
| POST | `/orders/create-payment-intent`| Create a Stripe payment intent | User |
| GET | `/orders/my` | Get all orders for the logged in user | User |
| GET | `/orders/my/:id` | Get specific order details | User |
| PATCH | `/orders/my/:id/cancel` | Cancel a pending order | User |

### 6. Wishlists (`/wishlists`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/wishlists/my` | Get user's wishlist | User |
| POST | `/wishlists/add/:productId`| Add a product to wishlist | User |
| DELETE | `/wishlists/remove/:productId`| Remove a product from wishlist | User |
| DELETE | `/wishlists/clear` | Clear the entire wishlist | User |

### 7. Admin (`/admin`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/admin/dashboard` | Get store statistics (users, revenue, etc) | Admin |
| GET | `/admin` | Get all orders | Admin |
| GET | `/admin/:id` | Get specific order details | Admin |
| PATCH | `/admin/:id/status`| Update order status (triggers email) | Admin |
| GET | `/admin/carts` | View all user carts | Admin |
| GET | `/admin/wishlists` | View all user wishlists | Admin |
| GET | `/admin/wishlists/stats`| View most wishlisted products | Admin |

### Webhooks
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/webhook` | Stripe Listener for successful payments| Stripe |

---

## Project Architecture

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
├── vercel.json         # Vercel deployment configuration
├── Ecommerce_Postman_Collection.json # Importable Postman workspace
└── index.js            # Main application entry point
```

---

<div align="center">
  <i>Built as part of an Advanced Backend Engineering Training Program.</i>
</div>
