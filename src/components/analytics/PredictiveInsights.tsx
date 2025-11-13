import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import { Progress } from '../ui/progress';

interface PredictionData {
  acNumber: number;
  currentCompletion: number;
  projected7Days: number;
  projected14Days: number;
  projected30Days: number;
  targetCompletion: number;
  onTrack: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  velocity: number; // surveys per day
}

const mockPredictions: PredictionData[] = [
  {
    acNumber: 101,
    currentCompletion: 12.5,
    projected7Days: 16.2,
    projected14Days: 21.8,
    projected30Days: 35.4,
    targetCompletion: 40.0,
    onTrack: false,
    riskLevel: 'medium',
    recommendation: 'Increase agent allocation by 20% to meet target',
    velocity: 0.54,
  },
  {
    acNumber: 102,
    currentCompletion: 8.2,
    projected7Days: 10.5,
    projected14Days: 14.2,
    projected30Days: 22.8,
    targetCompletion: 40.0,
    onTrack: false,
    riskLevel: 'high',
    recommendation: 'Critical: Double survey efforts, consider additional agents',
    velocity: 0.33,
  },
  {
    acNumber: 118,
    currentCompletion: 18.7,
    projected7Days: 24.1,
    projected14Days: 32.5,
    projected30Days: 48.2,
    targetCompletion: 40.0,
    onTrack: true,
    riskLevel: 'low',
    recommendation: 'On track: Maintain current pace',
    velocity: 0.77,
  },
];

export const PredictiveInsights = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Predictive Completion Forecasts</h2>
        <p className="text-muted-foreground mt-1">
          AI-powered projections based on current velocity and trends
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockPredictions.map((prediction) => (
          <Card key={prediction.acNumber} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">AC {prediction.acNumber}</h3>
                <p className="text-sm text-muted-foreground">Current: {prediction.currentCompletion}%</p>
              </div>
              <Badge
                variant={prediction.onTrack ? 'default' : 'destructive'}
                className="flex items-center gap-1"
              >
                {prediction.onTrack ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {prediction.onTrack ? 'On Track' : 'Behind'}
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress to Target</span>
                  <span className="font-medium">{prediction.currentCompletion}%</span>
                </div>
                <Progress value={prediction.currentCompletion} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">7 Days</span>
                  <span className="font-medium">{prediction.projected7Days}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">14 Days</span>
                  <span className="font-medium">{prediction.projected14Days}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">30 Days</span>
                  <span className="font-medium text-primary">{prediction.projected30Days}%</span>
                </div>
              </div>

              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Target: {prediction.targetCompletion}%</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle
                    className={`h-4 w-4 ${
                      prediction.riskLevel === 'high'
                        ? 'text-red-500'
                        : prediction.riskLevel === 'medium'
                        ? 'text-yellow-500'
                        : 'text-green-500'
                    }`}
                  />
                  <span className="text-sm capitalize">{prediction.riskLevel} Risk</span>
                </div>
              </div>

              <div className="bg-accent/50 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Recommendation</p>
                <p className="text-sm">{prediction.recommendation}</p>
              </div>

              <div className="text-xs text-muted-foreground">
                Velocity: {prediction.velocity} surveys/day
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
