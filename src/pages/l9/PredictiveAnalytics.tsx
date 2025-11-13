import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { TrendingUp, Target, Activity, BarChart3 } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const turnoutForecast = [
  { date: 'Week 1', predicted: 45, actual: 42, confidence: 85 },
  { date: 'Week 2', predicted: 58, actual: 56, confidence: 87 },
  { date: 'Week 3', predicted: 68, actual: 65, confidence: 89 },
  { date: 'Week 4', predicted: 76, actual: null, confidence: 91 },
  { date: 'E-Day', predicted: 82, actual: null, confidence: 88 },
];

const winProbability = [
  { factor: 'Ground Game', current: 78, target: 85 },
  { factor: 'Digital Reach', current: 85, target: 90 },
  { factor: 'Voter Sentiment', current: 72, target: 80 },
  { factor: 'Resource Allocation', current: 88, target: 92 },
  { factor: 'Opposition Analysis', current: 75, target: 82 },
  { factor: 'Media Coverage', current: 80, target: 88 },
];

const scenarioData = [
  { scenario: 'Best Case', winProbability: 92, seats: 145, voteShare: 48 },
  { scenario: 'Expected', winProbability: 78, seats: 128, voteShare: 42 },
  { scenario: 'Worst Case', winProbability: 65, seats: 108, voteShare: 38 },
];

const PredictiveAnalytics = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Predictive Analytics & Forecasting</h1>
          <p className="text-muted-foreground mt-2">AI-powered predictions and trend forecasting</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Win Probability" value="78%" icon={Target} variant="primary" subtitle="+5% from last week" />
          <StatCard title="Predicted Turnout" value="82%" icon={TrendingUp} variant="success" />
          <StatCard title="Forecast Accuracy" value="91%" icon={Activity} subtitle="Model confidence" />
          <StatCard title="Days to Election" value="28" icon={BarChart3} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Turnout Forecast vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={turnoutForecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Predicted" />
                  <Area type="monotone" dataKey="actual" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.6} name="Actual" />
                  <Line type="monotone" dataKey="confidence" stroke="hsl(var(--warning))" name="Confidence %" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Strength Radar</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={winProbability}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="factor" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Current" dataKey="current" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                  <Radar name="Target" dataKey="target" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.3} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Scenario Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {scenarioData.map((scenario) => (
                <div key={scenario.scenario} className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">{scenario.scenario}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Probability:</span>
                      <span className="font-semibold">{scenario.winProbability}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Projected Seats:</span>
                      <span className="font-semibold">{scenario.seats}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vote Share:</span>
                      <span className="font-semibold">{scenario.voteShare}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PredictiveAnalytics;
