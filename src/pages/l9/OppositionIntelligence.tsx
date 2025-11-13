import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { Shield, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const competitorComparison = [
  { metric: 'Ground Presence', us: 85, opponent1: 72, opponent2: 65 },
  { metric: 'Digital Reach', us: 88, opponent1: 75, opponent2: 68 },
  { metric: 'Public Sentiment', us: 78, opponent1: 65, opponent2: 58 },
  { metric: 'Media Coverage', us: 82, opponent1: 78, opponent2: 62 },
  { metric: 'Resource Base', us: 90, opponent1: 85, opponent2: 70 },
  { metric: 'Volunteer Strength', us: 87, opponent1: 68, opponent2: 60 },
];

const opponentActivity = [
  { date: 'Week 1', rallies: 12, digitalCampaigns: 8, mediaAppearances: 15 },
  { date: 'Week 2', rallies: 15, digitalCampaigns: 12, mediaAppearances: 18 },
  { date: 'Week 3', rallies: 10, digitalCampaigns: 15, mediaAppearances: 14 },
  { date: 'Week 4', rallies: 18, digitalCampaigns: 10, mediaAppearances: 20 },
];

const swotAnalysis = [
  { category: 'Strengths', items: ['Strong ground network', 'High volunteer engagement', 'Positive sentiment trend', 'Effective digital strategy'] },
  { category: 'Weaknesses', items: ['Limited rural penetration', 'Lower media coverage in some regions', 'Resource constraints in AC-004'] },
  { category: 'Opportunities', items: ['Swing voter segments identified', 'Opposition messaging gaps', 'Emerging local issues'] },
  { category: 'Threats', items: ['Aggressive opponent spending', 'Negative campaigning trends', 'Third-party spoiler effect'] },
];

const pollingTrends = [
  { survey: 'Survey 1', us: 42, opponent1: 38, opponent2: 15, undecided: 5 },
  { survey: 'Survey 2', us: 44, opponent1: 36, opponent2: 14, undecided: 6 },
  { survey: 'Survey 3', us: 46, opponent1: 35, opponent2: 13, undecided: 6 },
  { survey: 'Survey 4', us: 48, opponent1: 34, opponent2: 12, undecided: 6 },
];

const OppositionIntelligence = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Opposition Intelligence</h1>
          <p className="text-muted-foreground mt-2">Comprehensive competitor analysis and strategic insights</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Lead Margin" value="+14%" icon={TrendingDown} variant="success" subtitle="vs strongest opponent" />
          <StatCard title="Competitive Threats" value="3" icon={AlertTriangle} variant="warning" />
          <StatCard title="Strategic Advantages" value="8" icon={Shield} variant="primary" />
          <StatCard title="Target Gaps" value="12" icon={Target} subtitle="Opponent weaknesses" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Party Comparative Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={competitorComparison}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Our Campaign" dataKey="us" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.6} />
                  <Radar name="Opponent 1" dataKey="opponent1" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.3} />
                  <Radar name="Opponent 2" dataKey="opponent2" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Polling Trends Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pollingTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="survey" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="us" stroke="hsl(var(--success))" strokeWidth={3} name="Our Campaign" />
                  <Line type="monotone" dataKey="opponent1" stroke="hsl(var(--warning))" strokeWidth={2} name="Opponent 1" />
                  <Line type="monotone" dataKey="opponent2" stroke="hsl(var(--destructive))" strokeWidth={2} name="Opponent 2" />
                  <Line type="monotone" dataKey="undecided" stroke="hsl(var(--muted))" strokeWidth={1} strokeDasharray="5 5" name="Undecided" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Opposition Activity Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={opponentActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="rallies" fill="hsl(var(--primary))" name="Rallies" />
                <Bar dataKey="digitalCampaigns" fill="hsl(var(--success))" name="Digital Campaigns" />
                <Bar dataKey="mediaAppearances" fill="hsl(var(--warning))" name="Media Appearances" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SWOT Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {swotAnalysis.map((section) => (
                <div key={section.category} className="p-4 border rounded-lg">
                  <h3 className={`font-semibold text-lg mb-3 ${
                    section.category === 'Strengths' ? 'text-success' :
                    section.category === 'Weaknesses' ? 'text-destructive' :
                    section.category === 'Opportunities' ? 'text-primary' :
                    'text-warning'
                  }`}>
                    {section.category}
                  </h3>
                  <ul className="space-y-2">
                    {section.items.map((item, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OppositionIntelligence;
