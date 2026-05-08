import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My Backend API',
      version: '1.0.0',
      description: 'API docs generated with swagger-jsdoc'
    }
  ,
    components: {
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            deleted: { type: 'boolean' },
            updatedAt: { type: 'number' }
          }
        }
        ,
        DeviceToken: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            token: { type: 'string', description: 'FCM device token (Firebase Cloud Messaging). Not an auth JWT.' },
            platform: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    ,
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  // Look for JSDoc comments in API route files
  apis: [
    './src/app/api/**/*.js',
    './src/app/api/**/*.ts'
  ]
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
