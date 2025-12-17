/**
 * Beautiful Line Chart Component
 *
 * Features:
 * - Smooth curves
 * - Clean grid lines
 * - Dark tooltip
 * - Customizable dots
 * - Multi-line support
 * - Responsive design
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface LineConfig {
  dataKey: string;
  color: string;
  name?: string;
  strokeWidth?: number;
  dashed?: boolean;
}

interface BeautifulLineChartProps {
  data: any[];
  lines: LineConfig[];
  xAxisKey: string;
  title?: string;
  subtitle?: string;
  height?: number;
  showGrid?: boolean;
  yAxisDomain?: [number, number];
  yAxisLabel?: string;
  formatTooltipValue?: (value: number) => string;
  formatXAxisLabel?: (value: any) => string;
}

// Custom dark tooltip
const CustomTooltip = ({ active, payload, label, formatValue }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700 min-w-[140px]">
        <div className="font-semibold text-sm mb-2 border-b border-gray-700 pb-1">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 text-xs py-0.5">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-300">{entry.name}:</span>
            </div>
            <span className="font-medium">
              {formatValue ? formatValue(entry.value) : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom legend with colored dots
const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-3">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function BeautifulLineChart({
  data,
  lines,
  xAxisKey,
  title,
  subtitle,
  height = 280,
  showGrid = true,
  yAxisDomain,
  yAxisLabel,
  formatTooltipValue,
  formatXAxisLabel,
}: BeautifulLineChartProps) {
  return (
    <div className="w-full">
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
          )}

          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatXAxisLabel}
          />

          <YAxis
            domain={yAxisDomain}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
                  }
                : undefined
            }
          />

          <Tooltip
            content={<CustomTooltip formatValue={formatTooltipValue} />}
            cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '5 5' }}
          />

          <Legend content={<CustomLegend />} />

          {lines.map((line, index) => (
            <Line
              key={index}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color}
              strokeWidth={line.strokeWidth || 2}
              strokeDasharray={line.dashed ? '5 5' : undefined}
              dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: line.color, stroke: '#fff', strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BeautifulLineChart;
