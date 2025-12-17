/**
 * MLA Competitor Analysis Page
 * Shows detailed party-wise performance analysis
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { PARTY_COLORS, OTHERS_COLOR } from '@/lib/chartColors';
import { BeautifulDonutChart, BeautifulBarChart } from '@/components/charts';

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
  const [data, setData] = useState<CompetitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const acId = user?.assignedAC;

  useEffect(() => {
    const fetchData = async () => {
      if (!acId) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/mla-dashboard/${acId}/competitor-analysis`);
        if (!res.ok) throw new Error('Failed to fetch competitor analysis');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [acId]);

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
        <div className="text-red-500">Error: {error}</div>
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
      {/* Head-to-Head Comparison */}
      {data.ourParty && data.mainOpponent && (
        <Card>
          <CardHeader>
            <CardTitle>Head-to-Head: AIADMK vs DMK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <div className="text-4xl font-bold text-green-600">{data.ourParty.voteSharePercent}%</div>
                <div className="text-lg font-semibold mt-2">AIADMK</div>
                <div className="text-sm text-gray-600 mt-1">
                  {data.ourParty.totalVotes.toLocaleString()} votes
                </div>
                <div className="mt-4 text-sm">
                  <span className="font-semibold">{data.ourParty.boothsWon}</span> booths won
                  <span className="text-gray-500 ml-2">({data.ourParty.winRate}% win rate)</span>
                </div>
              </div>
              <div className="text-center p-6 bg-red-50 rounded-lg">
                <div className="text-4xl font-bold text-red-600">{data.mainOpponent.voteSharePercent}%</div>
                <div className="text-lg font-semibold mt-2">DMK</div>
                <div className="text-sm text-gray-600 mt-1">
                  {data.mainOpponent.totalVotes.toLocaleString()} votes
                </div>
                <div className="mt-4 text-sm">
                  <span className="font-semibold">{data.mainOpponent.boothsWon}</span> booths won
                  <span className="text-gray-500 ml-2">({data.mainOpponent.winRate}% win rate)</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-600">
                Margin:{' '}
                <span
                  className={`font-bold ${
                    data.ourParty.voteSharePercent > data.mainOpponent.voteSharePercent
                      ? 'text-green-600'
                      : 'text-red-600'
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vote Share Distribution</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booths Won by Party</CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle>All Parties Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4">Rank</th>
                  <th className="text-left py-3 px-4">Party</th>
                  <th className="text-right py-3 px-4">Total Votes</th>
                  <th className="text-right py-3 px-4">Vote Share</th>
                  <th className="text-right py-3 px-4">Booths Contested</th>
                  <th className="text-right py-3 px-4">Booths Won</th>
                  <th className="text-right py-3 px-4">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.competitors.map((competitor, index) => (
                  <tr key={competitor.party} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded text-white font-medium"
                        style={{ backgroundColor: getPartyColor(competitor.party) }}
                      >
                        {competitor.party}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">{competitor.totalVotes.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 font-bold">{competitor.voteSharePercent}%</td>
                    <td className="text-right py-3 px-4">{competitor.boothsContested}</td>
                    <td className="text-right py-3 px-4 font-semibold">{competitor.boothsWon}</td>
                    <td className="text-right py-3 px-4">
                      <span
                        className={`font-medium ${
                          competitor.winRate > 50
                            ? 'text-green-600'
                            : competitor.winRate > 25
                            ? 'text-yellow-600'
                            : 'text-red-600'
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
