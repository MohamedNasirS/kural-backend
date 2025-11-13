import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PredictiveInsights } from '@/components/analytics/PredictiveInsights';
import { ComparativeAnalysis } from '@/components/analytics/ComparativeAnalysis';
import { HeatmapAnalysis } from '@/components/analytics/HeatmapAnalysis';
import { AdvancedMetrics } from '@/components/analytics/AdvancedMetrics';
import { TrendForecasting } from '@/components/analytics/TrendForecasting';

export default function AdvancedAnalytics() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered insights and predictive analytics for all ACs
          </p>
        </div>

        <Tabs defaultValue="predictive" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="predictive" className="whitespace-nowrap">Predictive</TabsTrigger>
              <TabsTrigger value="comparative" className="whitespace-nowrap">Comparative</TabsTrigger>
              <TabsTrigger value="heatmap" className="whitespace-nowrap">Heatmap</TabsTrigger>
              <TabsTrigger value="metrics" className="whitespace-nowrap">Metrics</TabsTrigger>
              <TabsTrigger value="trends" className="whitespace-nowrap">Trends</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="predictive">
            <PredictiveInsights />
          </TabsContent>

          <TabsContent value="comparative">
            <ComparativeAnalysis />
          </TabsContent>

          <TabsContent value="heatmap">
            <HeatmapAnalysis />
          </TabsContent>

          <TabsContent value="metrics">
            <AdvancedMetrics />
          </TabsContent>

          <TabsContent value="trends">
            <TrendForecasting />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
