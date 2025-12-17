/**
 * Beautiful Donut Chart Component
 *
 * Matches the reference design with:
 * - Thick donut ring with gaps between segments
 * - External labels with name (bold) and percentage below
 * - Polyline connecting lines from segments (elbow style)
 * - Dark tooltip with mentions and share
 * - Clean legend at bottom with colored squares
 * - "Show X more" expandable button
 */

import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DataItem {
  name: string;
  value: number;
  color?: string;
}

interface BeautifulDonutChartProps {
  data: DataItem[];
  title?: string;
  subtitle?: string;
  height?: number;
  showMoreThreshold?: number;
  valueLabel?: string;
  colors?: string[];
}

// Vibrant color palette matching the reference
const DEFAULT_COLORS = [
  '#4361ee', // Blue (DMK style)
  '#2ec4b6', // Teal/Green (ADMK style)
  '#f9c74f', // Yellow/Gold (TVK style)
  '#e63946', // Red (NTK style)
  '#9d4edd', // Purple (BJP style)
  '#ff6b35', // Orange
  '#06d6a0', // Mint
  '#118ab2', // Ocean blue
  '#ef476f', // Pink
  '#073b4c', // Dark teal
];

const OTHERS_COLOR = '#94a3b8';

// Custom label with polyline connecting lines - matching reference exactly
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
  name,
}: any) => {
  if (percent < 0.03) return null; // Don't show labels for very small slices

  const RADIAN = Math.PI / 180;

  // Start point on the pie edge
  const startX = cx + (outerRadius + 8) * Math.cos(-midAngle * RADIAN);
  const startY = cy + (outerRadius + 8) * Math.sin(-midAngle * RADIAN);

  // Elbow point - extends outward then goes horizontal
  const elbowRadius = outerRadius + 25;
  const elbowX = cx + elbowRadius * Math.cos(-midAngle * RADIAN);
  const elbowY = cy + elbowRadius * Math.sin(-midAngle * RADIAN);

  // End point - extends horizontally from elbow
  const isRightSide = midAngle < 90 || midAngle > 270;
  const endX = isRightSide ? elbowX + 20 : elbowX - 20;
  const endY = elbowY;

  const textAnchor = isRightSide ? 'start' : 'end';
  const textX = isRightSide ? endX + 5 : endX - 5;

  const displayPercent = (percent * 100).toFixed(percent < 0.1 ? 2 : 1);

  return (
    <g>
      {/* Polyline connecting segment to label */}
      <polyline
        points={`${startX},${startY} ${elbowX},${elbowY} ${endX},${endY}`}
        stroke="#94a3b8"
        strokeWidth={1}
        fill="none"
      />
      {/* Label: Name (bold) */}
      <text
        x={textX}
        y={endY - 7}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        style={{ fontSize: '13px', fontWeight: 700, fill: '#1e293b' }}
      >
        {name}
      </text>
      {/* Label: Percentage */}
      <text
        x={textX}
        y={endY + 9}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        style={{ fontSize: '12px', fontWeight: 500, fill: '#64748b' }}
      >
        {displayPercent}%
      </text>
    </g>
  );
};

// Custom dark tooltip - matching reference style
const CustomTooltip = ({ active, payload, valueLabel }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = payload[0].payload.total || 1;
    const percent = ((data.value / total) * 100).toFixed(1);

    return (
      <div className="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl min-w-[140px]">
        <div className="font-bold text-sm mb-2 text-white">{data.name}</div>
        <div className="text-slate-300 text-xs space-y-1">
          <div>{valueLabel || 'Mentions'}: <span className="text-white font-medium">{data.value.toLocaleString()}</span></div>
          <div>Share: <span className="text-white font-medium">{percent}%</span></div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom legend with colored squares - matching reference
const CustomLegend = ({ payload, showAll, onToggle, threshold }: any) => {
  const displayItems = showAll ? payload : payload.slice(0, threshold);
  const hiddenCount = payload.length - threshold;

  return (
    <div className="flex flex-col items-center gap-3 mt-4">
      {/* Legend items in a row */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {displayItems.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-slate-600 font-medium">{entry.value}</span>
          </div>
        ))}
      </div>

      {/* Show more button - styled like reference */}
      {hiddenCount > 0 && (
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-full border border-slate-200 transition-all font-medium"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show {hiddenCount} more {hiddenCount === 1 ? 'brand' : 'brands'}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export function BeautifulDonutChart({
  data,
  title,
  subtitle,
  height = 320,
  showMoreThreshold = 6,
  valueLabel = 'Mentions',
  colors = DEFAULT_COLORS,
}: BeautifulDonutChartProps) {
  const [showAllLegend, setShowAllLegend] = useState(false);

  // Calculate total for percentage calculations
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Add total to each item for tooltip
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length],
    total,
  }));

  // Group small items into "Others" if there are too many
  const processedData = chartData.length > 10
    ? [
        ...chartData.slice(0, 9),
        {
          name: `Others (${chartData.length - 9})`,
          value: chartData.slice(9).reduce((sum, item) => sum + item.value, 0),
          color: OTHERS_COLOR,
          total,
        },
      ]
    : chartData;

  return (
    <div className="w-full">
      {/* Title and subtitle */}
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h3 className="text-base font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={processedData}
            cx="50%"
            cy="45%"
            innerRadius="40%"
            outerRadius="65%"
            paddingAngle={4}
            dataKey="value"
            label={renderCustomLabel}
            labelLine={false}
            cornerRadius={6}
          >
            {processedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="#fff"
                strokeWidth={3}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip valueLabel={valueLabel} />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom Legend below the chart */}
      <CustomLegend
        payload={processedData.map(item => ({ value: item.name, color: item.color }))}
        showAll={showAllLegend}
        onToggle={() => setShowAllLegend(!showAllLegend)}
        threshold={showMoreThreshold}
      />
    </div>
  );
}

export default BeautifulDonutChart;
