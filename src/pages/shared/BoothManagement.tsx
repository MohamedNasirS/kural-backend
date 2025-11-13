import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Edit2, Trash2, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface Booth {
  id: number;
  boothId: string;
  name: string;
  ac: number;
  address: string;
  voters: number;
  agents: number;
}

const initialBooths: Booth[] = [
  { id: 1, boothId: 'BID-001', name: 'Government School, Main Road', ac: 119, address: 'Main Road, Thondamuthur', voters: 854, agents: 2 },
  { id: 2, boothId: 'BID-002', name: 'Community Hall, West Street', ac: 119, address: 'West Street, Thondamuthur', voters: 723, agents: 3 },
  { id: 3, boothId: 'BID-003', name: 'Primary School, East Area', ac: 119, address: 'East Area, Coimbatore', voters: 912, agents: 1 },
];

export const BoothManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [booths, setBooths] = useState<Booth[]>(initialBooths);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBooth, setEditingBooth] = useState<Booth | null>(null);
  
  // Form states
  const [newBooth, setNewBooth] = useState({
    boothId: '',
    name: '',
    ac: user?.role === 'L2' ? user.assignedAC : 119,
    address: '',
    voters: 0,
  });
  
  const [editBooth, setEditBooth] = useState({
    boothId: '',
    name: '',
    ac: 119,
    address: '',
    voters: 0,
  });

  // Filter booths based on role
  const filteredBooths = user?.role === 'L2' 
    ? booths.filter(booth => booth.ac === user.assignedAC)
    : booths;

  const handleCreateBooth = () => {
    if (newBooth.boothId && newBooth.name && newBooth.address) {
      const boothToAdd: Booth = {
        id: Math.max(0, ...booths.map(b => b.id)) + 1,
        boothId: newBooth.boothId,
        name: newBooth.name,
        ac: newBooth.ac,
        address: newBooth.address,
        voters: newBooth.voters,
        agents: 0, // Default to 0 agents
      };
      
      setBooths([...booths, boothToAdd]);
      setNewBooth({
        boothId: '',
        name: '',
        ac: user?.role === 'L2' ? user!.assignedAC : 119,
        address: '',
        voters: 0,
      });
      setIsOpen(false);
      
      toast({
        title: 'Booth Created',
        description: `"${boothToAdd.name}" has been created successfully.`
      });
    } else {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
    }
  };

  const handleEditClick = (booth: Booth) => {
    setEditingBooth(booth);
    setEditBooth({
      boothId: booth.boothId,
      name: booth.name,
      ac: booth.ac,
      address: booth.address,
      voters: booth.voters,
    });
    setIsEditOpen(true);
  };

  const handleUpdateBooth = () => {
    if (editingBooth && editBooth.boothId && editBooth.name && editBooth.address) {
      setBooths(booths.map(booth => 
        booth.id === editingBooth.id 
          ? { ...booth, ...editBooth } 
          : booth
      ));
      setIsEditOpen(false);
      setEditingBooth(null);
      
      toast({
        title: 'Booth Updated',
        description: `"${editBooth.name}" has been updated successfully.`
      });
    } else {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteBooth = (id: number, name: string) => {
    setBooths(booths.filter(booth => booth.id !== id));
    toast({
      title: 'Booth Deleted',
      description: `"${name}" has been deleted successfully.`
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Booth Management</h1>
            <p className="text-muted-foreground">
              {user?.role === 'L2' 
                ? `Manage booths for AC ${user.assignedAC}`
                : 'Manage booths across all constituencies'}
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Building2 className="mr-2 h-4 w-4" />
                Create New Booth
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Booth</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="boothId">Booth ID <span className="text-destructive">*</span></Label>
                  <Input 
                    id="boothId" 
                    placeholder="BID-XXX" 
                    value={newBooth.boothId}
                    onChange={(e) => setNewBooth({...newBooth, boothId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boothName">Booth Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="boothName" 
                    placeholder="e.g., Government School, Main Road" 
                    value={newBooth.name}
                    onChange={(e) => setNewBooth({...newBooth, name: e.target.value})}
                  />
                </div>
                {user?.role !== 'L2' && (
                  <div className="space-y-2">
                    <Label htmlFor="ac">Assembly Constituency <span className="text-destructive">*</span></Label>
                    <Select 
                      value={newBooth.ac.toString()} 
                      onValueChange={(value) => setNewBooth({...newBooth, ac: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select AC" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="119">119 - Thondamuthur</SelectItem>
                        <SelectItem value="119">119 - Coimbatore North</SelectItem>
                        <SelectItem value="120">120 - Coimbatore South</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                  <Input 
                    id="address" 
                    placeholder="Enter full address" 
                    value={newBooth.address}
                    onChange={(e) => setNewBooth({...newBooth, address: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voters">Total Registered Voters</Label>
                  <Input 
                    id="voters" 
                    type="number" 
                    placeholder="0" 
                    value={newBooth.voters}
                    onChange={(e) => setNewBooth({...newBooth, voters: parseInt(e.target.value) || 0})}
                  />
                </div>
                <Button className="w-full" onClick={handleCreateBooth}>
                  Create Booth
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Booth ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  {user?.role !== 'L2' && (
                    <th className="px-4 py-3 text-left text-sm font-semibold">AC</th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-semibold">Address</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Voters</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Agents</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBooths.map((booth) => (
                  <tr key={booth.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium">{booth.boothId}</td>
                    <td className="px-4 py-3 text-sm">{booth.name}</td>
                    {user?.role !== 'L2' && (
                      <td className="px-4 py-3 text-sm">{booth.ac}</td>
                    )}
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{booth.address}</td>
                    <td className="px-4 py-3 text-sm">{booth.voters}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {booth.agents} Agent{booth.agents !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditClick(booth)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteBooth(booth.id, booth.name)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Edit Booth Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingBooth(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Booth</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editBoothId">Booth ID <span className="text-destructive">*</span></Label>
                <Input 
                  id="editBoothId" 
                  placeholder="BID-XXX" 
                  value={editBooth.boothId}
                  onChange={(e) => setEditBooth({...editBooth, boothId: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBoothName">Booth Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="editBoothName" 
                  placeholder="e.g., Government School, Main Road" 
                  value={editBooth.name}
                  onChange={(e) => setEditBooth({...editBooth, name: e.target.value})}
                />
              </div>
              {user?.role !== 'L2' && (
                <div className="space-y-2">
                  <Label htmlFor="editAc">Assembly Constituency <span className="text-destructive">*</span></Label>
                  <Select 
                    value={editBooth.ac.toString()} 
                    onValueChange={(value) => setEditBooth({...editBooth, ac: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select AC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="119">119 - Thondamuthur</SelectItem>
                      <SelectItem value="119">119 - Coimbatore North</SelectItem>
                      <SelectItem value="120">120 - Coimbatore South</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="editAddress">Address <span className="text-destructive">*</span></Label>
                <Input 
                  id="editAddress" 
                  placeholder="Enter full address" 
                  value={editBooth.address}
                  onChange={(e) => setEditBooth({...editBooth, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVoters">Total Registered Voters</Label>
                <Input 
                  id="editVoters" 
                  type="number" 
                  placeholder="0" 
                  value={editBooth.voters}
                  onChange={(e) => setEditBooth({...editBooth, voters: parseInt(e.target.value) || 0})}
                />
              </div>
              <Button className="w-full" onClick={handleUpdateBooth}>
                Update Booth
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};