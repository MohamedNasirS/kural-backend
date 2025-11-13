import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ExportButton';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Home, FileCheck, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';

const boothPerformance = [
  { booth: 'B-101', voters: 245, surveyed: 189, completion: 77.1 },
  { booth: 'B-102', voters: 312, surveyed: 243, completion: 77.9 },
  { booth: 'B-103', voters: 198, surveyed: 142, completion: 71.7 },
  { booth: 'B-104', voters: 267, surveyed: 201, completion: 75.3 },
  { booth: 'B-105', voters: 225, surveyed: 162, completion: 72.0 },
];

const surveyQuestions = [
  { question: 'Party Preference', responses: 423, percentage: 85 },
  { question: 'Key Issues', responses: 412, percentage: 83 },
  { question: 'Infrastructure Needs', responses: 389, percentage: 78 },
  { question: 'Employment Status', responses: 401, percentage: 81 },
];

const agentPerformance = [
  { name: 'Agent A', surveys: 145, quality: 92 },
  { name: 'Agent B', surveys: 128, quality: 88 },
  { name: 'Agent C', surveys: 137, quality: 90 },
  { name: 'Agent D', surveys: 119, quality: 85 },
  { name: 'Agent E', surveys: 108, quality: 87 },
];

const weeklyTrend = [
  { week: 'Week 1', completed: 98 },
  { week: 'Week 2', completed: 142 },
  { week: 'Week 3', completed: 167 },
  { week: 'Week 4', completed: 189 },
  { week: 'Week 5', completed: 156 },
];

const responseDistribution = [
  { name: 'Completed', value: 752, color: 'hsl(var(--success))' },
  { name: 'In Progress', value: 123, color: 'hsl(var(--warning))' },
  { name: 'Pending', value: 372, color: 'hsl(var(--muted))' },
];

export const ACReports = () => {
  const { acNumber } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Prepare data for export
  const exportData = {
    boothPerformance,
    surveyQuestions,
    agentPerformance,
    weeklyTrend,
    responseDistribution,
    voters: 1247,
    families: 342,
    surveys: 752,
    booths: 5,
    completion: 60.3,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/l1/ac/${acNumber}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold">Performance Reports</h1>
              <p className="text-muted-foreground">AC {acNumber} - Comprehensive analytics and statistics</p>
            </div>
          </div>
          <ExportButton 
            data={exportData}
            filename={`AC-${acNumber}-Report`}
            acNumber={acNumber}
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Voters" value="1,247" icon={Users} variant="primary" />
          <StatCard title="Total Families" value="342" icon={Home} variant="primary" />
          <StatCard title="Surveys Completed" value="752" icon={FileCheck} variant="success" />
          <StatCard title="Completion Rate" value="60.3%" icon={TrendingUp} variant="default" />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Survey Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="hsl(var(--primary))" strokeWidth={2} name="Completed Surveys" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Response Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={responseDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {responseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Booth Performance Table */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Booth-Level Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Booth ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Total Voters</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Surveyed</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Completion %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {boothPerformance.map((booth) => (
                  <tr key={booth.booth} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium">{booth.booth}</td>
                    <td className="px-4 py-3 text-sm">{booth.voters}</td>
                    <td className="px-4 py-3 text-sm">{booth.surveyed}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 max-w-[100px]">
                          <div 
                            className="bg-success h-2 rounded-full" 
                            style={{ width: `${booth.completion}%` }}
                          />
                        </div>
                        <span className="font-medium">{booth.completion}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Additional Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Survey Question Coverage</h3>
            <div className="space-y-4">
              {surveyQuestions.map((q, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{q.question}</span>
                    <span className="text-muted-foreground">{q.responses} responses</span>
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${q.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Agent Performance Summary</h3>
            <div className="space-y-3">
              {agentPerformance.map((agent, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-sm text-muted-foreground">{agent.surveys} surveys completed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-success">{agent.quality}%</p>
                    <p className="text-xs text-muted-foreground">Quality Score</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};