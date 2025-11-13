import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useNavigate } from 'react-router-dom';

interface HeatmapData {
  acNumber: number;
  name: string;
  completion: number;
  surveys: number;
  category: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
}

const mockHeatmapData: HeatmapData[] = [
  { acNumber: 101, name: 'Dharapuram (SC)', completion: 12.5, surveys: 1245, category: 'average' },
  { acNumber: 102, name: 'Kangayam', completion: 8.2, surveys: 825, category: 'poor' },
  { acNumber: 118, name: 'Coimbatore North', completion: 18.7, surveys: 1870, category: 'good' },
  { acNumber: 119, name: 'Thondamuthur', completion: 22.3, surveys: 2234, category: 'excellent' },
  { acNumber: 120, name: 'Coimbatore South', completion: 5.1, surveys: 510, category: 'critical' },
  { acNumber: 121, name: 'Singanallur', completion: 15.4, surveys: 1540, category: 'average' },
  { acNumber: 123, name: 'Pollachi', completion: 19.8, surveys: 1980, category: 'good' },
  { acNumber: 125, name: 'Udumalaipettai', completion: 7.3, surveys: 730, category: 'poor' },
];

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
          {mockHeatmapData.map((ac) => (
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
              { label: 'Excellent', count: mockHeatmapData.filter(d => d.category === 'excellent').length, color: 'text-green-500' },
              { label: 'Good', count: mockHeatmapData.filter(d => d.category === 'good').length, color: 'text-blue-500' },
              { label: 'Average', count: mockHeatmapData.filter(d => d.category === 'average').length, color: 'text-yellow-500' },
              { label: 'Poor', count: mockHeatmapData.filter(d => d.category === 'poor').length, color: 'text-orange-500' },
              { label: 'Critical', count: mockHeatmapData.filter(d => d.category === 'critical').length, color: 'text-red-500' },
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
              • {mockHeatmapData.filter(d => d.category === 'excellent' || d.category === 'good').length} ACs performing above target
            </p>
            <p className="text-muted-foreground">
              • {mockHeatmapData.filter(d => d.category === 'critical' || d.category === 'poor').length} ACs require immediate attention
            </p>
            <p className="text-muted-foreground">
              • Average completion: {(mockHeatmapData.reduce((sum, d) => sum + d.completion, 0) / mockHeatmapData.length).toFixed(1)}%
            </p>
            <p className="text-muted-foreground">
              • Total surveys: {mockHeatmapData.reduce((sum, d) => sum + d.surveys, 0).toLocaleString()}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
