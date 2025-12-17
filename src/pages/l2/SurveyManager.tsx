import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCheck, Filter, Eye, Loader2, Building2, Calendar, Search, BarChart3, List } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { SurveyDetailDrawer } from '@/components/SurveyDetailDrawer';
import { useToast } from '@/components/ui/use-toast';
import { fetchSurveys } from '@/lib/surveys';
import API_BASE_URL from '@/lib/api';
import { useBooths, getBoothLabel } from '@/hooks/use-booths';
import type { NormalizedSurveyResponse } from '@/utils/normalizedTypes';
import {
  normalizeSurveyResponse,
  formatDateTime,
  safeString,
} from '@/utils/universalMappers';
import { BeautifulDonutChart } from '@/components/charts';

// Helper to check if a value is NA/empty
const isNAValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && (value.trim() === '' || value.toLowerCase() === 'na' || value.toLowerCase() === 'n/a')) return true;
  return false;
};

// Answer distribution chart data type
interface AnswerDistribution {
  questionId: string;
  prompt: string;
  data: { name: string; value: number; color?: string }[];
  totalResponses: number;
  naCount: number;
}

// Chart colors
const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];

// Helper to format booth display - show booth_id if boothname is empty
const formatBooth = (boothname?: string, boothno?: string, booth_id?: string) => {
  if (boothname && boothname !== 'N/A') return boothname;
  if (boothno && boothno !== 'N/A') return boothno;
  if (booth_id) return booth_id;
  return 'N/A';
};

// Loading skeleton
const ResponseSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <Card key={i} className="p-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </Card>
    ))}
  </div>
);

