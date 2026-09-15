const swaggerJsdoc = require('swagger-jsdoc');
const schemas = require('./swaggerSchemas');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MediCall Adherence API',
      version: '1.0.0',
      description: 'Voice-call medication adherence backend system for Ghana with verified Twi instructions, Africa\'s Talking Voice/SMS integration, and Khaya AI TTS.'
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3000',
        description: 'Current Environment Server'
      }
    ],
    components: {
      schemas
    }
  },
  apis: [
    './src/routes/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
