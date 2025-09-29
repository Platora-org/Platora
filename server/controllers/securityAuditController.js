import * as SecurityAuditModel from "../models/securityAuditModel.js";

// Get all security audit logs with filtering
export const getAllSecurityLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { 
      action, 
      userId, 
      startDate, 
      endDate, 
      ipAddress,
      page = 1, 
      limit = 50 
    } = req.query;

    const filters = {
      action,
      userId,
      startDate,
      endDate,
      ipAddress
    };

    // Get logs and total count
    const [logs, totalCount] = await Promise.all([
      SecurityAuditModel.getSecurityLogs(filters, page, limit),
      SecurityAuditModel.getSecurityLogsCount(filters)
    ]);

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      totalCount,
      hasNext: parseInt(page) * parseInt(limit) < totalCount,
      hasPrev: parseInt(page) > 1
    };

    res.json({
      success: true,
      logs,
      pagination
    });

  } catch (error) {
    console.error('Error fetching security logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security logs'
    });
  }
};

// Get security audit statistics
export const getSecurityStatistics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Get all statistics in parallel
    const [
      overview,
      actionBreakdown,
      suspiciousIps,
      recentHighRiskEvents,
      walletStatus
    ] = await Promise.all([
      SecurityAuditModel.getSecurityOverviewStats(),
      SecurityAuditModel.getActionBreakdown(),
      SecurityAuditModel.getSuspiciousIPs(),
      SecurityAuditModel.getHighRiskEvents(),
      SecurityAuditModel.getWalletStatusSummary()
    ]);

    res.json({
      success: true,
      statistics: {
        overview: {
          total_events: parseInt(overview.total_events),
          last_24h_events: parseInt(overview.last_24h_events),
          last_7d_events: parseInt(overview.last_7d_events),
          security_alerts: parseInt(overview.security_alerts),
          unique_users: parseInt(overview.unique_users),
          unique_ips: parseInt(overview.unique_ips)
        },
        actionBreakdown,
        suspiciousIps,
        recentHighRiskEvents,
        walletStatus
      }
    });

  } catch (error) {
    console.error('Error fetching security statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security statistics'
    });
  }
};

// Get security logs for a specific user
export const getUserSecurityLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    // Check if admin or same user
    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const logs = await SecurityAuditModel.getUserSecurityLogs(userId, limit);

    res.json({
      success: true,
      logs
    });

  } catch (error) {
    console.error('Error fetching user security logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user security logs'
    });
  }
};

// Get security events by IP address
export const getSecurityLogsByIP = async (req, res) => {
  try {
    const { ipAddress } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Get logs and summary in parallel
    const [logs, summary] = await Promise.all([
      SecurityAuditModel.getSecurityLogsByIP(ipAddress),
      SecurityAuditModel.getIPSummary(ipAddress)
    ]);

    res.json({
      success: true,
      logs,
      summary
    });

  } catch (error) {
    console.error('Error fetching security logs by IP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security logs by IP'
    });
  }
};

// Clear old security logs (admin only)
export const clearOldSecurityLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { days = 365 } = req.body; // Default: keep 1 year

    const deletedCount = await SecurityAuditModel.deleteOldSecurityLogs(days);

    // Log this cleanup action
    await SecurityAuditModel.logCleanupAction(
      req.user.id,
      deletedCount,
      days,
      req.ip
    );

    res.json({
      success: true,
      message: `Successfully cleared ${deletedCount} old security log entries`,
      deletedCount
    });

  } catch (error) {
    console.error('Error clearing old security logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear old security logs'
    });
  }
};

// Export security logs (admin only)
export const exportSecurityLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { startDate, endDate, format = 'json' } = req.query;

    const logs = await SecurityAuditModel.getSecurityLogsForExport(startDate, endDate);

    if (format === 'csv') {
      // Convert to CSV format
      const headers = ['ID', 'Action', 'User Email', 'User Name', 'Details', 'IP Address', 'Timestamp'];
      const csvData = [
        headers.join(','),
        ...logs.map(row => [
          row.id,
          `"${row.action}"`,
          `"${row.user_email || ''}"`,
          `"${row.first_name || ''} ${row.last_name || ''}"`,
          `"${(row.details || '').replace(/"/g, '""')}"`,
          row.ip_address || '',
          row.created_at
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=security_logs_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvData);
    } else {
      res.json({
        success: true,
        logs,
        exportInfo: {
          totalRecords: logs.length,
          exportDate: new Date().toISOString(),
          dateRange: {
            start: startDate || 'all',
            end: endDate || 'all'
          }
        }
      });
    }

  } catch (error) {
    console.error('Error exporting security logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export security logs'
    });
  }
};