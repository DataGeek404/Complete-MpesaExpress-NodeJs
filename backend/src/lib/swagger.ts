export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'M-Pesa Daraja API Integration',
    description: `
## Overview
This API provides a complete integration with Safaricom's M-Pesa Daraja API, supporting:
- **STK Push** (Lipa Na M-Pesa Online) - Initiate customer payments
- **C2B** (Customer to Business) - Receive payments via paybill/till
- **B2C** (Business to Customer) - Send payments to customers

## Authentication
All API endpoints require authentication using an API key. Include your API key in the request headers:
\`\`\`
X-API-Key: your_api_key_here
\`\`\`
Or use Bearer token format:
\`\`\`
Authorization: Bearer your_api_key_here
\`\`\`

### Permissions
API keys can have the following permissions:
- \`read\` - View transactions and logs
- \`write\` - Create transactions
- \`stk_push\` - Initiate STK Push requests
- \`c2b\` - Manage C2B operations
- \`b2c\` - Initiate B2C payments
- \`admin\` - Full access including API key management
- \`*\` - All permissions

## Callbacks
Callback URLs must be publicly accessible HTTPS endpoints registered with Safaricom.

## Error Handling
All errors follow a consistent format:
\`\`\`json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
\`\`\`

## Rate Limiting
- Default: 1000 requests per hour per API key
- Rate limit headers are included in responses:
  - \`X-RateLimit-Remaining\`: Requests remaining
  - \`X-RateLimit-Reset\`: Reset timestamp

## WebSocket/SSE
Real-time updates are available via Server-Sent Events at \`/api/events\`
    `,
    version: '2.0.0',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
      url: 'https://example.com/support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'https://api.your-domain.com',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'API key management endpoints',
    },
    {
      name: 'STK Push',
      description: 'Lipa Na M-Pesa Online (STK Push) operations',
    },
    {
      name: 'C2B',
      description: 'Customer to Business payment operations',
    },
    {
      name: 'B2C',
      description: 'Business to Customer payment operations',
    },
    {
      name: 'Callbacks',
      description: 'M-Pesa callback endpoints',
    },
    {
      name: 'Transactions',
      description: 'Transaction management and queries',
    },
    {
      name: 'Statistics',
      description: 'Dashboard statistics and analytics',
    },
    {
      name: 'Logs',
      description: 'System logs and monitoring',
    },
    {
      name: 'Retry Queue',
      description: 'Failed request retry management',
    },
    {
      name: 'System',
      description: 'System health and status',
    },
  ],
  paths: {
    '/api/auth/keys': {
      get: {
        tags: ['Authentication'],
        summary: 'List API Keys',
        description: 'Retrieve all API keys (admin only). Does not return the actual key values.',
        operationId: 'listApiKeys',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: {
            description: 'API keys retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiKeysListResponse' },
                example: {
                  success: true,
                  data: {
                    keys: [
                      {
                        id: 1,
                        name: 'Production Dashboard',
                        permissions: ['read', 'stk_push'],
                        rate_limit: 1000,
                        is_active: true,
                        last_used_at: '2024-01-15T10:30:00Z',
                        expires_at: null,
                        created_at: '2024-01-01T00:00:00Z',
                      },
                      {
                        id: 2,
                        name: 'Mobile App',
                        permissions: ['read', 'write', 'stk_push'],
                        rate_limit: 5000,
                        is_active: true,
                        last_used_at: '2024-01-15T10:25:00Z',
                        expires_at: '2024-12-31T23:59:59Z',
                        created_at: '2024-01-01T00:00:00Z',
                      },
                    ],
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Authentication'],
        summary: 'Create API Key',
        description: 'Create a new API key (admin only). The key is only returned once.',
        operationId: 'createApiKey',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateApiKeyRequest' },
              example: {
                name: 'Mobile App Production',
                permissions: ['read', 'write', 'stk_push'],
                rateLimitPerHour: 5000,
                expiresInDays: 365,
              },
            },
          },
        },
        responses: {
          200: {
            description: 'API key created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateApiKeyResponse' },
                example: {
                  success: true,
                  data: {
                    key: 'mpesa_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
                    name: 'Mobile App Production',
                    permissions: ['read', 'write', 'stk_push'],
                    rate_limit: 5000,
                    is_active: true,
                    expires_at: '2025-01-15T00:00:00Z',
                  },
                  message: 'API key created. Save this key securely - it will not be shown again.',
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      delete: {
        tags: ['Authentication'],
        summary: 'Revoke API Key',
        description: 'Revoke an existing API key (admin only)',
        operationId: 'revokeApiKey',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'ID of the API key to revoke',
            example: 2,
          },
        ],
        responses: {
          200: {
            description: 'API key revoked successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'API key revoked successfully',
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/mpesa/stk-push': {
      post: {
        tags: ['STK Push'],
        summary: 'Initiate STK Push',
        description: 'Initiates an M-Pesa STK Push request to a customer\'s phone. The customer will receive a prompt to enter their PIN.',
        operationId: 'initiateSTKPush',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/STKPushRequest' },
              examples: {
                basic: {
                  summary: 'Basic payment',
                  value: {
                    phoneNumber: '254712345678',
                    amount: 100,
                    accountReference: 'INV001',
                    transactionDesc: 'Payment',
                  },
                },
                subscription: {
                  summary: 'Subscription payment',
                  value: {
                    phoneNumber: '254798765432',
                    amount: 2500,
                    accountReference: 'SUB2024001',
                    transactionDesc: 'Monthly Sub',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'STK Push initiated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/STKPushResponse' },
                example: {
                  success: true,
                  data: {
                    MerchantRequestID: '29115-34620561-1',
                    CheckoutRequestID: 'ws_CO_191220191020363925',
                    ResponseCode: '0',
                    ResponseDescription: 'Success. Request accepted for processing',
                    CustomerMessage: 'Success. Request accepted for processing',
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                example: {
                  success: false,
                  error: 'Validation failed: phoneNumber: Phone number must be in format 254XXXXXXXXX',
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/api/mpesa/stk-push/query': {
      post: {
        tags: ['STK Push'],
        summary: 'Query STK Push Status',
        description: 'Query the status of an STK Push transaction using the CheckoutRequestID',
        operationId: 'querySTKPush',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['checkoutRequestId'],
                properties: {
                  checkoutRequestId: {
                    type: 'string',
                    description: 'The CheckoutRequestID from the STK Push response',
                    example: 'ws_CO_191220191020363925',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Query successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/STKQueryResponse' },
                examples: {
                  success: {
                    summary: 'Successful payment',
                    value: {
                      success: true,
                      data: {
                        ResponseCode: '0',
                        ResponseDescription: 'The service request has been accepted successsfully',
                        MerchantRequestID: '29115-34620561-1',
                        CheckoutRequestID: 'ws_CO_191220191020363925',
                        ResultCode: '0',
                        ResultDesc: 'The service request is processed successfully.',
                      },
                    },
                  },
                  cancelled: {
                    summary: 'User cancelled',
                    value: {
                      success: true,
                      data: {
                        ResponseCode: '0',
                        ResponseDescription: 'The service request has been accepted successsfully',
                        MerchantRequestID: '29115-34620561-1',
                        CheckoutRequestID: 'ws_CO_191220191020363925',
                        ResultCode: '1032',
                        ResultDesc: 'Request cancelled by user',
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/mpesa/c2b/register': {
      post: {
        tags: ['C2B'],
        summary: 'Register C2B URLs',
        description: 'Register validation and confirmation URLs for C2B payments. These URLs must be publicly accessible.',
        operationId: 'registerC2BUrls',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/C2BRegisterRequest' },
              example: {
                validationUrl: 'https://your-domain.com/api/mpesa/callback/c2b/validation',
                confirmationUrl: 'https://your-domain.com/api/mpesa/callback/c2b/confirmation',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'URLs registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/C2BRegisterResponse' },
                example: {
                  success: true,
                  data: {
                    OriginatorCoversationID: 'AG_20240115_000041234567890',
                    ResponseCode: '0',
                    ResponseDescription: 'Success',
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/mpesa/c2b/simulate': {
      post: {
        tags: ['C2B'],
        summary: 'Simulate C2B Payment',
        description: 'Simulate a C2B payment (sandbox only). Use this for testing your integration.',
        operationId: 'simulateC2B',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/C2BSimulateRequest' },
              example: {
                phoneNumber: '254712345678',
                amount: 500,
                billRefNumber: 'ACC001234',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Simulation successful',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    OriginatorCoversationID: 'AG_20240115_000041234567891',
                    ResponseCode: '0',
                    ResponseDescription: 'Accept the service request successfully.',
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/mpesa/b2c': {
      post: {
        tags: ['B2C'],
        summary: 'Initiate B2C Payment',
        description: 'Send money from your business to a customer\'s M-Pesa account',
        operationId: 'initiateB2C',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/B2CRequest' },
              examples: {
                salary: {
                  summary: 'Salary payment',
                  value: {
                    phoneNumber: '254712345678',
                    amount: 50000,
                    commandId: 'SalaryPayment',
                    remarks: 'January 2024 Salary',
                    occasion: 'Monthly Salary',
                  },
                },
                refund: {
                  summary: 'Customer refund',
                  value: {
                    phoneNumber: '254798765432',
                    amount: 1500,
                    commandId: 'BusinessPayment',
                    remarks: 'Refund for order #12345',
                    occasion: 'Customer Refund',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'B2C request initiated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/B2CResponse' },
                example: {
                  success: true,
                  data: {
                    ConversationID: 'AG_20240115_00007777abcd1234',
                    OriginatorConversationID: '29115-34620561-1',
                    ResponseCode: '0',
                    ResponseDescription: 'Accept the service request successfully.',
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/mpesa/callback/stk': {
      post: {
        tags: ['Callbacks'],
        summary: 'STK Push Callback',
        description: 'Receives STK Push result callbacks from M-Pesa. This endpoint is called by Safaricom.',
        operationId: 'stkCallback',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/STKCallbackRequest' },
              examples: {
                success: {
                  summary: 'Successful payment',
                  value: {
                    Body: {
                      stkCallback: {
                        MerchantRequestID: '29115-34620561-1',
                        CheckoutRequestID: 'ws_CO_191220191020363925',
                        ResultCode: 0,
                        ResultDesc: 'The service request is processed successfully.',
                        CallbackMetadata: {
                          Item: [
                            { Name: 'Amount', Value: 100 },
                            { Name: 'MpesaReceiptNumber', Value: 'QKJ1234567' },
                            { Name: 'Balance' },
                            { Name: 'TransactionDate', Value: '20240115102036' },
                            { Name: 'PhoneNumber', Value: '254712345678' },
                          ],
                        },
                      },
                    },
                  },
                },
                cancelled: {
                  summary: 'User cancelled',
                  value: {
                    Body: {
                      stkCallback: {
                        MerchantRequestID: '29115-34620561-1',
                        CheckoutRequestID: 'ws_CO_191220191020363925',
                        ResultCode: 1032,
                        ResultDesc: 'Request cancelled by user',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Callback received',
            content: {
              'application/json': {
                example: { ResultCode: 0, ResultDesc: 'Accepted' },
              },
            },
          },
        },
      },
    },
    '/api/mpesa/callback/c2b/validation': {
      post: {
        tags: ['Callbacks'],
        summary: 'C2B Validation Callback',
        description: 'Receives C2B validation requests from M-Pesa. Return accepted/rejected.',
        operationId: 'c2bValidation',
        requestBody: {
          content: {
            'application/json': {
              example: {
                TransactionType: 'Pay Bill',
                TransID: 'QKJ1234568',
                TransTime: '20240115102045',
                TransAmount: '500.00',
                BusinessShortCode: '600000',
                BillRefNumber: 'ACC001234',
                InvoiceNumber: '',
                OrgAccountBalance: '',
                ThirdPartyTransID: '',
                MSISDN: '254712345678',
                FirstName: 'John',
                MiddleName: '',
                LastName: 'Doe',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Validation response',
            content: {
              'application/json': {
                examples: {
                  accepted: {
                    summary: 'Accept payment',
                    value: { ResultCode: 0, ResultDesc: 'Accepted' },
                  },
                  rejected: {
                    summary: 'Reject payment',
                    value: { ResultCode: 'C2B00011', ResultDesc: 'Rejected' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/mpesa/callback/c2b/confirmation': {
      post: {
        tags: ['Callbacks'],
        summary: 'C2B Confirmation Callback',
        description: 'Receives C2B confirmation when payment is completed',
        operationId: 'c2bConfirmation',
        responses: {
          200: { description: 'Confirmation received' },
        },
      },
    },
    '/api/mpesa/callback/b2c/result': {
      post: {
        tags: ['Callbacks'],
        summary: 'B2C Result Callback',
        description: 'Receives B2C result callbacks from M-Pesa',
        operationId: 'b2cResult',
        requestBody: {
          content: {
            'application/json': {
              example: {
                Result: {
                  ResultType: 0,
                  ResultCode: 0,
                  ResultDesc: 'The service request is processed successfully.',
                  OriginatorConversationID: '29115-34620561-1',
                  ConversationID: 'AG_20240115_00007777abcd1234',
                  TransactionID: 'QKJ1234569',
                  ResultParameters: {
                    ResultParameter: [
                      { Key: 'TransactionAmount', Value: 50000 },
                      { Key: 'TransactionReceipt', Value: 'QKJ1234569' },
                      { Key: 'B2CRecipientIsRegisteredCustomer', Value: 'Y' },
                      { Key: 'B2CChargesPaidAccountAvailableFunds', Value: 500000 },
                      { Key: 'ReceiverPartyPublicName', Value: '254712345678 - John Doe' },
                      { Key: 'TransactionCompletedDateTime', Value: '15.01.2024 10:20:45' },
                      { Key: 'B2CUtilityAccountAvailableFunds', Value: 1000000 },
                      { Key: 'B2CWorkingAccountAvailableFunds', Value: 500000 },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Result received' },
        },
      },
    },
    '/api/mpesa/callback/b2c/timeout': {
      post: {
        tags: ['Callbacks'],
        summary: 'B2C Timeout Callback',
        description: 'Receives B2C timeout callbacks when request takes too long',
        operationId: 'b2cTimeout',
        responses: {
          200: { description: 'Timeout received' },
        },
      },
    },
    '/api/transactions': {
      get: {
        tags: ['Transactions'],
        summary: 'Get Transactions',
        description: 'Retrieve transactions with filtering, search, and pagination',
        operationId: 'getTransactions',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1, minimum: 1 },
            description: 'Page number',
            example: 1,
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            description: 'Items per page',
            example: 20,
          },
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['STK_PUSH', 'C2B', 'B2C', 'all'] },
            description: 'Transaction type filter',
            example: 'STK_PUSH',
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'completed', 'failed', 'cancelled', 'all'] },
            description: 'Status filter',
            example: 'completed',
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search by phone, transaction ID, or account reference',
            example: '254712',
          },
        ],
        responses: {
          200: {
            description: 'Transactions retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TransactionsResponse' },
                example: {
                  success: true,
                  data: {
                    transactions: [
                      {
                        id: 1,
                        transaction_type: 'STK_PUSH',
                        checkout_request_id: 'ws_CO_191220191020363925',
                        merchant_request_id: '29115-34620561-1',
                        transaction_id: 'QKJ1234567',
                        phone_number: '254712345678',
                        amount: 100,
                        account_reference: 'INV001',
                        transaction_desc: 'Payment',
                        result_code: 0,
                        result_desc: 'The service request is processed successfully.',
                        status: 'completed',
                        created_at: '2024-01-15T10:20:36Z',
                        updated_at: '2024-01-15T10:21:00Z',
                      },
                    ],
                    pagination: {
                      page: 1,
                      limit: 20,
                      total: 150,
                      totalPages: 8,
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/transactions/{id}': {
      get: {
        tags: ['Transactions'],
        summary: 'Get Transaction by ID',
        description: 'Retrieve a single transaction by its ID',
        operationId: 'getTransactionById',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Transaction ID',
            example: 1,
          },
        ],
        responses: {
          200: {
            description: 'Transaction retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Transaction' },
              },
            },
          },
          404: {
            description: 'Transaction not found',
            content: {
              'application/json': {
                example: { success: false, error: 'Transaction not found' },
              },
            },
          },
        },
      },
    },
    '/api/stats': {
      get: {
        tags: ['Statistics'],
        summary: 'Get Dashboard Statistics',
        description: 'Retrieve comprehensive transaction statistics for the dashboard',
        operationId: 'getStats',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: {
            description: 'Statistics retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StatsResponse' },
                example: {
                  success: true,
                  data: {
                    overview: {
                      totalTransactions: 15234,
                      totalAmount: 45678900,
                      completedAmount: 42500000,
                    },
                    byStatus: {
                      completed: 12500,
                      pending: 1500,
                      failed: 1000,
                      cancelled: 234,
                    },
                    byType: {
                      STK_PUSH: 10000,
                      C2B: 4000,
                      B2C: 1234,
                    },
                    last24Hours: {
                      count: 567,
                      amount: 1234500,
                    },
                    today: {
                      count: 234,
                      amount: 567800,
                      completed: 200,
                      failed: 20,
                      pending: 14,
                    },
                    hourlyVolume: [
                      { hour: '2024-01-15 09:00:00', count: 45, amount: 123400 },
                      { hour: '2024-01-15 10:00:00', count: 67, amount: 234500 },
                    ],
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/retry-queue': {
      get: {
        tags: ['Retry Queue'],
        summary: 'Get Retry Queue',
        description: 'Get items currently in the retry queue',
        operationId: 'getRetryQueue',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: {
            description: 'Retry queue retrieved',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    items: [
                      {
                        id: 1,
                        job_type: 'stk_push',
                        endpoint: '/api/mpesa/stk-push',
                        method: 'POST',
                        max_retries: 5,
                        current_retry: 2,
                        next_retry_at: '2024-01-15T10:30:00Z',
                        last_error: 'Connection timeout',
                        status: 'pending',
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/retry-queue/stats': {
      get: {
        tags: ['Retry Queue'],
        summary: 'Get Retry Queue Stats',
        description: 'Get retry queue statistics',
        operationId: 'getRetryQueueStats',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: {
            description: 'Stats retrieved',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    pending: 5,
                    processing: 1,
                    completed: 150,
                    failed: 10,
                    deadLetter: 3,
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/dead-letter': {
      get: {
        tags: ['Retry Queue'],
        summary: 'Get Dead Letter Queue',
        description: 'Get items that have exhausted all retries',
        operationId: 'getDeadLetterQueue',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: { description: 'Dead letter queue retrieved' },
        },
      },
    },
    '/api/dead-letter/{id}/retry': {
      post: {
        tags: ['Retry Queue'],
        summary: 'Retry Dead Letter Item',
        description: 'Retry a dead letter queue item',
        operationId: 'retryDeadLetterItem',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: 'Item requeued for retry',
            content: {
              'application/json': {
                example: { success: true, message: 'Item requeued successfully' },
              },
            },
          },
        },
      },
    },
    '/api/events': {
      get: {
        tags: ['System'],
        summary: 'Server-Sent Events',
        description: 'Connect to receive real-time transaction updates via SSE',
        operationId: 'subscribeEvents',
        responses: {
          200: {
            description: 'Event stream',
            content: {
              'text/event-stream': {
                schema: { type: 'string' },
                example: 'data: {"type":"transaction","data":{"id":1,"status":"completed"}}\n\n',
              },
            },
          },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health Check',
        description: 'Check API health status and connectivity',
        operationId: 'healthCheck',
        responses: {
          200: {
            description: 'Service healthy',
            content: {
              'application/json': {
                example: {
                  status: 'healthy',
                  timestamp: '2024-01-15T10:30:00Z',
                  version: '2.0.0',
                  uptime: 86400,
                  connections: { sse: 5 },
                  environment: 'production',
                },
              },
            },
          },
          503: {
            description: 'Service unhealthy',
            content: {
              'application/json': {
                example: {
                  status: 'unhealthy',
                  timestamp: '2024-01-15T10:30:00Z',
                  error: 'Database connection failed',
                },
              },
            },
          },
        },
      },
    },
    '/api/docs': {
      get: {
        tags: ['System'],
        summary: 'Get API Documentation',
        description: 'Returns this OpenAPI specification as JSON',
        operationId: 'getDocs',
        responses: {
          200: {
            description: 'OpenAPI specification',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      STKPushRequest: {
        type: 'object',
        required: ['phoneNumber', 'amount', 'accountReference'],
        properties: {
          phoneNumber: {
            type: 'string',
            pattern: '^254[0-9]{9}$',
            description: 'Phone number in format 254XXXXXXXXX',
            example: '254712345678',
          },
          amount: {
            type: 'number',
            minimum: 1,
            maximum: 150000,
            description: 'Amount to charge (KES 1 - 150,000)',
            example: 100,
          },
          accountReference: {
            type: 'string',
            maxLength: 12,
            description: 'Account reference for the transaction',
            example: 'INV001',
          },
          transactionDesc: {
            type: 'string',
            maxLength: 13,
            description: 'Transaction description',
            example: 'Payment',
          },
        },
      },
      STKPushResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              MerchantRequestID: { type: 'string' },
              CheckoutRequestID: { type: 'string' },
              ResponseCode: { type: 'string' },
              ResponseDescription: { type: 'string' },
              CustomerMessage: { type: 'string' },
            },
          },
        },
      },
      STKQueryResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              ResponseCode: { type: 'string' },
              ResponseDescription: { type: 'string' },
              MerchantRequestID: { type: 'string' },
              CheckoutRequestID: { type: 'string' },
              ResultCode: { type: 'string' },
              ResultDesc: { type: 'string' },
            },
          },
        },
      },
      C2BRegisterRequest: {
        type: 'object',
        properties: {
          validationUrl: {
            type: 'string',
            format: 'uri',
            description: 'URL for validation callbacks',
          },
          confirmationUrl: {
            type: 'string',
            format: 'uri',
            description: 'URL for confirmation callbacks',
          },
        },
      },
      C2BRegisterResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              OriginatorCoversationID: { type: 'string' },
              ResponseCode: { type: 'string' },
              ResponseDescription: { type: 'string' },
            },
          },
        },
      },
      C2BSimulateRequest: {
        type: 'object',
        required: ['phoneNumber', 'amount'],
        properties: {
          phoneNumber: {
            type: 'string',
            pattern: '^254[0-9]{9}$',
            example: '254712345678',
          },
          amount: {
            type: 'number',
            minimum: 1,
            example: 500,
          },
          billRefNumber: {
            type: 'string',
            maxLength: 20,
            example: 'ACC001234',
          },
        },
      },
      B2CRequest: {
        type: 'object',
        required: ['phoneNumber', 'amount', 'commandId', 'remarks'],
        properties: {
          phoneNumber: {
            type: 'string',
            pattern: '^254[0-9]{9}$',
            example: '254712345678',
          },
          amount: {
            type: 'number',
            minimum: 1,
            example: 1000,
          },
          commandId: {
            type: 'string',
            enum: ['SalaryPayment', 'BusinessPayment', 'PromotionPayment'],
            description: 'Type of B2C transaction',
            example: 'BusinessPayment',
          },
          remarks: {
            type: 'string',
            maxLength: 100,
            example: 'Payment for services',
          },
          occasion: {
            type: 'string',
            maxLength: 100,
            example: 'Monthly salary',
          },
        },
      },
      B2CResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              ConversationID: { type: 'string' },
              OriginatorConversationID: { type: 'string' },
              ResponseCode: { type: 'string' },
              ResponseDescription: { type: 'string' },
            },
          },
        },
      },
      STKCallbackRequest: {
        type: 'object',
        properties: {
          Body: {
            type: 'object',
            properties: {
              stkCallback: {
                type: 'object',
                properties: {
                  MerchantRequestID: { type: 'string' },
                  CheckoutRequestID: { type: 'string' },
                  ResultCode: { type: 'integer' },
                  ResultDesc: { type: 'string' },
                  CallbackMetadata: {
                    type: 'object',
                    properties: {
                      Item: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            Name: { type: 'string' },
                            Value: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          transaction_type: { type: 'string', enum: ['STK_PUSH', 'C2B', 'B2C'], example: 'STK_PUSH' },
          checkout_request_id: { type: 'string', example: 'ws_CO_191220191020363925' },
          merchant_request_id: { type: 'string', example: '29115-34620561-1' },
          conversation_id: { type: 'string' },
          originator_conversation_id: { type: 'string' },
          transaction_id: { type: 'string', example: 'QKJ1234567' },
          phone_number: { type: 'string', example: '254712345678' },
          amount: { type: 'number', example: 100 },
          account_reference: { type: 'string', example: 'INV001' },
          transaction_desc: { type: 'string', example: 'Payment' },
          result_code: { type: 'integer', example: 0 },
          result_desc: { type: 'string', example: 'The service request is processed successfully.' },
          status: { type: 'string', enum: ['pending', 'completed', 'failed', 'cancelled'], example: 'completed' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      TransactionsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              transactions: {
                type: 'array',
                items: { $ref: '#/components/schemas/Transaction' },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
      StatsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              overview: {
                type: 'object',
                properties: {
                  totalTransactions: { type: 'integer' },
                  totalAmount: { type: 'number' },
                  completedAmount: { type: 'number' },
                },
              },
              byStatus: {
                type: 'object',
                properties: {
                  completed: { type: 'integer' },
                  pending: { type: 'integer' },
                  failed: { type: 'integer' },
                  cancelled: { type: 'integer' },
                },
              },
              byType: {
                type: 'object',
                properties: {
                  STK_PUSH: { type: 'integer' },
                  C2B: { type: 'integer' },
                  B2C: { type: 'integer' },
                },
              },
            },
          },
        },
      },
      CreateApiKeyRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            maxLength: 100,
            description: 'Name for the API key',
            example: 'Production Dashboard',
          },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            default: ['read'],
            description: 'Array of permissions',
            example: ['read', 'write', 'stk_push'],
          },
          rateLimitPerHour: {
            type: 'integer',
            default: 1000,
            description: 'Rate limit per hour',
            example: 5000,
          },
          expiresInDays: {
            type: 'integer',
            description: 'Number of days until expiration',
            example: 365,
          },
        },
      },
      CreateApiKeyResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'The API key (shown only once)' },
              name: { type: 'string' },
              permissions: { type: 'array', items: { type: 'string' } },
              rate_limit: { type: 'integer' },
              is_active: { type: 'boolean' },
              expires_at: { type: 'string', format: 'date-time', nullable: true },
            },
          },
          message: { type: 'string' },
        },
      },
      ApiKeysListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              keys: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    permissions: { type: 'array', items: { type: 'string' } },
                    rate_limit: { type: 'integer' },
                    is_active: { type: 'boolean' },
                    last_used_at: { type: 'string', format: 'date-time', nullable: true },
                    expires_at: { type: 'string', format: 'date-time', nullable: true },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Error message' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          details: { type: 'object' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Unauthorized - Invalid or missing API key',
        content: {
          'application/json': {
            example: {
              success: false,
              error: 'Unauthorized',
              message: 'Invalid or missing API key. Include your API key in the X-API-Key header.',
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden - Insufficient permissions',
        content: {
          'application/json': {
            example: {
              success: false,
              error: 'Forbidden',
              message: 'Insufficient permissions for this operation.',
            },
          },
        },
      },
      InternalError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            example: {
              success: false,
              error: 'Internal server error',
              requestId: 'req_abc123',
            },
          },
        },
      },
    },
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for authentication. Get your key from the admin dashboard.',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Alternative: Use API key as Bearer token',
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
};
