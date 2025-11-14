import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Users, Home, FileCheck, UserCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface FamilyDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  familyData: {
    id: string;
    headName: string;
    members: number;
    booth: string;
    surveyed: number;
    address: string;
  } | null;
}

// Mock data for family members
const getMockFamilyMembers = (familyId: string) => [
  { id: 1, name: 'Rajesh Kumar', age: 45, gender: 'Male', relationship: 'Head', phone: '+91 98765 43210', surveyed: true },
  { id: 2, name: 'Priya Rajesh', age: 40, gender: 'Female', relationship: 'Wife', phone: '+91 98765 43211', surveyed: true },
  { id: 3, name: 'Arun Rajesh', age: 18, gender: 'Male', relationship: 'Son', phone: '', surveyed: false },
  { id: 4, name: 'Meena Rajesh', age: 15, gender: 'Female', relationship: 'Daughter', phone: '', surveyed: true },
];

// Mock data for family details
const getMockFamilyDetails = (familyId: string) => ({
  location: 'Main Road, Thondamuthur',
  assignedAgents: [
    { id: 1, name: 'Rajesh Kumar', surveys: 45, status: 'active' },
    { id: 2, name: 'Priya Sharma', surveys: 38, status: 'active' },
  ],
  recentActivity: [
    { id: 1, action: 'Survey completed for Arun Rajesh', time: '10 mins ago', agent: 'Rajesh Kumar' },
    { id: 2, action: 'Family details updated', time: '25 mins ago', agent: 'Priya Sharma' },
    { id: 3, action: 'New family registered', time: '1 hour ago', agent: 'Rajesh Kumar' },
  ],
  demographics: {
    totalMembers: 4,
    male: 2,
    female: 2,
    surveyed: 3,
    pending: 1,
  },
});

export const FamilyDetailDrawer = ({ open, onClose, familyData }: FamilyDetailDrawerProps) => {
  if (!familyData) return null;

  const members = getMockFamilyMembers(familyData.id);
  const details = getMockFamilyDetails(familyData.id);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            {familyData.id} - {familyData.headName}
          </SheetTitle>
          <SheetDescription>{familyData.address}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Family Status */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Family Status</h3>
              <Badge variant={familyData.surveyed === familyData.members ? 'default' : familyData.surveyed > 0 ? 'secondary' : 'destructive'}>
                {familyData.surveyed}/{familyData.members} Surveyed
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  familyData.surveyed === familyData.members ? 'bg-success' : familyData.surveyed > 0 ? 'bg-warning' : 'bg-destructive'
                }`}
                style={{ width: `${(familyData.surveyed / familyData.members) * 100}%` }}
              />
            </div>
          </Card>

          {/* Family Members */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Family Members
            </h3>
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.age} years, {member.gender} ({member.relationship})</p>
                    </div>
                  </div>
                  <Badge variant={member.surveyed ? 'default' : 'secondary'}>
                    {member.surveyed ? 'Surveyed' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Demographics */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Family Demographics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold text-primary">{details.demographics.totalMembers}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Male / Female</p>
                <p className="text-lg font-bold">{details.demographics.male} / {details.demographics.female}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-success" />
                  Surveyed
                </p>
                <p className="text-2xl font-bold text-success">{details.demographics.surveyed}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-warning" />
                  Pending
                </p>
                <p className="text-2xl font-bold text-warning">{details.demographics.pending}</p>
              </div>
            </div>
          </Card>

          <Separator />

          {/* Recent Activity */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {details.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <FileCheck className="h-4 w-4 text-primary mt-1" />
                  <div className="flex-1">
                    <p className="text-sm">{activity.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{activity.agent}</p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};