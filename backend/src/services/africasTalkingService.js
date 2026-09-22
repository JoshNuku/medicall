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

const normalizePhoneNumber = (phone) => {
  if (!phone) return phone;
  let cleaned = String(phone).replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+2330')) {
    cleaned = '+233' + cleaned.slice(5);
  } else if (cleaned.startsWith('2330')) {
    cleaned = '+233' + cleaned.slice(4);
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '+233' + cleaned.slice(1);
  } else if (cleaned.startsWith('233') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
};

/**
 * Triggers an outbound phone call via Africa's Talking Voice API.
 */
const makeOutboundCall = async (toPhoneNumber, fromPhoneNumber = process.env.AT_VOICE_PHONE_NUMBER, retries = 3) => {
  if (!voiceClient) {
    console.warn("[Africa's Talking] Voice client not initialized. Check AT_API_KEY.");
    return { status: 'skipped', message: 'API key not configured' };
  }

  const cleanDestination = Array.isArray(toPhoneNumber)
    ? toPhoneNumber.map(normalizePhoneNumber)
    : [normalizePhoneNumber(toPhoneNumber)];

  console.log(`📞 [Africa's Talking] Initiating outbound call to: ${cleanDestination.join(', ')}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await voiceClient.call({
        callFrom: fromPhoneNumber,
        callTo: cleanDestination
      });
      const firstEntry = response?.entries?.[0];
      console.log(`✓ [Africa's Talking] Call dispatched:`, JSON.stringify(firstEntry || response));
      return { status: 'success', data: response, entry: firstEntry };
    } catch (err) {
      const errDetail = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      console.error(`[Africa's Talking] Outbound call attempt ${attempt}/${retries} failed:`, errDetail);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        return { status: 'failed', error: errDetail };
      }
    }
  }
};

/**
 * Sends an SMS message via Africa's Talking SMS API.
 */
const sendSms = async (toPhoneNumber, message, from = null) => {
  if (!smsClient) {
    console.warn("[Africa's Talking] SMS client not initialized. Check AT_API_KEY.");
    return { status: 'skipped', message: 'API key not configured' };
  }

  try {
    const cleanTo = Array.isArray(toPhoneNumber)
      ? toPhoneNumber.map(normalizePhoneNumber)
      : [normalizePhoneNumber(toPhoneNumber)];

    const payload = {
      to: cleanTo,
      message
    };
    if (from) payload.from = from;

    let response = await smsClient.send(payload);

    // Auto-fallback if a custom senderId is unapproved/invalid
    if (response?.SMSMessageData?.Message === 'InvalidSenderId' && from) {
      console.warn(`[Africa's Talking] Sender ID '${from}' is unapproved. Retrying with default sender...`);
      delete payload.from;
      response = await smsClient.send(payload);
    }

    const recipient = response?.SMSMessageData?.Recipients?.[0];
    const isSuccess = recipient?.status === 'Success';

    return {
      status: isSuccess ? 'success' : 'failed',
      data: response,
      messageId: recipient?.messageId,
      cost: recipient?.cost
    };
  } catch (err) {
    console.error("[Africa's Talking] SMS send error:", err.message);
    return { status: 'failed', error: err.message };
  }
};

module.exports = {
  makeOutboundCall,
  sendSms
};
