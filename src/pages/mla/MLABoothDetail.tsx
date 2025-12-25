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
import { BeautifulDonutChart, BeautifulBarChart } from '@/components/charts';
import { useMLABoothDetail } from '@/hooks/useMLADashboard';

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

  const acId = user?.assignedAC;

  // React Query hook - data is cached for 5 minutes
  const { data, isLoading: loading, error } = useMLABoothDetail(acId, boothNo);
  const detail = data as BoothDetail | undefined;

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
    return <div className="text-center py-8 text-red-500">Error: {(error as Error).message}</div>;
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
      <Card className="dark:bg-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="dark:text-foreground">
                Booth #{detail.booth.boothNo} - {detail.booth.boothName}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
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
        <Card className="dark:bg-card">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Our Vote Share</div>
            <div className="text-2xl font-bold dark:text-foreground">
              {detail.electionResult.ourParty.voteSharePercent}%
            </div>
            <div className="text-sm text-muted-foreground">
              ({detail.electionResult.ourParty.votes.toLocaleString()} votes)
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-card">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Margin</div>
            <div
              className={`text-2xl font-bold ${
                detail.electionResult.result === 'won'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {detail.electionResult.result === 'won' ? '+' : '-'}
              {detail.electionResult.margin.votes} ({detail.electionResult.margin.percent}
              %)
            </div>
            {detail.electionResult.gapToFlip && (
              <div className="text-sm text-orange-600 dark:text-orange-400">
                Gap to flip: {detail.electionResult.gapToFlip} votes
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="dark:bg-card">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Turnout</div>
            <div className="text-2xl font-bold dark:text-foreground">
              {detail.electionResult.turnoutPercent}%
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-card">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Voters</div>
            <div className="text-2xl font-bold dark:text-foreground">
              {detail.voterStats.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demographics */}
      <Card className="dark:bg-card">
        <CardHeader>
          <CardTitle className="dark:text-foreground">Demographics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gender Distribution - Pie Chart */}
            <div>
              <BeautifulDonutChart
                data={[
                  { name: 'Male', value: detail.voterStats.male.count, color: '#3b82f6' },
                  { name: 'Female', value: detail.voterStats.female.count, color: '#ec4899' },
                  { name: 'Others', value: detail.voterStats.others.count, color: '#8b5cf6' },
                ].filter(d => d.value > 0)}
                title="Gender Distribution"
                height={250}
                valueLabel="Voters"
                showMoreThreshold={3}
              />
            </div>

            {/* Age Distribution - Bar Chart */}
            <div>
              <BeautifulBarChart
                data={detail.ageDistribution.map(item => ({
                  name: item.range,
                  value: item.count,
                }))}
                title="Age Distribution"
                height={250}
                layout="vertical"
                barColor="#10b981"
                valueLabel="Voters"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Party Results */}
      <Card className="dark:bg-card">
        <CardHeader>
          <CardTitle className="dark:text-foreground">All Party Results ({detail.electionResult.year})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="dark:border-border">
                <TableHead className="dark:text-foreground">Party</TableHead>
                <TableHead className="dark:text-foreground">Candidate</TableHead>
                <TableHead className="dark:text-foreground">Votes</TableHead>
                <TableHead className="dark:text-foreground">Vote Share %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(detail.allPartyResults || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No party results available
                  </TableCell>
                </TableRow>
              ) : (
                (detail.allPartyResults || []).map((party, idx) => (
                  <TableRow
                    key={party.party}
                    className={`dark:border-border ${idx === 0 ? 'bg-green-50 dark:bg-green-950/30' : ''}`}
                  >
                    <TableCell className="font-medium dark:text-foreground">{party.party}</TableCell>
                    <TableCell className="dark:text-foreground">{party.candidate}</TableCell>
                    <TableCell className="dark:text-foreground">{party.votes.toLocaleString()}</TableCell>
                    <TableCell className="dark:text-foreground">{party.voteSharePercent}%</TableCell>
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
