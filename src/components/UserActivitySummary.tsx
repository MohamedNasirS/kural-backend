import { useActivityLog } from '@/contexts/ActivityLogContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Activity, TrendingUp, Clock, Zap } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';

export const UserActivitySummary = () => {
  const { getActivitiesByUser } = useActivityLog();
  const { user } = useAuth();
  
  if (!user) return null;
  
  const userActivities = getActivitiesByUser(user.id);
  
  const todayCount = userActivities.filter(a => isToday(a.timestamp)).length;
  const weekCount = userActivities.filter(a => isThisWeek(a.timestamp)).length;
  const monthCount = userActivities.filter(a => isThisMonth(a.timestamp)).length;
  
  // Most frequent action
  const actionCounts: Record<string, number> = {};
  userActivities.forEach(a => {
    actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
  });
  const mostFrequent = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];
  
  // Last active
  const lastActivity = userActivities[0];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Your Activity Summary</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-accent/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Today</span>
          </div>
          <p className="text-2xl font-bold">{todayCount}</p>
        </div>
        <div className="bg-accent/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">This Week</span>
          </div>
          <p className="text-2xl font-bold">{weekCount}</p>
        </div>
        <div className="bg-accent/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">This Month</span>
          </div>
          <p className="text-2xl font-bold">{monthCount}</p>
        </div>
      </div>

      <div className="space-y-3">
        {mostFrequent && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Most Frequent Action</span>
            <Badge variant="outline">
              {mostFrequent[0]} ({mostFrequent[1]} times)
            </Badge>
          </div>
        )}
        {lastActivity && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Activity</span>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">{format(lastActivity.timestamp, 'MMM dd, HH:mm')}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
