import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Activity, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { CONSTITUENCIES } from '@/constants/constituencies';
import { formatDistanceToNow } from 'date-fns';

interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_name: string;
  voter_id: string;
  voterID: string;
  voterId: string;
  booth: string;
  ac_id: number | null;
  survey_date: string;
  status: string;
  answers: any[];
}

export const LiveSurveyMonitor = () => {
  const [surveys, setSurveys] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acFilter, setAcFilter] = useState<string>('all');
  const [boothFilter, setBoothFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [uniqueBooths, setUniqueBooths] = useState<string[]>([]);

  const fetchSurveys = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');

      if (acFilter !== 'all') {
        params.append('ac', acFilter);
      }
      if (boothFilter !== 'all') {
        params.append('booth', boothFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const data = await api.get(`/survey-responses?${params.toString()}`);
      setSurveys(data.responses || []);

      // Extract unique booths from responses
      const booths = [...new Set((data.responses || []).map((s: SurveyResponse) => s.booth).filter(Boolean))];
      setUniqueBooths(booths as string[]);
    } catch (error) {
      console.error('Error fetching survey responses:', error);
    }
  }, [acFilter, boothFilter, searchTerm]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchSurveys();
      setIsLoading(false);
    };
    loadData();
  }, [fetchSurveys]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSurveys();
    setIsRefreshing(false);
  };

  const getACName = (acId: number | null): string => {
    if (!acId) return 'Unknown';
    const constituency = CONSTITUENCIES.find(c => c.number === acId);
    return constituency ? `${acId} - ${constituency.name}` : `AC ${acId}`;
  };

  const getTimeAgo = (dateString: string): string => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  // Extract a sample question/answer from responses for display
  const getFirstAnswer = (answers: any[]): { question: string; answer: string } | null => {
    if (!answers || answers.length === 0) return null;

    // Handle different answer structures
    const firstAnswer = answers[0];
    if (typeof firstAnswer === 'object') {
      const question = firstAnswer.question || firstAnswer.fieldLabel || firstAnswer.label || 'Question';
      const answer = firstAnswer.answer || firstAnswer.value || firstAnswer.response || 'N/A';
      return { question, answer: String(answer) };
    }
    return null;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading survey responses...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center">
              <Activity className="mr-3 h-8 w-8 text-success animate-pulse" />
              Live Survey Monitor
            </h1>
            <p className="text-muted-foreground">
              Real-time survey submissions from all {CONSTITUENCIES.length} Assembly Constituencies
              ({surveys.length} recent responses)
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, voter ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={acFilter} onValueChange={setAcFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by AC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ACs</SelectItem>
                {CONSTITUENCIES.map(ac => (
                  <SelectItem key={ac.number} value={String(ac.number)}>
                    {ac.number} - {ac.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={boothFilter} onValueChange={setBoothFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Booth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Booths</SelectItem>
                {uniqueBooths.map(booth => (
                  <SelectItem key={booth} value={booth}>{booth}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              onClick={() => {
                setAcFilter('all');
                setBoothFilter('all');
                setSearchTerm('');
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          {surveys.length > 0 ? (
            surveys.map((survey) => {
              const firstAnswer = getFirstAnswer(survey.answers);
              return (
                <Card key={survey.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          survey.status === 'Completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                        }`}>
                          {survey.status}
                        </span>
                        <span className="text-sm text-muted-foreground flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {getTimeAgo(survey.survey_date)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {survey.respondent_name || 'Unknown Voter'}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">AC:</span>
                          <span className="ml-2 font-medium">{getACName(survey.ac_id)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Booth:</span>
                          <span className="ml-2 font-medium">{survey.booth || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Voter ID:</span>
                          <span className="ml-2 font-medium">{survey.voterId || survey.voterID || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Survey:</span>
                          <span className="ml-2 font-medium">{survey.survey_id || 'N/A'}</span>
                        </div>
                      </div>
                      {firstAnswer && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium text-muted-foreground mb-1">{firstAnswer.question}</p>
                          <p className="text-sm font-semibold">{firstAnswer.answer}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchTerm || acFilter !== 'all' || boothFilter !== 'all'
                  ? 'No surveys match the current filters.'
                  : 'No survey responses found.'}
              </p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
