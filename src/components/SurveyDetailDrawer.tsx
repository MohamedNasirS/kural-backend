import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Users, Home, FileCheck, User, Calendar, UserCircle, ClipboardList } from 'lucide-react';

interface SurveyAnswer {
  question?: string;
  questionId?: string;
  answer?: string;
  value?: string;
  prompt?: string;
}

interface SurveyDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  surveyData: {
    // Support for new format from SurveyManager
    id?: string | number;
    respondent_name?: string;
    voter_id?: string;
    voterId?: string;
    booth?: string;
    booth_id?: string | null;
    survey_date?: string;
    status?: string;
    answers?: SurveyAnswer[];
    // Support for legacy format
    voter?: string;
    question?: string;
    answer?: string;
    date?: string;
    agent?: string;
  } | null;
}

export const SurveyDetailDrawer = ({ open, onClose, surveyData }: SurveyDetailDrawerProps) => {
  if (!surveyData) return null;

  // Normalize data to support both old and new formats
  const voterName = surveyData.respondent_name || surveyData.voter || 'Unknown';
  const voterId = surveyData.voterId || surveyData.voter_id || 'N/A';
  const booth = surveyData.booth || 'N/A';
  const date = surveyData.survey_date || surveyData.date || 'N/A';
  const status = surveyData.status || 'Completed';
  const answers = surveyData.answers || (surveyData.question && surveyData.answer ? [{
    question: surveyData.question,
    answer: surveyData.answer
  }] : []);
  const agent = surveyData.agent || 'N/A';

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Survey Response Details
          </SheetTitle>
          <SheetDescription>Response ID: {surveyData.id || 'N/A'}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Respondent Information */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Respondent Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{voterName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Voter ID</p>
                  <p className="text-sm font-medium">{voterId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Booth</p>
                  <p className="text-sm font-medium">{booth}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Survey Date</p>
                  <p className="text-sm font-medium">{formatDate(date)}</p>
                </div>
              </div>
              {agent !== 'N/A' && (
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Agent</p>
                    <p className="text-sm font-medium">{agent}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Survey Status */}
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Survey Status
              </h3>
              <Badge variant={status === 'Completed' ? 'default' : 'secondary'}>
                {status}
              </Badge>
            </div>
          </Card>

          {/* Survey Responses */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Survey Responses ({answers.length} answer{answers.length !== 1 ? 's' : ''})
            </h3>
            {answers.length > 0 ? (
              <div className="space-y-4">
                {answers.map((item, index) => {
                  const questionText = item.question || item.prompt || item.questionId || `Question ${index + 1}`;
                  const answerText = item.answer || item.value || 'No answer provided';

                  return (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Q{index + 1}: {questionText}
                      </p>
                      <p className="text-base font-medium bg-background p-2 rounded border">
                        {answerText}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No answers recorded for this survey response.</p>
              </div>
            )}
          </Card>

          <Separator />

          {/* Additional Metadata */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Response Metadata</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Total Questions</span>
                <span className="text-sm">{answers.length}</span>
              </div>
              {surveyData.booth_id && (
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Booth ID</span>
                  <span className="text-sm font-mono">{surveyData.booth_id}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};
