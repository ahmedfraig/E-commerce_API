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
    <img src="https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=Stripe&logoColor=white" alt="Stripe" />
  </p>
</div>

---

## Overview

A comprehensive backend REST API tailored for E-commerce platforms. Built using the **MVC (Model-View-Controller)** architecture, it handles the entire lifecycle of an online store — from highly secure OTP-based user authentication and complex product inventory management (with Cloudinary integration) to atomic order processing with Mongoose Transactions and an Admin analytics dashboard powered by MongoDB Aggregation Pipelines.

---

## Key Features

- **Robust Authentication & Authorization**
  - OTP-based email verification via Nodemailer.
  - Dual-token system: short-lived Access Token (JSON) + long-lived Refresh Token (HttpOnly Cookie).
  - Separate cryptographic secrets for access and refresh tokens.
  - Secure password reset flow with hashed crypto tokens.
  - Role-Based Access Control (Admin vs. Customer).

- **Product Management**
  - Full-text search, server-side pagination, and advanced filtering (price range, category, brand, tags).
  - Dynamic image uploads via `Multer` and `Cloudinary` with bulk deletion support.
  - Built-in review and dynamic average rating calculation system.
  - SEO-friendly URL slugs auto-generated via `slugify`.

- **Cart & Checkout**
  - Real-time stock deduction and restoration — all wrapped in **Mongoose Transactions** to guarantee data integrity.
  - Dynamic Coupon engine backed by a database model with expiration dates, usage limits, and active/inactive toggling.

- **Orders & Payments**
  - Atomic order creation protected with **Mongoose Transactions**.
  - Stripe Payment integration with secure Webhooks (`payment_intent.succeeded`).
  - Full order lifecycle tracking (pending → confirmed → shipped → delivered → cancelled).
  - Automated email notifications on order creation and status updates.

- **Admin Dashboard**
  - MongoDB Aggregation Pipelines for complex analytics: Total Revenue, Top 5 Products, Daily Sales (7 days).
  - Concurrent query execution via `Promise.all` for blazing-fast dashboard load times.
  - Full visibility into all user carts, wishlists, and orders.

- **Security Hardening**
  - Passwords hashed with `bcryptjs` (10 salt rounds). OTPs and reset tokens hashed with SHA-256.
  - Mass assignment protection — regular users can only update whitelisted profile fields.
  - Anti-email-enumeration on the forgot-password endpoint.
  - CORS restricted to the configured frontend origin with credentials support.
  - HTTP header protection via `helmet`.
  - Separate rate limiters for general API (100 req/15min) and auth routes (20 req/15min).
  - Global error handler with specific catches for Mongoose, JWT, and duplicate key errors.

- **Performance Optimizations**
  - Read-only queries optimized with `.lean()` for up to 5x faster responses.
  - Pagination capped at 100 items per page to prevent DoS via query manipulation.
  - Concurrent database calls via `Promise.all` wherever queries are independent.
  - MongoDB compound indexes on Product fields for optimized search and filtering.

---

## Tech Stack

