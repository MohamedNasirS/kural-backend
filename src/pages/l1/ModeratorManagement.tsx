import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Edit2, Trash2, Eye } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface Moderator {
  id: number;
  name: string;
  email: string;
  assignedAC: string;
  status: 'Active' | 'Inactive';
}

const mockModerators: Moderator[] = [
  { id: 1, name: 'ACI Moderator', email: 'aci@ac119.com', assignedAC: '119 - Thondamuthur', status: 'Active' },
  { id: 2, name: 'Priya Sharma', email: 'priya@ac119.com', assignedAC: '119 - Coimbatore North', status: 'Active' },
  { id: 3, name: 'Arun Patel', email: 'arun@ac120.com', assignedAC: '120 - Coimbatore South', status: 'Active' },
  { id: 4, name: 'Deepa Singh', email: 'deepa@ac121.com', assignedAC: '121 - Singanallur', status: 'Inactive' },
];

const acOptions = [
  { value: '119', label: '119 - Thondamuthur' },
  { value: '119', label: '119 - Coimbatore North' },
  { value: '120', label: '120 - Coimbatore South' },
  { value: '121', label: '121 - Singanallur' },
  { value: '122', label: '122 - Sulur' },
  { value: '123', label: '123 - Kovai' },
];

export const ModeratorManagement = () => {
  const { toast } = useToast();
  const [moderators, setModerators] = useState<Moderator[]>(mockModerators);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedModerator, setSelectedModerator] = useState<Moderator | null>(null);
  const [viewModerator, setViewModerator] = useState<Moderator | null>(null);
  
  // Form states
  const [newModerator, setNewModerator] = useState({
    name: '',
    email: '',
    assignedAC: '',
    password: '',
  });
  
  const [editModerator, setEditModerator] = useState({
    id: 0,
    name: '',
    email: '',
    assignedAC: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  // Handle adding a new moderator
  const handleAddModerator = () => {
    if (!newModerator.name || !newModerator.email || !newModerator.assignedAC || !newModerator.password) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Check if email already exists
    if (moderators.some(mod => mod.email === newModerator.email)) {
      toast({
        title: 'Validation Error',
        description: 'A moderator with this email already exists.',
        variant: 'destructive',
      });
      return;
    }

    const selectedAC = acOptions.find(ac => ac.value === newModerator.assignedAC);
    const newMod: Moderator = {
      id: Math.max(0, ...moderators.map(m => m.id)) + 1,
      name: newModerator.name,
      email: newModerator.email,
      assignedAC: selectedAC ? selectedAC.label : newModerator.assignedAC,
      status: 'Active',
    };

    setModerators([...moderators, newMod]);
    
    // Reset form
    setNewModerator({
      name: '',
      email: '',
      assignedAC: '',
      password: '',
    });
    
    setIsAddOpen(false);
    
    toast({
      title: 'Moderator Added',
      description: `${newModerator.name} has been successfully added as a moderator.`,
    });
  };

  // Handle editing a moderator
  const handleEditClick = (moderator: Moderator) => {
    setSelectedModerator(moderator);
    setEditModerator({
      id: moderator.id,
      name: moderator.name,
      email: moderator.email,
      assignedAC: moderator.assignedAC.split(' - ')[0], // Extract AC number
      status: moderator.status,
    });
    setIsEditOpen(true);
  };

  const handleUpdateModerator = () => {
    if (!editModerator.name || !editModerator.email || !editModerator.assignedAC) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const selectedAC = acOptions.find(ac => ac.value === editModerator.assignedAC);
    const updatedModerators = moderators.map(mod => 
      mod.id === editModerator.id 
        ? { 
            ...mod, 
            name: editModerator.name,
            email: editModerator.email,
            assignedAC: selectedAC ? selectedAC.label : editModerator.assignedAC,
            status: editModerator.status,
          } 
        : mod
    );

    setModerators(updatedModerators);
    setIsEditOpen(false);
    setSelectedModerator(null);
    
    toast({
      title: 'Moderator Updated',
      description: `${editModerator.name}'s information has been successfully updated.`,
    });
  };

  // Handle deleting a moderator
  const handleDeleteModerator = (id: number, name: string) => {
    setModerators(moderators.filter(mod => mod.id !== id));
    toast({
      title: 'Moderator Deleted',
      description: `${name} has been successfully removed from the system.`,
    });
  };

  // Handle viewing moderator details
  const handleViewClick = (moderator: Moderator) => {
    setViewModerator(moderator);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Moderator Management</h1>
            <p className="text-muted-foreground">Manage Layer 2 (ACI) Moderators across all constituencies</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Moderator
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Moderator (ACI)</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Enter moderator name" 
                    value={newModerator.name}
                    onChange={(e) => setNewModerator({...newModerator, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter email address" 
                    value={newModerator.email}
                    onChange={(e) => setNewModerator({...newModerator, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ac">Assign to Assembly Constituency</Label>
                  <Select value={newModerator.assignedAC} onValueChange={(value) => setNewModerator({...newModerator, assignedAC: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AC" />
                    </SelectTrigger>
                    <SelectContent>
                      {acOptions.map((ac) => (
                        <SelectItem key={ac.value} value={ac.value}>
                          {ac.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter password" 
                    value={newModerator.password}
                    onChange={(e) => setNewModerator({...newModerator, password: e.target.value})}
                  />
                </div>
                <Button className="w-full" onClick={handleAddModerator}>
                  Create Moderator
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Assigned AC</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {moderators.map((moderator) => (
                  <tr key={moderator.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium">{moderator.name}</td>
                    <td className="px-4 py-3 text-sm">{moderator.email}</td>
                    <td className="px-4 py-3 text-sm">{moderator.assignedAC}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        moderator.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        {moderator.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewClick(moderator)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(moderator)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteModerator(moderator.id, moderator.name)}>
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
      </div>

      {/* View Moderator Dialog */}
      <Dialog open={!!viewModerator} onOpenChange={(open) => !open && setViewModerator(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Moderator Details</DialogTitle>
          </DialogHeader>
          {viewModerator && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{viewModerator.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{viewModerator.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Assigned AC</Label>
                  <p className="font-medium">{viewModerator.assignedAC}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="font-medium">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      viewModerator.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {viewModerator.status}
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">ID</Label>
                <p className="font-medium">MOD-{viewModerator.id.toString().padStart(3, '0')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Moderator Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setSelectedModerator(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Moderator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input 
                id="edit-name" 
                placeholder="Enter moderator name" 
                value={editModerator.name}
                onChange={(e) => setEditModerator({...editModerator, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input 
                id="edit-email" 
                type="email" 
                placeholder="Enter email address" 
                value={editModerator.email}
                onChange={(e) => setEditModerator({...editModerator, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ac">Assign to Assembly Constituency</Label>
              <Select value={editModerator.assignedAC} onValueChange={(value) => setEditModerator({...editModerator, assignedAC: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AC" />
                </SelectTrigger>
                <SelectContent>
                  {acOptions.map((ac) => (
                    <SelectItem key={ac.value} value={ac.value}>
                      {ac.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editModerator.status} onValueChange={(value) => setEditModerator({...editModerator, status: value as 'Active' | 'Inactive'})}>
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleUpdateModerator}>
              Update Moderator
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};