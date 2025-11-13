import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Home, FileCheck, MapPin, Search, TrendingUp, TrendingDown } from 'lucide-react';

// Expanded mock data for all 26 ACs (101-126)
const allACsData = [
  { acNumber: '101', name: 'Dharapuram (SC)', voters: 2134, families: 589, surveys: 389, booths: 106, completion: 82 },
  { acNumber: '102', name: 'Kangayam', voters: 1845, families: 489, surveys: 256, booths: 87, completion: 66 },
  { acNumber: '108', name: 'Udhagamandalam', voters: 1678, families: 434, surveys: 223, booths: 79, completion: 67 },
  { acNumber: '109', name: 'Gudalur (SC)', voters: 1234, families: 298, surveys: 134, booths: 65, completion: 58 },
  { acNumber: '110', name: 'Coonoor', voters: 1890, families: 501, surveys: 278, booths: 91, completion: 71 },
  { acNumber: '111', name: 'Mettupalayam', voters: 2023, families: 556, surveys: 334, booths: 101, completion: 77 },
  { acNumber: '112', name: 'Avanashi (SC)', voters: 1756, families: 467, surveys: 245, booths: 84, completion: 69 },
  { acNumber: '113', name: 'Tiruppur North', voters: 2456, families: 689, surveys: 478, booths: 123, completion: 92 },
  { acNumber: '114', name: 'Tiruppur South', voters: 2189, families: 601, surveys: 401, booths: 109, completion: 84 },
  { acNumber: '115', name: 'Palladam', voters: 1823, families: 478, surveys: 267, booths: 88, completion: 70 },
  { acNumber: '116', name: 'Sulur', voters: 1678, families: 445, surveys: 234, booths: 82, completion: 65 },
  { acNumber: '117', name: 'Kavundampalayam', voters: 1956, families: 521, surveys: 312, booths: 97, completion: 73 },
  { acNumber: '118', name: 'Coimbatore North', voters: 2340, families: 678, surveys: 423, booths: 112, completion: 85 },
  { acNumber: '119', name: 'Thondamuthur', voters: 1247, families: 342, surveys: 156, booths: 89, completion: 78 },
  { acNumber: '120', name: 'Coimbatore South', voters: 1890, families: 534, surveys: 289, booths: 95, completion: 72 },
  { acNumber: '121', name: 'Singanallur', voters: 2145, families: 598, surveys: 387, booths: 108, completion: 91 },
  { acNumber: '122', name: 'Kinathukadavu', voters: 1678, families: 434, surveys: 223, booths: 79, completion: 67 },
  { acNumber: '123', name: 'Pollachi', voters: 2378, families: 645, surveys: 456, booths: 118, completion: 89 },
  { acNumber: '124', name: 'Valparai (SC)', voters: 1234, families: 298, surveys: 134, booths: 65, completion: 58 },
  { acNumber: '125', name: 'Udumalaipettai', voters: 1945, families: 534, surveys: 298, booths: 93, completion: 75 },
  { acNumber: '126', name: 'Madathukulam', voters: 1567, families: 412, surveys: 189, booths: 71, completion: 62 },
];

export const ACAnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('completion');

  const getPerformanceColor = (completion: number) => {
    if (completion >= 80) return 'success';
    if (completion >= 60) return 'warning';
    return 'destructive';
  };

  const getPerformanceLabel = (completion: number) => {
    if (completion >= 80) return 'High';
    if (completion >= 60) return 'Medium';
    return 'Low';
  };

  const filteredAndSortedACs = allACsData
    .filter((ac) =>
      ac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ac.acNumber.includes(searchQuery)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'completion':
          return b.completion - a.completion;
        case 'voters':
          return b.voters - a.voters;
        case 'surveys':
          return b.surveys - a.surveys;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">AC Analytics Dashboard</h1>
          <p className="text-xl text-muted-foreground">Overview of all 26 Assembly Constituencies</p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by AC name or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completion">Completion Rate</SelectItem>
              <SelectItem value="voters">Total Voters</SelectItem>
              <SelectItem value="surveys">Surveys Completed</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* AC Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedACs.map((ac) => (
            <Card
              key={ac.acNumber}
              className="p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-105 border-2 hover:border-primary"
              onClick={() => navigate(`/l1/ac/${ac.acNumber}`)}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">AC {ac.acNumber}</h3>
                    <p className="text-sm text-muted-foreground">{ac.name}</p>
                  </div>
                  <Badge variant={getPerformanceColor(ac.completion) as any}>
                    {getPerformanceLabel(ac.completion)}
                  </Badge>
                </div>

                {/* Completion Percentage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Completion</span>
                    <span className="text-sm font-bold">{ac.completion}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        ac.completion >= 80
                          ? 'bg-success'
                          : ac.completion >= 60
                          ? 'bg-warning'
                          : 'bg-destructive'
                      }`}
                      style={{ width: `${ac.completion}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <Users className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Voters</p>
                      <p className="text-sm font-bold">{ac.voters.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <Home className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Families</p>
                      <p className="text-sm font-bold">{ac.families}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <FileCheck className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Surveys</p>
                      <p className="text-sm font-bold">{ac.surveys}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <MapPin className="h-4 w-4 text-warning" />
                    <div>
                      <p className="text-xs text-muted-foreground">Booths</p>
                      <p className="text-sm font-bold">{ac.booths}</p>
                    </div>
                  </div>
                </div>

                {/* Trend Indicator */}
                <div className="flex items-center justify-center gap-2 pt-2 border-t">
                  {ac.completion >= 75 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-xs text-success font-medium">On Track</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-warning" />
                      <span className="text-xs text-warning font-medium">Needs Attention</span>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary Stats */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Overall Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">{allACsData.length}</p>
              <p className="text-sm text-muted-foreground">Total ACs</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {allACsData.reduce((sum, ac) => sum + ac.voters, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total Voters</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-success">
                {allACsData.reduce((sum, ac) => sum + ac.surveys, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Surveys Done</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-warning">
                {Math.round(allACsData.reduce((sum, ac) => sum + ac.completion, 0) / allACsData.length)}%
              </p>
              <p className="text-sm text-muted-foreground">Avg Completion</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {allACsData.reduce((sum, ac) => sum + ac.booths, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Booths</p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};