export const SurveyManager = () => {
  const { user } = useAuth();
  const acNumber = user?.assignedAC || 119;
  const acName = user?.aciName || 'Assembly Constituency';
  const { toast } = useToast();
  const [selectedSurvey, setSelectedSurvey] = useState<NormalizedSurveyResponse | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formFilter, setFormFilter] = useState<string>('all');
  const [boothFilter, setBoothFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [assignedForms, setAssignedForms] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [surveyResponses, setSurveyResponses] = useState<NormalizedSurveyResponse[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('list');

  // Compute answer distributions for charts
  const answerDistributions = useMemo((): AnswerDistribution[] => {
    const questionMap = new Map<string, { prompt: string; answers: Map<string, number>; naCount: number }>();

    surveyResponses.forEach((response) => {
      if (!response.answers) return;
      response.answers.forEach((answer: any) => {
        // Get the question identifier
        const key = answer.questionId || answer.masterQuestionId || answer.prompt || answer.question;
        // Get the display text - prioritize questionText for survey answers
        const prompt = answer.questionText || answer.prompt || answer.question || key;
        if (!key) return;

        if (!questionMap.has(key)) {
          questionMap.set(key, { prompt, answers: new Map(), naCount: 0 });
        }
        const q = questionMap.get(key)!;
        // Update prompt if we found a better one (questionText takes priority)
        if (answer.questionText && q.prompt === key) {
          q.prompt = answer.questionText;
        }

        // Get the answer value - check answerText first for readable format
        const answerValue = answer.answerText ?? answer.value ?? answer.answer ?? answer.response;
        const answerStr = isNAValue(answerValue) ? '__NA__' : String(answerValue);
        if (answerStr === '__NA__') {
          q.naCount++;
        } else {
          q.answers.set(answerStr, (q.answers.get(answerStr) || 0) + 1);
        }
      });
    });

    const distributions: AnswerDistribution[] = [];
    questionMap.forEach((value, questionId) => {
      const totalWithData = Array.from(value.answers.values()).reduce((a, b) => a + b, 0);
      const total = totalWithData + value.naCount;
      const data: { name: string; value: number; color?: string }[] = [];

      let colorIdx = 0;
      value.answers.forEach((count, answerValue) => {
        data.push({
          name: answerValue.length > 30 ? answerValue.slice(0, 30) + '...' : answerValue,
          value: count,
          color: CHART_COLORS[colorIdx % CHART_COLORS.length],
        });
        colorIdx++;
      });

      // Sort by count descending
      data.sort((a, b) => b.value - a.value);

      distributions.push({
        questionId,
        prompt: value.prompt,
        data,
        totalResponses: total,
        naCount: value.naCount,
      });
    });

    return distributions;
  }, [surveyResponses]);

  // Use centralized booth fetching hook
  const { booths, loading: loadingBooths, fetchBooths } = useBooths();

  // Fetch booths when AC changes
  useEffect(() => {
    if (acNumber) {
      fetchBooths(acNumber);
    }
  }, [acNumber, fetchBooths]);

  // Fetch survey responses from the API
  const fetchSurveyResponses = useCallback(async () => {
    setIsLoadingResponses(true);
    try {
      const params = new URLSearchParams();
      if (formFilter !== 'all') params.append('survey', formFilter);
      if (boothFilter !== 'all') params.append('booth', boothFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const response = await fetch(
        `${API_BASE_URL}/survey-responses/${acNumber}?${params.toString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch survey responses');
      }

      const responseData = await response.json();
      // Handle standardized API response format
      const data = responseData.data || responseData;
      // Normalize responses using universal mapper
      const normalizedResponses = (data.responses || []).map((r: any) => normalizeSurveyResponse(r));
      setSurveyResponses(normalizedResponses);
    } catch (error) {
      console.error('Failed to load survey responses', error);
      toast({
        title: 'Unable to load survey responses',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingResponses(false);
    }
  }, [acNumber, formFilter, boothFilter, searchTerm, toast]);

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

  // Fetch survey responses when filters change
  useEffect(() => {
    fetchSurveyResponses();
  }, [acNumber, formFilter, boothFilter]);

  // Handle filter application
  const handleApplyFilters = () => {
    fetchSurveyResponses();
  };

  const handleViewDetails = (survey: NormalizedSurveyResponse) => {
    setSelectedSurvey(survey);
    setIsDrawerOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Survey Manager</h1>
          <p className="text-muted-foreground">Review survey responses for AC {acNumber} - {acName}</p>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by voter name..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              />
            </div>
            <Select value={formFilter} onValueChange={(val) => { setFormFilter(val); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Survey Form" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Forms</SelectItem>
                {isLoadingForms ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : assignedForms.length > 0 ? (
                  assignedForms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No forms</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={boothFilter} onValueChange={(val) => { setBoothFilter(val); }} disabled={loadingBooths}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={loadingBooths ? "Loading..." : "Booth"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Booths</SelectItem>
                {booths.map((booth) => (
                  <SelectItem key={booth._id || booth.boothCode} value={booth.booth_id || booth.boothCode}>
                    {getBoothLabel(booth)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="default" size="sm" onClick={handleApplyFilters} disabled={isLoadingResponses}>
              {isLoadingResponses ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              <span className="ml-2">Apply</span>
            </Button>
          </div>
          {surveyResponses.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">{surveyResponses.length} response(s) found</p>
          )}
        </Card>

        {/* Tabs: List and Analytics View */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Responses
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics ({answerDistributions.length})
            </TabsTrigger>
          </TabsList>

          {/* Analytics View */}
          <TabsContent value="analytics" className="mt-4">
            {isLoadingResponses && surveyResponses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading response data...</p>
              </div>
            ) : answerDistributions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium">No data for analytics</p>
                <p className="text-sm text-muted-foreground">
                  Select a survey form and apply filters to view answer distributions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {answerDistributions.map((dist) => (
                  <Card key={dist.questionId} className="p-4">
                    <h4 className="font-semibold text-sm mb-2 line-clamp-2">{dist.prompt}</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {dist.totalResponses} responses{dist.naCount > 0 && ` (${dist.naCount} N/A)`}
                    </p>
                    {dist.data.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                    ) : (
                      <BeautifulDonutChart
                        data={dist.data}
                        height={220}
                        valueLabel="Responses"
                        showMoreThreshold={6}
                      />
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="mt-4">
            <div className="space-y-2">
              {isLoadingResponses ? (
                <ResponseSkeleton />
              ) : surveyResponses.length > 0 ? (
                surveyResponses.map((survey) => (
                  <Card key={survey.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileCheck className={`h-4 w-4 flex-shrink-0 ${survey.status === 'Completed' ? 'text-green-500' : 'text-yellow-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{safeString(survey.respondent_name, 'Unknown')}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {safeString(survey.voter_id || survey.voterId, '')}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              survey.status === 'Completed'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                            }`}>
                              {survey.status || 'Pending'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {formatBooth(survey.booth, survey.boothno, survey.booth_id)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(survey.survey_date)}
                            </span>
                            {survey.answers && survey.answers.length > 0 && (
                              <span className="text-muted-foreground">{survey.answers.length} answer(s)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => handleViewDetails(survey)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-8 text-center">
                  <FileCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No survey responses found.</p>
                  <p className="text-sm text-muted-foreground mt-1">Responses will appear here once submitted.</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SurveyDetailDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        surveyData={selectedSurvey}
      />
    </DashboardLayout>
  );
};