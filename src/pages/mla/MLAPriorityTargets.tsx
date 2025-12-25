/**
 * MLA Priority Targets Page
 * Shows all flippable booths sorted by gap to flip
 */

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useMLAPriorityTargets } from '@/hooks/useMLADashboard';

interface PriorityTarget {
  boothNo: string;
  boothName: string;
  ourVoteSharePercent: number;
  margin: { votes: number; percent: number };
  gapToFlip: number;
  totalVoters: number;
  reason: string;
}

interface PriorityData {
  priorityTargets: PriorityTarget[];
  summary: {
    totalFlippable: number;
    totalGapToFlip: number;
    avgGapPerBooth: number;
    potentialBoothGain: number;
  };
}

export default function MLAPriorityTargets() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const acId = user?.assignedAC;

  // React Query hook - data is cached for 5 minutes
  const { data: queryData, isLoading: loading, error } = useMLAPriorityTargets(acId, 100);
  const data = queryData as PriorityData | undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading priority targets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {(error as Error).message}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{data.summary.totalFlippable}</div>
            <div className="text-sm text-muted-foreground">Flippable Booths</div>
          </CardContent>
        </Card>
        <Card className="dark:bg-card">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold dark:text-foreground">{data.summary.totalGapToFlip.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Votes Needed</div>
          </CardContent>
        </Card>
        <Card className="dark:bg-card">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold dark:text-foreground">{data.summary.avgGapPerBooth}</div>
            <div className="text-sm text-muted-foreground">Avg Gap Per Booth</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">+{data.summary.potentialBoothGain}</div>
            <div className="text-sm text-muted-foreground">Potential Booth Gain</div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Targets Table */}
      <Card className="dark:bg-card">
        <CardHeader>
          <CardTitle className="dark:text-foreground">Flippable Booths - Sorted by Gap to Flip</CardTitle>
        </CardHeader>
        <CardContent>
          {data.priorityTargets.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">No flippable booths found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-border bg-muted/50 dark:bg-muted/20">
                    <th className="text-left py-3 px-4 dark:text-foreground">Rank</th>
                    <th className="text-left py-3 px-4 dark:text-foreground">Booth</th>
                    <th className="text-right py-3 px-4 dark:text-foreground">Our Vote %</th>
                    <th className="text-right py-3 px-4 dark:text-foreground">Lost By</th>
                    <th className="text-right py-3 px-4 dark:text-foreground">Gap to Flip</th>
                    <th className="text-right py-3 px-4 dark:text-foreground">Total Voters</th>
                    <th className="text-left py-3 px-4 dark:text-foreground">Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {data.priorityTargets.map((target, index) => (
                    <tr
                      key={target.boothNo}
                      className="border-b dark:border-border hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/mla/booth/${target.boothNo}`)}
                    >
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${
                          index < 3 ? 'bg-orange-500' : index < 10 ? 'bg-yellow-500' : 'bg-gray-400 dark:bg-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium dark:text-foreground">Booth #{target.boothNo}</div>
                        <div className="text-muted-foreground text-xs">{target.boothName}</div>
                      </td>
                      <td className="text-right py-3 px-4 dark:text-foreground">{target.ourVoteSharePercent}%</td>
                      <td className="text-right py-3 px-4 text-red-600 dark:text-red-400">
                        {target.margin.votes} votes ({target.margin.percent}%)
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-lg">{target.gapToFlip}</span>
                        <span className="text-muted-foreground text-xs block">votes</span>
                      </td>
                      <td className="text-right py-3 px-4 dark:text-foreground">{target.totalVoters.toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs">{target.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Back Button */}
      <Button variant="outline" onClick={() => navigate('/mla/dashboard')}>
        Back to Dashboard
      </Button>
    </div>
  );
}
