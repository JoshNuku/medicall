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

  let statusCode = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500);
  let clientMessage = err.message || 'An error occurred';

  // Handle PostgreSQL specific error codes gracefully
  if (err.code === '23505' || err.message?.includes('duplicate key value') || err.message?.includes('unique constraint')) {
    statusCode = 409;
    if (err.message?.includes('phone_number')) {
      clientMessage = 'A patient with this phone number is already registered in MediCall.';
    } else {
      clientMessage = 'A record with this unique information already exists.';
    }
  } else if (err.code === '23503' || err.message?.includes('violates foreign key constraint')) {
    statusCode = 400;
    clientMessage = 'The referenced patient or template record could not be found.';
  } else if (err.code === '22P02') {
    statusCode = 400;
    clientMessage = 'Invalid identifier or numerical input provided.';
  } else if (statusCode >= 500 && !err.isExplicit) {
    clientMessage = 'An internal server error occurred. Please try again.';
  }

  res.status(statusCode).json({
    error: clientMessage,
    code: err.code || (statusCode === 409 ? 'DUPLICATE_ENTRY' : (statusCode === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR')),
    status: statusCode
  });
};

module.exports = errorHandler;
