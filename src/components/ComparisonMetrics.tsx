import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

// Mock average data across all ACs
const averageData = {
  voters: 1897,
  families: 521,
  surveys: 298,
  booths: 94,
  completion: 76,
};

// Mock best performing AC
const bestPerformingAC = {
  acNumber: '113',
  name: 'Tiruppur North',
  voters: 2456,
  families: 689,
  surveys: 478,
  booths: 123,
  completion: 92,
};

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
  const votersVsAvg = calculateDifference(currentAC.voters, averageData.voters);
  const familiesVsAvg = calculateDifference(currentAC.families, averageData.families);
  const surveysVsAvg = calculateDifference(currentAC.surveys, averageData.surveys);
  const completionVsAvg = calculateDifference(currentAC.completion || 0, averageData.completion);

  const votersVsBest = calculateDifference(currentAC.voters, bestPerformingAC.voters);
  const familiesVsBest = calculateDifference(currentAC.families, bestPerformingAC.families);
  const surveysVsBest = calculateDifference(currentAC.surveys, bestPerformingAC.surveys);
  const completionVsBest = calculateDifference(currentAC.completion || 0, bestPerformingAC.completion);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Comparison with Average */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">vs. AC Average</h3>
          <Badge variant="secondary">All 26 ACs</Badge>
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
