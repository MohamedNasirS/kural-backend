import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Users, Home, FileCheck, User, Calendar, UserCircle } from 'lucide-react';

interface SurveyDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  surveyData: {
    id: number;
    voter: string;
    voterId: string;
    booth: string;
    question: string;
    answer: string;
    date: string;
    agent: string;
  } | null;
}

export const SurveyDetailDrawer = ({ open, onClose, surveyData }: SurveyDetailDrawerProps) => {
  if (!surveyData) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Survey Details
          </SheetTitle>
          <SheetDescription>Survey ID: {surveyData.id}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Survey Information */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Survey Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Voter</p>
                  <p className="text-sm font-medium">{surveyData.voter}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Voter ID</p>
                  <p className="text-sm font-medium">{surveyData.voterId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Booth</p>
                  <p className="text-sm font-medium">{surveyData.booth}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium">{surveyData.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Agent</p>
                  <p className="text-sm font-medium">{surveyData.agent}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Survey Question and Answer */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Survey Response
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Question</p>
                <p className="text-base font-semibold bg-muted p-3 rounded-lg">{surveyData.question}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Answer</p>
                <p className="text-base font-semibold bg-muted p-3 rounded-lg">{surveyData.answer}</p>
              </div>
            </div>
          </Card>

          {/* Additional Metadata */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Additional Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Survey Status</span>
                <Badge variant="default">Completed</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Response Length</span>
                <span className="text-sm">{surveyData.answer.length} characters</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Survey Type</span>
                <span className="text-sm">Standard Form</span>
              </div>
            </div>
          </Card>

          <Separator />

          {/* Survey History */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Voter Survey History</h3>
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <p className="font-medium text-sm">Which party will you vote for?</p>
                  <Badge variant="outline" className="text-xs">2024-03-15</Badge>
                </div>
                <p className="text-sm mt-1">Party A</p>
                <p className="text-xs text-muted-foreground mt-2">Agent: Rajesh Kumar</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <p className="font-medium text-sm">What is your primary concern?</p>
                  <Badge variant="outline" className="text-xs">2024-03-15</Badge>
                </div>
                <p className="text-sm mt-1">Healthcare</p>
                <p className="text-xs text-muted-foreground mt-2">Agent: Rajesh Kumar</p>
              </div>
            </div>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};