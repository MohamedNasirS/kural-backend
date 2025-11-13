import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface Admin {
  id: number;
  name: string;
  email: string;
  status: 'Active' | 'Inactive';
  created: string;
}

const initialAdmins: Admin[] = [
  { id: 1, name: 'ACIM Manager', email: 'acim@ac.com', status: 'Active', created: '2024-01-15' },
  { id: 2, name: 'John Doe', email: 'john@ac.com', status: 'Active', created: '2024-02-20' },
  { id: 3, name: 'Jane Smith', email: 'jane@ac.com', status: 'Inactive', created: '2024-03-10' },
];

export const AdminManagement = () => {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [editAdmin, setEditAdmin] = useState({
    name: '',
    email: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  const handleAddAdmin = () => {
    if (newAdmin.name && newAdmin.email && newAdmin.password) {
      const adminToAdd: Admin = {
        id: admins.length > 0 ? Math.max(...admins.map(a => a.id)) + 1 : 1,
        name: newAdmin.name,
        email: newAdmin.email,
        status: 'Active',
        created: new Date().toISOString().split('T')[0],
      };
      
      setAdmins([...admins, adminToAdd]);
      setNewAdmin({ name: '', email: '', password: '' });
      setIsOpen(false);
      toast({
        title: 'Admin Added',
        description: `${adminToAdd.name} has been added successfully.`
      });
    } else {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
    }
  };

  const handleEditClick = (admin: Admin) => {
    console.log('Edit clicked for admin:', admin);
    setEditingAdmin(admin);
    setEditAdmin({
      name: admin.name,
      email: admin.email,
      status: admin.status,
    });
    setIsEditOpen(true);
  };

  const handleUpdateAdmin = () => {
    if (editingAdmin) {
      // Validate required fields
      if (!editAdmin.name || !editAdmin.email) {
        toast({
          title: 'Error',
          description: 'Name and email are required.',
          variant: 'destructive'
        });
        return;
      }
      
      setAdmins(admins.map(admin => 
        admin.id === editingAdmin.id 
          ? { ...admin, ...editAdmin } 
          : admin
      ));
      setIsEditOpen(false);
      setEditingAdmin(null);
      toast({
        title: 'Admin Updated',
        description: `${editAdmin.name} has been updated successfully.`
      });
    }
  };

  const handleDeleteAdmin = (id: number) => {
    setAdmins(admins.filter(admin => admin.id !== id));
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Management</h1>
            <p className="text-muted-foreground">Manage Layer 1 (ACIM) Administrators</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Admin (ACIM)</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name" 
                    placeholder="Enter admin name" 
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter email address" 
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter password" 
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddAdmin}
                >
                  Create Admin
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium">{admin.name}</td>
                    <td className="px-4 py-3 text-sm">{admin.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        admin.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{admin.created}</td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditClick(admin)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteAdmin(admin.id)}
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

        {/* Edit Admin Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingAdmin(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="edit-name" 
                  placeholder="Enter admin name" 
                  value={editAdmin.name}
                  onChange={(e) => setEditAdmin({...editAdmin, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email <span className="text-destructive">*</span></Label>
                <Input 
                  id="edit-email" 
                  type="email" 
                  placeholder="Enter email address" 
                  value={editAdmin.email}
                  onChange={(e) => setEditAdmin({...editAdmin, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  className="w-full p-2 border rounded"
                  value={editAdmin.status}
                  onChange={(e) => setEditAdmin({...editAdmin, status: e.target.value as 'Active' | 'Inactive'})}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <Button className="w-full" onClick={handleUpdateAdmin}>
                Update Admin
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};