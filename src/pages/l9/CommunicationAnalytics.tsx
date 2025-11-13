import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { Phone, Mail, MessageSquare, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const channelPerformance = [
  { channel: 'Door-to-Door', contacts: 125000, conversions: 98000, rate: 78 },
  { channel: 'Phone Calls', contacts: 85000, conversions: 59500, rate: 70 },
  { channel: 'WhatsApp', contacts: 142000, conversions: 113600, rate: 80 },
  { channel: 'SMS', contacts: 95000, conversions: 66500, rate: 70 },
  { channel: 'Email', contacts: 48000, conversions: 31200, rate: 65 },
];

const dailyOutreach = [
  { date: 'Jan 20', calls: 8500, doorToDoor: 12000, messages: 15000 },
  { date: 'Jan 21', calls: 9200, doorToDoor: 13500, messages: 16500 },
  { date: 'Jan 22', calls: 8800, doorToDoor: 11800, messages: 14800 },
  { date: 'Jan 23', calls: 10500, doorToDoor: 14200, messages: 18000 },
  { date: 'Jan 24', calls: 9800, doorToDoor: 13800, messages: 17200 },
];

const responseQuality = [
  { name: 'Positive Response', value: 68, color: 'hsl(var(--success))' },
  { name: 'Neutral Response', value: 22, color: 'hsl(var(--muted))' },
  { name: 'Negative Response', value: 7, color: 'hsl(var(--destructive))' },
  { name: 'No Response', value: 3, color: 'hsl(var(--muted-foreground))' },
];

const callCenterMetrics = [
  { metric: 'Total Calls', value: '42,500' },
  { metric: 'Avg Call Duration', value: '4.2 min' },
  { metric: 'Call Success Rate', value: '82%' },
  { metric: 'Follow-ups Scheduled', value: '8,450' },
];

const CommunicationAnalytics = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Communication & Outreach Analytics</h1>
          <p className="text-muted-foreground mt-2">Multi-channel campaign communication performance</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Contacts" value="495K" icon={Users} variant="primary" />
          <StatCard title="Avg Conversion" value="74%" icon={Phone} variant="success" />
          <StatCard title="Messages Sent" value="142K" icon={MessageSquare} subtitle="This week" />
          <StatCard title="Email Open Rate" value="65%" icon={Mail} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Channel-wise Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="channel" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="contacts" fill="hsl(var(--primary))" name="Total Contacts" />
                  <Bar dataKey="conversions" fill="hsl(var(--success))" name="Successful Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Quality Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={responseQuality}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {responseQuality.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Outreach Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyOutreach}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calls" stroke="hsl(var(--primary))" strokeWidth={2} name="Phone Calls" />
                <Line type="monotone" dataKey="doorToDoor" stroke="hsl(var(--success))" strokeWidth={2} name="Door-to-Door" />
                <Line type="monotone" dataKey="messages" stroke="hsl(var(--warning))" strokeWidth={2} name="Messages" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Call Center Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {callCenterMetrics.map((item) => (
                  <div key={item.metric} className="flex justify-between items-center p-3 bg-accent/50 rounded-lg">
                    <span className="text-muted-foreground">{item.metric}</span>
                    <span className="font-semibold text-lg">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Channel Conversion Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {channelPerformance.map((channel) => (
                  <div key={channel.channel}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{channel.channel}</span>
                      <span className="text-sm font-semibold">{channel.rate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${channel.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CommunicationAnalytics;
