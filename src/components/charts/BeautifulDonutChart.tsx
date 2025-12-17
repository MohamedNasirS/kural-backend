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
 * - Responsive design: hides polyline labels on mobile, shows only legend
 */

import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Custom hook to detect if viewport is mobile
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

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
  disableOthersGrouping?: boolean; // Disable automatic grouping of small items into "Others"
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
// Only shows labels for segments >= 5% to avoid overlapping
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
  name,
  index,
}: any) => {
  // Hide labels for very small slices (< 2%) to avoid overlapping
  // Lowered from 5% to show labels for most segments like "Negative" sentiment
  if (percent < 0.02) return null;

  const RADIAN = Math.PI / 180;

  // Start point on the pie edge
  const startX = cx + (outerRadius + 8) * Math.cos(-midAngle * RADIAN);
  const startY = cy + (outerRadius + 8) * Math.sin(-midAngle * RADIAN);

  // Elbow point - extends outward then goes horizontal
  // Vary the elbow radius slightly based on index to reduce overlaps
  const elbowRadius = outerRadius + 25 + (index % 2) * 10;
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
        style={{ fontSize: '12px', fontWeight: 600, fill: '#1e293b' }}
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
// On mobile, shows percentages since polyline labels are hidden
const CustomLegend = ({ payload, showAll, onToggle, threshold, isMobile, total, hasOthers, othersExpanded, onOthersToggle }: any) => {
  // Show all items when othersExpanded is true OR when showAll is true
  const displayItems = (showAll || othersExpanded) ? payload : payload.slice(0, threshold);
  const hiddenCount = payload.length - threshold;

  return (
    <div className="flex flex-col items-center gap-3 mt-4">
      {/* Legend items - show percentages on mobile */}
      <div className={`flex flex-wrap justify-center ${isMobile ? 'gap-x-3 gap-y-2' : 'gap-x-5 gap-y-2'}`}>
        {displayItems.map((entry: any, index: number) => {
          const percentage = total > 0 ? ((entry.rawValue / total) * 100).toFixed(1) : '0';
          const isOthersItem = entry.isOthers;

          return (
            <div
              key={`legend-${index}`}
              className={`flex items-center gap-1.5 ${isOthersItem ? 'cursor-pointer hover:bg-slate-100 px-2 py-1 rounded-md -mx-2 -my-1 transition-colors' : ''}`}
              onClick={isOthersItem ? onOthersToggle : undefined}
              title={isOthersItem ? (othersExpanded ? 'Click to collapse' : 'Click to expand') : undefined}
            >
              <div
                className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} rounded flex-shrink-0`}
                style={{ backgroundColor: entry.color }}
              />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-600 font-medium ${isOthersItem ? 'underline decoration-dotted underline-offset-2' : ''}`}>
                {entry.value}
                {isMobile && <span className="text-slate-400 ml-1">({percentage}%)</span>}
              </span>
              {isOthersItem && (
                othersExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* Single button for Others expand/collapse - only show when not expanded */}
      {hasOthers && !othersExpanded && (
        <button
          onClick={onOthersToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 ${isMobile ? 'text-xs' : 'text-sm'} text-slate-600 hover:bg-slate-100 rounded-full border border-slate-200 transition-all font-medium`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Expand Others
        </button>
      )}

      {/* Show collapse button when expanded */}
      {hasOthers && othersExpanded && (
        <button
          onClick={onOthersToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 ${isMobile ? 'text-xs' : 'text-sm'} text-slate-600 hover:bg-slate-100 rounded-full border border-slate-200 transition-all font-medium`}
        >
          <ChevronUp className="w-3.5 h-3.5" />
          Collapse to Others
        </button>
      )}

      {/* Show more button - only when there's NO "Others" group (to avoid duplicate buttons) */}
      {hiddenCount > 0 && !hasOthers && (
        <button
          onClick={onToggle}
          className={`flex items-center gap-1.5 px-4 py-2 ${isMobile ? 'text-xs' : 'text-sm'} text-blue-600 hover:bg-blue-50 rounded-full border border-slate-200 transition-all font-medium`}
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
  disableOthersGrouping = false,
}: BeautifulDonutChartProps) {
  const [showAllLegend, setShowAllLegend] = useState(false);
  const [othersExpanded, setOthersExpanded] = useState(false);
  const isMobile = useIsMobile(640);

  // Calculate total for percentage calculations
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Add total to each item for tooltip
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length],
    total,
  }));

  // Group items into "Others" based on showMoreThreshold when collapsed
  // Skip grouping if disableOthersGrouping is true
  let processedData = chartData;
  let othersOriginalItems: any[] = [];

  if (!disableOthersGrouping && chartData.length > showMoreThreshold) {
    // Group items beyond threshold into "Others"
    const mainItems = chartData.slice(0, showMoreThreshold);
    const extraItems = chartData.slice(showMoreThreshold);
    const extraValue = extraItems.reduce((sum, item) => sum + item.value, 0);

    if (extraValue > 0) {
      othersOriginalItems = extraItems;
      processedData = [
        ...mainItems,
        {
          name: `Others (${extraItems.length})`,
          value: extraValue,
          color: OTHERS_COLOR,
          total,
          isOthers: true,
        },
      ];
    }
  }

  // When "Others" is expanded, show all original items instead of grouped
  const displayData = othersExpanded && othersOriginalItems.length > 0
    ? chartData // Show all original data
    : processedData;

  // Responsive chart height - smaller on mobile
  const responsiveHeight = isMobile ? Math.min(height, 200) : height;

  return (
    <div className="w-full">
      {/* Title and subtitle */}
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-slate-800`}>{title}</h3>}
          {subtitle && <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>{subtitle}</p>}
        </div>
      )}

      <ResponsiveContainer width="100%" height={responsiveHeight}>
        <PieChart>
          <Pie
            data={displayData}
            cx="50%"
            cy="50%"
            innerRadius={isMobile ? "35%" : "40%"}
            outerRadius={isMobile ? "75%" : "65%"}
            paddingAngle={isMobile ? 2 : 4}
            dataKey="value"
            label={isMobile ? false : renderCustomLabel}
            labelLine={false}
            cornerRadius={isMobile ? 4 : 6}
          >
            {displayData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="#fff"
                strokeWidth={isMobile ? 2 : 3}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip valueLabel={valueLabel} />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom Legend below the chart - shows percentages on mobile */}
      <CustomLegend
        payload={displayData.map(item => ({
          value: item.name,
          color: item.color,
          rawValue: item.value,
          isOthers: (item as any).isOthers
        }))}
        showAll={showAllLegend}
        onToggle={() => setShowAllLegend(!showAllLegend)}
        threshold={showMoreThreshold}
        isMobile={isMobile}
        total={total}
        hasOthers={othersOriginalItems.length > 0}
        othersExpanded={othersExpanded}
        onOthersToggle={() => setOthersExpanded(!othersExpanded)}
      />
    </div>
  );
}

export default BeautifulDonutChart;
