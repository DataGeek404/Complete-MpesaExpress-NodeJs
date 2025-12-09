import { Transaction, TransactionStats } from '@/types/transaction';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// API Headers
const getHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(API_KEY && { 'X-API-Key': API_KEY }),
});

// Error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(
      error.error || error.message || 'Request failed',
      response.status,
      error.code
    );
  }
  return response.json();
}

// Transaction API
export interface TransactionsResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
}

export async function fetchTransactions(
  filters: TransactionFilters = {}
): Promise<TransactionsResponse> {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.type && filters.type !== 'all') params.append('type', filters.type);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);
  
  const url = `${API_BASE_URL}/api/transactions?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  return handleResponse<TransactionsResponse>(response);
}

export async function fetchTransaction(id: number): Promise<{ success: boolean; data: Transaction }> {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${id}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  return handleResponse(response);
}

// Stats API
export interface StatsResponse {
  success: boolean;
  data: {
    overview: {
      totalTransactions: number;
      totalAmount: number;
      completedAmount: number;
    };
    byStatus: {
      completed: number;
      pending: number;
      failed: number;
      cancelled: number;
    };
    byType: {
      STK_PUSH: number;
      C2B: number;
      B2C: number;
    };
    last24Hours: {
      count: number;
      amount: number;
    };
    today: {
      count: number;
      amount: number;
      completed: number;
      failed: number;
      pending: number;
    };
    hourlyVolume: Array<{
      hour: string;
      count: number;
      amount: number;
    }>;
  };
}

export async function fetchStats(): Promise<StatsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/stats`, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  return handleResponse<StatsResponse>(response);
}

// Convert API stats to dashboard format
export function convertToTransactionStats(apiStats: StatsResponse['data']): TransactionStats {
  return {
    total: apiStats.overview.totalTransactions,
    completed: apiStats.byStatus.completed,
    pending: apiStats.byStatus.pending,
    failed: apiStats.byStatus.failed,
    totalAmount: apiStats.overview.totalAmount,
  };
}

// Health Check API
export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
  connections: {
    sse: number;
  };
  environment: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  return handleResponse<HealthResponse>(response);
}

// STK Push API
export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc?: string;
}

export interface STKPushResponse {
  success: boolean;
  data: {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResponseCode: string;
    ResponseDescription: string;
    CustomerMessage: string;
  };
}

export async function initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
  const response = await fetch(`${API_BASE_URL}/api/mpesa/stk-push`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  });
  
  return handleResponse<STKPushResponse>(response);
}

// Server-Sent Events for real-time updates
export function subscribeToEvents(
  onTransaction: (transaction: Transaction) => void,
  onError?: (error: Event) => void
): EventSource {
  const eventSource = new EventSource(`${API_BASE_URL}/api/events`);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'transaction') {
        onTransaction(data.data);
      }
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    onError?.(error);
  };
  
  return eventSource;
}

// Export base URL for debugging
export const getApiBaseUrl = () => API_BASE_URL;
