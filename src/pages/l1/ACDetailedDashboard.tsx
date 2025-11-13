import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Home, FileCheck, MapPin, UserCircle, Activity, Clock, UserPlus, TrendingUp, Calendar, LineChart } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart as RechartsLineChart, Line, AreaChart, Area } from 'recharts';
import { BoothDetailDrawer } from '@/components/BoothDetailDrawer';
import { AgentLeaderboard } from '@/components/AgentLeaderboard';
import { ExportButton } from '@/components/ExportButton';
import { ComparisonMetrics } from '@/components/ComparisonMetrics';

// Expanded mock data for all 21 ACs
const acData: Record<string, { name: string; voters: number; families: number; surveys: number; booths: number; completion: number }> = {
  '119': { name: 'Thondamuthur', voters: 1247, families: 342, surveys: 156, booths: 89, completion: 78 },
  '119': { name: 'Coimbatore North', voters: 2340, families: 678, surveys: 423, booths: 112, completion: 85 },
  '120': { name: 'Coimbatore South', voters: 1890, families: 534, surveys: 289, booths: 95, completion: 72 },
  '121': { name: 'Singanallur', voters: 2145, families: 598, surveys: 387, booths: 108, completion: 91 },
  '122': { name: 'Sulur', voters: 1678, families: 445, surveys: 234, booths: 82, completion: 65 },
  '123': { name: 'Kavundampalayam', voters: 1956, families: 521, surveys: 312, booths: 97, completion: 73 },
  '124': { name: 'Ganapathy', voters: 2234, families: 612, surveys: 445, booths: 115, completion: 88 },
  '125': { name: 'Podanur', voters: 1534, families: 389, surveys: 198, booths: 76, completion: 68 },
  '126': { name: 'Tirupur North', voters: 2456, families: 689, surveys: 478, booths: 123, completion: 92 },
  '127': { name: 'Tirupur South', voters: 2189, families: 601, surveys: 401, booths: 109, completion: 84 },
  '128': { name: 'Palladam', voters: 1823, families: 478, surveys: 267, booths: 88, completion: 70 },
  '129': { name: 'Udumalpet', voters: 1945, families: 534, surveys: 298, booths: 93, completion: 75 },
  '130': { name: 'Madathukulam', voters: 1567, families: 412, surveys: 189, booths: 71, completion: 62 },
  '131': { name: 'Pollachi', voters: 2378, families: 645, surveys: 456, booths: 118, completion: 89 },
  '132': { name: 'Valparai', voters: 1234, families: 298, surveys: 134, booths: 65, completion: 58 },
  '133': { name: 'Kinathukadavu', voters: 1678, families: 434, surveys: 223, booths: 79, completion: 67 },
  '134': { name: 'Anamalai', voters: 1890, families: 501, surveys: 278, booths: 91, completion: 71 },
  '135': { name: 'Mettupalayam', voters: 2023, families: 556, surveys: 334, booths: 101, completion: 77 },
  '136': { name: 'Avanashi', voters: 1756, families: 467, surveys: 245, booths: 84, completion: 69 },
  '137': { name: 'Dharapuram', voters: 2134, families: 589, surveys: 389, booths: 106, completion: 82 },
  '138': { name: 'Kangeyam', voters: 1845, families: 489, surveys: 256, booths: 87, completion: 66 },
};

const recentActivities = [
  { id: 1, text: 'Survey completed for Family #142', time: '5 minutes ago', type: 'survey' },
  { id: 2, text: 'Updated voter details: Rajesh Kumar', time: '12 minutes ago', type: 'voter' },
  { id: 3, text: 'New family registered: Family #143', time: '23 minutes ago', type: 'family' },
  { id: 4, text: 'Booth Agent assigned to Booth #45', time: '1 hour ago', type: 'booth' },
  { id: 5, text: 'Survey completed for Family #138', time: '2 hours ago', type: 'survey' },
];

const boothPerformanceData = [
  { booth: 'Booth 1', completion: 85, voters: 450 },
  { booth: 'Booth 2', completion: 72, voters: 520 },
  { booth: 'Booth 3', completion: 91, voters: 380 },
  { booth: 'Booth 4', completion: 68, voters: 490 },
  { booth: 'Booth 5', completion: 79, voters: 410 },
];

const agentPerformanceData = [
  { name: 'High Performers', value: 45, color: 'hsl(var(--success))' },
  { name: 'Medium Performers', value: 35, color: 'hsl(var(--warning))' },
  { name: 'Low Performers', value: 20, color: 'hsl(var(--destructive))' },
];

// Time-series data for trends
const timeSeriesData = [
  { date: 'Week 1', surveys: 45, voters: 312, families: 89 },
  { date: 'Week 2', surveys: 78, voters: 445, families: 124 },
  { date: 'Week 3', surveys: 112, voters: 678, families: 189 },
  { date: 'Week 4', surveys: 156, voters: 892, families: 256 },
  { date: 'Week 5', surveys: 198, voters: 1045, families: 298 },
  { date: 'Week 6', surveys: 234, voters: 1247, families: 342 },
];

