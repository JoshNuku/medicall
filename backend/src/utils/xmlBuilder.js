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
  const plays = [];
  if (Array.isArray(playUrls) && playUrls.length > 0) {
    for (const u of playUrls) {
      if (u) plays.push(`  <Play url="${escapeXml(u)}"/>`);
    }
  } else if (playUrl) {
    plays.push(`  <Play url="${escapeXml(playUrl)}"/>`);
  }

  const say = sayText ? `    <Say>${escapeXml(sayText)}</Say>\n` : '';
  const finishAttr = finishOnKey ? ` finishOnKey="${escapeXml(finishOnKey)}"` : '';
  const getDigitsTag = `  <GetDigits numDigits="${numDigits}" timeout="${timeout}"${finishAttr} callbackUrl="${escapeXml(callbackUrl)}">\n${say}  </GetDigits>`;

  if (plays.length > 0) {
    return `${plays.join('\n')}\n${getDigitsTag}`;
  }
  return getDigitsTag;
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
