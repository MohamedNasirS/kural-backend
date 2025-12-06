import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/ui/card';
import { Users, Home, FileCheck, TrendingUp, Loader2, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ExportButton } from '@/components/ExportButton';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
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
  acName?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c43'];

export const Reports = () => {
  const { user } = useAuth();
  const acNumber = user?.assignedAC || 119;
  const [boothFilter, setBoothFilter] = useState<string>('all');

  // API state
  const [boothReports, setBoothReports] = useState<BoothReport[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [acNumber]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

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

  // Get unique booths for filter options
  const uniqueBooths = boothReports.map(item => item.boothname || `Booth ${item.boothNo}`);

  // Filter booth performance data
  const filteredBoothPerformance = boothReports.filter(item => {
    const boothName = item.boothname || `Booth ${item.boothNo}`;
    return boothFilter === 'all' || boothName === boothFilter;
  });

  // Calculate totals
  const totalVoters = boothReports.reduce((sum, b) => sum + b.total_voters, 0);
  const totalFamilies = stats?.totalFamilies || boothReports.reduce((sum, b) => sum + b.total_families, 0);
  const totalSurveys = stats?.surveysCompleted || boothReports.reduce((sum, b) => sum + b.surveys_completed, 0);
  const totalMale = boothReports.reduce((sum, b) => sum + b.male_voters, 0);
  const totalFemale = boothReports.reduce((sum, b) => sum + b.female_voters, 0);
  const completionRate = totalVoters > 0 ? Math.round((totalSurveys / totalVoters) * 100 * 10) / 10 : 0;
  const pendingSurveys = totalVoters - totalSurveys;

  // Chart data preparations
  const genderDistributionData = [
    { name: 'Male', value: totalMale, color: '#3B82F6' },
    { name: 'Female', value: totalFemale, color: '#EC4899' },
  ];

  const surveyStatusData = [
    { name: 'Completed', value: totalSurveys, color: '#22C55E' },
    { name: 'Pending', value: pendingSurveys, color: '#EAB308' },
  ];

  const boothVoterData = boothReports.slice(0, 10).map(booth => ({
    name: booth.boothname?.substring(0, 15) || `Booth ${booth.boothNo}`,
    voters: booth.total_voters,
    surveyed: booth.surveys_completed,
    families: booth.total_families,
  }));

  const boothCompletionData = boothReports.slice(0, 10).map(booth => ({
    name: booth.boothname?.substring(0, 15) || `Booth ${booth.boothNo}`,
    completion: booth.completion_rate,
  }));

  // Top and bottom performing booths
  const sortedByCompletion = [...boothReports].sort((a, b) => b.completion_rate - a.completion_rate);
  const topPerformingBooths = sortedByCompletion.slice(0, 5);
  const needsAttentionBooths = sortedByCompletion.slice(-5).reverse();

  // Prepare data for export
  const exportData = {
    voters: totalVoters,
    surveys: totalSurveys,
    completion: completionRate,
    booths: boothReports.length,
    families: totalFamilies,
    maleVoters: totalMale,
    femaleVoters: totalFemale,
    boothPerformance: filteredBoothPerformance.map(b => ({
      booth: b.boothname || `Booth ${b.boothNo}`,
      voters: b.total_voters,
      surveyed: b.surveys_completed,
      completion: b.completion_rate
    })),
  };

  const acName = stats?.acName || user?.aciName || 'Assembly Constituency';

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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Reports & Analytics</h1>
            <p className="text-muted-foreground">Performance data for AC {acNumber} - {acName}</p>
          </div>
          <div className="flex gap-2">
            <Select value={boothFilter} onValueChange={setBoothFilter}>
              <SelectTrigger className="w-[250px]">
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
          <StatCard title="Completion Rate" value={`${completionRate}%`} icon={TrendingUp} variant={completionRate > 50 ? 'success' : 'warning'} />
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="booths">Booth Analysis</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Survey Status Pie Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  Survey Status Distribution
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={surveyStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {surveyStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{totalSurveys.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{pendingSurveys.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </Card>

              {/* Gender Distribution Pie Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Gender Distribution
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={genderDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {genderDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{totalMale.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Male Voters</p>
                  </div>
                  <div className="p-3 bg-pink-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-pink-600">{totalFemale.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Female Voters</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Booth Voter Bar Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Booth-wise Voter & Survey Distribution
              </h3>
              {boothVoterData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={boothVoterData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={11} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Bar dataKey="voters" fill="#3B82F6" name="Total Voters" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="surveyed" fill="#22C55E" name="Surveyed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="families" fill="#8B5CF6" name="Families" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                  No booth data available
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Booth Analysis Tab */}
          <TabsContent value="booths" className="space-y-6">
            {/* Completion Rate Bar Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Booth Completion Rates
              </h3>
              {boothCompletionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={boothCompletionData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={90} fontSize={11} />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Bar dataKey="completion" fill="#22C55E" name="Completion Rate" radius={[0, 4, 4, 0]}>
                      {boothCompletionData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.completion >= 70 ? '#22C55E' : entry.completion >= 40 ? '#EAB308' : '#EF4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                  No booth data available
                </div>
              )}
            </Card>

            {/* Booth Performance Table */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Detailed Booth Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Booth</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Voters</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Families</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Male</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Female</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Surveyed</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredBoothPerformance.length > 0 ? (
                      filteredBoothPerformance.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm font-medium">{row.boothname || `Booth ${row.boothNo}`}</td>
                          <td className="px-4 py-3 text-sm text-right">{row.total_voters.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right">{row.total_families.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right text-blue-600">{row.male_voters.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right text-pink-600">{row.female_voters.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right text-green-600">{row.surveys_completed.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Progress value={row.completion_rate} className="h-2 w-20" />
                              <span className={`text-sm font-semibold ${
                                row.completion_rate >= 70 ? 'text-green-600' :
                                row.completion_rate >= 40 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {row.completion_rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          No booth data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gender by Booth */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Gender Distribution by Booth</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {boothReports.slice(0, 10).map((booth, idx) => {
                    const malePercent = booth.total_voters > 0 ? (booth.male_voters / booth.total_voters) * 100 : 0;
                    const femalePercent = booth.total_voters > 0 ? (booth.female_voters / booth.total_voters) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate max-w-[200px]">{booth.boothname || `Booth ${booth.boothNo}`}</span>
                          <span className="text-muted-foreground">
                            M: {booth.male_voters} / F: {booth.female_voters}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3 flex overflow-hidden">
                          <div
                            className="bg-blue-500 h-3 transition-all"
                            style={{ width: `${malePercent}%` }}
                          />
                          <div
                            className="bg-pink-500 h-3 transition-all"
                            style={{ width: `${femalePercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Age Demographics (if available) */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Average Age by Booth</h3>
                {boothReports.some(b => b.avg_age > 0) ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={boothReports.slice(0, 10).map(b => ({
                      name: b.boothname?.substring(0, 12) || `B${b.boothNo}`,
                      age: b.avg_age
                    }))} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" fontSize={10} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="age" fill="#8B5CF6" name="Avg Age" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                    Age data not available
                  </div>
                )}
              </Card>
            </div>

            {/* Summary Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Demographics Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                  <p className="text-3xl font-bold text-blue-600">{totalMale.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Male Voters</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {totalVoters > 0 ? ((totalMale / totalVoters) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="p-4 bg-pink-500/10 rounded-lg text-center">
                  <p className="text-3xl font-bold text-pink-600">{totalFemale.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Female Voters</p>
                  <p className="text-xs text-pink-600 mt-1">
                    {totalVoters > 0 ? ((totalFemale / totalVoters) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="p-4 bg-purple-500/10 rounded-lg text-center">
                  <p className="text-3xl font-bold text-purple-600">{totalFamilies.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Families</p>
                  <p className="text-xs text-purple-600 mt-1">
                    ~{totalFamilies > 0 ? (totalVoters / totalFamilies).toFixed(1) : 0} per family
                  </p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-600">{boothReports.length}</p>
                  <p className="text-sm text-muted-foreground">Total Booths</p>
                  <p className="text-xs text-green-600 mt-1">
                    ~{boothReports.length > 0 ? Math.round(totalVoters / boothReports.length) : 0} voters/booth
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performing Booths */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-green-600">Top Performing Booths</h3>
                <div className="space-y-3">
                  {topPerformingBooths.map((booth, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{booth.boothname || `Booth ${booth.boothNo}`}</p>
                          <p className="text-xs text-muted-foreground">{booth.total_voters} voters</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-green-600">{booth.completion_rate}%</span>
                        <p className="text-xs text-muted-foreground">{booth.surveys_completed} surveyed</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Needs Attention Booths */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-red-600">Needs Attention</h3>
                <div className="space-y-3">
                  {needsAttentionBooths.map((booth, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-600 font-bold">
                          !
                        </div>
                        <div>
                          <p className="text-sm font-medium">{booth.boothname || `Booth ${booth.boothNo}`}</p>
                          <p className="text-xs text-muted-foreground">{booth.total_voters} voters</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-red-600">{booth.completion_rate}%</span>
                        <p className="text-xs text-muted-foreground">{booth.total_voters - booth.surveys_completed} pending</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Overall Progress */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Overall Survey Progress</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Completion</span>
                    <span className="font-semibold">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-4" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{totalVoters.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Target</p>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{totalSurveys.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="p-4 bg-yellow-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{pendingSurveys.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Remaining</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
