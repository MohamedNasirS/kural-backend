import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const mockAgents = [
  { id: 1, name: 'Rajesh Kumar', phone: '+91 98765 43210', boothId: '1', boothLocation: 'Government School, Main Road', status: 'Active' },
  { id: 2, name: 'Priya Sharma', phone: '+91 98765 43211', boothId: '2', boothLocation: 'Community Hall, West Street', status: 'Active' },
  { id: 3, name: 'Arun Patel', phone: '+91 98765 43212', boothId: '3', boothLocation: 'Primary School, East Area', status: 'Active' },
];

export const AgentManagement = () => {
  const { user } = useAuth();
  const acNumber = user?.assignedAC || 119;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Booth Agent Management</h1>
            <p className="text-muted-foreground">Manage booth agents for AC {acNumber} - Thondamuthur</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign Booth Agent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Booth Agent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input id="name" placeholder="Enter agent name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booth">Assign to Booth (BID)</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select booth" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Booth 1 - Government School, Main Road</SelectItem>
                      <SelectItem value="2">Booth 2 - Community Hall, West Street</SelectItem>
                      <SelectItem value="3">Booth 3 - Primary School, East Area</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baid">Booth Agent ID (BAID)</Label>
                  <Input id="baid" placeholder="Enter or auto-generate BAID" />
                </div>
                <Button className="w-full" onClick={() => setIsOpen(false)}>
                  Assign Agent
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Booth ID (BID)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Booth Location</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium">{agent.name}</td>
                    <td className="px-4 py-3 text-sm">{agent.phone}</td>
                    <td className="px-4 py-3 text-sm">{agent.boothId}</td>
                    <td className="px-4 py-3 text-sm">{agent.boothLocation}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
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
    </DashboardLayout>
  );
};
