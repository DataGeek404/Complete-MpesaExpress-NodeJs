import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  FilterList,
  Refresh,
  FiberManualRecord,
  Pause,
  PlayArrow,
} from '@mui/icons-material';
import { TransactionStatus, TransactionType } from '@/types/transaction';

interface TransactionFiltersProps {
  filter: { status?: TransactionStatus; type?: TransactionType };
  setFilter: (filter: { status?: TransactionStatus; type?: TransactionType }) => void;
  isLive: boolean;
  toggleLive: () => void;
  onRefresh: () => void;
}

export const TransactionFilters = ({
  filter,
  setFilter,
  isLive,
  toggleLive,
  onRefresh,
}: TransactionFiltersProps) => {
  const handleStatusChange = (status: TransactionStatus | '') => {
    setFilter({ ...filter, status: status || undefined });
  };

  const handleTypeChange = (type: TransactionType | '') => {
    setFilter({ ...filter, type: type || undefined });
  };

  const clearFilters = () => {
    setFilter({});
  };

  const hasFilters = filter.status || filter.type;

  return (
    <Box 
      display="flex" 
      alignItems="center" 
      gap={2} 
      flexWrap="wrap"
      sx={{ mb: 2 }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <FilterList color="action" />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filter.status || ''}
            label="Status"
            onChange={(e) => handleStatusChange(e.target.value as TransactionStatus | '')}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={filter.type || ''}
            label="Type"
            onChange={(e) => handleTypeChange(e.target.value as TransactionType | '')}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="STK_PUSH">STK Push</MenuItem>
            <MenuItem value="C2B">C2B</MenuItem>
            <MenuItem value="B2C">B2C</MenuItem>
          </Select>
        </FormControl>

        {hasFilters && (
          <Button 
            size="small" 
            onClick={clearFilters}
            sx={{ textTransform: 'none' }}
          >
            Clear
          </Button>
        )}
      </Box>

      <Box display="flex" alignItems="center" gap={1} ml="auto">
        <Chip
          icon={
            <FiberManualRecord 
              sx={{ 
                fontSize: 12, 
                color: isLive ? '#10b981' : '#6b7280',
                animation: isLive ? 'pulse 1.5s infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 }
                }
              }} 
            />
          }
          label={isLive ? 'Live' : 'Paused'}
          variant="outlined"
          color={isLive ? 'success' : 'default'}
          size="small"
          sx={{ fontWeight: 500 }}
        />

        <Tooltip title={isLive ? 'Pause live updates' : 'Resume live updates'}>
          <IconButton 
            onClick={toggleLive}
            color={isLive ? 'success' : 'default'}
            size="small"
          >
            {isLive ? <Pause /> : <PlayArrow />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Refresh data">
          <IconButton onClick={onRefresh} size="small">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
