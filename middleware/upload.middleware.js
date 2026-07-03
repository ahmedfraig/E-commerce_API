const multer = require('multer');
const path = require('path');

// Configure storage (using memory storage if we are going to upload straight to cloudinary)
// Or we can use disk storage temporarily. Memory storage is usually preferred for direct cloud uploads.
const storage = multer.diskStorage({
  // use temp dir or memory. For simplicity, we use memory storage if using cloudinary uploader stream, or disk and then remove.
  // Actually, let's just use diskStorage temporarily
  destination: function (req, file, cb) {
    // Make sure 'uploads' folder exists or use OS temp dir
    cb(null, require('os').tmpdir()); 
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;
