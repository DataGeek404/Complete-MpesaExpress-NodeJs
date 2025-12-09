export const MPESA_CONFIG = {
  // API URLs
  SANDBOX_BASE_URL: 'https://sandbox.safaricom.co.ke',
  PRODUCTION_BASE_URL: 'https://api.safaricom.co.ke',
  
  // Endpoints
  OAUTH_ENDPOINT: '/oauth/v1/generate?grant_type=client_credentials',
  STK_PUSH_ENDPOINT: '/mpesa/stkpush/v1/processrequest',
  STK_QUERY_ENDPOINT: '/mpesa/stkpushquery/v1/query',
  C2B_REGISTER_ENDPOINT: '/mpesa/c2b/v1/registerurl',
  C2B_SIMULATE_ENDPOINT: '/mpesa/c2b/v1/simulate',
  B2C_ENDPOINT: '/mpesa/b2c/v1/paymentrequest',
  
  // Transaction Types
  TRANSACTION_TYPE: {
    STK: 'CustomerPayBillOnline',
    C2B_PAYBILL: 'CustomerPayBillOnline',
    C2B_BUYGOODS: 'CustomerBuyGoodsOnline',
    B2C_PAYMENT: 'BusinessPayment',
    B2C_SALARY: 'SalaryPayment',
    B2C_PROMOTION: 'PromotionPayment',
  },
} as const;

export function getBaseUrl(): string {
  return process.env.MPESA_ENVIRONMENT === 'production'
    ? MPESA_CONFIG.PRODUCTION_BASE_URL
    : MPESA_CONFIG.SANDBOX_BASE_URL;
}

export function getCallbackUrl(path: string): string {
  const baseUrl = process.env.MPESA_CALLBACK_BASE_URL || 'https://your-domain.com';
  return `${baseUrl}/api/mpesa/callback${path}`;
}
