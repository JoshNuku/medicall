const escapeXml = (unsafe) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const buildVoiceResponse = (childrenXml) => {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${childrenXml}\n</Response>`;
};

const buildGetDigits = ({ numDigits = 1, timeout = 10, finishOnKey = null, callbackUrl, playUrl, playUrls, sayText }) => {
  const parts = [];
  if (Array.isArray(playUrls) && playUrls.length > 0) {
    for (const u of playUrls) {
      if (u) parts.push(`    <Play url="${escapeXml(u)}"/>`);
    }
  } else if (playUrl) {
    parts.push(`    <Play url="${escapeXml(playUrl)}"/>`);
  }
  if (sayText) {
    parts.push(`    <Say>${escapeXml(sayText)}</Say>`);
  }

  const finishAttr = finishOnKey ? ` finishOnKey="${escapeXml(finishOnKey)}"` : '';
  return `  <GetDigits numDigits="${numDigits}" timeout="${timeout}"${finishAttr} callbackUrl="${escapeXml(callbackUrl)}">\n${parts.join('\n')}\n  </GetDigits>`;
};

const buildPlay = (url) => {
  return `  <Play url="${escapeXml(url)}"/>`;
};

const buildSay = (text) => {
  return `  <Say>${escapeXml(text)}</Say>`;
};

module.exports = {
  escapeXml,
  buildVoiceResponse,
  buildGetDigits,
  buildPlay,
  buildSay
};
