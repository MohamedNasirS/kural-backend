import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Edit2, Trash2, Filter, Loader2, Users as UsersIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { CONSTITUENCIES } from '@/constants/constituencies';

interface BoothAgent {
  _id: string;
  username: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  booth_id: string;
  booth_agent_id: string;
  boothCode?: string;
  boothName?: string;
  aci_id: number;
  aci_name: string;
  acim_id?: number;
  acim_name?: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
}

interface Booth {
  _id: string;
  booth_id?: string;
  boothCode?: string;
  boothNumber?: number;
  boothNo?: number;
  boothName?: string;
  ac_id?: number;
  ac_name?: string;
  assignedAgents?: string[];
}

export const BoothAgentManagementNew = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [agents, setAgents] = useState<BoothAgent[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<BoothAgent | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  // Default to empty - user must select AC first (for L0/L1)
  const [filterAC, setFilterAC] = useState<string>('');
  const [filterBooth, setFilterBooth] = useState<string>('all');
  
  // Form states
  const [newAgent, setNewAgent] = useState({
    username: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    booth_id: '',
    aci_id: user?.role === 'L2' ? user.assignedAC : '',
    aci_name: user?.role === 'L2' ? (user.aciName || '') : '',
  });
  
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    booth_id: '',
  });

  // Booths available for the edit dialog (loaded when editing an agent)
  const [editBoothsList, setEditBoothsList] = useState<Booth[]>([]);
  // Booths available for the create dialog (loaded when AC is selected)
  const [createBoothsList, setCreateBoothsList] = useState<Booth[]>([]);
  const [loadingCreateBooths, setLoadingCreateBooths] = useState(false);

  // Fetch data on mount and when filter changes
  // For L0/L1: only fetch when AC is selected
  // For L2: always fetch (they have assigned AC)
  useEffect(() => {
    if (user) {
      if (user.role === 'L2') {
        // L2 users always have an assigned AC, fetch immediately
        fetchData();
      } else if (filterAC) {
        // L0/L1 users must select an AC first
        fetchData();
      } else {
        // Clear data when no AC is selected
        setAgents([]);
        setBooths([]);
        setLoading(false);
      }
    }
  }, [user, filterAC]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Determine AC filter for booths - L2 always uses their AC, L0/L1 can filter
      const acForBooths = user?.role === 'L2'
        ? user.assignedAC
        : (filterAC ? parseInt(filterAC) : null);

      // Build booth API URL with AC filter if specified
      const boothUrl = acForBooths
        ? `/rbac/booths?ac=${acForBooths}&limit=1000`
        : `/rbac/booths?limit=1000`;

      const [agentsResponse, boothsResponse] = await Promise.all([
        api.get('/rbac/users?role=Booth Agent'),
        api.get(boothUrl)
      ]);

      console.log('[BoothAgentMgmt] Fetched agents:', agentsResponse.users?.length || 0, 'agents');
      console.log('[BoothAgentMgmt] Fetched booths:', boothsResponse.booths?.length || 0, 'booths');
      console.log('[BoothAgentMgmt] Sample booth:', boothsResponse.booths?.[0]);

      // Map backend fields to frontend interface
      const mappedAgents = (agentsResponse.users || []).map((agent: any) => ({
        ...agent,
        fullName: agent.name || agent.fullName || '',
        username: agent.email || agent.username || '',
        phoneNumber: agent.phone || agent.phoneNumber || '',
        aci_id: agent.aci_id || agent.assignedAC || 0,
        aci_name: agent.aci_name || '',
        // Prefer string booth_id, then populated booth_id, then populated _id
        booth_id: agent.booth_id || agent.assignedBoothId?.booth_id || agent.assignedBoothId?.boothCode || (typeof agent.assignedBoothId === 'string' ? agent.assignedBoothId : agent.assignedBoothId?._id) || '',
        boothCode: agent.assignedBoothId?.boothCode || agent.assignedBoothId?.booth_id || agent.booth_id || agent.boothCode || '',
        boothName: agent.assignedBoothId?.boothName || agent.boothName || '',
      }));

      setAgents(mappedAgents);
      setBooths(boothsResponse.booths || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch booths for a specific AC (used when editing an agent in a different AC)
  const fetchBoothsForAC = async (acId: number): Promise<Booth[]> => {
    try {
      const response = await api.get(`/rbac/booths?ac=${acId}&limit=1000`);
      return response.booths || [];
    } catch (error) {
      console.error('Error fetching booths for AC:', acId, error);
      return [];
    }
  };

  // Fetch booths for create dialog when AC is selected
  const fetchBoothsForCreateDialog = async (acId: number) => {
    try {
      setLoadingCreateBooths(true);
      const boothsList = await fetchBoothsForAC(acId);
      setCreateBoothsList(boothsList);
    } catch (error) {
      console.error('Error fetching booths for create dialog:', error);
      setCreateBoothsList([]);
    } finally {
      setLoadingCreateBooths(false);
    }
  };

  // Load booths for L2 user on mount (they have fixed AC)
  useEffect(() => {
    if (user?.role === 'L2' && user.assignedAC) {
      fetchBoothsForCreateDialog(user.assignedAC);
    }
  }, [user]);

  // Filter agents based on role, AC filter, and booth filter
  const filteredAgents = (() => {
    let result = user?.role === 'L2'
      ? agents.filter(agent => agent.aci_id === user.assignedAC)
      : agents;

    // Apply AC filter for L0/L1 users
    if (user?.role !== 'L2' && filterAC) {
      result = result.filter(agent => agent.aci_id === parseInt(filterAC));
    }

    // Apply booth filter
    if (filterBooth && filterBooth !== 'all') {
      console.log('[BoothAgentMgmt] Filtering by booth:', filterBooth);
      console.log('[BoothAgentMgmt] Agents before booth filter:', result.map(a => ({ name: a.fullName, booth_id: a.booth_id, boothCode: a.boothCode })));
      result = result.filter(agent => {
        const agentBoothId = agent.booth_id || agent.boothCode || '';
        const match = agentBoothId === filterBooth;
        console.log(`[BoothAgentMgmt] Agent ${agent.fullName}: booth_id=${agentBoothId}, match=${match}`);
        return match;
      });
      console.log('[BoothAgentMgmt] Agents after booth filter:', result.length);
    }

    return result;
  })();

  // Get available booths for agent assignment in create dialog
  // For L2: use createBoothsList (pre-loaded for their AC)
  // For L0/L1: use createBoothsList (loaded when AC is selected in dialog)
  const availableBooths = user?.role === 'L2'
    ? createBoothsList
    : createBoothsList;

  // Use the dynamically loaded booths for edit dialog, with fallback to filtered booths
  const editAvailableBooths = editBoothsList.length > 0
    ? editBoothsList
    : (editingAgent ? booths.filter(booth => booth.ac_id === editingAgent.aci_id) : []);

  const handleCreateAgent = async () => {
    // Validation
    if (!newAgent.username || !newAgent.password || !newAgent.fullName || !newAgent.phoneNumber || !newAgent.booth_id || !newAgent.aci_id) {
      toast({
        title: 'Validation Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      console.log('Creating booth agent:', newAgent);
      
      const response = await api.post('/rbac/users/booth-agent', {
        username: newAgent.username,
        password: newAgent.password,
        fullName: newAgent.fullName,
        phoneNumber: newAgent.phoneNumber,
        booth_id: newAgent.booth_id,
        aci_id: parseInt(newAgent.aci_id),
        aci_name: newAgent.aci_name,
      });
      
      console.log('Agent created:', response);
      
      toast({
        title: 'Success',
        description: 'Booth agent created successfully',
      });
      
      // Refresh data
      await fetchData();
      
      // Reset form and close dialog
      setNewAgent({
        username: '',
        password: '',
        fullName: '',
        phoneNumber: '',
        booth_id: '',
        aci_id: user?.role === 'L2' ? user.assignedAC : '',
        aci_name: user?.role === 'L2' ? (user.aciName || '') : '',
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create booth agent',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = async (agent: BoothAgent) => {
    setEditingAgent(agent);
    setEditForm({
      fullName: agent.fullName,
      phoneNumber: agent.phoneNumber,
      booth_id: agent.booth_id,
    });

    // Fetch booths for this agent's AC to populate dropdown
    if (agent.aci_id) {
      const acBooths = await fetchBoothsForAC(agent.aci_id);
      setEditBoothsList(acBooths);
    } else {
      setEditBoothsList(booths);
    }

    setIsEditOpen(true);
  };

  const handleUpdateAgent = async () => {
    if (!editingAgent || !editForm.fullName || !editForm.phoneNumber || !editForm.booth_id) {
      toast({
        title: 'Validation Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpdating(true);
      console.log('Updating agent:', editingAgent._id, editForm);
      
      const response = await api.put(`/rbac/users/${editingAgent._id}`, {
        fullName: editForm.fullName,
        phoneNumber: editForm.phoneNumber,
        booth_id: editForm.booth_id,
      });
      
      console.log('Agent updated:', response);
      
      toast({
        title: 'Success',
        description: 'Booth agent updated successfully',
      });
      
      // Refresh data
      await fetchData();
      
      setIsEditOpen(false);
      setEditingAgent(null);
    } catch (error: any) {
      console.error('Error updating agent:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update booth agent',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAgent = async (agent: BoothAgent) => {
    if (!confirm(`Are you sure you want to delete booth agent "${agent.fullName}"?`)) {
      return;
    }

    try {
      console.log('Deleting agent:', agent._id);
      await api.delete(`/rbac/users/${agent._id}`);
      
      toast({
        title: 'Success',
        description: 'Booth agent deleted successfully',
      });
      
      // Refresh data
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete booth agent',
        variant: 'destructive',
      });
    }
  };

  const getBoothInfo = (booth_id: string) => {
    if (!booth_id) return 'N/A';
    const booth = booths.find(b => b._id === booth_id || b.booth_id === booth_id || b.boothCode === booth_id);
    if (booth) {
      return `${booth.boothCode || booth.booth_id} - ${booth.boothName}`;
    }
    // Return the booth_id string itself as fallback (e.g., "BOOTH1-111")
    return booth_id.startsWith('BOOTH') ? booth_id : 'N/A';
  };

  // Get unique ACs for filter dropdown
  const uniqueACs = Array.from(new Set(agents.map(a => a.aci_id))).sort((a, b) => a - b);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Booth Agent Management</h1>
            <p className="text-muted-foreground">
              {user?.role === 'L2' 
                ? `Manage booth agents for AC ${user.assignedAC || '...'}`
                : 'Manage booth agents and their assignments'}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {user?.role !== 'L2' && (
              <Select value={filterAC} onValueChange={(value) => {
                setFilterAC(value);
                setFilterBooth('all'); // Reset booth filter when AC changes
              }}>
                <SelectTrigger className="w-[280px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Select Constituency" />
                </SelectTrigger>
                <SelectContent>
                  {CONSTITUENCIES.map(constituency => (
                    <SelectItem key={constituency.number} value={constituency.number.toString()}>
                      AC {constituency.number} - {constituency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Booth filter - show when AC is selected (L0/L1) or always for L2 */}
            {(user?.role === 'L2' || filterAC) && (
              <Select value={filterBooth} onValueChange={setFilterBooth}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Booths" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Booths ({booths.length})</SelectItem>
                  {booths.map(booth => (
                    <SelectItem key={booth._id || booth.boothCode} value={booth._id || booth.boothCode}>
                      {booth.boothName || `Booth ${booth.boothNumber || booth.boothNo}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Booth Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Booth Agent</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={newAgent.username}
                      onChange={(e) => setNewAgent({...newAgent, username: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                    <Input 
                      id="password" 
                      type="password"
                      placeholder="Enter password" 
                      value={newAgent.password}
                      onChange={(e) => setNewAgent({...newAgent, password: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                    <Input 
                      id="fullName" 
                      placeholder="Enter full name" 
                      value={newAgent.fullName}
                      onChange={(e) => setNewAgent({...newAgent, fullName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number <span className="text-destructive">*</span></Label>
                    <Input 
                      id="phoneNumber" 
                      placeholder="+91 98765 43210" 
                      value={newAgent.phoneNumber}
                      onChange={(e) => setNewAgent({...newAgent, phoneNumber: e.target.value})}
                    />
                  </div>
                  {user?.role !== 'L2' && (
                    <div className="space-y-2">
                      <Label htmlFor="aci">Assembly Constituency <span className="text-destructive">*</span></Label>
                      <Select
                        value={newAgent.aci_id.toString()}
                        onValueChange={(value) => {
                          const constituency = CONSTITUENCIES.find(c => c.number === parseInt(value));
                          setNewAgent({
                            ...newAgent,
                            aci_id: value,
                            aci_name: constituency?.name || '',
                            booth_id: '' // Reset booth selection when AC changes
                          });
                          // Fetch booths for the selected AC
                          if (value) {
                            fetchBoothsForCreateDialog(parseInt(value));
                          } else {
                            setCreateBoothsList([]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Constituency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONSTITUENCIES.map(constituency => (
                            <SelectItem key={constituency.number} value={constituency.number.toString()}>
                              AC {constituency.number} - {constituency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="booth">Assign to Booth <span className="text-destructive">*</span></Label>
                    <Select
                      value={newAgent.booth_id}
                      onValueChange={(value) => setNewAgent({...newAgent, booth_id: value})}
                      disabled={(!newAgent.aci_id && user?.role !== 'L2') || loadingCreateBooths}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingCreateBooths ? "Loading booths..." : "Select booth"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBooths.length === 0 ? (
                          <SelectItem value="__no_booths__" disabled>
                            {loadingCreateBooths ? "Loading..." : "No booths available - select AC first"}
                          </SelectItem>
                        ) : (
                          availableBooths.map(booth => (
                            <SelectItem key={booth._id} value={booth._id}>
                              {booth.boothCode} - {booth.boothName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleCreateAgent} disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Booth Agent'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Show select AC prompt for L0/L1 when no AC selected */}
        {user?.role !== 'L2' && !filterAC ? (
          <Card className="p-8 text-center">
            <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Select a Constituency</h3>
            <p className="text-muted-foreground mb-4">
              Please select an Assembly Constituency from the dropdown above to view booth agents.
            </p>
          </Card>
        ) : loading ? (
          <Card className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading booth agents...</p>
          </Card>
        ) : filteredAgents.length === 0 ? (
          <Card className="p-8 text-center">
            <UsersIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Booth Agents Found</h3>
            <p className="text-muted-foreground mb-4">
              {filterAC ? `No booth agents found for AC ${filterAC}. ` : ''}Get started by adding your first booth agent.
            </p>
            <Button onClick={() => setIsOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Booth Agent
            </Button>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Agent ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                    {user?.role !== 'L2' && (
                      <th className="px-4 py-3 text-left text-sm font-semibold">AC</th>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-semibold">Assigned Booth</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAgents.map((agent) => (
                    <tr key={agent._id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium">{agent.booth_agent_id}</td>
                      <td className="px-4 py-3 text-sm">{agent.fullName}</td>
                      <td className="px-4 py-3 text-sm">{agent.username}</td>
                      <td className="px-4 py-3 text-sm">{agent.phoneNumber}</td>
                      {user?.role !== 'L2' && (
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium">AC {agent.aci_id}</div>
                            <div className="text-xs text-muted-foreground">
                              {CONSTITUENCIES.find(c => c.number === agent.aci_id)?.name || agent.aci_name}
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm max-w-xs truncate">
                        {agent.boothCode && agent.boothName
                          ? `${agent.boothCode} - ${agent.boothName}`
                          : agent.boothCode || agent.boothName || agent.booth_id || getBoothInfo(agent.booth_id)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={agent.isActive ? "default" : "secondary"}>
                          {agent.isActive ? 'Active' : 'Inactive'}
                        </Badge>
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
                            onClick={() => handleDeleteAgent(agent)}
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
        )}

        {/* Edit Agent Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingAgent(null);
            setEditBoothsList([]);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Booth Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editFullName">Full Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="editFullName" 
                  placeholder="Enter full name" 
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhoneNumber">Phone Number <span className="text-destructive">*</span></Label>
                <Input 
                  id="editPhoneNumber" 
                  placeholder="+91 98765 43210" 
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBooth">Assign to Booth <span className="text-destructive">*</span></Label>
                <Select 
                  value={editForm.booth_id} 
                  onValueChange={(value) => setEditForm({...editForm, booth_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select booth" />
                  </SelectTrigger>
                  <SelectContent>
                    {editAvailableBooths.map(booth => (
                      <SelectItem key={booth._id} value={booth._id}>
                        {booth.boothCode} - {booth.boothName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleUpdateAgent} disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Booth Agent'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};
