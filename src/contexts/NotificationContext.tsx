import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'activity';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  getUnreadCount: () => number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Mock data generator
const generateMockNotifications = (userId: string, userRole: string): Notification[] => {
  const notifications: Notification[] = [];
  const now = new Date();

  if (userRole === 'L0') {
    notifications.push(
      {
        id: 'n1',
        type: 'success',
        title: 'System Update Complete',
        message: 'All database backups completed successfully',
        timestamp: new Date(now.getTime() - 5 * 60000),
        read: false,
        userId,
        metadata: { backupCount: 12 }
      },
      {
        id: 'n2',
        type: 'warning',
        title: 'High Server Load',
        message: 'Server CPU usage at 85% - consider scaling',
        timestamp: new Date(now.getTime() - 15 * 60000),
        read: false,
        userId,
        metadata: { cpu: 85 }
      },
      {
        id: 'n3',
        type: 'info',
        title: 'New Admin Created',
        message: 'ACIM for AC 118 was successfully created',
        timestamp: new Date(now.getTime() - 30 * 60000),
        read: true,
        userId,
        actionUrl: '/l0/users'
      }
    );
  } else if (userRole === 'L1') {
    notifications.push(
      {
        id: 'n4',
        type: 'success',
        title: 'Survey Milestone Reached',
        message: 'AC 101 has completed 200 surveys - 15% completion!',
        timestamp: new Date(now.getTime() - 10 * 60000),
        read: false,
        userId,
        actionUrl: '/l1/ac/101',
        metadata: { acNumber: 101, completion: 15 }
      },
      {
        id: 'n5',
        type: 'activity',
        title: 'New Agent Assigned',
        message: 'Agent Ramesh Kumar assigned to Booth 12',
        timestamp: new Date(now.getTime() - 25 * 60000),
        read: false,
        userId,
        actionUrl: '/l1/booth-agents'
      },
      {
        id: 'n6',
        type: 'warning',
        title: 'Low Survey Progress',
        message: 'AC 119 is behind target - only 8% completed',
        timestamp: new Date(now.getTime() - 45 * 60000),
        read: true,
        userId,
        actionUrl: '/l1/ac/119'
      }
    );
  } else if (userRole === 'L2') {
    notifications.push(
      {
        id: 'n7',
        type: 'success',
        title: 'Daily Target Achieved',
        message: 'You completed 25 surveys today!',
        timestamp: new Date(now.getTime() - 20 * 60000),
        read: false,
        userId,
        metadata: { count: 25 }
      },
      {
        id: 'n8',
        type: 'activity',
        title: 'New Family Added',
        message: 'Family of 5 members added to Booth 8',
        timestamp: new Date(now.getTime() - 35 * 60000),
        read: false,
        userId,
        actionUrl: '/l2/families'
      },
      {
        id: 'n9',
        type: 'info',
        title: 'Booth Status Updated',
        message: 'Booth 12 status changed to Active',
        timestamp: new Date(now.getTime() - 50 * 60000),
        read: true,
        userId,
        actionUrl: '/l2/booths'
      }
    );
  }

  return notifications;
};

export const NotificationProvider = ({ children, userId, userRole }: { children: ReactNode; userId: string; userRole: string }) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => 
    generateMockNotifications(userId, userRole)
  );

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `n_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast
    const toastFn = {
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      activity: toast.info,
    }[notification.type];

    toastFn(notification.title, {
      description: notification.message,
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const unreadCount = getUnreadCount();

  // Simulate real-time notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const messages = [
        { type: 'activity' as const, title: 'New Survey', message: 'Survey completed by agent' },
        { type: 'info' as const, title: 'System Update', message: 'Data sync completed' },
        { type: 'success' as const, title: 'Goal Achieved', message: 'Daily target reached' },
      ];
      const random = messages[Math.floor(Math.random() * messages.length)];
      
      if (Math.random() > 0.7) { // 30% chance every minute
        addNotification({
          ...random,
          userId,
        });
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [userId, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        getUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
