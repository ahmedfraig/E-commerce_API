exports.MESSAGES = {
  // Product
  PRODUCT_NOT_FOUND: 'Product not found',
  PRODUCT_INACTIVE: 'Cannot review an inactive product',
  PRODUCT_ALREADY_REVIEWED: 'Product already reviewed',
  PRODUCT_REVIEW_PURCHASE_REQUIRED: 'You must purchase and receive this product to review it',
  PRODUCT_IMAGE_UPLOAD_FAILED: 'Failed to upload one or more images. Upload transaction aborted.',
  PRODUCT_DELETED: 'Product successfully deleted',

  // User
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'Email already exists',
  USER_NOT_AUTHORIZED: 'Not authorized to update this user',
  USER_CANNOT_DELETE_SELF: 'You cannot delete your own account',
  USER_CANNOT_CHANGE_OWN_ROLE: 'Cannot change your own role',

  // Auth
  INVALID_CREDENTIALS: 'Invalid credentials',
  NOT_AUTHORIZED: 'Not authorized to access this route',
  EMAIL_NOT_VERIFIED: 'Please verify your email first',
  INVALID_OTP: 'Invalid or expired OTP',
  INVALID_RESET_TOKEN: 'Invalid or expired reset token',
  OTP_SENT: 'OTP sent to email',
  PASSWORD_RESET_SENT: 'Password reset link sent to email',
  PASSWORD_UPDATED: 'Password updated successfully',
  LOGGED_OUT: 'Logged out successfully',
  SAME_PASSWORD: 'New password must be different from the current password',
  INCORRECT_CURRENT_PASSWORD: 'Incorrect current password',
  FORCE_PASSWORD_CHANGE: 'You must change your password.',
  INVALID_TOKEN: 'Invalid token. Please log in again.',
  TOKEN_EXPIRED: 'Your token has expired. Please refresh.',

  // Order
  ORDER_NOT_FOUND: 'Order not found',
  CART_EMPTY: 'Cart is empty',
  CANNOT_CANCEL_ORDER: 'You cannot cancel an order that is already processing or shipped',

  // Cart
  CART_NOT_FOUND: 'Cart not found',
  ITEM_NOT_IN_CART: 'Item not in cart',
  NOT_ENOUGH_STOCK: 'Not enough stock',
  INVALID_COUPON: 'Invalid coupon code',
  COUPON_EXPIRED: 'This coupon has expired',
  COUPON_LIMIT_REACHED: 'This coupon has reached its usage limit',

  // Wishlist
  WISHLIST_NOT_FOUND: 'Wishlist not found',

  // Reviews
  REVIEW_NOT_FOUND: 'Review not found',
  NOT_AUTHORIZED_REVIEW: 'Not authorized to delete this review',
};
