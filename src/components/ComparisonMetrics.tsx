import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CONSTITUENCIES } from '@/constants/constituencies';

interface ComparisonMetricsProps {
  currentAC: {
    acNumber: string;
    name: string;
    voters: number;
    families: number;
    surveys: number;
    booths: number;
    completion?: number;
  };
}

interface ACData {
  voters: number;
  families: number;
  surveys: number;
  booths: number;
  completion: number;
}

interface BestAC extends ACData {
  acNumber: string;
  name: string;
}

const calculateDifference = (current: number, comparison: number) => {
  const diff = current - comparison;
  const percentage = ((diff / comparison) * 100).toFixed(1);
  return { diff, percentage: parseFloat(percentage) };
};

const DifferenceIndicator = ({ percentage }: { percentage: number }) => {
  if (percentage > 0) {
    return (
      <div className="flex items-center gap-1 text-success">
        <TrendingUp className="h-4 w-4" />
        <span className="text-sm font-medium">+{percentage}%</span>
      </div>
    );
  } else if (percentage < 0) {
    return (
      <div className="flex items-center gap-1 text-destructive">
        <TrendingDown className="h-4 w-4" />
        <span className="text-sm font-medium">{percentage}%</span>
      </div>
    );
  } else {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span className="text-sm font-medium">0%</span>
      </div>
    );
  }
};

export const ComparisonMetrics = ({ currentAC }: ComparisonMetricsProps) => {
  const [averageData, setAverageData] = useState<ACData>({
    voters: 0,
    families: 0,
    surveys: 0,
    booths: 0,
    completion: 0,
  });
  const [bestPerformingAC, setBestPerformingAC] = useState<BestAC>({
    acNumber: '',
    name: '',
    voters: 0,
    families: 0,
    surveys: 0,
    booths: 0,
    completion: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [acCount, setAcCount] = useState(CONSTITUENCIES.length);

  useEffect(() => {
    const fetchAllACStats = async () => {
      try {
        setIsLoading(true);
        const allStats: Array<{
          acNumber: number;
          name: string;
          voters: number;
          families: number;
          surveys: number;
          booths: number;
          completion: number;
        }> = [];

        // Fetch stats for all ACs (try first few to get averages)
        const acNumbers = CONSTITUENCIES.map(c => c.number);
        const statsPromises = acNumbers.slice(0, 10).map(async (acNum) => {
          try {
            const data = await api.get(`/dashboard/stats/${acNum}`);
            const totalVoters = data.totalMembers || 0;
            const surveys = data.surveysCompleted || 0;
            const completion = totalVoters > 0 ? (surveys / totalVoters) * 100 : 0;
            return {
              acNumber: acNum,
              name: CONSTITUENCIES.find(c => c.number === acNum)?.name || `AC ${acNum}`,
              voters: totalVoters,
              families: data.totalFamilies || 0,
              surveys: surveys,
              booths: data.totalBooths || 0,
              completion: completion,
            };
          } catch {
            return null;
          }
        });

        const results = await Promise.all(statsPromises);
        results.forEach(r => {
          if (r) allStats.push(r);
        });

        if (allStats.length > 0) {
          // Calculate averages
          const avg: ACData = {
            voters: Math.round(allStats.reduce((sum, s) => sum + s.voters, 0) / allStats.length),
            families: Math.round(allStats.reduce((sum, s) => sum + s.families, 0) / allStats.length),
            surveys: Math.round(allStats.reduce((sum, s) => sum + s.surveys, 0) / allStats.length),
            booths: Math.round(allStats.reduce((sum, s) => sum + s.booths, 0) / allStats.length),
            completion: Math.round(allStats.reduce((sum, s) => sum + s.completion, 0) / allStats.length),
          };
          setAverageData(avg);
          setAcCount(allStats.length);

          // Find best performing AC (by completion rate)
          const best = allStats.reduce((prev, curr) =>
            curr.completion > prev.completion ? curr : prev
          , allStats[0]);
          setBestPerformingAC({
            acNumber: String(best.acNumber),
            name: best.name,
            voters: best.voters,
            families: best.families,
            surveys: best.surveys,
            booths: best.booths,
            completion: Math.round(best.completion),
          });
        }
      } catch (error) {
        console.error('Error fetching AC stats for comparison:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllACStats();
  }, []);

  const votersVsAvg = calculateDifference(currentAC.voters, averageData.voters || 1);
  const familiesVsAvg = calculateDifference(currentAC.families, averageData.families || 1);
  const surveysVsAvg = calculateDifference(currentAC.surveys, averageData.surveys || 1);
  const completionVsAvg = calculateDifference(currentAC.completion || 0, averageData.completion || 1);

  const votersVsBest = calculateDifference(currentAC.voters, bestPerformingAC.voters || 1);
  const familiesVsBest = calculateDifference(currentAC.families, bestPerformingAC.families || 1);
  const surveysVsBest = calculateDifference(currentAC.surveys, bestPerformingAC.surveys || 1);
  const completionVsBest = calculateDifference(currentAC.completion || 0, bestPerformingAC.completion || 1);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading comparison data...</span>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Comparison with Average */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">vs. AC Average</h3>
          <Badge variant="secondary">{acCount} ACs</Badge>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Voters</p>
              <p className="text-lg font-bold">{currentAC.voters.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Avg: {averageData.voters.toLocaleString()}</p>
            </div>
            <DifferenceIndicator percentage={votersVsAvg.percentage} />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Families</p>
              <p className="text-lg font-bold">{currentAC.families}</p>
              <p className="text-xs text-muted-foreground">Avg: {averageData.families}</p>
            </div>
            <DifferenceIndicator percentage={familiesVsAvg.percentage} />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Surveys</p>
              <p className="text-lg font-bold">{currentAC.surveys}</p>
              <p className="text-xs text-muted-foreground">Avg: {averageData.surveys}</p>
            </div>
            <DifferenceIndicator percentage={surveysVsAvg.percentage} />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-lg font-bold">{currentAC.completion || 0}%</p>
              <p className="text-xs text-muted-foreground">Avg: {averageData.completion}%</p>
            </div>
            <DifferenceIndicator percentage={completionVsAvg.percentage} />
          </div>
        </div>
      </Card>

      {/* Comparison with Best Performing AC */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">vs. Top Performer</h3>
          <Badge variant="default">AC {bestPerformingAC.acNumber}</Badge>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Voters</p>
              <p className="text-lg font-bold">{currentAC.voters.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Top: {bestPerformingAC.voters.toLocaleString()}</p>
            </div>
            <DifferenceIndicator percentage={votersVsBest.percentage} />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Families</p>
              <p className="text-lg font-bold">{currentAC.families}</p>
              <p className="text-xs text-muted-foreground">Top: {bestPerformingAC.families}</p>
            </div>
            <DifferenceIndicator percentage={familiesVsBest.percentage} />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Surveys</p>
              <p className="text-lg font-bold">{currentAC.surveys}</p>
              <p className="text-xs text-muted-foreground">Top: {bestPerformingAC.surveys}</p>
            </div>
            <DifferenceIndicator percentage={surveysVsBest.percentage} />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-lg font-bold">{currentAC.completion || 0}%</p>
              <p className="text-xs text-muted-foreground">Top: {bestPerformingAC.completion}%</p>
            </div>
            <DifferenceIndicator percentage={completionVsBest.percentage} />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-center text-muted-foreground">
            Best performing AC: {bestPerformingAC.name}
          </p>
        </div>
      </Card>
    </div>
  );
};
