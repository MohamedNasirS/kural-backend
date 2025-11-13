import { Card } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Button } from '../ui/button';
import { Download, TrendingUp } from 'lucide-react';

const mockTrendData = [
  { date: 'Week 1', actual: 2.1, projected: null, lower: null, upper: null },
  { date: 'Week 2', actual: 4.5, projected: null, lower: null, upper: null },
  { date: 'Week 3', actual: 7.2, projected: null, lower: null, upper: null },
  { date: 'Week 4', actual: 10.8, projected: null, lower: null, upper: null },
  { date: 'Week 5', actual: 12.5, projected: 12.5, lower: 11.8, upper: 13.2 },
  { date: 'Week 6', actual: null, projected: 15.2, lower: 14.1, upper: 16.3 },
  { date: 'Week 7', actual: null, projected: 18.4, lower: 16.9, upper: 19.9 },
  { date: 'Week 8', actual: null, projected: 21.8, lower: 19.8, upper: 23.8 },
  { date: 'Week 9', actual: null, projected: 25.5, lower: 23.0, upper: 28.0 },
  { date: 'Week 10', actual: null, projected: 29.3, lower: 26.3, upper: 32.3 },
  { date: 'Week 11', actual: null, projected: 33.2, lower: 29.7, upper: 36.7 },
  { date: 'Week 12', actual: null, projected: 37.4, lower: 33.4, upper: 41.4 },
];

export const TrendForecasting = () => {
  const handleExport = () => {
    const csv = [
      ['Date', 'Actual', 'Projected', 'Lower Bound', 'Upper Bound'],
      ...mockTrendData.map(d => [
        d.date,
        d.actual || '',
        d.projected || '',
        d.lower || '',
        d.upper || '',
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trend-forecast.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Completion Trend Forecast</h2>
          <p className="text-muted-foreground mt-1">
            12-week projection with confidence intervals
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      <Card className="p-6">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={mockTrendData}>
            <defs>
              <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis className="text-xs" label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px' 
              }} 
            />
            <Legend />
            
            {/* Confidence interval */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="url(#colorConfidence)"
              name="Upper Confidence"
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="url(#colorConfidence)"
              name="Lower Confidence"
            />
            
            {/* Actual data */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', r: 5 }}
              name="Actual"
            />
            
            {/* Projected data */}
            <Line
              type="monotone"
              dataKey="projected"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'hsl(var(--primary))', r: 3 }}
              name="Projected"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Projected 12-Week</p>
              <p className="text-2xl font-bold">37.4%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Expected completion by end of quarter
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-500 font-bold">±</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Confidence Range</p>
              <p className="text-2xl font-bold">±4%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            95% confidence interval width
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <span className="text-purple-500 font-bold">Δ</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weekly Growth</p>
              <p className="text-2xl font-bold">3.8%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Average projected weekly increase
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Forecast Methodology</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Algorithm:</strong> Linear regression with moving average smoothing
          </p>
          <p>
            • <strong>Data Points:</strong> Based on last 5 weeks of actual performance
          </p>
          <p>
            • <strong>Confidence Intervals:</strong> Calculated using standard error of prediction
          </p>
          <p>
            • <strong>Assumptions:</strong> Current agent count and efficiency rates remain stable
          </p>
        </div>
      </Card>
    </div>
  );
};
