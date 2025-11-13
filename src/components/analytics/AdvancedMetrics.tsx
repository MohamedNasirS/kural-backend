import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Users, Zap, Home, UserCheck, Clock, Award } from 'lucide-react';

interface MetricData {
  label: string;
  value: number;
  unit: string;
  icon: any;
  description: string;
  benchmark: number;
  color: string;
}

const mockMetrics: MetricData[] = [
  {
    label: 'Agent Efficiency Score',
    value: 82.5,
    unit: '%',
    icon: Zap,
    description: 'Average surveys completed per agent per day',
    benchmark: 75,
    color: 'text-yellow-500',
  },
  {
    label: 'Survey Quality Index',
    value: 91.2,
    unit: '%',
    icon: Award,
    description: 'Percentage of surveys with complete data',
    benchmark: 85,
    color: 'text-green-500',
  },
  {
    label: 'Booth Coverage',
    value: 78.3,
    unit: '%',
    icon: Home,
    description: 'Booths with active agent assignments',
    benchmark: 80,
    color: 'text-blue-500',
  },
  {
    label: 'Family Engagement',
    value: 65.7,
    unit: '%',
    icon: Users,
    description: 'Families with at least one survey',
    benchmark: 70,
    color: 'text-purple-500',
  },
  {
    label: 'Response Time',
    value: 4.2,
    unit: 'min',
    icon: Clock,
    description: 'Average time per survey completion',
    benchmark: 5.0,
    color: 'text-cyan-500',
  },
  {
    label: 'Agent Retention',
    value: 94.1,
    unit: '%',
    icon: UserCheck,
    description: 'Active agents vs total assigned',
    benchmark: 90,
    color: 'text-pink-500',
  },
];

export const AdvancedMetrics = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Advanced Performance Metrics</h2>
        <p className="text-muted-foreground mt-1">
          Deep dive into efficiency and quality indicators
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const isAboveBenchmark = metric.label === 'Response Time' 
            ? metric.value < metric.benchmark 
            : metric.value > metric.benchmark;
          
          return (
            <Card key={index} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg bg-accent ${metric.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">
                    {metric.value}
                    <span className="text-lg text-muted-foreground ml-1">{metric.unit}</span>
                  </p>
                </div>
              </div>

              <h3 className="font-semibold mb-2">{metric.label}</h3>
              <p className="text-sm text-muted-foreground mb-4">{metric.description}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">vs Benchmark</span>
                  <span className={isAboveBenchmark ? 'text-green-500' : 'text-yellow-500'}>
                    {metric.benchmark}{metric.unit}
                  </span>
                </div>
                <Progress 
                  value={metric.label === 'Response Time' ? 100 - (metric.value / metric.benchmark * 100) : (metric.value / metric.benchmark * 100)} 
                  className="h-2" 
                />
                <p className="text-xs text-muted-foreground">
                  {isAboveBenchmark ? '✓ Above' : '△ Below'} benchmark
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Metric Definitions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="font-medium">Agent Efficiency Score</p>
            <p className="text-muted-foreground">
              Calculated as: (Total Surveys / Total Agents / Days Active) × Quality Factor
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Survey Quality Index</p>
            <p className="text-muted-foreground">
              Percentage of surveys with all mandatory fields completed and validated
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Booth Coverage</p>
            <p className="text-muted-foreground">
              (Active Booths / Total Booths) × 100, where active = has assigned agent
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Family Engagement</p>
            <p className="text-muted-foreground">
              (Families with surveys / Total families) × 100
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