| Category         | Technologies                                                              |
| ---------------- | ------------------------------------------------------------------------- |
| **Runtime**      | Node.js, Express.js                                                       |
| **Database**     | MongoDB, Mongoose ODM                                                     |
| **Authentication** | JSON Web Tokens (Access + Refresh), bcryptjs, crypto                    |
| **Security**     | helmet, express-rate-limit, express-mongo-sanitize, CORS                  |
| **File Storage** | Cloudinary, Multer                                                        |
| **Payments**     | Stripe API (Payment Intents + Webhooks)                                   |
| **Validation**   | Joi                                                                       |
| **Email**        | Nodemailer                                                                |
| **Utilities**    | Slugify, Morgan (HTTP Logging), cookie-parser                             |
| **Deployment**   | Vercel (Serverless)                                                       |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas cluster)
- [Cloudinary](https://cloudinary.com/) Account (for image hosting)
- [Stripe](https://stripe.com/) Account (for payment processing)

### Postman Collection

A complete **`Ecommerce_Postman_Collection.json`** is included in the root directory. Import it into Postman to instantly test all endpoints with automatic token management via pre-request scripts.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/ecommerce-api.git
    cd ecommerce-api
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory:
    ```env
    PORT=5000
    MONGODB_URI=mongodb://localhost:27017/ecommerce-api

    # JWT Configuration (use two DIFFERENT secrets)
    JWT_SECRET=your_access_token_secret
    JWT_REFRESH_SECRET=your_refresh_token_secret
    JWT_EXPIRES_IN=15m

    # Frontend URL (used for CORS origin and password reset links)
    FRONTEND_URL=http://localhost:3000

    # Cloudinary
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret

    # Nodemailer (Gmail App Password)
    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=587
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_app_password

    # Stripe
    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_WEBHOOK_SECRET=whsec_...
    ```

4.  **Start the server:**
    ```bash
    # Development mode (with hot-reload)
    npm run dev

    # Production mode
    npm start
    ```

---

## API Endpoints Reference

> All requests and responses use `application/json`. Protected routes require an `Authorization: Bearer <token>` header. Paginated endpoints accept `?page=1&limit=10` query parameters (max limit: 100).

### 1. Authentication (`/auth`)

| Method | Endpoint                         | Description                                      | Access |
| ------ | -------------------------------- | ------------------------------------------------ | ------ |
| POST   | `/auth/register/send-otp`        | Register a new user and send OTP to email         | Public |
| POST   | `/auth/verify-otp`               | Verify OTP and activate account                   | Public |
| POST   | `/auth/login`                    | Login and receive access + refresh tokens         | Public |
| GET    | `/auth/refresh-token`            | Exchange refresh cookie for a new access token    | Public |
| POST   | `/auth/logout`                   | Logout user (invalidates refresh cookie)          | User   |
| POST   | `/auth/forgot-password/send-otp` | Send password reset link to email                 | Public |
| POST   | `/auth/forgot-password/verify-otp` | Reset password using token                      | Public |
| GET    | `/auth/me`                       | Get current logged-in user profile                | User   |

### 2. Users (`/users`)

| Method | Endpoint               | Description                                          | Access     |
| ------ | ---------------------- | ---------------------------------------------------- | ---------- |
| POST   | `/users/add`           | Create a new user manually (auto-verified)            | Admin      |
| POST   | `/users/change-password` | Change password using current password              | User       |
| GET    | `/users/all`           | Get paginated list of all users                       | Admin      |
| GET    | `/users/:id`           | Get a single user by ID                               | Admin      |
| PATCH  | `/users/:id`           | Update user profile (field-restricted for customers)  | User/Admin |
| DELETE | `/users/:id`           | Delete a user                                         | Admin      |

### 3. Products (`/products`)

| Method | Endpoint                        | Description                              | Access     |
| ------ | ------------------------------- | ---------------------------------------- | ---------- |
| GET    | `/products`                     | Get all products (pagination & filters)  | Public     |
| GET    | `/products/search`              | Full-text search with advanced filters   | Public     |
| GET    | `/products/:id`                 | Get single product by ID                 | Public     |
| POST   | `/products`                     | Create product (with image upload)       | Admin      |
| PUT    | `/products/update/:id`          | Update product details                   | Admin      |
| DELETE | `/products/:id`                 | Delete product (removes Cloudinary imgs) | Admin      |
| POST   | `/products/:id/reviews`         | Add a review to a product                | User       |
| DELETE | `/products/:id/reviews/:rid`    | Delete a review                          | User/Admin |
| GET    | `/products/:id/reviews`         | Get all reviews for a product            | Public     |

### 4. Carts (`/carts`)

| Method | Endpoint                   | Description                          | Access |
| ------ | -------------------------- | ------------------------------------ | ------ |
| GET    | `/carts`                   | Get user's cart (auto-creates)       | User   |
| POST   | `/carts/items`             | Add item to cart (transactional)     | User   |
| PATCH  | `/carts/items`             | Update item quantity (transactional) | User   |
| DELETE | `/carts/items/:productId`  | Remove item from cart (transactional)| User   |
| POST   | `/carts/coupon`            | Apply a discount coupon              | User   |
| DELETE | `/carts/coupon`            | Remove applied coupon                | User   |
| DELETE | `/carts/clear`             | Empty entire cart (transactional)    | User   |

### 5. Orders (`/orders`)

| Method | Endpoint                        | Description                            | Access |
| ------ | ------------------------------- | -------------------------------------- | ------ |
| POST   | `/orders`                       | Create order from cart (transactional) | User   |
| POST   | `/orders/create-payment-intent` | Create a Stripe payment intent         | User   |
| GET    | `/orders/my`                    | Get logged-in user's order history     | User   |
| GET    | `/orders/my/:id`                | Get specific order details             | User   |
| PATCH  | `/orders/my/:id/cancel`         | Cancel a pending/confirmed order       | User   |

### 6. Wishlists (`/wishlists`)

| Method | Endpoint                         | Description                      | Access |
| ------ | -------------------------------- | -------------------------------- | ------ |
| GET    | `/wishlists/my`                  | Get user's wishlist              | User   |
| POST   | `/wishlists/add/:productId`      | Add a product to wishlist        | User   |
| DELETE | `/wishlists/remove/:productId`   | Remove a product from wishlist   | User   |
| DELETE | `/wishlists/clear`               | Clear the entire wishlist        | User   |

### 7. Admin (`/admin`)

| Method | Endpoint                | Description                                  | Access |
| ------ | ----------------------- | -------------------------------------------- | ------ |
| GET    | `/admin/dashboard`      | Store analytics (revenue, top products, etc.) | Admin  |
| GET    | `/admin`                | Get all orders (with filters & pagination)   | Admin  |
| GET    | `/admin/:id`            | Get specific order details                   | Admin  |
| PATCH  | `/admin/:id/status`     | Update order status (triggers email)         | Admin  |
| GET    | `/admin/carts`          | View all user carts                          | Admin  |
| GET    | `/admin/wishlists`      | View all user wishlists (paginated)          | Admin  |
| GET    | `/admin/wishlists/stats` | View most wishlisted products               | Admin  |

### Webhooks

| Method | Endpoint   | Description                              | Access |
| ------ | ---------- | ---------------------------------------- | ------ |
| POST   | `/webhook` | Stripe listener for successful payments  | Stripe |

---

## Frontend Integration Guide

> Critical details for frontend developers building the client application for this API.

### Credentials & Cookies

This API stores the `refreshToken` in an **HttpOnly Cookie** — the browser handles it automatically, but your HTTP client must be configured to support it:

```javascript
// Axios (recommended)
axios.defaults.withCredentials = true;

// Fetch API
fetch(url, { credentials: 'include' });
```

### Silent Token Refresh (Interceptor Pattern)

The `accessToken` expires after **15 minutes**. Build an Axios interceptor to handle automatic, silent renewal:

1. A request fails with `401` and the message `"Your token has expired. Please refresh."`
2. Your interceptor calls `GET /auth/refresh-token` (the cookie is sent automatically)
3. The API returns a fresh `accessToken`
4. The interceptor retries the original request — the user never notices

### Standardized Response Format

```jsonc
// Success (single item)
{ "success": true, "data": { ... } }

// Success (paginated list)
{ "success": true, "count": 10, "pagination": { "total": 50, "page": 1, "pages": 5 }, "data": [ ... ] }

// Error
{ "success": false, "message": "Human-readable error message" }
```

---

## Project Architecture

```text
ecommerce-api/
├── config/             # Third-party configurations (Cloudinary)
├── controllers/        # Business logic for all endpoints
├── DB/                 # MongoDB connection setup
├── middleware/         # Auth guards, file uploads, error handler, Joi validation runner
├── models/             # Mongoose Schemas (User, Product, Order, Cart, Coupon, OTP, Wishlist)
├── routes/             # Express Router definitions
├── utils/              # Helper functions (email sender)
├── validation/         # Joi validation schemas
├── .env                # Environment variables (not committed)
├── vercel.json         # Vercel serverless deployment config
├── Ecommerce_Postman_Collection.json
└── index.js            # Application entry point
```

---

<div align="center">
  <i>Built as part of an Advanced Backend Engineering Training Program.</i>
</div>
