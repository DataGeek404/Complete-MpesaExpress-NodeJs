export type TransactionType = 'STK_PUSH' | 'C2B' | 'B2C';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  phoneNumber: string;
  accountReference?: string;
  transactionDesc?: string;
  mpesaReceiptNumber?: string;
  status: TransactionStatus;
  resultCode?: number;
  resultDesc?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  totalAmount: number;
}
