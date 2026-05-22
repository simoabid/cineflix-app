import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CineFlix API',
            version: '1.0.0',
            description: 'CineFlix streaming platform REST API — authentication, watchlists, collections, preferences, and TMDB proxy.',
            contact: {
                name: 'CineFlix Team',
            },
        },
        servers: [
            {
                url: '/api',
                description: 'API base path',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'auth_token',
                    description: 'HttpOnly cookie set by /auth/login or /auth/register',
                },
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string' },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                        avatar: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
export default swaggerSpec;
