import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, TransactionStats, TransactionStatus, TransactionType } from '@/types/transaction';
import { toast } from 'sonner';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_API_KEY || '';
const USE_MOCK_DATA = !import.meta.env.VITE_API_BASE_URL;

// API Headers
const getHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(API_KEY && { 'X-API-Key': API_KEY }),
});

// Mock data generator for demo purposes
const generateMockTransaction = (): Transaction => {
  const types: TransactionType[] = ['STK_PUSH', 'C2B', 'B2C'];
  const statuses: TransactionStatus[] = ['pending', 'completed', 'failed', 'cancelled'];
  const type = types[Math.floor(Math.random() * types.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  return {
    id: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
    type,
    amount: Math.floor(Math.random() * 50000) + 100,
    phoneNumber: `2547${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    accountReference: `REF${Math.floor(Math.random() * 10000)}`,
    transactionDesc: type === 'STK_PUSH' ? 'Payment for services' : type === 'C2B' ? 'Customer deposit' : 'Disbursement',
    mpesaReceiptNumber: status === 'completed' ? `QK${Math.random().toString(36).substr(2, 8).toUpperCase()}` : undefined,
    status,
    resultCode: status === 'completed' ? 0 : status === 'failed' ? 1 : undefined,
    resultDesc: status === 'completed' ? 'Success' : status === 'failed' ? 'Insufficient balance' : undefined,
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
    updatedAt: new Date(),
  };
};

const generateInitialTransactions = (count: number): Transaction[] => {
  return Array.from({ length: count }, generateMockTransaction).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
};

// Transform API response to frontend Transaction type
const transformApiTransaction = (t: any): Transaction => ({
  id: t.transaction_id || `TXN${t.id}`,
  type: t.transaction_type as TransactionType,
  amount: parseFloat(t.amount),
  phoneNumber: t.phone_number,
  accountReference: t.account_reference || '',
  transactionDesc: t.transaction_desc || t.result_desc || '',
  mpesaReceiptNumber: t.transaction_id,
  status: t.status as TransactionStatus,
  resultCode: t.result_code,
  resultDesc: t.result_desc,
  createdAt: new Date(t.created_at),
  updatedAt: new Date(t.updated_at || t.created_at),
});

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    USE_MOCK_DATA ? generateInitialTransactions(25) : []
  );
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(!USE_MOCK_DATA);
  const [isConnected, setIsConnected] = useState(USE_MOCK_DATA);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{ status?: TransactionStatus; type?: TransactionType }>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Fetch transactions from API
  const fetchTransactions = useCallback(async () => {
    if (USE_MOCK_DATA) return;
    
    try {
      setError(null);
      
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      
      if (filter.status) params.append('status', filter.status);
      if (filter.type) params.append('type', filter.type);
      
      const response = await fetch(`${API_BASE_URL}/api/transactions?${params}`, {
        headers: getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.data.transactions.map(transformApiTransaction));
        setPagination(data.data.pagination);
        setIsConnected(true);
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setError(err.message);
      setIsConnected(false);
      
      // Fall back to mock data
      if (transactions.length === 0) {
        setTransactions(generateInitialTransactions(25));
      }
    } finally {
      setIsLoading(false);
    }
  }, [filter.status, filter.type, pagination.page, pagination.limit, transactions.length]);

  // Fetch stats from API
  const fetchStats = useCallback(async (): Promise<TransactionStats | null> => {
    if (USE_MOCK_DATA) return null;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats`, {
        headers: getHeaders(),
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      if (data.success) {
        return {
          total: data.data.overview.totalTransactions,
          completed: data.data.byStatus.completed,
          pending: data.data.byStatus.pending,
          failed: data.data.byStatus.failed,
          totalAmount: data.data.overview.completedAmount,
        };
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
    
    return null;
  }, []);

  // Calculate stats from transactions
  const stats: TransactionStats = {
    total: pagination.total || transactions.length,
    pending: transactions.filter(t => t.status === 'pending').length,
    completed: transactions.filter(t => t.status === 'completed').length,
    failed: transactions.filter(t => t.status === 'failed').length,
    totalAmount: transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0),
  };

  // Simulate live transactions for mock mode
  useEffect(() => {
    if (!isLive || !USE_MOCK_DATA) return;

    const interval = setInterval(() => {
      const newTransaction = generateMockTransaction();
      newTransaction.createdAt = new Date();
      setTransactions(prev => [newTransaction, ...prev].slice(0, 100));
      toast.success(`New ${newTransaction.type} transaction: KES ${newTransaction.amount.toLocaleString()}`);
    }, Math.random() * 5000 + 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  // SSE subscription for real API
  const startLiveUpdates = useCallback(() => {
    if (USE_MOCK_DATA) return;
    
    try {
      eventSourceRef.current = new EventSource(`${API_BASE_URL}/api/events`);
      
      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transaction') {
            const newTransaction = transformApiTransaction(data.data);
            setTransactions(prev => [newTransaction, ...prev.slice(0, 99)]);
            toast.success(`New ${newTransaction.type} transaction: KES ${newTransaction.amount.toLocaleString()}`);
          }
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };
      
      eventSourceRef.current.onerror = (err) => {
        console.error('SSE error:', err);
        toast.error('Lost connection to live updates');
        setIsLive(false);
      };
    } catch (err) {
      console.error('Failed to connect to SSE:', err);
      toast.error('Failed to connect to live updates');
    }
  }, []);

  const stopLiveUpdates = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const filteredTransactions = transactions.filter(t => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.type && t.type !== filter.type) return false;
    return true;
  });

  const toggleLive = useCallback(() => {
    if (isLive) {
      stopLiveUpdates();
      setIsLive(false);
      toast.info('Live updates disabled');
    } else {
      if (!USE_MOCK_DATA) {
        startLiveUpdates();
      }
      setIsLive(true);
      toast.success('Live updates enabled');
    }
  }, [isLive, startLiveUpdates, stopLiveUpdates]);

  const refreshTransactions = useCallback(() => {
    if (USE_MOCK_DATA) {
      setTransactions(generateInitialTransactions(25));
    } else {
      setIsLoading(true);
      fetchTransactions();
    }
    toast.success('Transactions refreshed');
  }, [fetchTransactions]);

  // Initial fetch
  useEffect(() => {
    if (!USE_MOCK_DATA) {
      fetchTransactions();
    }
  }, [fetchTransactions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveUpdates();
    };
  }, [stopLiveUpdates]);

  return {
    transactions: filteredTransactions,
    stats,
    isLive,
    isLoading,
    isConnected,
    error,
    toggleLive,
    refreshTransactions,
    filter,
    setFilter,
    pagination,
    setPagination,
  };
};
