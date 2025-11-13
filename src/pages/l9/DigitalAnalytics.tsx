import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { Share2, TrendingUp, MessageCircle, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

const socialMetrics = [
  { platform: 'Facebook', followers: 285000, engagement: 4.2, reach: 1200000 },
  { platform: 'Twitter/X', followers: 142000, engagement: 3.8, reach: 680000 },
  { platform: 'Instagram', followers: 198000, engagement: 5.6, reach: 920000 },
  { platform: 'WhatsApp', followers: 95000, engagement: 8.2, reach: 450000 },
  { platform: 'YouTube', followers: 76000, engagement: 6.4, reach: 380000 },
];

const engagementTrend = [
  { date: 'Jan 1', likes: 12500, shares: 3200, comments: 1800 },
  { date: 'Jan 8', likes: 15800, shares: 4100, comments: 2300 },
  { date: 'Jan 15', likes: 18200, shares: 5500, comments: 2900 },
  { date: 'Jan 22', likes: 21500, shares: 6800, comments: 3500 },
  { date: 'Jan 29', likes: 24800, shares: 7200, comments: 4100 },
];

const viralContent = [
  { content: 'Healthcare Initiative Video', views: 485000, engagement: 8.5, shares: 12500 },
  { content: 'Youth Town Hall Highlights', views: 392000, engagement: 7.2, shares: 9800 },
  { content: 'Agricultural Support Announcement', views: 368000, engagement: 6.9, shares: 8200 },
  { content: 'Women Safety Campaign', views: 445000, engagement: 9.1, shares: 14200 },
  { content: 'Infrastructure Development Plans', views: 312000, engagement: 5.8, shares: 6900 },
];

const sentimentData = [
  { week: 'W1', positive: 68, neutral: 22, negative: 10 },
  { week: 'W2', positive: 72, neutral: 20, negative: 8 },
  { week: 'W3', positive: 75, neutral: 18, negative: 7 },
  { week: 'W4', positive: 78, neutral: 16, negative: 6 },
];

const DigitalAnalytics = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Digital & Social Media Analytics</h1>
          <p className="text-muted-foreground mt-2">Real-time social media performance and digital outreach metrics</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Followers" value="796K" icon={Share2} variant="primary" subtitle="+12K this week" />
          <StatCard title="Avg Engagement" value="5.6%" icon={TrendingUp} variant="success" />
          <StatCard title="Total Reach" value="3.6M" icon={Eye} subtitle="Last 30 days" />
          <StatCard title="Viral Posts" value="24" icon={MessageCircle} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Platform-wise Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={socialMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="followers" fill="hsl(var(--primary))" name="Followers (K)" />
                  <Bar yAxisId="right" dataKey="engagement" fill="hsl(var(--success))" name="Engagement %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sentiment Analysis Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={sentimentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="positive" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="neutral" stackId="1" stroke="hsl(var(--muted))" fill="hsl(var(--muted))" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="negative" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Engagement Metrics Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="likes" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="shares" stroke="hsl(var(--success))" strokeWidth={2} />
                <Line type="monotone" dataKey="comments" stroke="hsl(var(--warning))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Content</th>
                    <th className="text-right p-3">Views</th>
                    <th className="text-right p-3">Engagement Rate</th>
                    <th className="text-right p-3">Shares</th>
                  </tr>
                </thead>
                <tbody>
                  {viralContent.map((item) => (
                    <tr key={item.content} className="border-b hover:bg-accent/50">
                      <td className="p-3 font-medium">{item.content}</td>
                      <td className="text-right p-3">{item.views.toLocaleString()}</td>
                      <td className="text-right p-3">
                        <span className={`${item.engagement >= 8 ? 'text-success font-semibold' : 'text-muted-foreground'}`}>
                          {item.engagement}%
                        </span>
                      </td>
                      <td className="text-right p-3">{item.shares.toLocaleString()}</td>
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

export default DigitalAnalytics;
