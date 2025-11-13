import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { Users, Award, Activity, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const topPerformers = [
  { name: 'Rajesh Kumar', level: 'L2', voters: 4500, surveys: 320, efficiency: 94, score: 4.8 },
  { name: 'Priya Sharma', level: 'L2', voters: 4200, surveys: 298, efficiency: 91, score: 4.7 },
  { name: 'Amit Patel', level: 'L1', voters: 8500, surveys: 580, efficiency: 88, score: 4.6 },
  { name: 'Sunita Verma', level: 'L2', voters: 3980, surveys: 285, efficiency: 89, score: 4.5 },
  { name: 'Vikram Singh', level: 'L2', voters: 4150, surveys: 302, efficiency: 92, score: 4.6 },
];

const levelPerformance = [
  { level: 'L1 (Coordinators)', agents: 12, avgEfficiency: 85, totalVoters: 95000 },
  { level: 'L2 (Moderators)', agents: 45, avgEfficiency: 88, totalVoters: 180000 },
  { level: 'L3 (Field Agents)', agents: 280, avgEfficiency: 82, totalVoters: 420000 },
];

const teamMetrics = [
  { metric: 'Response Time', score: 88 },
  { metric: 'Data Quality', score: 92 },
  { metric: 'Target Achievement', score: 85 },
  { metric: 'Team Collaboration', score: 90 },
  { metric: 'Initiative Taking', score: 78 },
  { metric: 'Problem Solving', score: 86 },
];

const workloadData = [
  { agent: 'Team A', assigned: 5200, completed: 4680, pending: 520 },
  { agent: 'Team B', assigned: 4800, completed: 4320, pending: 480 },
  { agent: 'Team C', assigned: 6100, completed: 5490, pending: 610 },
  { agent: 'Team D', assigned: 5500, completed: 4950, pending: 550 },
  { agent: 'Team E', assigned: 4200, completed: 3780, pending: 420 },
];

const TeamManagement = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team & Volunteer Management</h1>
          <p className="text-muted-foreground mt-2">Monitor team performance and optimize resource allocation</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Agents" value="337" icon={Users} variant="primary" />
          <StatCard title="Active Today" value="312" icon={Activity} variant="success" subtitle="93% active rate" />
          <StatCard title="Avg Efficiency" value="85%" icon={TrendingUp} />
          <StatCard title="Top Performers" value="28" icon={Award} subtitle="Above 90% efficiency" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Level-wise Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={levelPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="level" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="agents" fill="hsl(var(--primary))" name="Agents" />
                  <Bar yAxisId="right" dataKey="avgEfficiency" fill="hsl(var(--success))" name="Avg Efficiency %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Performance Radar</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={teamMetrics}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Team Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workload Distribution by Team</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agent" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="hsl(var(--success))" name="Completed" stackId="a" />
                <Bar dataKey="pending" fill="hsl(var(--warning))" name="Pending" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performers Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Rank</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Level</th>
                    <th className="text-right p-3">Voters Contacted</th>
                    <th className="text-right p-3">Surveys</th>
                    <th className="text-right p-3">Efficiency</th>
                    <th className="text-right p-3">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((performer, index) => (
                    <tr key={performer.name} className="border-b hover:bg-accent/50">
                      <td className="p-3">
                        <span className={`font-bold ${index === 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                          #{index + 1}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{performer.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                          {performer.level}
                        </span>
                      </td>
                      <td className="text-right p-3">{performer.voters.toLocaleString()}</td>
                      <td className="text-right p-3">{performer.surveys}</td>
                      <td className="text-right p-3">
                        <span className="text-success font-semibold">{performer.efficiency}%</span>
                      </td>
                      <td className="text-right p-3">
                        <span className="font-semibold">{performer.score} ⭐</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TeamManagement;
