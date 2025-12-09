import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Visibility, ContentCopy } from '@mui/icons-material';
import { Transaction, TransactionStatus, TransactionType } from '@/types/transaction';

interface TransactionTableProps {
  transactions: Transaction[];
}

const getStatusColor = (status: TransactionStatus): "success" | "warning" | "error" | "default" => {
  switch (status) {
    case 'completed': return 'success';
    case 'pending': return 'warning';
    case 'failed': return 'error';
    case 'cancelled': return 'default';
    default: return 'default';
  }
};

const getTypeColor = (type: TransactionType): string => {
  switch (type) {
    case 'STK_PUSH': return '#6366f1';
    case 'C2B': return '#10b981';
    case 'B2C': return '#f59e0b';
    default: return '#6b7280';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatPhone = (phone: string) => {
  if (phone.startsWith('254')) {
    return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  }
  return phone;
};

export const TransactionTable = ({ transactions }: TransactionTableProps) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        maxHeight: 600,
        '& .MuiTableHead-root': {
          position: 'sticky',
          top: 0,
          zIndex: 1,
          backgroundColor: 'background.paper',
        }
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Transaction ID</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Phone Number</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Receipt No.</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">No transactions found</Typography>
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction, index) => (
              <TableRow 
                key={transaction.id}
                sx={{ 
                  animation: index === 0 ? 'fadeIn 0.5s ease-in-out' : 'none',
                  '@keyframes fadeIn': {
                    from: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
                    to: { backgroundColor: 'transparent' }
                  },
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      {transaction.id.slice(0, 16)}...
                    </Typography>
                    <Tooltip title="Copy ID">
                      <IconButton size="small" onClick={() => handleCopy(transaction.id)}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={transaction.type.replace('_', ' ')}
                    size="small"
                    sx={{
                      backgroundColor: `${getTypeColor(transaction.type)}20`,
                      color: getTypeColor(transaction.type),
                      fontWeight: 500,
                      fontSize: '0.7rem',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatPhone(transaction.phoneNumber)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(transaction.amount)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    color={getStatusColor(transaction.status)}
                    size="small"
                    sx={{ fontWeight: 500, fontSize: '0.7rem' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                    {transaction.mpesaReceiptNumber || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
                    {formatDate(transaction.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="View Details">
                    <IconButton size="small" color="primary">
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
