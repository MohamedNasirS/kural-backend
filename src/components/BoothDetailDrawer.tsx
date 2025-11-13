import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MapPin, Users, FileCheck, UserCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface BoothDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  boothData: {
    booth: string;
    completion: number;
    voters: number;
  } | null;
}

// Mock data for booth details
const getMockBoothDetails = (boothName: string) => ({
  boothNumber: boothName.replace('Booth ', ''),
  location: 'Government High School, Main Street',
  assignedAgents: [
    { id: 1, name: 'Rajesh Kumar', surveys: 45, status: 'active' },
    { id: 2, name: 'Priya Sharma', surveys: 38, status: 'active' },
    { id: 3, name: 'Amit Patel', surveys: 12, status: 'inactive' },
  ],
  recentActivity: [
    { id: 1, action: 'Survey completed for Family #234', time: '10 mins ago', agent: 'Rajesh Kumar' },
    { id: 2, action: 'Voter details updated', time: '25 mins ago', agent: 'Priya Sharma' },
    { id: 3, action: 'New family registered', time: '1 hour ago', agent: 'Rajesh Kumar' },
  ],
  demographics: {
    totalVoters: 450,
    male: 235,
    female: 215,
    surveyed: 385,
    pending: 65,
  },
});

export const BoothDetailDrawer = ({ open, onClose, boothData }: BoothDetailDrawerProps) => {
  if (!boothData) return null;

  const details = getMockBoothDetails(boothData.booth);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {boothData.booth}
          </SheetTitle>
          <SheetDescription>{details.location}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Completion Status */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Completion Status</h3>
              <Badge variant={boothData.completion >= 80 ? 'default' : boothData.completion >= 60 ? 'secondary' : 'destructive'}>
                {boothData.completion}%
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  boothData.completion >= 80 ? 'bg-success' : boothData.completion >= 60 ? 'bg-warning' : 'bg-destructive'
                }`}
                style={{ width: `${boothData.completion}%` }}
              />
            </div>
          </Card>

          {/* Demographics */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Voter Demographics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Total Voters</p>
                <p className="text-2xl font-bold text-primary">{details.demographics.totalVoters}</p>
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

          {/* Assigned Agents */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Assigned Agents
            </h3>
            <div className="space-y-3">
              {details.assignedAgents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.surveys} surveys completed</p>
                    </div>
                  </div>
                  <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                    {agent.status}
                  </Badge>
                </div>
              ))}
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
