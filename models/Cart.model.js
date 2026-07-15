const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  coupon: {
    code: { type: String, uppercase: true },
    discountType: { type: String, enum: ['percentage', 'fixed'] },
    discountValue: { type: Number }
  }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Indexes
cartSchema.index({ user: 1 });

// Virtuals for calculations
cartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
});

cartSchema.virtual('discountAmount').get(function () {
  if (!this.coupon || !this.coupon.code) return 0;
  const subtotal = this.subtotal;
  if (this.coupon.discountType === 'percentage') {
    const discount = (subtotal * this.coupon.discountValue) / 100;
    return Math.min(discount, subtotal);
  }
  return Math.min(this.coupon.discountValue, subtotal);
});

cartSchema.virtual('total').get(function () {
  const finalTotal = this.subtotal - this.discountAmount;
  return finalTotal > 0 ? finalTotal : 0;
});

cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((acc, item) => acc + item.quantity, 0);
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
