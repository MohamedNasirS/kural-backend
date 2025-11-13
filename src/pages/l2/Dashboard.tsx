import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/ui/card';
import { Users, Home, FileCheck, MapPin, Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

export const L2Dashboard = () => {
  const { user } = useAuth();
  const acNumber = user?.assignedAC || 118;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
          <p className="text-xl text-muted-foreground">Assembly Constituency {acNumber} - Thondamuthur</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Voters" value="1,247" icon={Users} variant="primary" />
          <StatCard title="Total Families" value="342" icon={Home} variant="primary" />
          <StatCard title="Surveys Completed" value="156" icon={FileCheck} variant="success" />
          <StatCard title="Total Booths" value="89" icon={MapPin} variant="warning" />
        </div>

        <Separator />

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ActionButton
              icon={Users}
              title="Voter Manager"
              description="View & update voter details"
              href="/l2/voters"
            />
            <ActionButton
              icon={Home}
              title="Family Manager"
              description="Manage family records"
              href="/l2/families"
            />
            <ActionButton
              icon={FileCheck}
              title="Survey Manager"
              description="Complete or review surveys"
              href="/l2/surveys"
            />
            <ActionButton
              icon={Activity}
              title="Reports"
              description="View booth performance"
              href="/l2/live-updates"
            />
          </div>
        </div>

        <Separator />

        {/* Booth Status Monitor */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Booth Status Monitor</h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Booth #</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Assigned Agent</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Voters</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Surveys</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { booth: '1', location: 'Government School, Main Road', agent: 'Rajesh Kumar', voters: 145, surveys: 89, status: 'Active' },
                    { booth: '2', location: 'Community Hall, West Street', agent: 'Priya Sharma', voters: 132, surveys: 76, status: 'Active' },
                    { booth: '3', location: 'Primary School, East Area', agent: 'Arun Patel', voters: 156, surveys: 92, status: 'Active' },
                  ].map((row) => (
                    <tr key={row.booth} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium">{row.booth}</td>
                      <td className="px-4 py-3 text-sm">{row.location}</td>
                      <td className="px-4 py-3 text-sm">{row.agent}</td>
                      <td className="px-4 py-3 text-sm">{row.voters}</td>
                      <td className="px-4 py-3 text-sm">{row.surveys}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};
