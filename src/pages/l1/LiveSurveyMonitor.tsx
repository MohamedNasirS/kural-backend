import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Activity, Clock } from 'lucide-react';
import { useState } from 'react';

const liveSurveys = [
  { id: 1, voter: 'Rajesh Kumar', booth: 'Booth 1', ac: '118 - Thondamuthur', agent: 'Rajesh Kumar', timestamp: '2 mins ago', question: 'Which party will you vote for?', answer: 'Party A' },
  { id: 2, voter: 'Priya Sharma', booth: 'Booth 2', ac: '118 - Thondamuthur', agent: 'Priya Sharma', timestamp: '5 mins ago', question: 'What is your primary concern?', answer: 'Healthcare' },
  { id: 3, voter: 'Arun Patel', booth: 'Booth 1', ac: '119 - Coimbatore North', agent: 'Arun Patel', timestamp: '8 mins ago', question: 'Rate government performance', answer: '7/10' },
  { id: 4, voter: 'Meena Devi', booth: 'Booth 3', ac: '120 - Coimbatore South', agent: 'Deepa Singh', timestamp: '12 mins ago', question: 'Which party will you vote for?', answer: 'Party B' },
  { id: 5, voter: 'Suresh Babu', booth: 'Booth 1', ac: '118 - Thondamuthur', agent: 'Rajesh Kumar', timestamp: '15 mins ago', question: 'What is your primary concern?', answer: 'Employment' },
];

// Get unique questions for filter options
const uniqueQuestions = Array.from(new Set(liveSurveys.map(survey => survey.question)));

export const LiveSurveyMonitor = () => {
  const [acFilter, setAcFilter] = useState<string>('all');
  const [questionFilter, setQuestionFilter] = useState<string>('all');
  const [boothFilter, setBoothFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Get unique booths for filter options
  const uniqueBooths = Array.from(new Set(liveSurveys.map(survey => survey.booth)));

  // Get unique ACs for filter options
  const uniqueACs = Array.from(new Set(liveSurveys.map(survey => survey.ac)));

  // Filter surveys based on selected filters and search term
  const filteredSurveys = liveSurveys.filter(survey => {
    // Search filter
    const matchesSearch = survey.voter.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         survey.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         survey.answer.toLowerCase().includes(searchTerm.toLowerCase());
    
    // AC filter
    const matchesAC = acFilter === 'all' || survey.ac === acFilter;
    
    // Question filter
    const matchesQuestion = questionFilter === 'all' || survey.question === questionFilter;
    
    // Booth filter
    const matchesBooth = boothFilter === 'all' || survey.booth === boothFilter;
    
    return matchesSearch && matchesAC && matchesQuestion && matchesBooth;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center">
            <Activity className="mr-3 h-8 w-8 text-success animate-pulse" />
            Live Survey Monitor
          </h1>
          <p className="text-muted-foreground">Real-time survey submissions from all 21 Assembly Constituencies</p>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by voter, agent, or answer..."
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
                {uniqueACs.map(ac => (
                  <SelectItem key={ac} value={ac}>{ac}</SelectItem>
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
            <Select value={questionFilter} onValueChange={setQuestionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Question" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Questions</SelectItem>
                {uniqueQuestions.map((question, index) => (
                  <SelectItem key={index} value={question}>{question}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="space-y-4">
          {filteredSurveys.length > 0 ? (
            filteredSurveys.map((survey) => (
              <Card key={survey.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                        New
                      </span>
                      <span className="text-sm text-muted-foreground flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {survey.timestamp}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{survey.voter}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">AC:</span>
                        <span className="ml-2 font-medium">{survey.ac}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Booth:</span>
                        <span className="ml-2 font-medium">{survey.booth}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Agent:</span>
                        <span className="ml-2 font-medium">{survey.agent}</span>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-1">{survey.question}</p>
                      <p className="text-sm font-semibold">{survey.answer}</p>
                    </div>
                  </div>
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
    </DashboardLayout>
  );
};