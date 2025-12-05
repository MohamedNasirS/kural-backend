import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CONSTITUENCIES } from '@/constants/constituencies';
import { Loader2 } from 'lucide-react';

interface HeatmapData {
  acNumber: number;
  name: string;
  completion: number;
  surveys: number;
  category: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
}

const getCategoryColor = (category: HeatmapData['category']) => {
  switch (category) {
    case 'excellent':
      return 'bg-green-500 hover:bg-green-600';
    case 'good':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'average':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'poor':
      return 'bg-orange-500 hover:bg-orange-600';
    case 'critical':
      return 'bg-red-500 hover:bg-red-600';
  }
};

const getPerformanceBand = (completion: number): HeatmapData['category'] => {
  if (completion >= 20) return 'excellent';
  if (completion >= 15) return 'good';
  if (completion >= 10) return 'average';
  if (completion >= 7) return 'poor';
  return 'critical';
};

export const HeatmapAnalysis = () => {
  const navigate = useNavigate();
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllACData = async () => {
      try {
        setIsLoading(true);
        const dataPromises = CONSTITUENCIES.map(async (constituency) => {
          try {
            const data = await api.get(`/dashboard/stats/${constituency.number}`);
            const totalVoters = data.totalMembers || 0;
            const surveys = data.surveysCompleted || 0;
            const completion = totalVoters > 0 ? (surveys / totalVoters) * 100 : 0;
            return {
              acNumber: constituency.number,
              name: constituency.name,
              completion: parseFloat(completion.toFixed(1)),
              surveys: surveys,
              category: getPerformanceBand(completion),
            };
          } catch {
            return {
              acNumber: constituency.number,
              name: constituency.name,
              completion: 0,
              surveys: 0,
              category: 'critical' as const,
            };
          }
        });

        const results = await Promise.all(dataPromises);
        setHeatmapData(results);
      } catch (error) {
        console.error('Error fetching heatmap data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllACData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Performance Heatmap</h2>
          <p className="text-muted-foreground mt-1">Loading data for all ACs...</p>
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
        <h2 className="text-2xl font-bold">Performance Heatmap</h2>
        <p className="text-muted-foreground mt-1">
          Visual overview of completion rates across all ACs
        </p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {heatmapData.map((ac) => (
            <button
              key={ac.acNumber}
              onClick={() => navigate(`/l1/ac/${ac.acNumber}`)}
              className={`${getCategoryColor(
                ac.category
              )} text-white rounded-lg p-4 transition-all hover:scale-105 cursor-pointer`}
            >
              <p className="text-xs font-medium opacity-90 mb-1">AC {ac.acNumber}</p>
              <p className="text-2xl font-bold">{ac.completion}%</p>
              <p className="text-xs opacity-75 mt-1">{ac.surveys.toLocaleString()}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Performance Bands</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-sm">Excellent (≥20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span className="text-sm">Good (15-19%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span className="text-sm">Average (10-14%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500" />
            <span className="text-sm">Poor (7-9%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-sm">Critical (&lt;7%)</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Distribution Summary</h3>
          <div className="space-y-3">
            {[
              { label: 'Excellent', count: heatmapData.filter(d => d.category === 'excellent').length, color: 'text-green-500' },
              { label: 'Good', count: heatmapData.filter(d => d.category === 'good').length, color: 'text-blue-500' },
              { label: 'Average', count: heatmapData.filter(d => d.category === 'average').length, color: 'text-yellow-500' },
              { label: 'Poor', count: heatmapData.filter(d => d.category === 'poor').length, color: 'text-orange-500' },
              { label: 'Critical', count: heatmapData.filter(d => d.category === 'critical').length, color: 'text-red-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className={`text-sm font-medium ${item.color}`}>{item.label}</span>
                <Badge variant="outline">{item.count} ACs</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Key Insights</h3>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              • {heatmapData.filter(d => d.category === 'excellent' || d.category === 'good').length} ACs performing above target
            </p>
            <p className="text-muted-foreground">
              • {heatmapData.filter(d => d.category === 'critical' || d.category === 'poor').length} ACs require immediate attention
            </p>
            <p className="text-muted-foreground">
              • Average completion: {heatmapData.length > 0 ? (heatmapData.reduce((sum, d) => sum + d.completion, 0) / heatmapData.length).toFixed(1) : 0}%
            </p>
            <p className="text-muted-foreground">
              • Total surveys: {heatmapData.reduce((sum, d) => sum + d.surveys, 0).toLocaleString()}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
