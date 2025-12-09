import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get transaction statistics
    const [
      totalResult,
      statusCounts,
      typeCounts,
      recentTransactions,
      todayStats,
      hourlyVolume,
    ] = await Promise.all([
      // Total transactions and amount
      query<any[]>(`
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount
        FROM transactions
      `),
      
      // Count by status
      query<any[]>(`
        SELECT status, COUNT(*) as count
        FROM transactions
        GROUP BY status
      `),
      
      // Count by type
      query<any[]>(`
        SELECT transaction_type, COUNT(*) as count
        FROM transactions
        GROUP BY transaction_type
      `),
      
      // Recent transactions (last 24 hours)
      query<any[]>(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
        FROM transactions
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `),
      
      // Today's stats
      query<any[]>(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as amount,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
          COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending
        FROM transactions
        WHERE DATE(created_at) = CURDATE()
      `),
      
      // Hourly volume (last 24 hours)
      query<any[]>(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as amount
        FROM transactions
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY hour
        ORDER BY hour ASC
      `),
    ]);
    
    // Process status counts
    const statusMap: Record<string, number> = {};
    statusCounts.forEach((row: any) => {
      statusMap[row.status] = row.count;
    });
    
    // Process type counts
    const typeMap: Record<string, number> = {};
    typeCounts.forEach((row: any) => {
      typeMap[row.transaction_type] = row.count;
    });
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalTransactions: totalResult[0]?.total_count || 0,
          totalAmount: parseFloat(totalResult[0]?.total_amount || 0),
          completedAmount: parseFloat(totalResult[0]?.completed_amount || 0),
        },
        byStatus: {
          completed: statusMap.completed || 0,
          pending: statusMap.pending || 0,
          failed: statusMap.failed || 0,
          cancelled: statusMap.cancelled || 0,
        },
        byType: {
          STK_PUSH: typeMap.STK_PUSH || 0,
          C2B: typeMap.C2B || 0,
          B2C: typeMap.B2C || 0,
        },
        last24Hours: {
          count: recentTransactions[0]?.count || 0,
          amount: parseFloat(recentTransactions[0]?.amount || 0),
        },
        today: {
          count: todayStats[0]?.count || 0,
          amount: parseFloat(todayStats[0]?.amount || 0),
          completed: todayStats[0]?.completed || 0,
          failed: todayStats[0]?.failed || 0,
          pending: todayStats[0]?.pending || 0,
        },
        hourlyVolume: hourlyVolume.map((row: any) => ({
          hour: row.hour,
          count: row.count,
          amount: parseFloat(row.amount),
        })),
      },
    });
  } catch (error: any) {
    logger.error('API_STATS', 'Failed to fetch statistics', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
