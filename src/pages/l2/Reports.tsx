import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Home, FileCheck, TrendingUp, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ExportButton } from '@/components/ExportButton';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const boothPerformance = [
  { booth: 'Booth 1', voters: 145, surveyed: 89, completion: 61.4 },
  { booth: 'Booth 2', voters: 132, surveyed: 76, completion: 57.6 },
  { booth: 'Booth 3', voters: 156, surveyed: 92, completion: 59.0 },
];

export const Reports = () => {
  const { user } = useAuth();
  const acNumber = user?.assignedAC || 118;
  const [boothFilter, setBoothFilter] = useState<string>('all');

  // Get unique booths for filter options
  const uniqueBooths = Array.from(new Set(boothPerformance.map(item => item.booth)));

  // Filter booth performance data
  const filteredBoothPerformance = boothPerformance.filter(item => {
    return boothFilter === 'all' || item.booth === boothFilter;
  });

  // Prepare data for export
  const exportData = {
    voters: 1247,
    surveys: 156,
    completion: 12.5,
    booths: 3,
    boothPerformance: filteredBoothPerformance,
    surveyQuestions: [
      { question: 'Which party will you vote for?', responses: 89, percentage: 57 },
      { question: 'What is your primary concern?', responses: 76, percentage: 49 },
      { question: 'Rate government performance', responses: 54, percentage: 35 },
    ],
    agentPerformance: [
      { name: 'Rajesh Kumar', surveys: 89, quality: 92, booth: 'Booth 1' },
      { name: 'Priya Sharma', surveys: 76, quality: 88, booth: 'Booth 2' },
      { name: 'Arun Patel', surveys: 92, quality: 95, booth: 'Booth 3' },
    ],
    weeklyTrend: [
      { week: 'Week 1', completed: 24 },
      { week: 'Week 2', completed: 32 },
      { week: 'Week 3', completed: 45 },
      { week: 'Week 4', completed: 55 },
    ],
    responseDistribution: [
      { name: 'Surveyed', value: 156 },
      { name: 'Pending', value: 872 },
      { name: 'Not Contacted', value: 219 },
    ],
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Reports & Analytics</h1>
            <p className="text-muted-foreground">Performance data for AC {acNumber} - Thondamuthur</p>
          </div>
          <div className="flex gap-2">
            <Select value={boothFilter} onValueChange={setBoothFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Booth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Booths</SelectItem>
                {uniqueBooths.map((booth) => (
                  <SelectItem key={booth} value={booth}>{booth}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton 
              data={exportData}
              filename={`AC-${acNumber}-Performance-Report`}
              acNumber={acNumber?.toString()}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Voters" value="1,247" icon={Users} variant="primary" />
          <StatCard title="Surveys Completed" value="156" icon={FileCheck} variant="success" />
          <StatCard title="Completion Rate" value="12.5%" icon={TrendingUp} variant="warning" />
          <StatCard title="Active Booths" value="3" icon={Home} variant="primary" />
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Booth Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Booth</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Total Voters</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Surveyed</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Completion %</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBoothPerformance.length > 0 ? (
                  filteredBoothPerformance.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium">{row.booth}</td>
                      <td className="px-4 py-3 text-sm">{row.voters}</td>
                      <td className="px-4 py-3 text-sm">{row.surveyed}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{row.completion}%</td>
                      <td className="px-4 py-3">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-success h-2 rounded-full transition-all"
                            style={{ width: `${row.completion}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No booth data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Survey Question Distribution</h3>
            <div className="space-y-4">
              {[
                { question: 'Which party will you vote for?', responses: 89 },
                { question: 'What is your primary concern?', responses: 76 },
                { question: 'Rate government performance', responses: 54 },
              ].map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.question}</span>
                    <span className="text-muted-foreground">{item.responses} responses</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(item.responses / 156) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Agent Performance</h3>
            <div className="space-y-3">
              {[
                { name: 'Rajesh Kumar', surveys: 89, booth: 'Booth 1' },
                { name: 'Priya Sharma', surveys: 76, booth: 'Booth 2' },
                { name: 'Arun Patel', surveys: 92, booth: 'Booth 3' },
              ].map((agent, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.booth}</p>
                  </div>
                  <span className="text-sm font-semibold">{agent.surveys} surveys</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};