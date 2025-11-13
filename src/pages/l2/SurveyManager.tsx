import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileCheck, Filter, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { SurveyDetailDrawer } from '@/components/SurveyDetailDrawer';
import { useToast } from '@/components/ui/use-toast';
import { fetchSurveys } from '@/lib/surveys';

const mockSurveys = [
  { id: 1, formName: 'Voter Intake Form 2025', voter: 'Rajesh Kumar', voterId: 'TND1234567', booth: 'Booth 1', question: 'Which party will you vote for?', answer: 'Party A', date: '2024-03-15', agent: 'Rajesh Kumar' },
  { id: 2, formName: 'Local Issues Survey', voter: 'Priya Sharma', voterId: 'TND1234568', booth: 'Booth 1', question: 'What is your primary concern?', answer: 'Healthcare', date: '2024-03-15', agent: 'Rajesh Kumar' },
  { id: 3, formName: 'Local Issues Survey', voter: 'Suresh Babu', voterId: 'TND1234571', booth: 'Booth 3', question: 'Rate government performance', answer: '7/10', date: '2024-03-14', agent: 'Priya Sharma' },
  { id: 4, formName: 'Voter Intake Form 2025', voter: 'Arun Patel', voterId: 'TND1234569', booth: 'Booth 2', question: 'Which party will you vote for?', answer: 'Party B', date: '2024-03-14', agent: 'Arun Patel' },
];

export const SurveyManager = () => {
  const { user } = useAuth();
  const acNumber = user?.assignedAC || 119;
  const { toast } = useToast();
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formFilter, setFormFilter] = useState<string>('all');
  const [boothFilter, setBoothFilter] = useState<string>('all');
  const [assignedForms, setAssignedForms] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  useEffect(() => {
    const loadAssignedForms = async () => {
      setIsLoadingForms(true);
      try {
        const surveys = await fetchSurveys({ assignedAC: acNumber });
        setAssignedForms(
          surveys
            .filter((survey) => survey.status === 'Active')
            .map((survey) => ({
              id: survey.id,
              name: survey.title,
            })),
        );
      } catch (error) {
        console.error('Failed to load assigned survey forms', error);
        toast({
          title: 'Unable to load survey forms',
          description: error instanceof Error ? error.message : 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingForms(false);
      }
    };

    loadAssignedForms();
  }, [acNumber, toast]);

  // Get unique booths for filter options
  const uniqueBooths = Array.from(new Set(mockSurveys.map(survey => survey.booth)));

  // Filter surveys based on selected filters
  const activeFormNames = new Set(assignedForms.map((form) => form.name));

  const filteredSurveys = mockSurveys.filter((survey) => {
    const selectedForm = assignedForms.find((form) => form.id === formFilter);
    const matchesForm =
      formFilter === 'all'
        ? activeFormNames.size > 0 && activeFormNames.has(survey.formName)
        : selectedForm
          ? survey.formName === selectedForm.name
          : false;
    
    // Booth filter
    const matchesBooth = boothFilter === 'all' || survey.booth === boothFilter;
    
    return matchesForm && matchesBooth;
  });

  const handleViewDetails = (survey: any) => {
    setSelectedSurvey(survey);
    setIsDrawerOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Survey Manager</h1>
          <p className="text-muted-foreground">Review survey responses for AC {acNumber} - Thondamuthur</p>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <Select value={formFilter} onValueChange={setFormFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select Survey Form to View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Survey Forms</SelectItem>
                {isLoadingForms ? (
                  <SelectItem value="loading" disabled>
                    Loading forms...
                  </SelectItem>
                ) : assignedForms.length > 0 ? (
                  assignedForms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No active forms assigned
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={boothFilter} onValueChange={setBoothFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Booth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Booths</SelectItem>
                {uniqueBooths.map((booth) => (
                  <SelectItem key={booth} value={booth}>
                    {booth}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {}}>
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          {filteredSurveys.length > 0 ? (
            filteredSurveys.map((survey) => (
              <Card key={survey.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <FileCheck className="h-5 w-5 text-success" />
                      <h3 className="text-lg font-semibold">{survey.voter}</h3>
                      <span className="text-sm text-muted-foreground">({survey.voterId})</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Booth:</span>
                        <span className="ml-2 font-medium">{survey.booth}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <span className="ml-2 font-medium">{survey.date}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Agent:</span>
                        <span className="ml-2 font-medium">{survey.agent}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-2">{survey.question}</p>
                      <p className="text-base font-semibold">{survey.answer}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleViewDetails(survey)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No surveys match the current filters.</p>
            </Card>
          )}
        </div>
      </div>

      <SurveyDetailDrawer 
        open={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        surveyData={selectedSurvey} 
      />
    </DashboardLayout>
  );
};