import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Edit2, Trash2, Eye, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { CONSTITUENCIES } from '@/constants/constituencies';

interface Moderator {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  assignedAC?: number;
  status: string;
  isActive: boolean;
  createdAt: string;
}

export const ModeratorManagement = () => {
  const { toast } = useToast();
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedModerator, setSelectedModerator] = useState<Moderator | null>(null);
  const [viewModerator, setViewModerator] = useState<Moderator | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newModerator, setNewModerator] = useState({
    name: '',
    email: '',
    phone: '',
    assignedAC: '',
    password: '',
  });

  const [editModerator, setEditModerator] = useState({
    _id: '',
    name: '',
    email: '',
    phone: '',
    assignedAC: '',
    status: 'Active',
  });

  // Fetch moderators (L2 users)
  useEffect(() => {
    fetchModerators();
  }, []);

  const fetchModerators = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/rbac/users?role=L2');
      const usersList = response.users || [];
      setModerators(usersList);
    } catch (error: any) {
      console.error('Error fetching moderators:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch moderators',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getACName = (acNumber?: number): string => {
    if (!acNumber) return 'Not Assigned';
    const constituency = CONSTITUENCIES.find(c => c.number === acNumber);
    return constituency ? `${acNumber} - ${constituency.name}` : `AC ${acNumber}`;
  };

  // Handle adding a new moderator
  const handleAddModerator = async () => {
    if (!newModerator.name || !newModerator.assignedAC || !newModerator.password) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (Name, AC, and Password).',
        variant: 'destructive',
      });
      return;
    }

    if (!newModerator.email && !newModerator.phone) {
      toast({
        title: 'Validation Error',
        description: 'Please provide either email or phone number.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/rbac/users', {
        name: newModerator.name,
        email: newModerator.email || undefined,
        phone: newModerator.phone || undefined,
        password: newModerator.password,
        role: 'L2',
        assignedAC: parseInt(newModerator.assignedAC),
        status: 'Active',
      });

      // Reset form
      setNewModerator({
        name: '',
        email: '',
        phone: '',
        assignedAC: '',
        password: '',
      });

      setIsAddOpen(false);
      fetchModerators();

      toast({
        title: 'Moderator Added',
        description: `${newModerator.name} has been successfully added as an ACI moderator.`,
      });
    } catch (error: any) {
      console.error('Error adding moderator:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add moderator',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle editing a moderator
  const handleEditClick = (moderator: Moderator) => {
    setSelectedModerator(moderator);
    setEditModerator({
      _id: moderator._id,
      name: moderator.name,
      email: moderator.email || '',
      phone: moderator.phone || '',
      assignedAC: moderator.assignedAC?.toString() || '',
      status: moderator.status || 'Active',
    });
    setIsEditOpen(true);
  };

  const handleUpdateModerator = async () => {
    if (!editModerator.name || !editModerator.assignedAC) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await api.put(`/rbac/users/${editModerator._id}`, {
        name: editModerator.name,
        email: editModerator.email || undefined,
        phone: editModerator.phone || undefined,
        assignedAC: parseInt(editModerator.assignedAC),
        status: editModerator.status,
      });

      setIsEditOpen(false);
      setSelectedModerator(null);
      fetchModerators();

      toast({
        title: 'Moderator Updated',
        description: `${editModerator.name}'s information has been successfully updated.`,
      });
    } catch (error: any) {
      console.error('Error updating moderator:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update moderator',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a moderator
  const handleDeleteModerator = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }

    try {
      await api.delete(`/rbac/users/${id}`);
      fetchModerators();
      toast({
        title: 'Moderator Deleted',
        description: `${name} has been successfully removed from the system.`,
      });
    } catch (error: any) {
      console.error('Error deleting moderator:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete moderator',
        variant: 'destructive',
      });
    }
  };

  // Handle viewing moderator details
  const handleViewClick = (moderator: Moderator) => {
    setViewModerator(moderator);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading moderators...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Moderator Management</h1>
            <p className="text-muted-foreground">
              Manage Layer 2 (ACI) Moderators across all constituencies ({moderators.length} moderators)
            </p>
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
                  <Label htmlFor="name">Full Name *</Label>
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
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={newModerator.phone}
                    onChange={(e) => setNewModerator({...newModerator, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ac">Assign to Assembly Constituency *</Label>
                  <Select value={newModerator.assignedAC} onValueChange={(value) => setNewModerator({...newModerator, assignedAC: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AC" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSTITUENCIES.map((ac) => (
                        <SelectItem key={ac.number} value={String(ac.number)}>
                          {ac.number} - {ac.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={newModerator.password}
                    onChange={(e) => setNewModerator({...newModerator, password: e.target.value})}
                  />
                </div>
                <Button className="w-full" onClick={handleAddModerator} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Moderator'
                  )}
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email / Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Assigned AC</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {moderators.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No moderators found. Add a new moderator to get started.
                    </td>
                  </tr>
                ) : (
                  moderators.map((moderator) => (
                    <tr key={moderator._id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium">{moderator.name}</td>
                      <td className="px-4 py-3 text-sm">{moderator.email || moderator.phone || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{getACName(moderator.assignedAC)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          moderator.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        }`}>
                          {moderator.status || 'Active'}
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
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteModerator(moderator._id, moderator.name)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
                  <p className="font-medium">{viewModerator.email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{viewModerator.phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Assigned AC</Label>
                  <p className="font-medium">{getACName(viewModerator.assignedAC)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="font-medium">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      viewModerator.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {viewModerator.status || 'Active'}
                    </span>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="font-medium">
                    {viewModerator.createdAt ? new Date(viewModerator.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
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
              <Label htmlFor="edit-name">Full Name *</Label>
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
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                placeholder="Enter phone number"
                value={editModerator.phone}
                onChange={(e) => setEditModerator({...editModerator, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ac">Assign to Assembly Constituency *</Label>
              <Select value={editModerator.assignedAC} onValueChange={(value) => setEditModerator({...editModerator, assignedAC: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AC" />
                </SelectTrigger>
                <SelectContent>
                  {CONSTITUENCIES.map((ac) => (
                    <SelectItem key={ac.number} value={String(ac.number)}>
                      {ac.number} - {ac.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editModerator.status} onValueChange={(value) => setEditModerator({...editModerator, status: value})}>
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleUpdateModerator} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Moderator'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};
