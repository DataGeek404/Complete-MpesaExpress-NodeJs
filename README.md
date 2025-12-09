# M-Pesa Daraja API Backend

A production-ready M-Pesa payment integration API built with Next.js and MySQL, supporting STK Push, C2B, B2C, and M-Pesa Express.

> **Note:** This is a pure API backend. For the frontend dashboard, see the main `src/` folder.

## Features

- ✅ **STK Push (Lipa Na M-Pesa Online)** - Initiate payment prompts to customers
- ✅ **C2B (Customer to Business)** - Receive payments from customers
- ✅ **B2C (Business to Customer)** - Send money to customers
- ✅ **Token Caching** - Automatic token management with expiry handling
- ✅ **Callback Handling** - Secure webhook endpoints for all transactions
- ✅ **MySQL Database** - Full transaction logging and persistence
- ✅ **Retry Queue** - Automatic retry mechanism with exponential backoff
- ✅ **Dead Letter Queue** - Failed job tracking and manual retry
- ✅ **Input Validation** - Zod-based request validation
- ✅ **Error Handling** - Comprehensive error logging and tracking
- ✅ **Real-time Events** - Server-Sent Events (SSE) for live updates

## Project Structure

```
backend/
├── src/
│   ├── app/
│   │   └── api/                    # API Routes
│   │       ├── dead-letter/        # Dead letter queue management
│   │       ├── docs/               # OpenAPI/Swagger JSON
│   │       ├── events/             # SSE for real-time updates
│   │       ├── health/             # Health check endpoint
│   │       ├── mpesa/              # M-Pesa integration endpoints
│   │       │   ├── stk-push/       # STK Push & Query
│   │       │   ├── c2b/            # C2B Register & Simulate
│   │       │   ├── b2c/            # B2C Payments
│   │       │   └── callback/       # Webhook callbacks
│   │       ├── retry-queue/        # Retry queue management
│   │       └── transactions/       # Transaction CRUD
│   ├── lib/                        # Business Logic
│   │   ├── mpesa/                  # M-Pesa SDK
│   │   │   ├── auth.ts             # OAuth token management
│   │   │   ├── config.ts           # API configuration
│   │   │   ├── stk-push.ts         # STK Push logic
│   │   │   ├── c2b.ts              # C2B logic
│   │   │   └── b2c.ts              # B2C logic
│   │   ├── db.ts                   # MySQL connection pool
│   │   ├── logger.ts               # Logging utility
│   │   ├── retry-queue.ts          # Retry queue logic
│   │   ├── swagger.ts              # OpenAPI spec generator
│   │   ├── validation.ts           # Zod schemas
│   │   ├── webhook-verification.ts # Callback security
│   │   └── websocket-manager.ts    # Real-time events
│   └── types/
│       └── mpesa.ts                # TypeScript interfaces
├── migrations/
│   └── init.sql                    # Database schema
├── scripts/
│   ├── migrate.js                  # Database migration script
│   └── process-queue.js            # Queue processor cron job
└── package.json
```

## Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- M-Pesa Daraja API credentials (from [developer.safaricom.co.ke](https://developer.safaricom.co.ke))

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your M-Pesa and database credentials:

```env
# M-Pesa Daraja API Configuration
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379
MPESA_BUSINESS_SHORTCODE=174379
MPESA_INITIATOR_NAME=testapi
MPESA_SECURITY_CREDENTIAL=your_security_credential

# Environment: sandbox or production
MPESA_ENVIRONMENT=sandbox

# Callback URLs (must be publicly accessible in production)
MPESA_CALLBACK_BASE_URL=https://your-domain.com

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mpesa_db
```

### 3. Setup Database

Run the migration script to create required tables:

```bash
npm run db:migrate
```

Or manually execute the SQL in `migrations/init.sql`.

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Health Check

```bash
GET /api/health
```

### STK Push (Lipa Na M-Pesa)

```bash
POST /api/mpesa/stk-push
Content-Type: application/json

{
  "phoneNumber": "254712345678",
  "amount": 100,
  "accountReference": "Order123",
  "transactionDesc": "Payment"
}
```

### STK Push Query

```bash
POST /api/mpesa/stk-push/query
Content-Type: application/json

{
  "checkoutRequestId": "ws_CO_123456789"
}
```

### C2B URL Registration

```bash
POST /api/mpesa/c2b/register
Content-Type: application/json

{
  "responseType": "Completed"
}
```

### C2B Simulation (Sandbox Only)

```bash
POST /api/mpesa/c2b/simulate
Content-Type: application/json

{
  "msisdn": "254712345678",
  "amount": 100,
  "billRefNumber": "Invoice001"
}
```

### B2C Payment

```bash
POST /api/mpesa/b2c
Content-Type: application/json

{
  "phoneNumber": "254712345678",
  "amount": 100,
  "remarks": "Salary payment",
  "occasion": "Monthly salary"
}
```

### Get Transactions

```bash
GET /api/transactions?page=1&limit=20&type=STK_PUSH&status=completed&search=254
```

### Get Single Transaction

```bash
GET /api/transactions/{id}
```

### Retry Queue Stats

```bash
GET /api/retry-queue/stats
```

### Real-time Events (SSE)

```bash
GET /api/events
```

## Callback URLs

Configure these URLs in your M-Pesa Daraja dashboard:

| Callback Type | URL |
|--------------|-----|
| STK Push | `https://your-domain.com/api/mpesa/callback/stk` |
| C2B Validation | `https://your-domain.com/api/mpesa/callback/c2b/validation` |
| C2B Confirmation | `https://your-domain.com/api/mpesa/callback/c2b/confirmation` |
| B2C Result | `https://your-domain.com/api/mpesa/callback/b2c/result` |
| B2C Timeout | `https://your-domain.com/api/mpesa/callback/b2c/timeout` |

## Database Schema

### transactions
Stores all payment transactions with full metadata.

### logs
System logs with levels: info, warn, error, debug.

### error_events
Detailed error tracking with stack traces.

### callback_history
Audit trail of all received callbacks.

### retry_queue
Pending retry jobs with exponential backoff.

### dead_letter_queue
Failed jobs that exceeded max retries.

## Production Deployment

### 1. Environment Setup

Set `MPESA_ENVIRONMENT=production` and use production API credentials.

### 2. Secure Callbacks

Ensure your callback URLs are:
- Using HTTPS
- Publicly accessible
- Behind a firewall with M-Pesa IPs whitelisted

### 3. Database Security

- Use a strong password
- Enable SSL connections
- Set up regular backups

### 4. Build and Start

```bash
npm run build
npm start
```

### 5. Queue Processing

Set up a cron job to process the retry queue:

```bash
# Run every minute
* * * * * cd /path/to/backend && node scripts/process-queue.js
```

## Security Best Practices

1. **Never expose credentials** - Use environment variables
2. **Validate all inputs** - Zod schemas are used for validation
3. **Log sensitive data carefully** - Security credentials are redacted
4. **Use HTTPS** - Required for production callbacks
5. **Rate limiting** - Consider adding rate limiting for API endpoints
6. **IP Whitelisting** - Verify callback sources (set `MPESA_SKIP_IP_VERIFICATION=false` in production)

## Troubleshooting

### Token Errors
- Verify consumer key and secret are correct
- Check if credentials are for sandbox vs production

### Callback Not Received
- Ensure callback URL is publicly accessible
- Check if URL is registered with M-Pesa
- Verify HTTPS certificate is valid

### Database Connection Issues
- Verify MySQL is running
- Check credentials in .env.local
- Ensure database exists

## License

MIT
