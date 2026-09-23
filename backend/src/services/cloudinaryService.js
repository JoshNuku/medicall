const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary from environment variables
const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  console.log(`☁️ [CLOUDINARY]: Configured successfully for cloud "${process.env.CLOUDINARY_CLOUD_NAME}"`);
} else {
  console.warn('⚠️ [CLOUDINARY]: Credentials missing. Audio files will be served locally.');
}

/**
 * Upload an audio file from local disk to Cloudinary
 * @param {string} localFilePath - Path to local audio file
 * @param {object} options - Custom upload options (folder, public_id, tags)
 * @returns {Promise<string|null>} - Returns secure HTTPS URL on success, null on failure
 */
const uploadAudioFile = async (localFilePath, options = {}) => {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  try {
    const defaultPublicId = path.basename(localFilePath, path.extname(localFilePath));
    const uploadOptions = {
      resource_type: 'video', // Cloudinary handles audio files under 'video' resource type
      folder: options.folder || 'medicall/audio',
      public_id: options.public_id || defaultPublicId,
      overwrite: true,
      format: options.format || 'mp3',
      ...options
    };

    const result = await cloudinary.uploader.upload(localFilePath, uploadOptions);
    console.log(`☁️ [CLOUDINARY]: Audio uploaded successfully -> ${result.secure_url}`);
    return result.secure_url;
  } catch (err) {
    console.error(`⚠️ [CLOUDINARY]: Upload failed for ${localFilePath}:`, err.message);
    return null;
  }
};

/**
 * Upload an in-memory audio buffer directly to Cloudinary
 * @param {Buffer} buffer - Audio file buffer
 * @param {object} options - Custom upload options (folder, public_id)
 * @returns {Promise<string|null>} - Returns secure HTTPS URL on success, null on failure
 */
const uploadAudioBuffer = async (buffer, options = {}) => {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const uploadOptions = {
        resource_type: 'video',
        folder: options.folder || 'medicall/audio',
        format: options.format || 'mp3',
        public_id: options.public_id || `audio_${Date.now()}`,
        overwrite: true,
        ...options
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('⚠️ [CLOUDINARY]: Buffer upload error:', error.message);
            return resolve(null);
          }
          console.log(`☁️ [CLOUDINARY]: Audio buffer uploaded successfully -> ${result.secure_url}`);
          return resolve(result.secure_url);
        }
      );

      uploadStream.end(buffer);
    } catch (err) {
      console.error('⚠️ [CLOUDINARY]: Stream upload exception:', err.message);
      resolve(null);
    }
  });
};

const CLOUDINARY_STATIC_AUDIO = {
  twi_confirmed: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186027/medicall/audio/static/twi_confirmed.mp3',
  en_confirmed: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186029/medicall/audio/static/en_confirmed.mp3',
  twi_not_taken_ack: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790166961/medicall/audio/static/twi_not_taken_ack.mp3',
  twi_diagnostic_reason: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790166963/medicall/audio/static/twi_diagnostic_reason.mp3',
  english_diagnostic_reason: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790166970/medicall/audio/static/english_diagnostic_reason.mp3',
  twi_diagnostic_ack: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186037/medicall/audio/static/twi_diagnostic_ack.mp3',
  en_diagnostic_ack: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186038/medicall/audio/static/en_diagnostic_ack.mp3',
  twi_inbound_intro: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790166971/medicall/audio/static/twi_inbound_intro.mp3',
  twi_outbound_reminder: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790166974/medicall/audio/static/twi_outbound_reminder.mp3',
  default_reminder: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186043/medicall/audio/static/default_reminder.mp3',
  default_reminder_en: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186045/medicall/audio/static/default_reminder_en.mp3',
  twi_cost_barrier: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186047/medicall/audio/static/twi_cost_barrier.mp3',
  en_cost_barrier: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186048/medicall/audio/static/en_cost_barrier.mp3',
  twi_side_effects: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186049/medicall/audio/static/twi_side_effects.mp3',
  en_side_effects: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186051/medicall/audio/static/en_side_effects.mp3',
  twi_forgot: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186052/medicall/audio/static/twi_forgot.mp3',
  en_forgot: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186053/medicall/audio/static/en_forgot.mp3',
  twi_early_reminder: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186054/medicall/audio/static/twi_early_reminder.mp3',
  en_early_reminder: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186056/medicall/audio/static/en_early_reminder.mp3',
  twi_pharmacist_alert: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186057/medicall/audio/static/twi_pharmacist_alert.mp3',
  en_pharmacist_alert: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186059/medicall/audio/static/en_pharmacist_alert.mp3',
  twi_invalid_key: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186060/medicall/audio/static/twi_invalid_key.mp3',
  en_invalid_key: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186061/medicall/audio/static/en_invalid_key.mp3',
  metformin_en: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186062/medicall/audio/static/metformin_en.mp3',
  lisinopril_en: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790186064/medicall/audio/static/lisinopril_en.mp3'
};

const getStaticAudioUrl = (key, fallbackPath, baseUrl) => {
  if (CLOUDINARY_STATIC_AUDIO[key]) return CLOUDINARY_STATIC_AUDIO[key];
  const cleanKey = key ? key.replace(/-/g, '_') : '';
  if (CLOUDINARY_STATIC_AUDIO[cleanKey]) return CLOUDINARY_STATIC_AUDIO[cleanKey];
  if (!fallbackPath) return null;
  if (fallbackPath.startsWith('http')) return fallbackPath;
  return baseUrl ? `${baseUrl}${fallbackPath.startsWith('/') ? '' : '/'}${fallbackPath}` : fallbackPath;
};

module.exports = {
  isCloudinaryConfigured,
  uploadAudioFile,
  uploadAudioBuffer,
  CLOUDINARY_STATIC_AUDIO,
  getStaticAudioUrl
};
