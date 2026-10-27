const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

/* ---------- Multer configuration ---------- */

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

const storage = multer.memoryStorage();

/**
 * Only accept jpeg, png, and webp images.
 */
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

/**
 * Single-file upload middleware expecting a field named "image".
 */
const uploadImage = upload.single('image');

/* ---------- Cloudinary upload helper ---------- */

/**
 * Upload an image buffer to Cloudinary.
 *
 * @param {Buffer} fileBuffer - Raw file bytes (from multer memoryStorage)
 * @returns {Promise<string|null>} Cloudinary secure_url on success, null on failure
 */
const uploadToCloudinary = async (fileBuffer) => {
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'campuspulse/tickets', resource_type: 'image' },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      );
      stream.end(fileBuffer);
    });

    return result.secure_url;
  } catch (err) {
    // Log but don't crash – the ticket can still be created without an image
    console.error('Cloudinary upload failed:', err.message);
    return null;
  }
};

module.exports = { upload, uploadImage, uploadToCloudinary };
