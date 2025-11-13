import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { Users, Target, MessageSquare, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const voterSegments = [
  { segment: 'Youth (18-25)', size: 28500, engagement: 72, priority: 'High', message: 'Education & Jobs' },
  { segment: 'Working Class', size: 42300, engagement: 68, priority: 'High', message: 'Economic Growth' },
  { segment: 'Women Voters', size: 38700, engagement: 75, priority: 'Critical', message: 'Safety & Welfare' },
  { segment: 'Senior Citizens', size: 19200, engagement: 82, priority: 'Medium', message: 'Healthcare & Pension' },
  { segment: 'Rural Farmers', size: 31500, engagement: 65, priority: 'High', message: 'Agriculture Support' },
];

const messageEffectiveness = [
  { message: 'Economic Development', effectiveness: 85, reach: 45000 },
  { message: 'Healthcare Reform', effectiveness: 78, reach: 38000 },
  { message: 'Education Quality', effectiveness: 82, reach: 42000 },
  { message: 'Infrastructure', effectiveness: 70, reach: 35000 },
  { message: 'Women Safety', effectiveness: 88, reach: 40000 },
];

const audienceDistribution = [
  { name: 'Committed Supporters', value: 35, color: 'hsl(var(--success))' },
  { name: 'Swing Voters', value: 42, color: 'hsl(var(--warning))' },
  { name: 'Opposition Leaning', value: 18, color: 'hsl(var(--destructive))' },
  { name: 'Undecided', value: 5, color: 'hsl(var(--muted))' },
];

const MicroTargeting = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Micro-Targeting & Personalization</h1>
          <p className="text-muted-foreground mt-2">Precision targeting for maximum campaign impact</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Target Segments" value="15" icon={Target} variant="primary" />
          <StatCard title="Personalized Messages" value="42" icon={MessageSquare} variant="success" />
          <StatCard title="Avg Engagement" value="73%" icon={TrendingUp} />
          <StatCard title="Reach Coverage" value="89%" icon={Users} subtitle="of target voters" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Voter Audience Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={audienceDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {audienceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Effectiveness by Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={messageEffectiveness} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="message" type="category" width={120} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="effectiveness" fill="hsl(var(--primary))" name="Effectiveness %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Voter Segment Intelligence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Segment</th>
                    <th className="text-right p-3">Size</th>
                    <th className="text-right p-3">Engagement</th>
                    <th className="text-left p-3">Priority</th>
                    <th className="text-left p-3">Key Message</th>
                  </tr>
                </thead>
                <tbody>
                  {voterSegments.map((segment) => (
                    <tr key={segment.segment} className="border-b hover:bg-accent/50">
                      <td className="p-3 font-medium">{segment.segment}</td>
                      <td className="text-right p-3">{segment.size.toLocaleString()}</td>
                      <td className="text-right p-3">{segment.engagement}%</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          segment.priority === 'Critical' ? 'bg-destructive/20 text-destructive' :
                          segment.priority === 'High' ? 'bg-warning/20 text-warning' :
                          'bg-muted/50 text-muted-foreground'
                        }`}>
                          {segment.priority}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{segment.message}</td>
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

export default MicroTargeting;
