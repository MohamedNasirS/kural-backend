import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, UserPlus, Filter } from 'lucide-react';
import { useState } from 'react';
import { VoterDetailDrawer } from '@/components/VoterDetailDrawer';
import { AddVoterDialog } from '@/components/AddVoterDialog';

const mockVoters = [
  { id: 1, name: 'Rajesh Kumar', age: 42, gender: 'Male', booth: 'B-101', family: 'F-234', phone: '+91 98765 43210', surveyed: true },
  { id: 2, name: 'Priya Sharma', age: 38, gender: 'Female', booth: 'B-102', family: 'F-235', phone: '+91 98765 43211', surveyed: false },
  { id: 3, name: 'Arun Patel', age: 55, gender: 'Male', booth: 'B-101', family: 'F-236', phone: '+91 98765 43212', surveyed: true },
  { id: 4, name: 'Meena Devi', age: 47, gender: 'Female', booth: 'B-103', family: 'F-237', phone: '+91 98765 43213', surveyed: false },
  { id: 5, name: 'Suresh Reddy', age: 33, gender: 'Male', booth: 'B-102', family: 'F-238', phone: '+91 98765 43214', surveyed: true },
];

export const ACVoterManager = () => {
  const { acNumber } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [boothFilter, setBoothFilter] = useState('all');
  const [voters, setVoters] = useState(mockVoters);
  const [selectedVoter, setSelectedVoter] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredVoters = voters.filter(voter => {
    const matchesSearch = voter.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         voter.phone.includes(searchTerm);
    const matchesBooth = boothFilter === 'all' || voter.booth === boothFilter;
    return matchesSearch && matchesBooth;
  });

  const handleViewDetails = (voter: any) => {
    setSelectedVoter(voter);
    setIsDrawerOpen(true);
  };

  const handleAddVoter = (newVoter: any) => {
    setVoters(prev => [...prev, newVoter]);
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
              <h1 className="text-4xl font-bold">Voter Manager</h1>
              <p className="text-muted-foreground">AC {acNumber} - Manage voter records</p>
            </div>
          </div>
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Voter
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={boothFilter} onValueChange={setBoothFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by booth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Booths</SelectItem>
                <SelectItem value="B-101">Booth B-101</SelectItem>
                <SelectItem value="B-102">Booth B-102</SelectItem>
                <SelectItem value="B-103">Booth B-103</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Age</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Gender</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Booth</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Family</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVoters.map((voter) => (
                  <tr key={voter.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium">{voter.name}</td>
                    <td className="px-4 py-3 text-sm">{voter.age}</td>
                    <td className="px-4 py-3 text-sm">{voter.gender}</td>
                    <td className="px-4 py-3 text-sm">{voter.booth}</td>
                    <td className="px-4 py-3 text-sm">{voter.family}</td>
                    <td className="px-4 py-3 text-sm">{voter.phone}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={voter.surveyed ? "default" : "secondary"}>
                        {voter.surveyed ? 'Surveyed' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(voter)}>View Details</Button>
                    </td>
                  </tr>
                ))}
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

      <AddVoterDialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onAddVoter={handleAddVoter} 
      />
    </DashboardLayout>
  );
};