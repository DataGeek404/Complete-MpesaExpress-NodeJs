import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import {
  Box,
  Container,
  Typography,
  Paper,
  AppBar,
  Toolbar,
} from '@mui/material';
import { AccountBalanceWallet } from '@mui/icons-material';
import { useTransactions } from '@/hooks/useTransactions';
import { StatsCards } from './StatsCards';
import { TransactionTable } from './TransactionTable';
import { TransactionFilters } from './TransactionFilters';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
    },
    secondary: {
      main: '#10b981',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(148, 163, 184, 0.1)',
        },
      },
    },
  },
});

export const Dashboard = () => {
  const {
    transactions,
    stats,
    isLive,
    toggleLive,
    refreshTransactions,
    filter,
    setFilter,
  } = useTransactions();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            backgroundColor: 'background.paper',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          }}
        >
          <Toolbar>
            <AccountBalanceWallet sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
              M-Pesa Transaction Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Live Monitoring System
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box mb={4}>
            <StatsCards stats={stats} />
          </Box>

          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              backgroundColor: 'background.paper',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Recent Transactions
            </Typography>

            <TransactionFilters
              filter={filter}
              setFilter={setFilter}
              isLive={isLive}
              toggleLive={toggleLive}
              onRefresh={refreshTransactions}
            />

            <TransactionTable transactions={transactions} />
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};
