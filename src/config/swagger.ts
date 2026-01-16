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
          description: 'Enter JWT token in the format: Bearer {token}',
        },
      },
      schemas: {
        // Schema for the user object returned on successful login
        AuthUser: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            name: {
              type: 'string',
            },
            role: {
              type: 'string',
              enum: ['admin', 'cliente'],
            },
            tenantName: {
              type: 'string',
            },
          },
        },
        // Schema for a Tenant object
        Tenant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The unique identifier for the tenant.',
            },
            name: {
              type: 'string',
              description: 'The name of the tenant.',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'The timestamp when the tenant was created.',
            },
          },
        },
        // Schema for a User object (Admin view)
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The unique identifier for the user.',
            },
            name: {
              type: 'string',
              description: 'The full name of the user.',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'The email address of the user.',
            },
            role: {
              type: 'string',
              enum: ['admin', 'cliente'],
              description: 'The role of the user.',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'The timestamp when the user was created.',
            },
            tenant_id: {
              type: 'string',
              format: 'uuid',
              description: 'The ID of the tenant the user belongs to.',
            },
            tenant_name: {
              type: 'string',
              description: 'The name of the tenant the user belongs to.',
            },
          },
        },
        // Schema for a Blocked Domain entry (tenant-specific view)
        BlockedDomain: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The unique identifier for the blocked domain entry.',
            },
            domain: {
              type: 'string',
              description: 'The domain name that is blocked.',
            },
            blockedAt: {
              type: 'string',
              format: 'date-time',
              description: 'The timestamp when the domain was blocked.',
            },
            tenant_id: {
              type: 'string',
              format: 'uuid',
              description: 'The ID of the tenant to whom this rule belongs.',
            },
          },
        },
        // Schema for a Blocked Domain entry (admin view)
        AdminBlockedDomain: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The unique identifier for the blocked domain entry.',
            },
            domain: {
              type: 'string',
              description: 'The domain name that is blocked.',
            },
            blockedAt: {
              type: 'string',
              format: 'date-time',
              description: 'The timestamp when the domain was blocked.',
            },
            tenant_id: {
              type: 'string',
              format: 'uuid',
              description: 'The ID of the tenant to whom this rule belongs.',
            },
            tenant_name: {
              type: 'string',
              description: 'The name of the tenant.',
            },
          },
        },
        // Schema for a Zabbix Host
        ZabbixHost: {
          type: 'object',
          properties: {
            hostid: {
              type: 'string',
              description: 'The unique ID of the host in Zabbix.',
            },
            name: {
              type: 'string',
              description: 'The visible name of the host.',
            },
            status: {
              type: 'string',
              description: 'The status of the host (0 - monitored, 1 - not monitored).',
            },
            description: {
              type: 'string',
              description: 'Description of the host.',
            },
          },
          example: {
            hostid: '10580',
            name: 'router-ny-01',
            status: '0',
            description: 'Core router for New York datacenter',
          },
        },
        // Schema for a Zabbix Alert (Problem)
        ZabbixAlert: {
          type: 'object',
          properties: {
            eventid: {
              type: 'string',
              description: 'The unique ID of the alert event in Zabbix.',
            },
            name: {
              type: 'string',
              description: 'The description of the alert.',
            },
            severity: {
              type: 'string',
              description: "Severity level of the alert (e.g., '4' for High, '5' for Disaster).",
            },
            acknowledged: {
              type: 'string',
              description: 'Whether the alert has been acknowledged (0 - no, 1 - yes).',
            },
            clock: {
              type: 'string',
              description: 'Timestamp of when the alert occurred.',
            },
            hosts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  hostid: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              description: 'List of hosts associated with this alert.',
            },
          },
          example: {
            eventid: '48123',
            name: 'Server server-lon-db-01 is unreachable',
            severity: '5',
            acknowledged: '0',
            clock: '1678886400',
            hosts: [{ hostid: '10581', name: 'server-lon-db-01' }],
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
