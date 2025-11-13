import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { Target, TrendingUp, Award, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';

const campaignHealth = [
  { category: 'Voter Outreach', score: 88 },
  { category: 'Digital Presence', score: 85 },
  { category: 'Ground Operations', score: 92 },
  { category: 'Resource Efficiency', score: 78 },
  { category: 'Team Performance', score: 86 },
  { category: 'Sentiment Trend', score: 82 },
];

const milestones = [
  { milestone: 'Voter Database Built', target: '500K', achieved: '485K', completion: 97, status: 'on-track' },
  { milestone: 'Door-to-Door Coverage', target: '80%', achieved: '76%', completion: 95, status: 'on-track' },
  { milestone: 'Digital Reach Target', target: '1M', achieved: '920K', completion: 92, status: 'on-track' },
  { milestone: 'Survey Completion', target: '200K', achieved: '194K', completion: 97, status: 'on-track' },
  { milestone: 'Volunteer Recruitment', target: '350', achieved: '337', completion: 96, status: 'on-track' },
];

const historicalComparison = [
  { metric: 'Voter Contact Rate', previous: 68, current: 78 },
  { metric: 'Campaign Reach', previous: 72, current: 85 },
  { metric: 'Volunteer Efficiency', previous: 75, current: 82 },
  { metric: 'Digital Engagement', previous: 65, current: 88 },
  { metric: 'Survey Response Rate', previous: 70, current: 78 },
];

const performanceTrend = [
  { month: 'Month 1', score: 65 },
  { month: 'Month 2', score: 72 },
  { month: 'Month 3', score: 78 },
  { month: 'Month 4', score: 85 },
  { month: 'Month 5', score: 88 },
];

const kpiMetrics = [
  { kpi: 'Overall Campaign Score', value: '85/100', status: 'excellent' },
  { kpi: 'Win Probability Index', value: '78%', status: 'good' },
  { kpi: 'Resource Utilization', value: '82%', status: 'good' },
  { kpi: 'Voter Satisfaction Score', value: '4.2/5', status: 'excellent' },
];

const SuccessMetrics = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Success Metrics & KPIs</h1>
          <p className="text-muted-foreground mt-2">Comprehensive performance tracking and benchmarking</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Campaign Health" value="85/100" icon={Activity} variant="success" />
          <StatCard title="Milestone Progress" value="95%" icon={Target} variant="primary" />
          <StatCard title="Performance Trend" value="+12%" icon={TrendingUp} variant="success" subtitle="vs last month" />
          <StatCard title="Benchmarks Met" value="18/20" icon={Award} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={campaignHealth}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Current Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Trend (Monthly)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--success))" strokeWidth={3} name="Campaign Score" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current vs Previous Campaign Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={historicalComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="previous" fill="hsl(var(--muted))" name="Previous Campaign" />
                <Bar dataKey="current" fill="hsl(var(--success))" name="Current Campaign" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Key Performance Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kpiMetrics.map((item) => (
                  <div key={item.kpi} className="flex justify-between items-center p-3 bg-accent/50 rounded-lg">
                    <span className="font-medium">{item.kpi}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{item.value}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'excellent' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Milestone Achievement Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {milestones.map((milestone) => (
                  <div key={milestone.milestone}>
                    <div className="flex justify-between mb-2">
                      <div>
                        <span className="font-medium text-sm">{milestone.milestone}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {milestone.achieved} / {milestone.target}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-success">{milestone.completion}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-success h-2 rounded-full transition-all"
                        style={{ width: `${milestone.completion}%` }}
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

export default SuccessMetrics;
