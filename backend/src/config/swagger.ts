import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NOC AI Backend API',
      version: '1.0.0',
      description:
        'This is the official API documentation for the NOC AI backend service. ' +
        'It provides endpoints for authentication, DNS blocklist management, and Zabbix integration.',
      contact: {
        name: 'API Support',
        email: 'dev@noc.ai',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001',
        description: 'Main API Server',
      },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter JWT token in the format: Bearer {token}'
            }
        }
    },
    security: [{
        bearerAuth: []
    }]
  },
  // Path to the API docs
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
