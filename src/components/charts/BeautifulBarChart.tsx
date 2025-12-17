/**
 * Beautiful Bar Chart Component
 *
 * Features:
 * - Rounded bar corners
 * - Clean grid lines
 * - Dark tooltip
 * - Gradient fills (optional)
 * - Responsive design with mobile optimizations
 */

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

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
  type?: string; // For conditional coloring (e.g., 'won', 'lost')
}

interface BeautifulBarChartProps {
  data: DataItem[];
  title?: string;
  subtitle?: string;
  height?: number;
  layout?: 'vertical' | 'horizontal';
  showGrid?: boolean;
  barColor?: string;
  colors?: string[];
  valueLabel?: string;
  showLegend?: boolean;
  legendItems?: Array<{ name: string; color: string }>;
  conditionalColors?: { [key: string]: string }; // Map type to color
}

// Default colors
const DEFAULT_BAR_COLOR = '#4f46e5'; // Indigo primary

const DEFAULT_CONDITIONAL_COLORS: { [key: string]: string } = {
  won: '#22c55e',
  lost: '#ef4444',
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#6b7280',
};

// Custom dark tooltip
const CustomTooltip = ({ active, payload, label, valueLabel }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
        <div className="font-semibold text-sm mb-1">{label}</div>
        <div className="text-gray-300 text-xs">
          {valueLabel || 'Value'}: {payload[0].value.toLocaleString()}
        </div>
      </div>
    );
  }
  return null;
};

// Custom legend component
const CustomLegend = ({ items }: { items: Array<{ name: string; color: string }> }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex justify-center gap-4 mt-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-muted-foreground">{item.name}</span>
        </div>
      ))}
    </div>
  );
};

export function BeautifulBarChart({
  data,
  title,
  subtitle,
  height = 250,
  layout = 'horizontal',
  showGrid = true,
  barColor = DEFAULT_BAR_COLOR,
  colors,
  valueLabel = 'Count',
  showLegend = false,
  legendItems,
  conditionalColors = DEFAULT_CONDITIONAL_COLORS,
}: BeautifulBarChartProps) {
  const isVertical = layout === 'vertical';
  const isMobile = useIsMobile(640);

  // Determine bar color for each item
  const getBarColor = (item: DataItem, index: number) => {
    if (item.color) return item.color;
    if (item.type && conditionalColors[item.type]) return conditionalColors[item.type];
    if (colors && colors[index]) return colors[index];
    return barColor;
  };

  // Responsive height
  const responsiveHeight = isMobile ? Math.min(height, 220) : height;

  // Shorten/format labels for cleaner display
  const formatLabel = (label: string) => {
    if (isMobile) {
      // Very short labels for mobile
      return label
        .replace('Lost by ', 'L:')
        .replace('Won by ', 'W:')
        .replace(' voters', '')
        .replace('< ', '<')
        .replace('> ', '>');
    }
    // For desktop, keep labels concise but readable
    return label
      .replace('Lost by ', 'Lost: ')
      .replace('Won by ', 'Won: ')
      .replace(' voters', '');
  };

  // Process data for display
  const processedData = data.map(item => ({ ...item, name: formatLabel(item.name) }));

  return (
    <div className="w-full">
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h3 className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>{title}</h3>}
          {subtitle && <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>{subtitle}</p>}
        </div>
      )}

      <ResponsiveContainer width="100%" height={responsiveHeight}>
        <BarChart
          data={processedData}
          layout={isVertical ? 'vertical' : 'horizontal'}
          margin={
            isVertical
              ? { top: 5, right: isMobile ? 15 : 30, left: 0, bottom: 5 }
              : { top: 5, right: isMobile ? 10 : 20, left: 0, bottom: 5 }
          }
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              horizontal={!isVertical}
              vertical={isVertical}
            />
          )}

          {isVertical ? (
            <>
              <XAxis
                type="number"
                tick={{ fontSize: isMobile ? 9 : 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: isMobile ? 9 : 11 }}
                tickLine={false}
                axisLine={false}
                width={isMobile ? 50 : 85}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                tick={{ fontSize: isMobile ? 9 : 11 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={processedData.length > 4 || isMobile ? -45 : 0}
                textAnchor={processedData.length > 4 || isMobile ? 'end' : 'middle'}
                height={processedData.length > 4 || isMobile ? 50 : 30}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 9 : 11 }}
                tickLine={false}
                axisLine={false}
                width={isMobile ? 30 : 40}
              />
            </>
          )}

          <Tooltip
            content={<CustomTooltip valueLabel={valueLabel} />}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          />

          <Bar
            dataKey="value"
            radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={isMobile ? 35 : 50}
          >
            {processedData.map((item, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(item, index)} />
            ))}
          </Bar>

          {showLegend && legendItems && (
            <Legend content={<CustomLegend items={legendItems} />} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BeautifulBarChart;
