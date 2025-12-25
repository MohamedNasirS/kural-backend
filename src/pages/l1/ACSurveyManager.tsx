import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useParams, useNavigate } from 'react-router-dom';
import { FileCheck, Eye, Loader2, Download, Search, Building2, Calendar, BarChart3, List } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SurveyDetailDrawer } from '@/components/SurveyDetailDrawer';
import API_BASE_URL from '@/lib/api';
import { fetchSurveys } from '@/lib/surveys';
import { CONSTITUENCIES } from '@/constants/constituencies';
import { BeautifulDonutChart } from '@/components/charts';
import type { NormalizedSurveyResponse } from '@/utils/normalizedTypes';
import {
  normalizeSurveyResponse,
  formatDateTime,
  safeString,
} from '@/utils/universalMappers';

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Helper to format booth display
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

export const ACSurveyManager = () => {
  const { acNumber: urlAcNumber } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Use URL param if available, otherwise default to empty (requires selection)
  const [acFilter, setAcFilter] = useState<string>(urlAcNumber || '');
  const [boothFilter, setBoothFilter] = useState('all');
  const [formFilter, setFormFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState<NormalizedSurveyResponse | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [surveyForms, setSurveyForms] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('list');

  // API state
  const [surveyResponses, setSurveyResponses] = useState<NormalizedSurveyResponse[]>([]);
  const [booths, setBooths] = useState<{ boothId: string; boothNo: number; boothName: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBooths, setLoadingBooths] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  // Compute answer distributions for charts
  const answerDistributions = useMemo((): AnswerDistribution[] => {
    const questionMap = new Map<string, { prompt: string; answers: Map<string, number>; naCount: number }>();

    surveyResponses.forEach((response) => {
      if (!response.answers) return;
      response.answers.forEach((answer: any) => {
        const key = answer.questionId || answer.masterQuestionId || answer.prompt || answer.question;
        const prompt = answer.questionText || answer.prompt || answer.question || key;
        if (!key) return;

        if (!questionMap.has(key)) {
          questionMap.set(key, { prompt, answers: new Map(), naCount: 0 });
        }
        const q = questionMap.get(key)!;
        if (answer.questionText && q.prompt === key) {
          q.prompt = answer.questionText;
        }

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

  // Fetch booths when AC changes
  useEffect(() => {
    if (acFilter) {
      fetchBooths(acFilter);
      loadSurveyForms(acFilter);
    } else {
      setBooths([]);
      setSurveyForms([]);
      setBoothFilter('all');
      setFormFilter('all');
    }
  }, [acFilter]);

  // Fetch survey responses when filters change
  useEffect(() => {
    if (acFilter) {
      fetchSurveyResponses();
    } else {
      setSurveyResponses([]);
    }
  }, [acFilter, boothFilter, formFilter, pagination.page]);

  const fetchBooths = async (ac: string) => {
    try {
      setLoadingBooths(true);
      const response = await fetch(`${API_BASE_URL}/voters/${ac}/booths`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch booths');
      }

      const responseData = await response.json();
      const data = responseData.data || responseData;
      setBooths(data.booths || []);
    } catch (err) {
      console.error('Error fetching booths:', err);
      setBooths([]);
    } finally {
      setLoadingBooths(false);
    }
  };

  const loadSurveyForms = async (ac: string) => {
    setIsLoadingForms(true);
    try {
      const surveys = await fetchSurveys({ assignedAC: parseInt(ac) });
      setSurveyForms(
        surveys
          .filter((survey) => survey.status === 'Active')
          .map((survey) => ({
            id: survey.id,
            name: survey.title,
          })),
      );
    } catch (error) {
      console.error('Failed to load assigned survey forms', error);
      setSurveyForms([]);
    } finally {
      setIsLoadingForms(false);
    }
  };

  const fetchSurveyResponses = useCallback(async () => {
    if (!acFilter) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (boothFilter && boothFilter !== 'all') {
        params.append('booth', boothFilter);
      }

      if (formFilter && formFilter !== 'all') {
        params.append('survey', formFilter);
      }

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await fetch(`${API_BASE_URL}/survey-responses/${acFilter}?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch survey responses');
      }

      const responseData = await response.json();
      const data = responseData.data || responseData;
      const normalizedResponses = (data.responses || []).map((r: any) => normalizeSurveyResponse(r));
      setSurveyResponses(normalizedResponses);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
    } catch (err) {
      console.error('Error fetching survey responses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load survey responses');
    } finally {
      setLoading(false);
    }
  }, [acFilter, boothFilter, formFilter, searchTerm, pagination.page]);

  const handleExportResults = () => {
    toast({
      title: 'Export Started',
      description: 'Survey results export has been initiated.',
    });

    setTimeout(() => {
      const csvContent = [
        ['Respondent', 'Voter ID', 'Booth', 'Date', 'Status'],
        ...surveyResponses.map(survey => [
          survey.respondent_name,
          survey.voter_id,
          survey.booth,
          formatDateTime(survey.survey_date),
          survey.status
        ])
      ]
        .map(row => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AC-${acFilter}-Survey-Results.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: 'Survey results have been successfully exported.',
      });
    }, 1000);
  };

  const handleViewDetails = (survey: NormalizedSurveyResponse) => {
    setSelectedSurvey(survey);
    setIsDrawerOpen(true);
  };

  const getAcName = (acNum: string) => {
    const constituency = CONSTITUENCIES.find(c => c.number === parseInt(acNum));
    return constituency?.name || '';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Survey Manager</h1>
            <p className="text-muted-foreground">
              {acFilter ? `AC ${acFilter} - ${getAcName(acFilter)} - Review survey responses` : 'Select a constituency to view survey responses'}
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExportResults} disabled={surveyResponses.length === 0}>
            <Download className="h-4 w-4" />
            Export Results
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by voter name..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchSurveyResponses()}
              />
            </div>
            <Select value={acFilter} onValueChange={(val) => {
              setAcFilter(val);
              setBoothFilter('all');
              setFormFilter('all');
              setPagination(prev => ({ ...prev, page: 1 }));
            }}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select Constituency" />
              </SelectTrigger>
              <SelectContent>
                {CONSTITUENCIES.map((constituency) => (
                  <SelectItem key={constituency.number} value={String(constituency.number)}>
                    AC {constituency.number} - {constituency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={formFilter} onValueChange={setFormFilter} disabled={!acFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={!acFilter ? 'Select AC First' : 'Survey Form'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Forms</SelectItem>
                {isLoadingForms ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : surveyForms.length > 0 ? (
                  surveyForms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No forms</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={boothFilter} onValueChange={setBoothFilter} disabled={!acFilter || loadingBooths}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder={!acFilter ? 'Select AC First' : loadingBooths ? 'Loading...' : 'Booth'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Booths ({booths.length})</SelectItem>
                {booths.map((booth) => (
                  <SelectItem key={booth.boothId} value={booth.boothId}>
                    {booth.boothName || booth.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {surveyResponses.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">{surveyResponses.length} response(s) found</p>
          )}
        </Card>

        {!acFilter ? (
          <Card className="p-8 text-center">
            <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Please select a constituency to view survey responses.</p>
          </Card>
        ) : (
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
              {loading && surveyResponses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading response data...</p>
                </div>
              ) : answerDistributions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">No data for analytics</p>
                  <p className="text-sm text-muted-foreground">
                    Select filters to view answer distributions.
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
              {/* Pagination Info */}
              {!loading && pagination.total > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <div>
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} responses
                  </div>
                  {pagination.pages > 1 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </Button>
                      <span className="flex items-center px-3">
                        Page {pagination.page} of {pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.pages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {loading ? (
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
        )}
      </div>

      <SurveyDetailDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        surveyData={selectedSurvey}
      />
    </DashboardLayout>
  );
};
