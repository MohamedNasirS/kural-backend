import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Loader2 } from 'lucide-react';
import { Progress } from '../ui/progress';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CONSTITUENCIES } from '@/constants/constituencies';

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

export const PredictiveInsights = () => {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setIsLoading(true);
        const predictionData: PredictionData[] = [];

        // Fetch data for first 6 ACs
        const promises = CONSTITUENCIES.slice(0, 6).map(async (c) => {
          try {
            const data = await api.get(`/dashboard/stats/${c.number}`);
            const totalVoters = data.totalMembers || 1;
            const surveys = data.surveysCompleted || 0;
            const currentCompletion = (surveys / totalVoters) * 100;

            // Calculate velocity based on surveys (assume 30-day period)
            const velocity = surveys / 30;

            // Project future completions
            const projected7Days = Math.min(currentCompletion + (velocity * 7 / totalVoters * 100), 100);
            const projected14Days = Math.min(currentCompletion + (velocity * 14 / totalVoters * 100), 100);
            const projected30Days = Math.min(currentCompletion + (velocity * 30 / totalVoters * 100), 100);

            const targetCompletion = 40.0;
            const onTrack = projected30Days >= targetCompletion;

            let riskLevel: 'low' | 'medium' | 'high' = 'low';
            let recommendation = 'On track: Maintain current pace';

            if (projected30Days < targetCompletion * 0.5) {
              riskLevel = 'high';
              recommendation = 'Critical: Double survey efforts, consider additional agents';
            } else if (projected30Days < targetCompletion * 0.75) {
              riskLevel = 'medium';
              recommendation = 'Increase agent allocation by 20% to meet target';
            }

            return {
              acNumber: c.number,
              currentCompletion: parseFloat(currentCompletion.toFixed(1)),
              projected7Days: parseFloat(projected7Days.toFixed(1)),
              projected14Days: parseFloat(projected14Days.toFixed(1)),
              projected30Days: parseFloat(projected30Days.toFixed(1)),
              targetCompletion,
              onTrack,
              riskLevel,
              recommendation,
              velocity: parseFloat(velocity.toFixed(2)),
            };
          } catch {
            return null;
          }
        });

        const results = await Promise.all(promises);
        results.forEach(r => {
          if (r) predictionData.push(r);
        });

        setPredictions(predictionData);
      } catch (error) {
        console.error('Error fetching prediction data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Predictive Completion Forecasts</h2>
          <p className="text-muted-foreground mt-1">Loading predictions...</p>
        </div>
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Predictive Completion Forecasts</h2>
        <p className="text-muted-foreground mt-1">
          Projections based on current velocity and trends
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {predictions.map((prediction) => (
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
