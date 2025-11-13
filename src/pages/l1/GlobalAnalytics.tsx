import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Home, FileCheck, TrendingUp, TrendingDown, Calendar as CalendarIcon, Filter, Map, Activity } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const acPerformance = [
  { ac: '119 - Thondamuthur', acNumber: 119, voters: 1247, completion: 12.5, activity: 'Medium' },
  { ac: '119 - Coimbatore North', acNumber: 119, voters: 2340, completion: 18.1, activity: 'High' },
  { ac: '120 - Coimbatore South', acNumber: 120, voters: 1890, completion: 15.3, activity: 'High' },
  { ac: '121 - Singanallur', acNumber: 121, voters: 1678, completion: 8.2, activity: 'Low' },
  { ac: '122 - Sulur', acNumber: 122, voters: 1534, completion: 14.7, activity: 'Medium' },
];

const voterTurnoutData = [
  { date: 'Jan 1', turnout: 45 },
  { date: 'Jan 8', turnout: 52 },
  { date: 'Jan 15', turnout: 61 },
  { date: 'Jan 22', turnout: 68 },
  { date: 'Jan 29', turnout: 73 },
];

const surveyProgressData = [
  { week: 'Week 1', surveys: 420 },
  { week: 'Week 2', surveys: 580 },
  { week: 'Week 3', surveys: 690 },
  { week: 'Week 4', surveys: 820 },
  { week: 'Week 5', surveys: 779 },
];

const agentActivityData = [
  { day: 'Mon', submissions: 125 },
  { day: 'Tue', submissions: 142 },
  { day: 'Wed', submissions: 158 },
  { day: 'Thu', submissions: 137 },
  { day: 'Fri', submissions: 165 },
  { day: 'Sat', submissions: 148 },
  { day: 'Sun', submissions: 134 },
];

export const GlobalAnalytics = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<Date | undefined>(new Date());
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [isLive, setIsLive] = useState(true);

  const handleACClick = (acNumber: number) => {
    navigate(`/l1/ac/${acNumber}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              Global Analytics Dashboard
              <span className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
                isLive ? "bg-success/10 text-success animate-pulse" : "bg-muted text-muted-foreground"
              )}>
                <Activity className="h-3 w-3" />
                {isLive ? 'Live' : 'Offline'}
              </span>
            </h1>
            <p className="text-muted-foreground">Overall performance across all 21 Assembly Constituencies</p>
          </div>
        </div>

        {/* Smart Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange ? format(dateRange, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateRange}
                  onSelect={setDateRange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Activity Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>

            {activityFilter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setActivityFilter('all')}>
                Clear Filters
              </Button>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Voters" value="26,247" icon={Users} variant="primary" />
          <StatCard title="Total Families" value="7,182" icon={Home} variant="primary" />
          <StatCard title="Surveys Completed" value="3,289" icon={FileCheck} variant="success" />
          <StatCard title="Avg Completion" value="12.5%" icon={TrendingUp} variant="warning" />
        </div>

        {/* Interactive Charts */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Voter Turnout Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={voterTurnoutData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="turnout" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Survey Progress by Week</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={surveyProgressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="surveys" fill="hsl(var(--success))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Agent Activity Over Time</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={agentActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="submissions" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">AC Performance Insights</h2>
              <p className="text-sm text-muted-foreground mb-4">Click any row to view detailed analytics</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Assembly Constituency</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Total Voters</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Completion %</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Activity Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {acPerformance
                      .filter(row => activityFilter === 'all' || row.activity === activityFilter)
                      .map((row, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleACClick(row.acNumber)}
                      >
                        <td className="px-4 py-3 text-sm font-medium">{row.ac}</td>
                        <td className="px-4 py-3 text-sm">{row.voters.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <span>{row.completion}%</span>
                            {row.completion > 15 ? (
                              <TrendingUp className="h-4 w-4 text-success" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            row.activity === 'High' ? 'bg-success/10 text-success' :
                            row.activity === 'Medium' ? 'bg-warning/10 text-warning' :
                            'bg-destructive/10 text-destructive'
                          }`}>
                            {row.activity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-success" />
              Highest Activity AC
            </h3>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-primary">119 - Coimbatore North</p>
              <p className="text-sm text-muted-foreground">18.1% completion rate</p>
              <p className="text-sm text-muted-foreground">423 surveys completed</p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingDown className="mr-2 h-5 w-5 text-destructive" />
              Lowest Activity AC
            </h3>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-primary">121 - Singanallur</p>
              <p className="text-sm text-muted-foreground">8.2% completion rate</p>
              <p className="text-sm text-muted-foreground">138 surveys completed</p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};
