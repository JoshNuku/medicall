const AfricasTalking = require('africastalking');
require('dotenv').config();

const apiKey = process.env.AT_API_KEY;
const username = process.env.AT_USERNAME || 'sandbox';

let voiceClient = null;
let smsClient = null;

if (apiKey && apiKey !== 'your_africastalking_api_key') {
  try {
    const at = AfricasTalking({ apiKey, username });
    voiceClient = at.VOICE;
    smsClient = at.SMS;
  } catch (err) {
    console.error("[Africa's Talking] Initialization error:", err.message);
  }
}

/**
 * Triggers an outbound phone call via Africa's Talking Voice API.
 */
const makeOutboundCall = async (toPhoneNumber, fromPhoneNumber = process.env.AT_VOICE_PHONE_NUMBER) => {
  if (!voiceClient) {
    console.warn("[Africa's Talking] Voice client not initialized. Check AT_API_KEY.");
    return { status: 'skipped', message: 'API key not configured' };
  }

  try {
    const response = await voiceClient.call({
      callFrom: fromPhoneNumber,
      callTo: Array.isArray(toPhoneNumber) ? toPhoneNumber : [toPhoneNumber]
    });
    return { status: 'success', data: response };
  } catch (err) {
    console.error("[Africa's Talking] Outbound call error:", err.message);
    return { status: 'failed', error: err.message };
  }
};

/**
 * Sends an SMS message via Africa's Talking SMS API.
 */
const sendSms = async (toPhoneNumber, message, from = process.env.AT_SMS_SENDER_ID || null) => {
  if (!smsClient) {
    console.warn("[Africa's Talking] SMS client not initialized. Check AT_API_KEY.");
    return { status: 'skipped', message: 'API key not configured' };
  }

  try {
    const payload = {
      to: Array.isArray(toPhoneNumber) ? toPhoneNumber : [toPhoneNumber],
      message
    };
    if (from) payload.from = from;

    const response = await smsClient.send(payload);
    return { status: 'success', data: response };
  } catch (err) {
    console.error("[Africa's Talking] SMS send error:", err.message);
    return { status: 'failed', error: err.message };
  }
};

module.exports = {
  makeOutboundCall,
  sendSms
};
