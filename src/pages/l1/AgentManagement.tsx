import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Edit2, Trash2, Filter } from 'lucide-react';
import { useState } from 'react';

const mockAgents = [
  { id: 1, name: 'Rajesh Kumar', phone: '+91 98765 43210', booth: 'Booth 1', ac: '118 - Thondamuthur', moderator: 'ACI Moderator', status: 'Active' },
  { id: 2, name: 'Priya Sharma', phone: '+91 98765 43211', booth: 'Booth 2', ac: '118 - Thondamuthur', moderator: 'ACI Moderator', status: 'Active' },
  { id: 3, name: 'Arun Patel', phone: '+91 98765 43212', booth: 'Booth 1', ac: '119 - Coimbatore North', moderator: 'Priya Sharma', status: 'Active' },
  { id: 4, name: 'Meena Devi', phone: '+91 98765 43213', booth: 'Booth 3', ac: '120 - Coimbatore South', moderator: 'Arun Patel', status: 'Inactive' },
];

export const AgentManagement = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Booth Agent Management</h1>
            <p className="text-muted-foreground">Manage Layer 3 (BLC) Booth Agents across all constituencies</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Agent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Booth Agent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Enter agent name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ac">Assembly Constituency</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="118">118 - Thondamuthur</SelectItem>
                      <SelectItem value="119">119 - Coimbatore North</SelectItem>
                      <SelectItem value="120">120 - Coimbatore South</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booth">Assign to Booth</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select booth" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Booth 1</SelectItem>
                      <SelectItem value="2">Booth 2</SelectItem>
                      <SelectItem value="3">Booth 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => setIsOpen(false)}>
                  Create Agent
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-4">
          <div className="flex space-x-4">
            <Select>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by AC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ACs</SelectItem>
                <SelectItem value="118">118 - Thondamuthur</SelectItem>
                <SelectItem value="119">119 - Coimbatore North</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Moderator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Moderators</SelectItem>
                <SelectItem value="aci">ACI Moderator</SelectItem>
                <SelectItem value="priya">Priya Sharma</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Assigned Booth</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">AC</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Moderator</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium">{agent.name}</td>
                    <td className="px-4 py-3 text-sm">{agent.phone}</td>
                    <td className="px-4 py-3 text-sm">{agent.booth}</td>
                    <td className="px-4 py-3 text-sm">{agent.ac}</td>
                    <td className="px-4 py-3 text-sm">{agent.moderator}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
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
