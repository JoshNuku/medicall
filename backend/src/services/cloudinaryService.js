const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure Cloudinary from environment variables
const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log(`☁️  [Cloudinary]: Configured for cloud "${process.env.CLOUDINARY_CLOUD_NAME}"`);
} else {
  console.warn('⚠️  [Cloudinary]: Missing configuration. Audio files will fall back to local disk storage.');
}

/**
 * Upload an audio file or Buffer to Cloudinary CDN
 * @param {string|Buffer} source - Local file path or audio Buffer
 * @param {object} options - Custom options (filename, folder, public_id)
 * @returns {Promise<string>} - Permanent secure HTTPS URL from Cloudinary (or local fallback URL)
 */
const uploadAudio = async (source, options = {}) => {
  const folder = options.folder || 'medicall/audio';
  const publicId = options.publicId || (options.filename ? path.parse(options.filename).name : undefined);

  if (!isConfigured) {
    if (typeof source === 'string' && source.includes('public/audio')) {
      const filename = path.basename(source);
      return `/audio/${filename}`;
    }
    return options.fallbackUrl || null;
  }

  try {
    if (Buffer.isBuffer(source)) {
      // Upload memory buffer via stream
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video', // Cloudinary handles audio files under video resource_type
            folder,
            public_id: publicId,
            overwrite: true,
          },
          (err, result) => {
            if (err) return reject(err);
            console.log(`☁️  [Cloudinary]: Buffer uploaded successfully -> ${result.secure_url}`);
            resolve(result.secure_url);
          }
        );
        uploadStream.end(source);
      });
    }

    if (typeof source === 'string' && fs.existsSync(source)) {
      // Upload local file from disk
      const result = await cloudinary.uploader.upload(source, {
        resource_type: 'video',
        folder,
        public_id: publicId,
        overwrite: true,
      });
      console.log(`☁️  [Cloudinary]: File "${path.basename(source)}" uploaded -> ${result.secure_url}`);
      return result.secure_url;
    }

    // If source is already a remote URL, return as-is
    if (typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://'))) {
      return source;
    }

    throw new Error(`Invalid audio source provided to Cloudinary uploader`);
  } catch (err) {
    console.error(`❌ [Cloudinary Upload Error]:`, err.message);
    // Return fallback URL if provided, otherwise rethrow
    if (options.fallbackUrl) return options.fallbackUrl;
    if (typeof source === 'string' && fs.existsSync(source)) {
      return `/audio/${path.basename(source)}`;
    }
    throw err;
  }
};

let cachedAudioMap = null;
function getAudioMap() {
  if (!cachedAudioMap) {
    try {
      const mapPath = path.join(__dirname, '../config/cloudinaryAudioMap.json');
      if (fs.existsSync(mapPath)) {
        cachedAudioMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      } else {
        cachedAudioMap = {};
      }
    } catch (_) {
      cachedAudioMap = {};
    }
  }
  return cachedAudioMap;
}

/**
 * Resolves an audio path or filename to its Cloudinary CDN URL if available.
 * Guarantees that production telephony and clients stream permanent CDN audio.
 * @param {string} audioPathOrName - e.g. "/audio/default-reminder.mp3" or "default-reminder.mp3"
 * @param {string} fallbackBaseUrl - e.g. "https://api.medicall.care"
 * @returns {string} - Cloudinary HTTPS URL or fallback URL
 */
function getCloudinaryAudioUrl(audioPathOrName, fallbackBaseUrl = '') {
  if (!audioPathOrName) return null;
  if (audioPathOrName.startsWith('http://') || audioPathOrName.startsWith('https://')) {
    return audioPathOrName;
  }

  const map = getAudioMap();
  const normalizedKey = audioPathOrName.startsWith('/') ? audioPathOrName : `/audio/${audioPathOrName}`;
  const baseKey = path.basename(audioPathOrName);

  if (map[normalizedKey]) return map[normalizedKey];
  if (map[baseKey]) return map[baseKey];

  return fallbackBaseUrl ? `${fallbackBaseUrl.replace(/\/$/, '')}${normalizedKey}` : normalizedKey;
}

module.exports = {
  isConfigured,
  uploadAudio,
  getCloudinaryAudioUrl,
  getAudioMap,
  cloudinary,
};

