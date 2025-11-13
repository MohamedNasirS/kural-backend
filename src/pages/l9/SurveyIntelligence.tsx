import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { FileText, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const surveyCompletion = [
  { survey: 'Voter Preference', responses: 42500, target: 50000, quality: 92 },
  { survey: 'Issue Priority', responses: 38200, target: 45000, quality: 88 },
  { survey: 'Candidate Perception', responses: 35800, target: 40000, quality: 90 },
  { survey: 'Local Concerns', responses: 48900, target: 50000, quality: 85 },
  { survey: 'Media Consumption', responses: 28500, target: 35000, quality: 87 },
];

const responsePatterns = [
  { name: 'Complete Responses', value: 78, color: 'hsl(var(--success))' },
  { name: 'Partial Responses', value: 15, color: 'hsl(var(--warning))' },
  { name: 'Incomplete/Abandoned', value: 7, color: 'hsl(var(--destructive))' },
];

const questionAnalysis = [
  { question: 'Top Issue Priority', positive: 72, neutral: 20, negative: 8 },
  { question: 'Candidate Favorability', positive: 68, neutral: 22, negative: 10 },
  { question: 'Party Preference', positive: 65, neutral: 25, negative: 10 },
  { question: 'Local Development', positive: 58, neutral: 28, negative: 14 },
  { question: 'Voting Intention', positive: 70, neutral: 18, negative: 12 },
];

const surveyTrend = [
  { week: 'Week 1', responses: 8500, quality: 85 },
  { week: 'Week 2', responses: 12200, quality: 87 },
  { week: 'Week 3', responses: 15800, quality: 89 },
  { week: 'Week 4', responses: 18500, quality: 90 },
  { week: 'Week 5', responses: 16900, quality: 88 },
];

const SurveyIntelligence = () => {
  const totalResponses = surveyCompletion.reduce((sum, item) => sum + item.responses, 0);
  const avgQuality = (surveyCompletion.reduce((sum, item) => sum + item.quality, 0) / surveyCompletion.length).toFixed(1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Survey Intelligence</h1>
          <p className="text-muted-foreground mt-2">Deep-dive analysis of survey responses and patterns</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Responses" value={totalResponses.toLocaleString()} icon={FileText} variant="primary" />
          <StatCard title="Avg Quality Score" value={`${avgQuality}%`} icon={CheckCircle} variant="success" />
          <StatCard title="Active Surveys" value="5" icon={TrendingUp} />
          <StatCard title="Completion Rate" value="78%" icon={AlertCircle} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Response Pattern Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={responsePatterns}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {responsePatterns.map((entry, index) => (
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
              <CardTitle>Weekly Survey Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={surveyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="responses" stroke="hsl(var(--primary))" strokeWidth={2} name="Responses" />
                  <Line yAxisId="right" type="monotone" dataKey="quality" stroke="hsl(var(--success))" strokeWidth={2} name="Quality %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Question-Level Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={questionAnalysis} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="question" type="category" width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="positive" stackId="a" fill="hsl(var(--success))" name="Positive %" />
                <Bar dataKey="neutral" stackId="a" fill="hsl(var(--muted))" name="Neutral %" />
                <Bar dataKey="negative" stackId="a" fill="hsl(var(--destructive))" name="Negative %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Survey Completion Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Survey Name</th>
                    <th className="text-right p-3">Responses</th>
                    <th className="text-right p-3">Target</th>
                    <th className="text-right p-3">Progress</th>
                    <th className="text-right p-3">Quality Score</th>
                  </tr>
                </thead>
                <tbody>
                  {surveyCompletion.map((survey) => {
                    const progress = ((survey.responses / survey.target) * 100).toFixed(1);
                    return (
                      <tr key={survey.survey} className="border-b hover:bg-accent/50">
                        <td className="p-3 font-medium">{survey.survey}</td>
                        <td className="text-right p-3">{survey.responses.toLocaleString()}</td>
                        <td className="text-right p-3">{survey.target.toLocaleString()}</td>
                        <td className="text-right p-3">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`${Number(progress) >= 90 ? 'text-success' : 'text-muted-foreground'}`}>
                              {progress}%
                            </span>
                          </div>
                        </td>
                        <td className="text-right p-3">
                          <span className="text-success font-semibold">{survey.quality}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SurveyIntelligence;
