import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ExportButton';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Home, FileCheck, TrendingUp, BarChart3, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BeautifulDonutChart } from '@/components/charts';
import { useState, useEffect } from 'react';
import API_BASE_URL from '@/lib/api';

interface BoothReport {
  booth: string;
  boothname: string;
  boothNo: number;
  booth_id: string;
  total_voters: number;
  total_families: number;
  male_voters: number;
  female_voters: number;
  verified_voters: number;
  surveys_completed: number;
  avg_age: number;
  completion_rate: number;
}

interface DashboardStats {
  totalFamilies: number;
  totalMembers: number;
  surveysCompleted: number;
  totalBooths: number;
}

export const ACReports = () => {
  const { acNumber } = useParams();
  const navigate = useNavigate();

  // API state
  const [boothReports, setBoothReports] = useState<BoothReport[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (acNumber) {
      fetchReports();
    }
  }, [acNumber]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch booth performance reports
      const [reportsResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/reports/${acNumber}/booth-performance`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/dashboard/stats/${acNumber}`, { credentials: 'include' })
      ]);

      if (!reportsResponse.ok) {
        throw new Error('Failed to fetch booth reports');
      }

      const reportsData = await reportsResponse.json();
      setBoothReports(reportsData.reports || []);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals from booth reports
  const totalVoters = boothReports.reduce((sum, b) => sum + b.total_voters, 0);
  const totalFamilies = stats?.totalFamilies || boothReports.reduce((sum, b) => sum + b.total_families, 0);
  const totalSurveys = stats?.surveysCompleted || boothReports.reduce((sum, b) => sum + b.surveys_completed, 0);
  const completionRate = totalVoters > 0 ? Math.round((totalSurveys / totalVoters) * 100) : 0;

  // Prepare data for charts
  const boothPerformanceData = boothReports.map(booth => ({
    booth: booth.boothname || `Booth ${booth.boothNo}`,
    voters: booth.total_voters,
    surveyed: booth.surveys_completed,
    completion: booth.completion_rate
  }));

  // Response distribution pie chart
  const responseDistribution = [
    { name: 'Completed', value: totalSurveys, color: '#22C55E' },
    { name: 'Pending', value: Math.max(0, totalVoters - totalSurveys), color: '#EAB308' },
  ];

  // Prepare data for export
  const exportData = {
    boothPerformance: boothReports,
    voters: totalVoters,
    families: totalFamilies,
    surveys: totalSurveys,
    booths: boothReports.length,
    completion: completionRate,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading reports...</span>
        </div>
      </DashboardLayout>
    );
  }

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

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Voters" value={totalVoters.toLocaleString()} icon={Users} variant="primary" />
          <StatCard title="Total Families" value={totalFamilies.toLocaleString()} icon={Home} variant="primary" />
          <StatCard title="Surveys Completed" value={totalSurveys.toLocaleString()} icon={FileCheck} variant="success" />
          <StatCard title="Completion Rate" value={`${completionRate}%`} icon={TrendingUp} variant="default" />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Booth-wise Voter Distribution</h3>
            {boothPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={boothPerformanceData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="booth" angle={-45} textAnchor="end" height={80} fontSize={10} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="voters" fill="hsl(var(--primary))" name="Total Voters" />
                  <Bar dataKey="surveyed" fill="hsl(var(--success))" name="Surveyed" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No booth data available
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Survey Response Distribution</h3>
            <BeautifulDonutChart
              data={responseDistribution}
              height={300}
              valueLabel="Voters"
              showMoreThreshold={4}
              disableOthersGrouping={true}
            />
          </Card>
        </div>

        {/* Booth Performance Table */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Booth-Level Performance
          </h3>
          {boothReports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Booth</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Total Voters</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Families</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Surveyed</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Completion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {boothReports.map((booth, idx) => (
                    <tr key={idx} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium">{booth.boothname || `Booth ${booth.boothNo}`}</td>
                      <td className="px-4 py-3 text-sm text-right">{booth.total_voters.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right">{booth.total_families.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right">{booth.surveys_completed.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 max-w-[100px]">
                            <div
                              className="bg-success h-2 rounded-full"
                              style={{ width: `${booth.completion_rate}%` }}
                            />
                          </div>
                          <span className="font-medium">{booth.completion_rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No booth performance data available
            </div>
          )}
        </Card>

        {/* Gender Distribution */}
        {boothReports.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Gender Distribution by Booth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={boothPerformanceData.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="booth" type="category" width={100} fontSize={10} />
                <Tooltip />
                <Legend />
                <Bar dataKey="voters" fill="hsl(var(--primary))" name="Voters" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
