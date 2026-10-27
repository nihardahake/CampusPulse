// CampusPulse configures Cloudinary from CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.
// The SDK automatically parses CLOUDINARY_URL during import; malformed values
// throw before the API can start. Ignore that alternate form and use our fields.
if (process.env.CLOUDINARY_URL) {
  console.warn('Ignoring CLOUDINARY_URL; configure Cloudinary with CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.');
  delete process.env.CLOUDINARY_URL;
}

const { v2: cloudinary } = require('cloudinary');

/**
 * Configure Cloudinary with credentials from environment variables.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
