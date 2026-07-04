const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, { timestamps: true });

// Pre-find hook to auto-populate products
wishlistSchema.pre(/^find/, function () {
  this.populate('products', 'name price images discountPrice slug');
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);
module.exports = Wishlist;