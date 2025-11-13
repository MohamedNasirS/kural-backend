import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Activity, Clock, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

const liveUpdates = [
  { id: 1, voter: 'Rajesh Kumar', booth: 'Booth 1', agent: 'Rajesh Kumar', timestamp: '2 mins ago', activity: 'Survey completed', question: 'Which party will you vote for?' },
  { id: 2, voter: 'Priya Sharma', booth: 'Booth 1', agent: 'Rajesh Kumar', timestamp: '5 mins ago', activity: 'Survey completed', question: 'What is your primary concern?' },
  { id: 3, voter: 'Suresh Babu', booth: 'Booth 3', agent: 'Priya Sharma', timestamp: '8 mins ago', activity: 'Voter details updated', question: null },
  { id: 4, voter: 'Meena Devi', booth: 'Booth 2', agent: 'Arun Patel', timestamp: '12 mins ago', activity: 'Survey completed', question: 'Rate government performance' },
];

export const LiveBoothUpdates = () => {
  const { user } = useAuth();
  const acNumber = user?.assignedAC || 119;
  const [boothFilter, setBoothFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  // Get unique booths for filter options
  const uniqueBooths = Array.from(new Set(liveUpdates.map(update => update.booth)));
  
  // Get unique activities for filter options
  const uniqueActivities = Array.from(new Set(liveUpdates.map(update => update.activity)));

  // Filter updates based on selected filters and search term
  const filteredUpdates = liveUpdates.filter(update => {
    // Search filter
    const matchesSearch = update.voter.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         update.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (update.question && update.question.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Booth filter
    const matchesBooth = boothFilter === 'all' || update.booth === boothFilter;
    
    // Activity filter
    const matchesActivity = activityFilter === 'all' || update.activity === activityFilter;
    
    return matchesSearch && matchesBooth && matchesActivity;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center">
            <Activity className="mr-3 h-8 w-8 text-success animate-pulse" />
            Live Booth Updates
          </h1>
          <p className="text-muted-foreground">Real-time activity from AC {acNumber} - Thondamuthur</p>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by voter, agent, or activity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={boothFilter} onValueChange={setBoothFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Booth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Booths</SelectItem>
                {uniqueBooths.map(booth => (
                  <SelectItem key={booth} value={booth}>{booth}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                {uniqueActivities.map(activity => (
                  <SelectItem key={activity} value={activity}>{activity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="space-y-4">
          {filteredUpdates.length > 0 ? (
            filteredUpdates.map((update) => (
              <Card key={update.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                        Live
                      </span>
                      <span className="text-sm text-muted-foreground flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {update.timestamp}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold mb-2">{update.activity}</h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Voter:</span>
                        <span className="ml-2 font-medium">{update.voter}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Booth:</span>
                        <span className="ml-2 font-medium">{update.booth}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Agent:</span>
                        <span className="ml-2 font-medium">{update.agent}</span>
                      </div>
                    </div>

                    {update.question && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">{update.question}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No updates match the current filters.</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};