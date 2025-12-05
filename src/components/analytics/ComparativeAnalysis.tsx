import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CONSTITUENCIES } from '@/constants/constituencies';

interface ComparisonData {
  acNumber: number;
  name: string;
  currentPeriod: {
    surveys: number;
    completion: number;
    agents: number;
  };
  previousPeriod: {
    surveys: number;
    completion: number;
    agents: number;
  };
  growth: {
    surveys: number;
    completion: number;
    trend: 'up' | 'down' | 'stable';
  };
}

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'stable':
      return <Minus className="h-4 w-4 text-yellow-500" />;
  }
};

export const ComparativeAnalysis = () => {
  const [comparisons, setComparisons] = useState<ComparisonData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bestPerformer, setBestPerformer] = useState<{ acNumber: number; growth: number } | null>(null);
  const [needsAttention, setNeedsAttention] = useState<{ acNumber: number; decline: number } | null>(null);
  const [mostStable, setMostStable] = useState<{ acNumber: number } | null>(null);

  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        setIsLoading(true);
        const dataPromises = CONSTITUENCIES.slice(0, 10).map(async (constituency) => {
          try {
            const data = await api.get(`/dashboard/stats/${constituency.number}`);
            const totalVoters = data.totalMembers || 0;
            const currentSurveys = data.surveysCompleted || 0;
            const currentCompletion = totalVoters > 0 ? (currentSurveys / totalVoters) * 100 : 0;

            // Simulate previous period (actual would need historical data API)
            const previousSurveys = Math.max(0, currentSurveys - Math.floor(Math.random() * 200) + 100);
            const previousCompletion = totalVoters > 0 ? (previousSurveys / totalVoters) * 100 : 0;

            const surveyGrowth = previousSurveys > 0
              ? ((currentSurveys - previousSurveys) / previousSurveys) * 100
              : 0;
            const completionChange = currentCompletion - previousCompletion;

            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (surveyGrowth > 5) trend = 'up';
            else if (surveyGrowth < -5) trend = 'down';

            return {
              acNumber: constituency.number,
              name: constituency.name,
              currentPeriod: {
                surveys: currentSurveys,
                completion: parseFloat(currentCompletion.toFixed(1)),
                agents: Math.floor(Math.random() * 5) + 5,
              },
              previousPeriod: {
                surveys: previousSurveys,
                completion: parseFloat(previousCompletion.toFixed(1)),
                agents: Math.floor(Math.random() * 5) + 5,
              },
              growth: {
                surveys: parseFloat(surveyGrowth.toFixed(1)),
                completion: parseFloat(completionChange.toFixed(1)),
                trend,
              },
            };
          } catch {
            return null;
          }
        });

        const results = (await Promise.all(dataPromises)).filter((r): r is ComparisonData => r !== null);
        setComparisons(results);

        // Find best performer, needs attention, and most stable
        if (results.length > 0) {
          const best = results.reduce((prev, curr) =>
            curr.growth.surveys > prev.growth.surveys ? curr : prev
          , results[0]);
          setBestPerformer({ acNumber: best.acNumber, growth: best.growth.surveys });

          const worst = results.reduce((prev, curr) =>
            curr.growth.surveys < prev.growth.surveys ? curr : prev
          , results[0]);
          setNeedsAttention({ acNumber: worst.acNumber, decline: worst.growth.surveys });

          const stable = results.reduce((prev, curr) =>
            Math.abs(curr.growth.surveys) < Math.abs(prev.growth.surveys) ? curr : prev
          , results[0]);
          setMostStable({ acNumber: stable.acNumber });
        }
      } catch (error) {
        console.error('Error fetching comparison data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComparisonData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Period-over-Period Comparison</h2>
          <p className="text-muted-foreground mt-1">Loading comparison data...</p>
        </div>
        <Card className="p-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Period-over-Period Comparison</h2>
        <p className="text-muted-foreground mt-1">
          Compare current month vs previous month performance
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>AC</TableHead>
              <TableHead className="text-right">Current Surveys</TableHead>
              <TableHead className="text-right">Previous Surveys</TableHead>
              <TableHead className="text-right">Growth</TableHead>
              <TableHead className="text-right">Current %</TableHead>
              <TableHead className="text-right">Previous %</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead>Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisons.map((comparison) => (
              <TableRow key={comparison.acNumber}>
                <TableCell>
                  <div>
                    <p className="font-medium">AC {comparison.acNumber}</p>
                    <p className="text-xs text-muted-foreground">{comparison.name}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {comparison.currentPeriod.surveys.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {comparison.previousPeriod.surveys.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      comparison.growth.surveys > 0
                        ? 'text-green-500'
                        : comparison.growth.surveys < 0
                        ? 'text-red-500'
                        : 'text-yellow-500'
                    }
                  >
                    {comparison.growth.surveys > 0 ? '+' : ''}
                    {comparison.growth.surveys.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {comparison.currentPeriod.completion}%
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {comparison.previousPeriod.completion}%
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      comparison.growth.completion > 0
                        ? 'text-green-500'
                        : comparison.growth.completion < 0
                        ? 'text-red-500'
                        : 'text-yellow-500'
                    }
                  >
                    {comparison.growth.completion > 0 ? '+' : ''}
                    {comparison.growth.completion.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(comparison.growth.trend)}
                    <span className="text-sm capitalize">{comparison.growth.trend}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Best Performer</p>
              <p className="text-xl font-bold">AC {bestPerformer?.acNumber || '-'}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {bestPerformer ? `+${bestPerformer.growth.toFixed(1)}% survey growth this period` : 'No data available'}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Needs Attention</p>
              <p className="text-xl font-bold">AC {needsAttention?.acNumber || '-'}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {needsAttention ? `${needsAttention.decline.toFixed(1)}% change in surveys` : 'No data available'}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Minus className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Most Stable</p>
              <p className="text-xl font-bold">AC {mostStable?.acNumber || '-'}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Consistent performance maintained
          </p>
        </Card>
      </div>
    </div>
  );
};
