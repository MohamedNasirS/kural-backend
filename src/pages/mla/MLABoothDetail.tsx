/**
 * MLA Booth Detail - Page 3
 *
 * Shows:
 * - Booth header with sentiment badge
 * - Key metrics (vote share %, margin %, turnout, voters)
 * - Demographics section (gender, age distribution)
 * - Historical performance table and chart
 * - All party results table
 *
 * See docs/MLA_DASHBOARD_CONTENT.md for full specification
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';

// TODO: Define types matching API response
interface BoothDetail {
  booth: {
    boothNo: string;
    boothName: string;
    acId: number;
    acName: string;
    sentiment: string;
  };
  electionResult: {
    year: number;
    result: string;
    totalVotes: number;
    turnoutPercent: number;
    ourParty: { name: string; votes: number; voteSharePercent: number };
    opponent: { name: string; votes: number; voteSharePercent: number };
    margin: { votes: number; percent: number };
    gapToFlip?: number;
  };
  voterStats: {
    total: number;
    male: { count: number; percentage: number };
    female: { count: number; percentage: number };
    others: { count: number; percentage: number };
  };
  ageDistribution: Array<{ range: string; count: number; percentage: number }>;
  electionHistory: Array<{
    year: number;
    type: string;
    result: string;
    ourVoteSharePercent: number;
    margin: { votes: number; percent: number };
  }>;
  allPartyResults: Array<{
    party: string;
    candidate: string;
    votes: number;
    voteSharePercent: number;
  }>;
}

export default function MLABoothDetail() {
  const { user } = useAuth();
  const { boothNo } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<BoothDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(
          `/api/mla-dashboard/${user?.assignedAC}/booth/${boothNo}`
        );
        if (!res.ok) throw new Error('Failed to fetch booth detail');
        const data = await res.json();
        setDetail(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.assignedAC && boothNo) {
      fetchDetail();
    }
  }, [user, boothNo]);

  const getSentimentBadge = (sentiment: string) => {
    const badges: Record<string, string> = {
      favorable: 'bg-green-100 text-green-800',
      negative: 'bg-red-100 text-red-800',
      balanced: 'bg-yellow-100 text-yellow-800',
      flippable: 'bg-orange-100 text-orange-800',
    };
    return badges[sentiment] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  if (!detail) {
    return <div className="text-center py-8">Booth not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="outline" onClick={() => navigate('/mla/booths')}>
        ← Back to Booth List
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                Booth #{detail.booth.boothNo} - {detail.booth.boothName}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {detail.booth.acName} (AC {detail.booth.acId})
              </p>
            </div>
            <span
              className={`text-sm px-3 py-1 rounded ${getSentimentBadge(
                detail.booth.sentiment
              )}`}
            >
              {detail.booth.sentiment.toUpperCase()}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">Our Vote Share</div>
            <div className="text-2xl font-bold">
              {detail.electionResult.ourParty.voteSharePercent}%
            </div>
            <div className="text-sm text-gray-500">
              ({detail.electionResult.ourParty.votes.toLocaleString()} votes)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">Margin</div>
            <div
              className={`text-2xl font-bold ${
                detail.electionResult.result === 'won'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {detail.electionResult.result === 'won' ? '+' : '-'}
              {detail.electionResult.margin.votes} ({detail.electionResult.margin.percent}
              %)
            </div>
            {detail.electionResult.gapToFlip && (
              <div className="text-sm text-orange-600">
                Gap to flip: {detail.electionResult.gapToFlip} votes
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">Turnout</div>
            <div className="text-2xl font-bold">
              {detail.electionResult.turnoutPercent}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">Total Voters</div>
            <div className="text-2xl font-bold">
              {detail.voterStats.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demographics */}
      <Card>
        <CardHeader>
          <CardTitle>Demographics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gender Distribution - Pie Chart */}
            <div>
              <h4 className="font-medium mb-2 text-center">Gender Distribution</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Male', value: detail.voterStats.male.count, color: '#3b82f6' },
                      { name: 'Female', value: detail.voterStats.female.count, color: '#ec4899' },
                      { name: 'Others', value: detail.voterStats.others.count, color: '#8b5cf6' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#ec4899" />
                    <Cell fill="#8b5cf6" />
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Age Distribution - Bar Chart */}
            <div>
              <h4 className="font-medium mb-2 text-center">Age Distribution</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={detail.ageDistribution}
                  layout="vertical"
                  margin={{ left: 10, right: 30 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="range" type="category" width={50} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Bar dataKey="count" name="Voters" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Election</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Our Vote %</TableHead>
                <TableHead>Margin (votes)</TableHead>
                <TableHead>Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(detail.electionHistory || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No historical data available
                  </TableCell>
                </TableRow>
              ) : (
                (detail.electionHistory || []).map((election) => (
                  <TableRow key={`${election.year}-${election.type}`}>
                    <TableCell>
                      {election.year} {election.type}
                    </TableCell>
                    <TableCell>
                      {election.result === 'won' ? '🟢 Won' : '🔴 Lost'}
                    </TableCell>
                    <TableCell>{election.ourVoteSharePercent}%</TableCell>
                    <TableCell
                      className={
                        election.result === 'won' ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {election.margin.votes > 0 ? '+' : ''}
                      {election.margin.votes}
                    </TableCell>
                    <TableCell
                      className={
                        election.result === 'won' ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {election.margin.percent > 0 ? '+' : ''}
                      {election.margin.percent}%
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="mt-4 h-48 flex items-center justify-center text-gray-400">
            TODO: Implement Historical Performance Chart
          </div>
        </CardContent>
      </Card>

      {/* All Party Results */}
      <Card>
        <CardHeader>
          <CardTitle>All Party Results ({detail.electionResult.year})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Party</TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Votes</TableHead>
                <TableHead>Vote Share %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(detail.allPartyResults || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    No party results available
                  </TableCell>
                </TableRow>
              ) : (
                (detail.allPartyResults || []).map((party, idx) => (
                  <TableRow
                    key={party.party}
                    className={idx === 0 ? 'bg-green-50' : ''}
                  >
                    <TableCell className="font-medium">{party.party}</TableCell>
                    <TableCell>{party.candidate}</TableCell>
                    <TableCell>{party.votes.toLocaleString()}</TableCell>
                    <TableCell>{party.voteSharePercent}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
