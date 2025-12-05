import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Users, Zap, Home, UserCheck, Clock, Award, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CONSTITUENCIES } from '@/constants/constituencies';

interface MetricData {
  label: string;
  value: number;
  unit: string;
  icon: any;
  description: string;
  benchmark: number;
  color: string;
}

export const AdvancedMetrics = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);

        // Fetch aggregate data from multiple ACs
        let totalMembers = 0;
        let totalSurveys = 0;
        let totalFamilies = 0;
        let totalBooths = 0;
        let acCount = 0;

        // Fetch data from multiple ACs
        const statsPromises = CONSTITUENCIES.slice(0, 10).map(async (c) => {
          try {
            return await api.get(`/dashboard/stats/${c.number}`);
          } catch {
            return null;
          }
        });

        const results = await Promise.all(statsPromises);
        results.forEach(data => {
          if (data) {
            totalMembers += data.totalMembers || 0;
            totalSurveys += data.surveysCompleted || 0;
            totalFamilies += data.totalFamilies || 0;
            totalBooths += data.totalBooths || 0;
            acCount++;
          }
        });

        // Fetch agent data
        let totalAgents = 0;
        let activeAgents = 0;
        try {
          const agentData = await api.get('/rbac/booth-agents');
          const agents = agentData.agents || agentData || [];
          totalAgents = agents.length;
          activeAgents = agents.filter((a: any) => a.isActive !== false).length;
        } catch {
          // Fallback
        }

        // Calculate metrics based on real data
        const completionRate = totalMembers > 0 ? (totalSurveys / totalMembers) * 100 : 0;
        const familyEngagement = totalFamilies > 0 ? (totalSurveys / totalFamilies) * 100 : 0;
        const agentRetention = totalAgents > 0 ? (activeAgents / totalAgents) * 100 : 0;
        const boothCoverage = acCount > 0 ? Math.min((totalBooths / (acCount * 100)) * 100, 100) : 0;

        const calculatedMetrics: MetricData[] = [
          {
            label: 'Agent Efficiency Score',
            value: totalAgents > 0 ? parseFloat(((totalSurveys / Math.max(totalAgents, 1)) / 30).toFixed(1)) : 0,
            unit: '/day',
            icon: Zap,
            description: 'Average surveys completed per agent per day',
            benchmark: 5,
            color: 'text-yellow-500',
          },
          {
            label: 'Survey Completion Rate',
            value: parseFloat(completionRate.toFixed(1)),
            unit: '%',
            icon: Award,
            description: 'Percentage of voters surveyed',
            benchmark: 50,
            color: 'text-green-500',
          },
          {
            label: 'Booth Coverage',
            value: parseFloat(boothCoverage.toFixed(1)),
            unit: '%',
            icon: Home,
            description: 'Booths with active data collection',
            benchmark: 80,
            color: 'text-blue-500',
          },
          {
            label: 'Family Engagement',
            value: parseFloat(Math.min(familyEngagement, 100).toFixed(1)),
            unit: '%',
            icon: Users,
            description: 'Families with at least one survey',
            benchmark: 70,
            color: 'text-purple-500',
          },
          {
            label: 'Active ACs',
            value: acCount,
            unit: '',
            icon: Clock,
            description: 'Assembly Constituencies with data',
            benchmark: CONSTITUENCIES.length,
            color: 'text-cyan-500',
          },
          {
            label: 'Agent Retention',
            value: parseFloat(agentRetention.toFixed(1)),
            unit: '%',
            icon: UserCheck,
            description: 'Active agents vs total assigned',
            benchmark: 90,
            color: 'text-pink-500',
          },
        ];

        setMetrics(calculatedMetrics);
      } catch (error) {
        console.error('Error fetching advanced metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Advanced Performance Metrics</h2>
          <p className="text-muted-foreground mt-1">Loading metrics...</p>
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
        <h2 className="text-2xl font-bold">Advanced Performance Metrics</h2>
        <p className="text-muted-foreground mt-1">
          Deep dive into efficiency and quality indicators
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => {
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
