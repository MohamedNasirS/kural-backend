/**
 * MLA Historical Trends Page
 * Shows detailed historical election trends with charts
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BeautifulLineChart } from '@/components/charts';

interface PartyTrend {
  year: number;
  voteShare: number;
  type: string;
}

interface CandidateResult {
  name: string;
  party: string;
  votes: number;
  voteShare: number;
}

interface HistoricalData {
  acId: number;
  acName: string;
  partyTrends: {
    AIADMK: PartyTrend[];
    DMK: PartyTrend[];
    others: PartyTrend[];
  };
  candidateHistory: Array<{
    year: number;
    candidates: CandidateResult[];
  }>;
  leadingSummary: string;
}

export default function MLAHistoricalTrends() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const acId = user?.assignedAC;

  useEffect(() => {
    const fetchData = async () => {
      if (!acId) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/mla-dashboard/${acId}/historical-trends`);
        if (!res.ok) throw new Error('Failed to fetch historical trends');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading historical trends...</div>
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
        <div className="text-gray-500">No historical data available</div>
      </div>
    );
  }

  // Prepare line chart data
  const lineChartData = data.partyTrends.AIADMK.map((item, index) => ({
    year: item.year,
    AIADMK: item.voteShare,
    DMK: data.partyTrends.DMK[index]?.voteShare || 0,
    Others: data.partyTrends.others[index]?.voteShare || 0,
    type: item.type,
  }));

  // Get party color
  const getPartyColor = (party: string) => {
    const colors: Record<string, string> = {
      AIADMK: '#10b981',
      DMK: '#ef4444',
      BJP: '#f97316',
      INC: '#3b82f6',
      NTK: '#8b5cf6',
      MNM: '#ec4899',
      PMK: '#eab308',
      CPM: '#dc2626',
      CPI: '#b91c1c',
    };
    return colors[party] || '#6b7280';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Election Trends - {data.acName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{data.leadingSummary}</p>
        </CardContent>
      </Card>

      {/* Vote Share Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Vote Share Trends (2009-2021)</CardTitle>
        </CardHeader>
        <CardContent>
          <BeautifulLineChart
            data={lineChartData}
            xAxisKey="year"
            height={400}
            yAxisDomain={[0, 100]}
            yAxisLabel="Vote Share %"
            lines={[
              { dataKey: 'AIADMK', color: '#10b981', name: 'AIADMK', strokeWidth: 3 },
              { dataKey: 'DMK', color: '#ef4444', name: 'DMK', strokeWidth: 3 },
              { dataKey: 'Others', color: '#8b5cf6', name: 'Others', strokeWidth: 2, dashed: true },
            ]}
            formatTooltipValue={(value) => `${value.toFixed(1)}%`}
          />
        </CardContent>
      </Card>

      {/* Candidate History */}
      <Card>
        <CardHeader>
          <CardTitle>Election Results by Year</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.candidateHistory.map((election) => (
              <Card key={election.year} className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{election.year} Assembly Election</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {election.candidates.map((candidate, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-2 rounded ${
                          index === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-sm">{candidate.name}</div>
                          <div
                            className="text-xs font-semibold"
                            style={{ color: getPartyColor(candidate.party) }}
                          >
                            {candidate.party}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{candidate.voteShare}%</div>
                          <div className="text-xs text-gray-500">
                            {candidate.votes?.toLocaleString()} votes
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
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
