/**
 * Swagger/OpenAPI Configuration
 * API Documentation for Kural Election Campaign Management System
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kural Election Campaign Management API',
      version: '1.0.0',
      description: `
API for Tamil Nadu Assembly Constituency (AC 101-126) election campaign management.

## Authentication
This API uses session-based authentication with HTTP-only cookies.
- Login via \`POST /api/auth/login\` to establish a session
- The session cookie is automatically sent with subsequent requests
- Sessions expire after 24 hours of inactivity

## Role Hierarchy (5-Tier RBAC)
| Role | Description | AC Access |
|------|-------------|-----------|
| L0 | Super Admin | All ACs |
| L1 (ACIM) | AC In-charge Manager | Multiple ACs |
| L2 (ACI) | AC In-charge | Single AC |
| MLA | MLA Dashboard | Single AC |
| BoothAgent | Field Agent | Assigned booths |

## Important Notes
- L1/L2/MLA users have \`assignedAC\` field limiting data access
- Voter data is sharded by AC (voters_101, voters_102, etc.)
- All delete operations are soft deletes (deleted: true)
      `,
      contact: {
        name: 'Kural Support',
        email: 'support@kuralapp.com'
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server'
      },
      {
        url: 'https://api.kuralapp.in',
        description: 'Production server'
      }
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management (RBAC)' },
      { name: 'Dashboard', description: 'Dashboard statistics and analytics' },
      { name: 'Voters', description: 'Voter data management' },
      { name: 'Booths', description: 'Booth management' },
      { name: 'Surveys', description: 'Survey management' },
      { name: 'Survey Responses', description: 'Survey response data' },
      { name: 'Families', description: 'Family grouping' },
      { name: 'Reports', description: 'Report generation' },
      { name: 'MLA Dashboard', description: 'MLA-specific analytics' },
      { name: 'Master Data', description: 'Master data configuration' },
      { name: 'Mobile App', description: 'Mobile application endpoints' },
      { name: 'Health', description: 'Health check endpoints' }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'kural.sid',
          description: 'Session cookie set after successful login'
        }
      },
      schemas: {
        // Common response schemas
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            error: { type: 'string', description: 'Detailed error (dev only)' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 50 },
            total: { type: 'integer', example: 1000 },
            totalPages: { type: 'integer', example: 20 }
          }
        },

        // User schemas
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'objectId' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', example: '9999999001' },
            role: { type: 'string', enum: ['L0', 'L1', 'L2', 'MLA', 'BoothAgent'] },
            assignedAC: { type: 'integer', example: 119, nullable: true },
            isActive: { type: 'boolean', default: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        UserCreate: {
          type: 'object',
          required: ['name', 'role', 'password'],
          properties: {
            name: { type: 'string', minLength: 2 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            password: { type: 'string', minLength: 6 },
            role: { type: 'string', enum: ['L0', 'L1', 'L2', 'MLA', 'BoothAgent'] },
            assignedAC: { type: 'integer', description: 'Required for L1/L2/MLA roles' }
          }
        },

        // Login schemas
        LoginRequest: {
          type: 'object',
          required: ['identifier', 'password'],
          properties: {
            identifier: { type: 'string', description: 'Email or phone number' },
            password: { type: 'string' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/UserSession' }
          }
        },
        UserSession: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string' },
            assignedAC: { type: 'integer', nullable: true },
            aciName: { type: 'string', nullable: true }
          }
        },

        // Voter schemas
        Voter: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'objectId' },
            voterID: { type: 'string', example: 'ABC1234567' },
            name: { type: 'string' },
            fatherHusbandName: { type: 'string' },
            age: { type: 'integer' },
            gender: { type: 'string', enum: ['M', 'F', 'O'] },
            address: { type: 'string' },
            acId: { type: 'integer', example: 119 },
            boothNo: { type: 'integer' },
            slNo: { type: 'integer' },
            surveyed: { type: 'boolean' },
            deleted: { type: 'boolean' }
          }
        },

        // Booth schemas
        Booth: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'objectId' },
            boothNo: { type: 'integer', example: 1 },
            acId: { type: 'integer', example: 119 },
            boothName: { type: 'string' },
            location: { type: 'string' },
            totalVoters: { type: 'integer' },
            assignedAgents: {
              type: 'array',
              items: { type: 'string', format: 'objectId' }
            }
          }
        },

        // Survey schemas
        Survey: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'objectId' },
            title: { type: 'string' },
            description: { type: 'string' },
            acId: { type: 'integer' },
            questions: {
              type: 'array',
              items: { $ref: '#/components/schemas/SurveyQuestion' }
            },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        SurveyQuestion: {
          type: 'object',
          properties: {
            questionId: { type: 'string' },
            questionText: { type: 'string' },
            questionType: { type: 'string', enum: ['text', 'single', 'multiple', 'rating'] },
            options: { type: 'array', items: { type: 'string' } },
            required: { type: 'boolean' }
          }
        },

        // Dashboard schemas
        DashboardStats: {
          type: 'object',
          properties: {
            totalVoters: { type: 'integer' },
            surveyedVoters: { type: 'integer' },
            totalBooths: { type: 'integer' },
            completedBooths: { type: 'integer' },
            totalAgents: { type: 'integer' },
            activeAgents: { type: 'integer' },
            surveyProgress: { type: 'number', format: 'float' }
          }
        },

        // MLA Dashboard schemas
        ElectionResult: {
          type: 'object',
          properties: {
            acId: { type: 'integer' },
            boothNo: { type: 'integer' },
            year: { type: 'integer' },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  partyCode: { type: 'string' },
                  votes: { type: 'integer' },
                  voteShare: { type: 'number' }
                }
              }
            }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: 'Not authenticated - login required',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Not authenticated' }
                }
              }
            }
          }
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Access denied' }
                }
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Resource not found' }
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    security: [{ sessionAuth: [] }],
    // Inline path definitions for core endpoints
    paths: {
      // Auth endpoints
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'User login',
          description: 'Authenticate user with email/phone and password. Sets session cookie on success.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' }
              }
            }
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/LoginResponse' }
                }
              },
              headers: {
                'Set-Cookie': {
                  description: 'Session cookie',
                  schema: { type: 'string' }
                }
              }
            },
            400: { description: 'Missing credentials' },
            401: { description: 'Invalid credentials' },
            429: { description: 'Too many login attempts' }
          }
        }
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'User logout',
          description: 'Destroy user session and clear cookie',
          responses: {
            200: { description: 'Logout successful' },
            500: { description: 'Failed to logout' }
          }
        }
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user',
          description: 'Returns the authenticated user from session',
          responses: {
            200: {
              description: 'User session data',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/LoginResponse' }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },

      // Health endpoint
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          security: [],
          responses: {
            200: {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      },

      // Dashboard endpoints
      '/api/dashboard/stats': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get dashboard statistics',
          description: 'Returns aggregated statistics for the dashboard. L1/L2/MLA users see only their assigned AC data.',
          parameters: [
            {
              name: 'acId',
              in: 'query',
              description: 'AC ID filter (L0 only)',
              schema: { type: 'integer' }
            }
          ],
          responses: {
            200: {
              description: 'Dashboard statistics',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DashboardStats' }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },

      // RBAC User endpoints
      '/api/rbac/users': {
        get: {
          tags: ['Users'],
          summary: 'List users',
          description: 'Get paginated list of users. L0 sees all, L1/L2 see users in their AC.',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'role', in: 'query', schema: { type: 'string' } },
            { name: 'acId', in: 'query', schema: { type: 'integer' } },
            { name: 'search', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            200: {
              description: 'User list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                      pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' }
          }
        },
        post: {
          tags: ['Users'],
          summary: 'Create user',
          description: 'Create a new user. Requires L0/L1 role.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserCreate' }
              }
            }
          },
          responses: {
            201: { description: 'User created' },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' }
          }
        }
      },
      '/api/rbac/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Get user by ID',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            200: {
              description: 'User details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' }
                }
              }
            },
            404: { $ref: '#/components/responses/NotFound' }
          }
        },
        put: {
          tags: ['Users'],
          summary: 'Update user',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserCreate' }
              }
            }
          },
          responses: {
            200: { description: 'User updated' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        },
        delete: {
          tags: ['Users'],
          summary: 'Delete user (soft delete)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'User deleted' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      },

      // Voter endpoints
      '/api/voters/{acId}': {
        get: {
          tags: ['Voters'],
          summary: 'Get voters by AC',
          description: 'Get paginated list of voters for an AC. Access restricted by user role.',
          parameters: [
            { name: 'acId', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'boothNo', in: 'query', schema: { type: 'integer' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'surveyed', in: 'query', schema: { type: 'boolean' } }
          ],
          responses: {
            200: {
              description: 'Voter list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      voters: { type: 'array', items: { $ref: '#/components/schemas/Voter' } },
                      pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' }
          }
        }
      },
      '/api/voters/{acId}/{voterId}': {
        get: {
          tags: ['Voters'],
          summary: 'Get voter by ID',
          parameters: [
            { name: 'acId', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'voterId', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            200: {
              description: 'Voter details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Voter' }
                }
              }
            },
            404: { $ref: '#/components/responses/NotFound' }
          }
        },
        put: {
          tags: ['Voters'],
          summary: 'Update voter',
          parameters: [
            { name: 'acId', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'voterId', in: 'path', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Voter' }
              }
            }
          },
          responses: {
            200: { description: 'Voter updated' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      },

      // Booth endpoints
      '/api/rbac/booths': {
        get: {
          tags: ['Booths'],
          summary: 'List booths',
          parameters: [
            { name: 'acId', in: 'query', schema: { type: 'integer' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
          ],
          responses: {
            200: {
              description: 'Booth list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      booths: { type: 'array', items: { $ref: '#/components/schemas/Booth' } },
                      pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                  }
                }
              }
            }
          }
        }
      },

      // Survey endpoints
      '/api/surveys': {
        get: {
          tags: ['Surveys'],
          summary: 'List surveys',
          parameters: [
            { name: 'acId', in: 'query', schema: { type: 'integer' } },
            { name: 'isActive', in: 'query', schema: { type: 'boolean' } }
          ],
          responses: {
            200: {
              description: 'Survey list',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Survey' }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Surveys'],
          summary: 'Create survey',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Survey' }
              }
            }
          },
          responses: {
            201: { description: 'Survey created' }
          }
        }
      },

      // Survey Response endpoints
      '/api/survey-responses': {
        get: {
          tags: ['Survey Responses'],
          summary: 'List survey responses',
          parameters: [
            { name: 'surveyId', in: 'query', schema: { type: 'string' } },
            { name: 'acId', in: 'query', schema: { type: 'integer' } },
            { name: 'boothNo', in: 'query', schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Survey response list' }
          }
        },
        post: {
          tags: ['Survey Responses'],
          summary: 'Submit survey response',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['surveyId', 'responses'],
                  properties: {
                    surveyId: { type: 'string' },
                    voterId: { type: 'string' },
                    responses: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Response submitted' }
          }
        }
      },

      // Report endpoints
      '/api/reports/generate': {
        post: {
          tags: ['Reports'],
          summary: 'Generate report',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reportType: { type: 'string', enum: ['survey', 'booth', 'voter', 'summary'] },
                    acId: { type: 'integer' },
                    boothNo: { type: 'integer' },
                    startDate: { type: 'string', format: 'date' },
                    endDate: { type: 'string', format: 'date' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Report generated' }
          }
        }
      },

      // MLA Dashboard endpoints
      '/api/mla-dashboard/overview': {
        get: {
          tags: ['MLA Dashboard'],
          summary: 'Get MLA dashboard overview',
          description: 'Returns election statistics and booth performance for MLA dashboard',
          parameters: [
            { name: 'acId', in: 'query', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: {
              description: 'MLA dashboard data',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      electionSummary: { type: 'object' },
                      boothPerformance: { type: 'array', items: { type: 'object' } },
                      partyComparison: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/mla-dashboard/booths': {
        get: {
          tags: ['MLA Dashboard'],
          summary: 'Get booth election results',
          parameters: [
            { name: 'acId', in: 'query', required: true, schema: { type: 'integer' } },
            { name: 'boothNo', in: 'query', schema: { type: 'integer' } }
          ],
          responses: {
            200: {
              description: 'Booth results',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ElectionResult' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: [] // We're defining paths inline above
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI middleware
 * @param {import('express').Application} app - Express app
 */
export function setupSwagger(app) {
  // Serve swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Kural API Documentation'
  }));

  // Serve raw OpenAPI spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('✓ Swagger API documentation available at /api-docs');
}

export { swaggerSpec };
