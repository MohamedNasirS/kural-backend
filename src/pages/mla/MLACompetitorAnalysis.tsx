/**
 * MLA Competitor Analysis Page
 * Shows detailed party-wise performance analysis
 */

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { PARTY_COLORS, OTHERS_COLOR } from '@/lib/chartColors';
import { BeautifulDonutChart, BeautifulBarChart } from '@/components/charts';
import { useMLACompetitorAnalysis } from '@/hooks/useMLADashboard';

interface Competitor {
  party: string;
  totalVotes: number;
  voteSharePercent: number;
  avgBoothVoteShare: number;
  boothsContested: number;
  boothsWon: number;
  winRate: number;
}

interface CompetitorData {
  acId: number;
  totalVotes: number;
  competitors: Competitor[];
  ourParty: Competitor | null;
  mainOpponent: Competitor | null;
}

export default function MLACompetitorAnalysis() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const acId = user?.assignedAC;

  // React Query hook - data is cached for 5 minutes
  const { data: queryData, isLoading: loading, error } = useMLACompetitorAnalysis(acId);
  const data = queryData as CompetitorData | undefined;

  // Get party color from centralized config
  const getPartyColor = (party: string) => {
    return PARTY_COLORS[party] || OTHERS_COLOR;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading competitor analysis...</div>
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
        <div className="text-muted-foreground">No data available</div>
      </div>
    );
  }

  // Prepare pie chart data
  const pieData = data.competitors.slice(0, 6).map((c) => ({
    name: c.party,
    value: c.voteSharePercent,
    color: getPartyColor(c.party),
  }));

  // Prepare bar chart data for booths won
  const boothWinData = data.competitors
    .filter((c) => c.boothsWon > 0)
    .slice(0, 8)
    .map((c) => ({
      party: c.party,
      boothsWon: c.boothsWon,
      color: getPartyColor(c.party),
    }));

  return (
    <div className="space-y-6">
      {/* Page Header with Year Indicator */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold dark:text-foreground">Competitor Analysis</h1>
        <p className="text-muted-foreground">
          2021 Assembly Election Results • AC {acId}
        </p>
      </div>

      {/* Head-to-Head Comparison */}
      {data.ourParty && data.mainOpponent && (
        <Card className="dark:bg-card">
          <CardHeader>
            <CardTitle className="dark:text-foreground">Head-to-Head: AIADMK vs DMK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-6 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400">{data.ourParty.voteSharePercent}%</div>
                <div className="text-lg font-semibold mt-2 dark:text-foreground">AIADMK</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {data.ourParty.totalVotes.toLocaleString()} votes
                </div>
                <div className="mt-4 text-sm dark:text-foreground">
                  <span className="font-semibold">{data.ourParty.boothsWon}</span> booths won
                  <span className="text-muted-foreground ml-2">({data.ourParty.winRate}% win rate)</span>
                </div>
              </div>
              <div className="text-center p-6 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <div className="text-4xl font-bold text-red-600 dark:text-red-400">{data.mainOpponent.voteSharePercent}%</div>
                <div className="text-lg font-semibold mt-2 dark:text-foreground">DMK</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {data.mainOpponent.totalVotes.toLocaleString()} votes
                </div>
                <div className="mt-4 text-sm dark:text-foreground">
                  <span className="font-semibold">{data.mainOpponent.boothsWon}</span> booths won
                  <span className="text-muted-foreground ml-2">({data.mainOpponent.winRate}% win rate)</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-sm text-muted-foreground">
                Margin:{' '}
                <span
                  className={`font-bold ${
                    data.ourParty.voteSharePercent > data.mainOpponent.voteSharePercent
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {(data.ourParty.voteSharePercent - data.mainOpponent.voteSharePercent).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vote Share Pie Chart */}
        <Card className="dark:bg-card">
          <CardHeader>
            <CardTitle className="text-base dark:text-foreground">Vote Share Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <BeautifulDonutChart
              data={pieData.map(item => ({
                name: item.name,
                value: item.value,
                color: item.color,
              }))}
              height={300}
              valueLabel="Vote Share %"
              showMoreThreshold={6}
            />
          </CardContent>
        </Card>

        {/* Booths Won Bar Chart */}
        <Card className="dark:bg-card">
          <CardHeader>
            <CardTitle className="text-base dark:text-foreground">Booths Won by Party</CardTitle>
          </CardHeader>
          <CardContent>
            <BeautifulBarChart
              data={boothWinData.map(item => ({
                name: item.party,
                value: item.boothsWon,
                color: item.color,
              }))}
              height={300}
              layout="vertical"
              valueLabel="Booths Won"
            />
          </CardContent>
        </Card>
      </div>

      {/* All Parties Table */}
      <Card className="dark:bg-card">
        <CardHeader>
          <CardTitle className="dark:text-foreground">All Parties Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-border bg-muted/50 dark:bg-muted/20">
                  <th className="text-left py-3 px-4 dark:text-foreground">Rank</th>
                  <th className="text-left py-3 px-4 dark:text-foreground">Party</th>
                  <th className="text-right py-3 px-4 dark:text-foreground">Total Votes</th>
                  <th className="text-right py-3 px-4 dark:text-foreground">Vote Share</th>
                  <th className="text-right py-3 px-4 dark:text-foreground">Booths Contested</th>
                  <th className="text-right py-3 px-4 dark:text-foreground">Booths Won</th>
                  <th className="text-right py-3 px-4 dark:text-foreground">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.competitors.map((competitor, index) => (
                  <tr key={competitor.party} className="border-b dark:border-border hover:bg-muted/50">
                    <td className="py-3 px-4 dark:text-foreground">{index + 1}</td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded text-white font-medium"
                        style={{ backgroundColor: getPartyColor(competitor.party) }}
                      >
                        {competitor.party}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 dark:text-foreground">{competitor.totalVotes.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 font-bold dark:text-foreground">{competitor.voteSharePercent}%</td>
                    <td className="text-right py-3 px-4 dark:text-foreground">{competitor.boothsContested}</td>
                    <td className="text-right py-3 px-4 font-semibold dark:text-foreground">{competitor.boothsWon}</td>
                    <td className="text-right py-3 px-4">
                      <span
                        className={`font-medium ${
                          competitor.winRate > 50
                            ? 'text-green-600 dark:text-green-400'
                            : competitor.winRate > 25
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {competitor.winRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      <Button variant="outline" onClick={() => navigate('/mla/dashboard')}>
        Back to Dashboard
      </Button>
    </div>
  );
}