export const ACDetailedDashboard = () => {
  const { acNumber } = useParams<{ acNumber: string }>();
  const navigate = useNavigate();
  const data = acData[acNumber || '119'] || acData['119'];
  const [selectedBooth, setSelectedBooth] = useState<{ booth: string; completion: number; voters: number } | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header with AC Selector (Option A) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Assembly Constituency {acNumber}</h1>
            <p className="text-xl text-muted-foreground">{data.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={acNumber || '118'}
              onValueChange={(value) => navigate(`/l1/ac/${value}`)}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select AC" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(acData).map(([num, info]) => (
                  <SelectItem key={num} value={num}>
                    AC {num} - {info.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton data={data} filename={`ac-${acNumber}-report`} acNumber={acNumber} />
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Voters"
            value={data.voters.toLocaleString()}
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Total Families"
            value={data.families.toLocaleString()}
            icon={Home}
            variant="primary"
          />
          <StatCard
            title="Surveys Completed"
            value={data.surveys.toLocaleString()}
            icon={FileCheck}
            variant="success"
          />
          <StatCard
            title="Total Booths"
            value={data.booths.toLocaleString()}
            icon={MapPin}
            variant="warning"
          />
        </div>

        <Separator />

        {/* Tabbed View with Detailed Analytics */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="booths">Booths</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="surveys">Surveys</TabsTrigger>
            <TabsTrigger value="families">Families</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Comparison Metrics (Option D.5) */}
            <ComparisonMetrics currentAC={{ ...data, acNumber: acNumber || '118' }} />

            <div>
              <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ActionButton
                  icon={Users}
                  title="Voter Manager"
                  description="View & update voter details"
                  href={`/l1/ac/${acNumber}/voters`}
                />
                <ActionButton
                  icon={Home}
                  title="Family Manager"
                  description="Manage family records"
                  href={`/l1/ac/${acNumber}/families`}
                />
                <ActionButton
                  icon={FileCheck}
                  title="Survey Manager"
                  description="Complete or review surveys"
                  href={`/l1/ac/${acNumber}/surveys`}
                />
                <ActionButton
                  icon={Activity}
                  title="Reports"
                  description="View performance and statistics"
                  href={`/l1/ac/${acNumber}/reports`}
                />
              </div>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity Feed
              </h3>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                    <div className={`mt-1 rounded-full p-1 ${
                      activity.type === 'voter' ? 'bg-primary/10' :
                      activity.type === 'booth' ? 'bg-warning/10' :
                      activity.type === 'family' ? 'bg-success/10' :
                      'bg-accent/10'
                    }`}>
                      {activity.type === 'voter' && <Users className="h-4 w-4 text-primary" />}
                      {activity.type === 'booth' && <MapPin className="h-4 w-4 text-warning" />}
                      {activity.type === 'family' && <Home className="h-4 w-4 text-success" />}
                      {activity.type === 'survey' && <FileCheck className="h-4 w-4 text-accent" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.text}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* NEW: Trends Tab (Option D.1) */}
          <TabsContent value="trends" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Survey Progress Over Time
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="surveys" stroke="hsl(var(--primary))" strokeWidth={2} name="Surveys" />
                </RechartsLineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Voter Registration Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="voters" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.3} name="Voters" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Weekly Activity Metrics</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="families" fill="hsl(var(--warning))" name="Families Registered" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* Enhanced Booths Tab with Drill-Down (Option D.2) */}
          <TabsContent value="booths" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Booth Performance Breakdown</h3>
              <p className="text-sm text-muted-foreground mb-4">Click on any bar to view detailed booth information</p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={boothPerformanceData} onClick={(data) => {
                  if (data && data.activePayload) {
                    setSelectedBooth(data.activePayload[0].payload);
                  }
                }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="booth" />
                  <YAxis />
                  <Tooltip cursor={{ fill: 'hsl(var(--primary) / 0.1)' }} />
                  <Legend />
                  <Bar dataKey="completion" fill="hsl(var(--primary))" name="Completion %" className="cursor-pointer" />
                  <Bar dataKey="voters" fill="hsl(var(--success))" name="Total Voters" className="cursor-pointer" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* Enhanced Agents Tab with Leaderboard (Option D.3) */}
          <TabsContent value="agents" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Agent Performance Distribution</h3>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={agentPerformanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {agentPerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Agent Leaderboard (Option D.3) */}
            <AgentLeaderboard acNumber={acNumber} />
          </TabsContent>

          <TabsContent value="surveys" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Survey Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Voter Preferences 2024</span>
                    <span className="text-sm text-muted-foreground">78%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '78%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Community Issues Survey</span>
                    <span className="text-sm text-muted-foreground">65%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-success h-2 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Family Demographics</span>
                    <span className="text-sm text-muted-foreground">45%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-warning h-2 rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="families" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Family Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{data?.families || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Families</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-success">3.2</p>
                  <p className="text-sm text-muted-foreground">Avg Family Size</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-warning">1,247</p>
                  <p className="text-sm text-muted-foreground">Single Members</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-accent">892</p>
                  <p className="text-sm text-muted-foreground">Large Families (5+)</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Booth Detail Drawer (Option D.2) */}
        <BoothDetailDrawer
          open={selectedBooth !== null}
          onClose={() => setSelectedBooth(null)}
          boothData={selectedBooth}
        />
      </div>
    </DashboardLayout>
  );
};
