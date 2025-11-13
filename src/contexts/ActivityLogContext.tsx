import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';

export type ActivityAction = 'create' | 'update' | 'delete' | 'view' | 'export' | 'assign' | 'login' | 'logout';
export type EntityType = 'voter' | 'family' | 'survey' | 'booth' | 'agent' | 'form' | 'admin' | 'moderator';

export interface ActivityLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: 'L0' | 'L1' | 'L2' | 'L9';
  action: ActivityAction;
  entityType: EntityType;
  entityId?: string;
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  acNumber?: number;
}

interface ActivityLogContextType {
  activities: ActivityLog[];
  logActivity: (activity: Omit<ActivityLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => void;
  getActivitiesByUser: (userId: string) => ActivityLog[];
  getActivitiesByRole: (role: 'L0' | 'L1' | 'L2' | 'L9') => ActivityLog[];
  getRecentActivities: (limit?: number) => ActivityLog[];
  getFilteredActivities: (filters: {
    dateFrom?: Date;
    dateTo?: Date;
    action?: ActivityAction;
    entityType?: EntityType;
    userId?: string;
  }) => ActivityLog[];
}

const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined);

// Generate mock activity data
const generateMockActivities = (): ActivityLog[] => {
  const now = new Date();
  const activities: ActivityLog[] = [];

  const users = [
    { id: '1', name: 'Super Admin', role: 'L0' as const },
    { id: '2', name: 'ACIM Sharma', role: 'L1' as const },
    { id: '3', name: 'ACI Moderator', role: 'L2' as const },
  ];

  const actions: { action: ActivityAction; entityType: EntityType; details: string; acNumber?: number }[] = [
    { action: 'create', entityType: 'voter', details: 'Created new voter Rajesh Kumar', acNumber: 101 },
    { action: 'update', entityType: 'family', details: 'Updated family details for Singh household', acNumber: 118 },
    { action: 'create', entityType: 'survey', details: 'Completed survey for Booth 12', acNumber: 119 },
    { action: 'assign', entityType: 'agent', details: 'Assigned agent to Booth 8', acNumber: 121 },
    { action: 'export', entityType: 'voter', details: 'Exported voter data to CSV' },
    { action: 'view', entityType: 'booth', details: 'Viewed booth statistics', acNumber: 118 },
    { action: 'delete', entityType: 'survey', details: 'Deleted invalid survey entry', acNumber: 102 },
    { action: 'create', entityType: 'admin', details: 'Created new ACIM account' },
    { action: 'update', entityType: 'booth', details: 'Updated booth status to Active', acNumber: 123 },
    { action: 'login', entityType: 'voter', details: 'User logged in successfully' },
  ];

  for (let i = 0; i < 50; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days

    activities.push({
      id: `act_${i + 1}`,
      timestamp,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: action.action,
      entityType: action.entityType,
      entityId: `${action.entityType}_${Math.floor(Math.random() * 1000)}`,
      details: action.details,
      metadata: { timestamp: timestamp.toISOString() },
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      acNumber: action.acNumber,
    });
  }

  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export const ActivityLogProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>(() => generateMockActivities());

  const logActivity = useCallback((activity: Omit<ActivityLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => {
    if (!user) return;

    const newActivity: ActivityLog = {
      ...activity,
      id: `act_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
    };

    setActivities(prev => [newActivity, ...prev]);
  }, [user]);

  const getActivitiesByUser = useCallback((userId: string) => {
    return activities.filter(a => a.userId === userId);
  }, [activities]);

  const getActivitiesByRole = useCallback((role: 'L0' | 'L1' | 'L2' | 'L9') => {
    return activities.filter(a => a.userRole === role);
  }, [activities]);

  const getRecentActivities = useCallback((limit = 10) => {
    return activities.slice(0, limit);
  }, [activities]);

  const getFilteredActivities = useCallback((filters: {
    dateFrom?: Date;
    dateTo?: Date;
    action?: ActivityAction;
    entityType?: EntityType;
    userId?: string;
  }) => {
    let filtered = [...activities];

    if (filters.dateFrom) {
      filtered = filtered.filter(a => a.timestamp >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(a => a.timestamp <= filters.dateTo!);
    }
    if (filters.action) {
      filtered = filtered.filter(a => a.action === filters.action);
    }
    if (filters.entityType) {
      filtered = filtered.filter(a => a.entityType === filters.entityType);
    }
    if (filters.userId) {
      filtered = filtered.filter(a => a.userId === filters.userId);
    }

    // Apply RBAC filtering
    if (user?.role === 'L2') {
      // L2 users only see activities in their AC
      filtered = filtered.filter(a => 
        a.acNumber === user.assignedAC || a.userId === user.id
      );
    } else if (user?.role === 'L1') {
      // L1 users see activities in all ACs they manage (simplified: all ACs)
      // In real implementation, this would check against managed ACs
    }
    // L0 sees everything (no filter)

    return filtered;
  }, [activities, user]);

  return (
    <ActivityLogContext.Provider
      value={{
        activities,
        logActivity,
        getActivitiesByUser,
        getActivitiesByRole,
        getRecentActivities,
        getFilteredActivities,
      }}
    >
      {children}
    </ActivityLogContext.Provider>
  );
};

export const useActivityLog = () => {
  const context = useContext(ActivityLogContext);
  if (!context) {
    throw new Error('useActivityLog must be used within ActivityLogProvider');
  }
  return context;
};
