import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { VoterDetailDrawer } from '@/components/VoterDetailDrawer';

const mockVoters = [
  { id: 1, name: 'Rajesh Kumar', voterId: 'TND1234567', familyId: 'FAM001', booth: 'Booth 1', status: 'Surveyed', phone: '+91 98765 43210', age: 45, gender: 'Male', surveyed: true },
  { id: 2, name: 'Priya Sharma', voterId: 'TND1234568', familyId: 'FAM001', booth: 'Booth 1', status: 'Surveyed', phone: '+91 98765 43211', age: 40, gender: 'Female', surveyed: true },
  { id: 3, name: 'Arun Patel', voterId: 'TND1234569', familyId: 'FAM002', booth: 'Booth 2', status: 'Pending', phone: '+91 98765 43212', age: 35, gender: 'Male', surveyed: false },
  { id: 4, name: 'Meena Devi', voterId: 'TND1234570', familyId: 'FAM003', booth: 'Booth 1', status: 'Not Contacted', phone: '+91 98765 43213', age: 55, gender: 'Female', surveyed: false },
  { id: 5, name: 'Suresh Babu', voterId: 'TND1234571', familyId: 'FAM002', booth: 'Booth 3', status: 'Surveyed', phone: '+91 98765 43214', age: 48, gender: 'Male', surveyed: true },
];

export const VoterManager = () => {
  const { user } = useAuth();
  const acNumber = user?.assignedAC || 118;
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [boothFilter, setBoothFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedVoter, setSelectedVoter] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Get unique booths for filter options
  const uniqueBooths = Array.from(new Set(mockVoters.map(voter => voter.booth)));

  // Filter voters based on search term and filters
  const filteredVoters = mockVoters.filter(voter => {
    // Search filter
    const matchesSearch = voter.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         voter.voterId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Booth filter
    const matchesBooth = boothFilter === 'all' || voter.booth === boothFilter;
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || voter.status.toLowerCase().replace(' ', '-') === statusFilter;
    
    return matchesSearch && matchesBooth && matchesStatus;
  });

  const handleViewDetails = (voter: any) => {
    setSelectedVoter(voter);
    setIsDrawerOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Voter Manager</h1>
          <p className="text-muted-foreground">Manage voters for AC {acNumber} - Thondamuthur</p>
        </div>

        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or voter ID..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Survey Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="surveyed">Surveyed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="not-contacted">Not Contacted</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {}}>
              <Filter className="mr-2 h-4 w-4" />
              Apply
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Voter ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Family ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Booth</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVoters.length > 0 ? (
                  filteredVoters.map((voter) => (
                    <tr key={voter.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium">{voter.name}</td>
                      <td className="px-4 py-3 text-sm">{voter.voterId}</td>
                      <td className="px-4 py-3 text-sm">{voter.familyId}</td>
                      <td className="px-4 py-3 text-sm">{voter.booth}</td>
                      <td className="px-4 py-3 text-sm">{voter.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          voter.status === 'Surveyed' ? 'bg-success/10 text-success' :
                          voter.status === 'Pending' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {voter.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(voter)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No voters match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <VoterDetailDrawer 
        open={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        voterData={selectedVoter} 
      />
    </DashboardLayout>
  );
};