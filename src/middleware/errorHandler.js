const { buildVoiceResponse, buildSay } = require('../utils/xmlBuilder');

const errorHandler = (err, req, res, next) => {
  // Safe logging without leaking sensitive patient data
  console.error(`[Error] ${req.method} ${req.path}:`, err.message || err);

  // If error occurs on a voice webhook route, always return valid AT XML
  if (req.path.startsWith('/voice')) {
    const fallbackXml = buildVoiceResponse(
      buildSay('We are experiencing technical difficulties. Please try again later. Goodbye.')
    );
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(fallbackXml);
  }

  const statusCode = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500);
  const clientMessage = statusCode >= 500 ? 'An internal server error occurred.' : (err.message || 'Bad Request');

  res.status(statusCode).json({
    error: clientMessage,
    status: statusCode
  });
};

module.exports = errorHandler;
