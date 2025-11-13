import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Eye, Users, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { FamilyDetailDrawer } from '@/components/FamilyDetailDrawer';

const mockFamilies = [
  { id: 'FAM001', headName: 'Rajesh Kumar', members: 4, booth: 'Booth 1', surveyed: 2, address: 'Main Road, Thondamuthur' },
  { id: 'FAM002', headName: 'Arun Patel', members: 3, booth: 'Booth 2', surveyed: 1, address: 'West Street, Thondamuthur' },
  { id: 'FAM003', headName: 'Meena Devi', members: 5, booth: 'Booth 1', surveyed: 0, address: 'East Area, Thondamuthur' },
  { id: 'FAM004', headName: 'Deepa Singh', members: 2, booth: 'Booth 3', surveyed: 2, address: 'North Road, Thondamuthur' },
];

export const FamilyManager = () => {
  const { user } = useAuth();
  const acNumber = user?.assignedAC || 118;
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [boothFilter, setBoothFilter] = useState<string>('all');
  const [selectedFamily, setSelectedFamily] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Get unique booths for filter options
  const uniqueBooths = Array.from(new Set(mockFamilies.map(family => family.booth)));

  // Filter families based on search term and filters
  const filteredFamilies = mockFamilies.filter(family => {
    // Search filter
    const matchesSearch = family.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         family.headName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Booth filter
    const matchesBooth = boothFilter === 'all' || family.booth === boothFilter;
    
    return matchesSearch && matchesBooth;
  });

  const handleViewDetails = (family: any) => {
    setSelectedFamily(family);
    setIsDrawerOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Family Manager</h1>
          <p className="text-muted-foreground">Manage family records for AC {acNumber} - Thondamuthur</p>
        </div>

        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by family ID or head of family..." 
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
            <Button variant="outline" onClick={() => {}}>
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </Card>

        {filteredFamilies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFamilies.map((family) => (
              <Card key={family.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{family.id}</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-1">{family.headName}</h3>
                    <p className="text-sm text-muted-foreground">{family.address}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Members</p>
                      <p className="font-semibold">{family.members}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Booth</p>
                      <p className="font-semibold">{family.booth}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Survey Progress</span>
                      <span className="font-medium">{family.surveyed}/{family.members}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-success h-2 rounded-full transition-all"
                        style={{ width: `${(family.surveyed / family.members) * 100}%` }}
                      />
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" onClick={() => handleViewDetails(family)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No families match the current filters.</p>
          </Card>
        )}
      </div>

      <FamilyDetailDrawer 
        open={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        familyData={selectedFamily} 
      />
    </DashboardLayout>
  );
};