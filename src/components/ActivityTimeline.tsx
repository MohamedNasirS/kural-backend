import { useActivityLog } from '@/contexts/ActivityLogContext';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { Activity, Clock } from 'lucide-react';

export const ActivityTimeline = ({ limit = 10 }: { limit?: number }) => {
  const { getRecentActivities } = useActivityLog();
  const activities = getRecentActivities(limit);

  const groupByDate = (acts: ReturnType<typeof getRecentActivities>) => {
    const groups: Record<string, ReturnType<typeof getRecentActivities>> = {};
    
    activities.forEach(activity => {
      let dateLabel: string;
      if (isToday(activity.timestamp)) {
        dateLabel = 'Today';
      } else if (isYesterday(activity.timestamp)) {
        dateLabel = 'Yesterday';
      } else {
        dateLabel = format(activity.timestamp, 'MMM dd, yyyy');
      }
      
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(activity);
    });
    
    return groups;
  };

  const groupedActivities = groupByDate(activities);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Recent Activity</h3>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, items]) => (
            <div key={date}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">{date}</h4>
              <div className="space-y-3 relative">
                <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                {items.map((activity, index) => (
                  <div key={activity.id} className="relative pl-8">
                    <div className="absolute left-0 top-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-background" />
                    </div>
                     <div className="bg-accent/50 rounded-lg p-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium break-words">{activity.details}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <p className="text-xs text-muted-foreground">{activity.userName}</p>
                            <span className="text-xs text-muted-foreground">•</span>
                            <Badge variant="outline" className="text-xs">
                              {activity.action}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {activity.entityType}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          {format(activity.timestamp, 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
