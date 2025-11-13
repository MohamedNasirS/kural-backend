import { DashboardLayout } from '@/components/DashboardLayout';
import { ActivityLog } from '@/components/ActivityLog';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { UserActivitySummary } from '@/components/UserActivitySummary';

export default function ActivityLogs() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-muted-foreground mt-2">
            Track activities across all managed Assembly Constituencies
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <ActivityLog />
          </div>
          <div className="space-y-6 order-1 lg:order-2">
            <UserActivitySummary />
            <ActivityTimeline limit={8} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
