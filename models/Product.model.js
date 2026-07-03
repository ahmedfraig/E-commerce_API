const mongoose = require('mongoose');
const slugify = require('slugify');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true
  }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 200
  },
  slug: {
    type: String
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 500
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number,
    default: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  sku: {
    type: String
  },
  images: {
    type: [{
      public_id: { type: String, required: true },
      url: { type: String, required: true }
    }],
    validate: [v => v.length > 0, 'At least one image is required']
  },
  category: {
    type: String,
    required: true,
    lowercase: true
  },
  subcategory: {
    type: String
  },
  brand: {
    type: String
  },
  tags: [{
    type: String
  }],
  reviews: [reviewSchema],
  averageRating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Indexes
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1, brand: 1, price: 1, averageRating: -1, createdAt: -1 });

// Pre-save hook for slug
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Method to calculate average rating
productSchema.methods.calcAverageRating = function () {
  if (this.reviews.length === 0) {
    this.averageRating = 0;
    this.numReviews = 0;
  } else {
    const sum = this.reviews.reduce((acc, item) => item.rating + acc, 0);
    this.averageRating = sum / this.reviews.length;
    this.numReviews = this.reviews.length;
  }
};

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
