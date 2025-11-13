import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Users, Home, FileCheck, User, Clock, CheckCircle, XCircle, Phone, Calendar } from 'lucide-react';

interface VoterDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  voterData: {
    id: number;
    name: string;
    age: number;
    gender: string;
    booth: string;
    family: string;
    phone: string;
    surveyed: boolean;
  } | null;
}

// Mock data for voter details
const getMockVoterDetails = (voterId: number) => ({
  address: '123 Main Street, Thondamuthur',
  familyMembers: 4,
  surveyHistory: [
    { id: 1, date: '2024-01-15', question: 'Which party do you prefer?', answer: 'Party A', agent: 'Rajesh Kumar' },
    { id: 2, date: '2023-11-22', question: 'Main issues in your area?', answer: 'Infrastructure development', agent: 'Priya Sharma' },
  ],
  recentActivity: [
    { id: 1, action: 'Survey completed', time: '10 mins ago', agent: 'Rajesh Kumar' },
    { id: 2, action: 'Voter details updated', time: '25 mins ago', agent: 'Priya Sharma' },
    { id: 3, action: 'New voter registered', time: '1 hour ago', agent: 'Rajesh Kumar' },
  ],
  demographics: {
    totalSurveys: 2,
    lastSurvey: '2024-01-15',
    preferredParty: 'Party A',
  },
});

export const VoterDetailDrawer = ({ open, onClose, voterData }: VoterDetailDrawerProps) => {
  if (!voterData) return null;

  const details = getMockVoterDetails(voterData.id);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {voterData.name}
          </SheetTitle>
          <SheetDescription>Voter ID: {voterData.id}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Voter Status */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Voter Status</h3>
              <Badge variant={voterData.surveyed ? 'default' : 'secondary'}>
                {voterData.surveyed ? 'Surveyed' : 'Pending'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{voterData.family}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{voterData.booth}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{voterData.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{voterData.age} years</span>
              </div>
            </div>
          </Card>

          {/* Survey History */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Survey History
            </h3>
            <div className="space-y-3">
              {details.surveyHistory.map((survey) => (
                <div key={survey.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between">
                    <p className="font-medium text-sm">{survey.question}</p>
                    <Badge variant="outline" className="text-xs">{survey.date}</Badge>
                  </div>
                  <p className="text-sm mt-1">{survey.answer}</p>
                  <p className="text-xs text-muted-foreground mt-2">Agent: {survey.agent}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Voter Demographics */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Voter Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Total Surveys</p>
                <p className="text-2xl font-bold text-primary">{details.demographics.totalSurveys}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Last Survey</p>
                <p className="text-lg font-bold">{details.demographics.lastSurvey}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Preferred Party</p>
                <p className="text-lg font-bold text-success">{details.demographics.preferredParty}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Family Members</p>
                <p className="text-2xl font-bold text-warning">{details.familyMembers}</p>
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