import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Edit2, Trash2, Filter } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

interface Booth {
  id: string;
  name: string;
  ac: number;
}

interface Agent {
  id: number;
  name: string;
  phone: string;
  booths: string[];
  ac: number;
  status: 'Active' | 'Inactive';
}

const initialBooths: Booth[] = [
  { id: '1', name: 'Government School, Main Road', ac: 118 },
  { id: '2', name: 'Community Hall, West Street', ac: 118 },
  { id: '3', name: 'Primary School, East Area', ac: 119 },
];

const initialAgents: Agent[] = [
  { id: 1, name: 'Rajesh Kumar', phone: '+91 98765 43210', booths: ['1'], ac: 118, status: 'Active' },
  { id: 2, name: 'Priya Sharma', phone: '+91 98765 43211', booths: ['2'], ac: 118, status: 'Active' },
  { id: 3, name: 'Arun Patel', phone: '+91 98765 43212', booths: ['1', '2'], ac: 118, status: 'Active' },
  { id: 4, name: 'Meena Devi', phone: '+91 98765 43213', booths: ['3'], ac: 119, status: 'Inactive' },
];

export const BoothAgentManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [booths] = useState<Booth[]>(initialBooths);
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [filterAC, setFilterAC] = useState<string>('all');
  
  // Form states
  const [newAgent, setNewAgent] = useState({
    name: '',
    phone: '',
    ac: user?.role === 'L2' ? user.assignedAC : 119,
  });
  
  const [editAgent, setEditAgent] = useState({
    name: '',
    phone: '',
    ac: 119,
  });
  
  const [selectedBooths, setSelectedBooths] = useState<string[]>([]);
  const [editSelectedBooths, setEditSelectedBooths] = useState<string[]>([]);

  // Filter data based on role
  const availableBooths = user?.role === 'L2' 
    ? booths.filter(booth => booth.ac === user.assignedAC)
    : booths;

  const filteredAgents = (() => {
    let result = user?.role === 'L2' 
      ? agents.filter(agent => agent.ac === user.assignedAC)
      : agents;
      
    // Apply AC filter for L0/L1 users
    if (user?.role !== 'L2' && filterAC !== 'all') {
      result = result.filter(agent => agent.ac === parseInt(filterAC));
    }
    
    return result;
  })();

  const getBoothNames = (boothIds: string[]) => {
    return boothIds.map(id => {
      const booth = booths.find(b => b.id === id);
      return booth?.name || `Booth ${id}`;
    }).join(', ');
  };

  const toggleBooth = (boothId: string) => {
    setSelectedBooths(prev => 
      prev.includes(boothId) 
        ? prev.filter(id => id !== boothId)
        : [...prev, boothId]
    );
  };

  const toggleEditBooth = (boothId: string) => {
    setEditSelectedBooths(prev => 
      prev.includes(boothId) 
        ? prev.filter(id => id !== boothId)
        : [...prev, boothId]
    );
  };

  const handleAddAgent = () => {
    if (newAgent.name && newAgent.phone) {
      const agentToAdd: Agent = {
        id: Math.max(0, ...agents.map(a => a.id)) + 1,
        name: newAgent.name,
        phone: newAgent.phone,
        booths: selectedBooths,
        ac: newAgent.ac,
        status: 'Active',
      };
      
      setAgents([...agents, agentToAdd]);
      setNewAgent({
        name: '',
        phone: '',
        ac: user?.role === 'L2' ? user!.assignedAC : 119,
      });
      setSelectedBooths([]);
      setIsOpen(false);
      
      toast({
        title: 'Agent Added',
        description: `"${agentToAdd.name}" has been added successfully.`
      });
    } else {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
    }
  };

  const handleEditClick = (agent: Agent) => {
    setEditingAgent(agent);
    setEditAgent({
      name: agent.name,
      phone: agent.phone,
      ac: agent.ac,
    });
    setEditSelectedBooths(agent.booths);
    setIsEditOpen(true);
  };

  const handleUpdateAgent = () => {
    if (editingAgent && editAgent.name && editAgent.phone) {
      setAgents(agents.map(agent => 
        agent.id === editingAgent.id 
          ? { ...agent, ...editAgent, booths: editSelectedBooths } 
          : agent
      ));
      setIsEditOpen(false);
      setEditingAgent(null);
      setEditSelectedBooths([]);
      
      toast({
        title: 'Agent Updated',
        description: `"${editAgent.name}" has been updated successfully.`
      });
    } else {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAgent = (id: number, name: string) => {
    setAgents(agents.filter(agent => agent.id !== id));
    toast({
      title: 'Agent Deleted',
      description: `"${name}" has been deleted successfully.`
    });
  };

  const handleApplyFilter = () => {
    // Filter is applied automatically through filteredAgents
    toast({
      title: 'Filter Applied',
      description: 'Agents have been filtered by AC.'
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Booth Agent Management</h1>
            <p className="text-muted-foreground">
              {user?.role === 'L2' 
                ? `Manage booth agents for AC ${user.assignedAC}`
                : 'Manage booth agents across all constituencies'}
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Booth Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Booth Agent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name" 
                    placeholder="Enter agent name" 
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                  <Input 
                    id="phone" 
                    placeholder="+91 XXXXX XXXXX" 
                    value={newAgent.phone}
                    onChange={(e) => setNewAgent({...newAgent, phone: e.target.value})}
                  />
                </div>
                {user?.role !== 'L2' && (
                  <div className="space-y-2">
                    <Label htmlFor="ac">Assembly Constituency</Label>
                    <Select 
                      value={newAgent.ac.toString()} 
                      onValueChange={(value) => setNewAgent({...newAgent, ac: parseInt(value)})}
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
                  <Label>Assign to Booths (Multiple Selection)</Label>
                  <Card className="p-4 max-h-48 overflow-y-auto">
                    <div className="space-y-3">
                      {availableBooths.map((booth) => (
                        <div key={booth.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`booth-${booth.id}`}
                            checked={selectedBooths.includes(booth.id)}
                            onCheckedChange={() => toggleBooth(booth.id)}
                          />
                          <Label
                            htmlFor={`booth-${booth.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {booth.name} {user?.role !== 'L2' && `(AC ${booth.ac})`}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <p className="text-sm text-muted-foreground">
                    {selectedBooths.length} booth{selectedBooths.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
                <Button className="w-full" onClick={handleAddAgent}>
                  Create Agent
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {user?.role !== 'L2' && (
          <Card className="p-4">
            <div className="flex space-x-4">
              <Select value={filterAC} onValueChange={setFilterAC}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by AC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ACs</SelectItem>
                  <SelectItem value="119">119 - Thondamuthur</SelectItem>
                  <SelectItem value="119">119 - Coimbatore North</SelectItem>
                  <SelectItem value="120">120 - Coimbatore South</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleApplyFilter}>
                <Filter className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Assigned Booths</th>
                  {user?.role !== 'L2' && (
                    <th className="px-4 py-3 text-left text-sm font-semibold">AC</th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium">{agent.name}</td>
                    <td className="px-4 py-3 text-sm">{agent.phone}</td>
                    <td className="px-4 py-3 text-sm max-w-md">
                      <div className="flex flex-wrap gap-1">
                        {agent.booths.map((boothId) => (
                          <span key={boothId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            Booth {boothId}
                          </span>
                        ))}
                      </div>
                    </td>
                    {user?.role !== 'L2' && (
                      <td className="px-4 py-3 text-sm">{agent.ac}</td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditClick(agent)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteAgent(agent.id, agent.name)}
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

        {/* Edit Agent Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingAgent(null);
            setEditSelectedBooths([]);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Booth Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Full Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="editName" 
                  placeholder="Enter agent name" 
                  value={editAgent.name}
                  onChange={(e) => setEditAgent({...editAgent, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhone">Phone Number <span className="text-destructive">*</span></Label>
                <Input 
                  id="editPhone" 
                  placeholder="+91 XXXXX XXXXX" 
                  value={editAgent.phone}
                  onChange={(e) => setEditAgent({...editAgent, phone: e.target.value})}
                />
              </div>
              {user?.role !== 'L2' && (
                <div className="space-y-2">
                  <Label htmlFor="editAc">Assembly Constituency</Label>
                  <Select 
                    value={editAgent.ac.toString()} 
                    onValueChange={(value) => setEditAgent({...editAgent, ac: parseInt(value)})}
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
                <Label>Assign to Booths (Multiple Selection)</Label>
                <Card className="p-4 max-h-48 overflow-y-auto">
                  <div className="space-y-3">
                    {availableBooths.map((booth) => (
                      <div key={booth.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-booth-${booth.id}`}
                          checked={editSelectedBooths.includes(booth.id)}
                          onCheckedChange={() => toggleEditBooth(booth.id)}
                        />
                        <Label
                          htmlFor={`edit-booth-${booth.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {booth.name} {user?.role !== 'L2' && `(AC ${booth.ac})`}
                        </Label>
                      </div>
                    ))}
                  </div>
                </Card>
                <p className="text-sm text-muted-foreground">
                  {editSelectedBooths.length} booth{editSelectedBooths.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              <Button className="w-full" onClick={handleUpdateAgent}>
                Update Agent
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};