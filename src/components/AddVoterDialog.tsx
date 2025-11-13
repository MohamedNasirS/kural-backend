import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { User, Phone, Home, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddVoterDialogProps {
  open: boolean;
  onClose: () => void;
  onAddVoter: (voter: any) => void;
}

export const AddVoterDialog = ({ open, onClose, onAddVoter }: AddVoterDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    booth: '',
    family: '',
    phone: '',
    address: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.age || !formData.gender || !formData.booth || !formData.family || !formData.phone) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Create new voter object
    const newVoter = {
      id: Date.now(), // Simple ID generation
      name: formData.name,
      age: parseInt(formData.age),
      gender: formData.gender,
      booth: formData.booth,
      family: formData.family,
      phone: formData.phone,
      surveyed: false,
    };

    onAddVoter(newVoter);
    
    // Reset form
    setFormData({
      name: '',
      age: '',
      gender: '',
      booth: '',
      family: '',
      phone: '',
      address: '',
    });
    
    toast({
      title: 'Voter Added',
      description: `${formData.name} has been successfully added to the voter list.`,
    });
    
    onClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Add New Voter
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new voter to the system.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="age">Age <span className="text-destructive">*</span></Label>
              <Input
                id="age"
                type="number"
                placeholder="Enter age"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
              <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="booth">Booth <span className="text-destructive">*</span></Label>
              <Select value={formData.booth} onValueChange={(value) => handleChange('booth', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select booth" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B-101">Booth B-101</SelectItem>
                  <SelectItem value="B-102">Booth B-102</SelectItem>
                  <SelectItem value="B-103">Booth B-103</SelectItem>
                  <SelectItem value="B-104">Booth B-104</SelectItem>
                  <SelectItem value="B-105">Booth B-105</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="family">Family ID <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="family"
                  placeholder="Enter family ID"
                  value={formData.family}
                  onChange={(e) => handleChange('family', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Enter full address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={3}
            />
          </div>
          
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Voter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};