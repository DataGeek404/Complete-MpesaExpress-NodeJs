import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { 
  TrendingUp, 
  CheckCircle, 
  HourglassEmpty, 
  Cancel,
  AccountBalance
} from '@mui/icons-material';
import { TransactionStats } from '@/types/transaction';

interface StatsCardsProps {
  stats: TransactionStats;
}

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color: string;
}) => (
  <Card 
    sx={{ 
      height: '100%',
      background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
      border: `1px solid ${color}30`,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 8px 24px ${color}20`,
      }
    }}
  >
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ color }}>
            {value}
          </Typography>
        </Box>
        <Box 
          sx={{ 
            p: 1.5, 
            borderRadius: 2, 
            backgroundColor: `${color}20`,
            color 
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const StatsCards = ({ stats }: StatsCardsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 3 }}>
      <StatCard
        title="Total Transactions"
        value={stats.total}
        icon={<TrendingUp />}
        color="#6366f1"
      />
      <StatCard
        title="Completed"
        value={stats.completed}
        icon={<CheckCircle />}
        color="#10b981"
      />
      <StatCard
        title="Pending"
        value={stats.pending}
        icon={<HourglassEmpty />}
        color="#f59e0b"
      />
      <StatCard
        title="Failed"
        value={stats.failed}
        icon={<Cancel />}
        color="#ef4444"
      />
      <StatCard
        title="Total Amount"
        value={formatCurrency(stats.totalAmount)}
        icon={<AccountBalance />}
        color="#8b5cf6"
      />
    </Box>
  );
};
