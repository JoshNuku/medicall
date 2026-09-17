require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Sends a chat completion request to the Groq API endpoint.
 */
const sendChatCompletion = async ({ model, messages, tools = [], temperature = 0.2 }) => {
  if (!GROQ_API_KEY) {
    console.warn('[GroqClient] GROQ_API_KEY is not configured in .env');
    return null;
  }

  const payload = {
    model,
    messages,
    temperature
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = 'auto';
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API Error (${response.status}): ${errorText}`);
  }

  return response.json();
};

module.exports = {
  sendChatCompletion
};
