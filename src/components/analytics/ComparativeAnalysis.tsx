import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

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

const mockComparisons: ComparisonData[] = [
  {
    acNumber: 101,
    name: 'Dharapuram (SC)',
    currentPeriod: { surveys: 1245, completion: 12.5, agents: 8 },
    previousPeriod: { surveys: 980, completion: 10.2, agents: 8 },
    growth: { surveys: 27.0, completion: 2.3, trend: 'up' },
  },
  {
    acNumber: 102,
    name: 'Kangayam',
    currentPeriod: { surveys: 825, completion: 8.2, agents: 6 },
    previousPeriod: { surveys: 920, completion: 9.1, agents: 7 },
    growth: { surveys: -10.3, completion: -0.9, trend: 'down' },
  },
  {
    acNumber: 118,
    name: 'Coimbatore North',
    currentPeriod: { surveys: 1870, completion: 18.7, agents: 10 },
    previousPeriod: { surveys: 1840, completion: 18.4, agents: 10 },
    growth: { surveys: 1.6, completion: 0.3, trend: 'stable' },
  },
];

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
            {mockComparisons.map((comparison) => (
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
              <p className="text-xl font-bold">AC 118</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            +27% survey growth this period
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Needs Attention</p>
              <p className="text-xl font-bold">AC 119</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            -10.3% decline in surveys
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Minus className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Most Stable</p>
              <p className="text-xl font-bold">AC 120</p>
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
