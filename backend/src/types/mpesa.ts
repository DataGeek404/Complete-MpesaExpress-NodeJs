// M-Pesa API Types

export interface MpesaAuthResponse {
  access_token: string;
  expires_in: string;
}

export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc?: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface STKCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value?: string | number;
        }>;
      };
    };
  };
}

export interface C2BRegisterRequest {
  shortCode: string;
  responseType: 'Completed' | 'Cancelled';
  confirmationURL: string;
  validationURL: string;
}

export interface C2BRegisterResponse {
  OriginatorCoversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export interface C2BSimulateRequest {
  shortCode: string;
  commandID: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline';
  amount: number;
  msisdn: string;
  billRefNumber?: string;
}

export interface C2BValidationRequest {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber: string;
  OrgAccountBalance: string;
  ThirdPartyTransID: string;
  MSISDN: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
}

export interface C2BConfirmationRequest extends C2BValidationRequest {}

export interface B2CRequest {
  initiatorName: string;
  securityCredential: string;
  commandID: 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment';
  amount: number;
  partyA: string;
  partyB: string;
  remarks: string;
  queueTimeOutURL: string;
  resultURL: string;
  occasion?: string;
}

export interface B2CResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export interface B2CCallbackBody {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: Array<{
        Key: string;
        Value: string | number;
      }>;
    };
    ReferenceData?: {
      ReferenceItem: {
        Key: string;
        Value: string;
      };
    };
  };
}

export interface Transaction {
  id: number;
  transaction_type: 'STK_PUSH' | 'C2B' | 'B2C';
  checkout_request_id?: string;
  merchant_request_id?: string;
  conversation_id?: string;
  originator_conversation_id?: string;
  transaction_id?: string;
  phone_number: string;
  amount: number;
  account_reference?: string;
  transaction_desc?: string;
  result_code?: number;
  result_desc?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  raw_request: string;
  raw_callback?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Log {
  id: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  metadata?: string;
  created_at: Date;
}

export interface ErrorEvent {
  id: number;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  request_data?: string;
  created_at: Date;
}
