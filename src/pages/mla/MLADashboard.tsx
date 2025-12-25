/**
 * MLA Dashboard - Home Page (AC Overview)
 *
 * Shows:
 * - Header with AC info and last election result
 * - 6 Metric Cards (Total Booths, Voters, Favorable, Negative, Flippable)
 * - 4 Charts (Booth Sentiment, Gender, Booth Size, Margin Distribution)
 * - Priority Targets section (flippable booths)
 * - Quick Actions
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BeautifulDonutChart,
  BeautifulBarChart,
  BeautifulLineChart,
} from '@/components/charts';
import {
  SEMANTIC_COLORS,
  SOCIAL_SENTIMENT_COLORS,
  SHARE_OF_VOICE_COLORS,
  PARTY_COLORS,
} from '@/lib/chartColors';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useMLAOverview,
  useMLAGenderDistribution,
  useMLAMarginDistribution,
  useMLABoothSizeDistribution,
  useMLACurrentVoterStats,
  useMLAPriorityTargets,
  useMLAHistoricalTrends,
  useMLAShareOfVoice,
  useMLASentimentBreakdown,
} from '@/hooks/useMLADashboard';

interface ACOverview {
  ac: { id: number; name: string; district: string };
  stats: { totalBooths: number; totalVoters: number; avgVotersPerBooth: number };
  lastElection: {
    year: number;
    result: string;
    margin: number;
    marginPercent: number;
    ourParty: { name: string; votes: number; voteSharePercent: number };
    opponent: { name: string; votes: number; voteSharePercent: number };
  };
  boothSentiment: {
    favorable: { count: number; percentage: number };
    negative: { count: number; percentage: number };
    balanced: { count: number; percentage: number };
    flippable: { count: number; percentage: number };
  };
  flippableBooths: { count: number; totalGapToFlip: number; avgGapPerBooth: number };
  predictedTurnout2026: number | null;
}

interface CurrentVoterStats {
  available: boolean;
  currentVoterRoll?: {
    totalBooths: number;
    activeVoters: number;
    removedVoters: number;
    newVoters: number;
    totalInDB: number;
    genderDistribution: {
      male: { count: number; percentage: number };
      female: { count: number; percentage: number };
      others: { count: number; percentage: number };
    };
  };
  note?: string;
}

interface PriorityTarget {
  boothNo: string;
  boothName: string;
  ourVoteSharePercent: number;
  margin: { votes: number; percent: number };
  gapToFlip: number;
  totalVoters: number;
  reason: string;
}

interface GenderDistribution {
  genderDistribution: {
    male: { count: number; percentage: number };
    female: { count: number; percentage: number };
    transgender: { count: number; percentage: number };
  };
  total: number;
}

interface MarginDistribution {
  marginDistribution: Array<{ range: string; count: number; type: string }>;
  totalBooths: number;
}

interface BoothSizeDistribution {
  boothSizeDistribution: Array<{ range: string; count: number; percentage: number }>;
  totalBooths: number;
}

interface HistoricalTrends {
  acId: number;
  acName: string;
  partyTrends: {
    AIADMK: Array<{ year: number; voteShare: number; type: string }>;
    DMK: Array<{ year: number; voteShare: number; type: string }>;
    others: Array<{ year: number; voteShare: number; type: string }>;
  };
  leadingSummary: string;
}

// Social Media Analytics interfaces (production API format)
interface ShareOfVoiceData {
  success: boolean;
  data: {
    items: Array<{
      competitor_id: number;
      competitor_name: string;
      mention_count: number;
      percentage: number;
    }>;
    total_mentions: number;
  };
}

interface SentimentBreakdownData {
  success: boolean;
  data: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
}

const SENTIMENT_COLORS = {
  favorable: SEMANTIC_COLORS.positive,
  negative: SEMANTIC_COLORS.negative,
  balanced: SEMANTIC_COLORS.balanced,
  flippable: SEMANTIC_COLORS.flippable,
};

const GENDER_COLORS = [SEMANTIC_COLORS.male, SEMANTIC_COLORS.female, SEMANTIC_COLORS.other];

export default function MLADashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [socialTimeRange, setSocialTimeRange] = useState<string>('30d');

  // Tab state from URL - 'election' (2021) or 'current' (SIR 2026)
  const activeTab = searchParams.get('view') || 'election';
  const setActiveTab = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', tab);
    setSearchParams(newParams);
  };

  const acId = user?.assignedAC;

  // React Query hooks - data is cached for 5 minutes
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useMLAOverview(acId);
  const { data: priorityTargetsData } = useMLAPriorityTargets(acId, 4);
  const { data: genderData } = useMLAGenderDistribution(acId);
  const { data: marginData } = useMLAMarginDistribution(acId);
  const { data: boothSizeData } = useMLABoothSizeDistribution(acId);
  const { data: historicalData } = useMLAHistoricalTrends(acId);
  const { data: currentVoterStats } = useMLACurrentVoterStats(acId);
  const { data: shareOfVoice } = useMLAShareOfVoice(acId, socialTimeRange);
  const { data: socialSentiment } = useMLASentimentBreakdown(acId, socialTimeRange);

  const priorityTargets = (priorityTargetsData as any)?.priorityTargets || [];

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {(overviewError as Error).message}</div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No data available for this AC</div>
      </div>
    );
  }

  // Prepare chart data
  const sentimentChartData = [
    { name: 'Favorable', value: overview.boothSentiment.favorable.count, color: SENTIMENT_COLORS.favorable },
    { name: 'Negative', value: overview.boothSentiment.negative.count, color: SENTIMENT_COLORS.negative },
    { name: 'Balanced', value: overview.boothSentiment.balanced.count, color: SENTIMENT_COLORS.balanced },
    { name: 'Flippable', value: overview.boothSentiment.flippable.count, color: SENTIMENT_COLORS.flippable },
  ];

  const genderChartData = genderData?.genderDistribution
    ? [
        { name: 'Male', value: genderData.genderDistribution.male?.count || 0 },
        { name: 'Female', value: genderData.genderDistribution.female?.count || 0 },
        { name: 'Others', value: genderData.genderDistribution.transgender?.count || 0 },
      ]
    : [];

  // Prepare historical trends line chart data
  const historicalChartData = historicalData?.partyTrends?.AIADMK?.map((item, index) => ({
    year: item.year,
    AIADMK: item.voteShare,
    DMK: historicalData.partyTrends.DMK[index]?.voteShare || 0,
    Others: historicalData.partyTrends.others[index]?.voteShare || 0,
    type: item.type,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Main Tabs - Switch between 2021 Election and Current Voter Roll */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="election" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            2021 Election
          </TabsTrigger>
          <TabsTrigger
            value="current"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            disabled={!currentVoterStats?.available}
          >
            SIR 2026
          </TabsTrigger>
        </TabsList>

        {/* 2021 Election Tab Content */}
        <TabsContent value="election" className="space-y-6 mt-0">
          {/* Header with 2021 Election Result */}
          <Card className={`${overview.lastElection.result === 'won' ? 'border-green-500 dark:border-green-700' : 'border-red-500 dark:border-red-700'} dark:bg-card`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start sm:items-center gap-2 flex-wrap">
                <span className={`text-xl sm:text-2xl ${overview.lastElection.result === 'won' ? 'text-green-600' : 'text-red-600'}`}>
                  {overview.lastElection.result === 'won' ? '🟢' : '🔴'}
                </span>
                <span className="text-sm sm:text-base leading-tight dark:text-foreground">
                  Result:{' '}
                  <span className={overview.lastElection.result === 'won' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {overview.lastElection.result.toUpperCase()}
                  </span>{' '}
                  by {overview.lastElection.margin.toLocaleString()} votes ({overview.lastElection.marginPercent}%)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-muted-foreground">Our Party ({overview.lastElection.ourParty.name}):</span>{' '}
                  <span className="font-semibold dark:text-foreground">{overview.lastElection.ourParty.voteSharePercent}%</span>
                  <span className="text-muted-foreground ml-1">
                    ({overview.lastElection.ourParty.votes.toLocaleString()} votes)
                  </span>
                </div>
                <div className="text-muted-foreground hidden sm:block">vs</div>
                <div>
                  <span className="text-muted-foreground">{overview.lastElection.opponent.name}:</span>{' '}
                  <span className="font-semibold dark:text-foreground">{overview.lastElection.opponent.voteSharePercent}%</span>
                  <span className="text-muted-foreground ml-1">
                    ({overview.lastElection.opponent.votes.toLocaleString()} votes)
                  </span>
                </div>
                {overview.predictedTurnout2026 && (
                  <div className="sm:ml-auto">
                    <span className="text-muted-foreground">Predicted 2026 Turnout:</span>{' '}
                    <span className="font-semibold dark:text-foreground">{overview.predictedTurnout2026}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2021 Election Metric Cards */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">Booth Sentiment Analysis</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
              <Card className="dark:bg-card">
                <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold dark:text-foreground">{overview.stats.totalBooths}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Booths</div>
                </CardContent>
              </Card>
              <Card className="dark:bg-card">
                <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold dark:text-foreground">{overview.stats.totalVoters.toLocaleString()}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Votes Cast</div>
                </CardContent>
              </Card>
              <Card className="dark:bg-card">
                <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold dark:text-foreground">{overview.stats.avgVotersPerBooth.toLocaleString()}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Avg Votes/Booth</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{overview.boothSentiment.favorable.count}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Favorable ({overview.boothSentiment.favorable.percentage}%)</div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{overview.boothSentiment.negative.count}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Negative ({overview.boothSentiment.negative.percentage}%)</div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
                <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400">{overview.flippableBooths.count}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Flippable</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Charts - 2021 Election Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Booth Sentiment Donut */}
            <Card className="dark:bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 dark:text-foreground">
                  Booth Sentiment Distribution
                </CardTitle>
                <p className="text-xs text-muted-foreground">Distribution of booths by sentiment analysis</p>
              </CardHeader>
              <CardContent>
                <BeautifulDonutChart
                  data={sentimentChartData}
                  height={280}
                  valueLabel="Booths"
                  showMoreThreshold={4}
                  disableOthersGrouping={true}
                />
              </CardContent>
            </Card>

            {/* Gender Distribution Donut */}
            <Card className="dark:bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base dark:text-foreground">Gender Distribution</CardTitle>
                <p className="text-xs text-muted-foreground">Voter distribution by gender</p>
              </CardHeader>
              <CardContent>
                <BeautifulDonutChart
                  data={genderChartData.map((item, idx) => ({
                    ...item,
                    color: GENDER_COLORS[idx],
                  }))}
                  height={280}
                  valueLabel="Voters"
                  showMoreThreshold={3}
                  disableOthersGrouping={true}
                />
              </CardContent>
            </Card>

            {/* Booth Size Distribution - Donut */}
            <Card className="dark:bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 dark:text-foreground">
                  Booth Size Distribution
                </CardTitle>
                <p className="text-xs text-muted-foreground">Number of booths by voter count range</p>
              </CardHeader>
              <CardContent>
                <BeautifulDonutChart
                  data={(boothSizeData?.boothSizeDistribution || []).map((item, idx) => ({
                    name: item.range.replace(' voters', ''),
                    value: item.count,
                    color: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'][idx] || '#e9d5ff',
                  }))}
                  height={280}
                  valueLabel="Booths"
                  showMoreThreshold={4}
                  disableOthersGrouping={true}
                />
              </CardContent>
            </Card>

            {/* Victory Margin Distribution - Donut with details */}
            <Card className="dark:bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 dark:text-foreground">
                  Victory Margin Distribution
                </CardTitle>
                <p className="text-xs text-muted-foreground">Booths by win/loss margin ranges</p>
              </CardHeader>
              <CardContent>
                <BeautifulDonutChart
                  data={(marginData?.marginDistribution || []).map((item, idx) => ({
                    name: item.range.replace('Lost by ', 'L: ').replace('Won by ', 'W: '),
                    value: item.count,
                    color: item.type === 'won'
                      ? ['#86efac', '#4ade80', '#22c55e', '#16a34a'][idx % 4]
                      : ['#fca5a5', '#f87171', '#ef4444', '#dc2626'][idx % 4],
                  }))}
                  height={280}
                  valueLabel="Booths"
                  showMoreThreshold={8}
                  disableOthersGrouping={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* Historical Trends Chart - Full Width */}
          {historicalChartData.length > 0 && (
            <Card className="dark:bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-col gap-1">
                  <span className="text-sm sm:text-base dark:text-foreground">Historical Vote Share Trends (2009-2021)</span>
                  {historicalData?.leadingSummary && (
                    <span className="text-[10px] sm:text-xs font-normal text-muted-foreground leading-tight">{historicalData.leadingSummary}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BeautifulLineChart
                  data={historicalChartData}
                  xAxisKey="year"
                  height={300}
                  yAxisDomain={[0, 100]}
                  lines={[
                    { dataKey: 'AIADMK', color: PARTY_COLORS.AIADMK || '#10b981', name: 'AIADMK', strokeWidth: 2 },
                    { dataKey: 'DMK', color: PARTY_COLORS.DMK || '#ef4444', name: 'DMK', strokeWidth: 2 },
                    { dataKey: 'Others', color: '#8b5cf6', name: 'Others', strokeWidth: 2, dashed: true },
                  ]}
                  formatTooltipValue={(value) => `${value.toFixed(1)}%`}
                />
              </CardContent>
            </Card>
          )}

          {/* Social Media Analytics Section */}
          {(shareOfVoice?.data?.items?.length || socialSentiment?.data) && (
            <Card className="dark:bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-base dark:text-foreground">Social Media Analytics</span>
                  <div className="flex gap-2">
                    {['7d', '30d', '90d'].map((range) => (
                      <button
                        key={range}
                        onClick={() => setSocialTimeRange(range)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          socialTimeRange === range
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                      </button>
                    ))}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Share of Voice Chart */}
                  {shareOfVoice?.data?.items?.length > 0 && (
                    <div>
                      <BeautifulDonutChart
                        data={shareOfVoice.data.items.map((item, idx) => ({
                          name: item.competitor_name,
                          value: item.mention_count,
                          color: PARTY_COLORS[item.competitor_name.toUpperCase()] ||
                                 PARTY_COLORS[item.competitor_name] ||
                                 SHARE_OF_VOICE_COLORS[idx % SHARE_OF_VOICE_COLORS.length],
                        }))}
                        title="Share of Voice"
                        subtitle="Distribution of mentions across competitors"
                        height={280}
                        valueLabel="Mentions"
                        showMoreThreshold={6}
                      />
                    </div>
                  )}

                  {/* Social Sentiment Breakdown */}
                  {socialSentiment?.data && (
                    <div>
                      <BeautifulDonutChart
                        data={[
                          { name: 'Positive', value: socialSentiment.data.positive, color: SOCIAL_SENTIMENT_COLORS.positive },
                          { name: 'Neutral', value: socialSentiment.data.neutral, color: SOCIAL_SENTIMENT_COLORS.neutral },
                          { name: 'Negative', value: socialSentiment.data.negative, color: SOCIAL_SENTIMENT_COLORS.negative },
                        ].filter(d => d.value > 0)}
                        title="Social Media Sentiment"
                        subtitle={`Total: ${socialSentiment.data.total.toLocaleString()} mentions`}
                        height={280}
                        valueLabel="Mentions"
                        showMoreThreshold={3}
                        disableOthersGrouping={true}
                      />
                    </div>
                  )}
                </div>

                {/* Share of Voice Table */}
                {shareOfVoice?.data?.items?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2 text-sm dark:text-foreground">Competitor Mentions</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50 dark:bg-muted/20">
                            <th className="text-left py-2 px-2 font-medium dark:text-foreground">Party/Brand</th>
                            <th className="text-right py-2 px-2 font-medium dark:text-foreground">Mentions</th>
                            <th className="text-right py-2 px-2 font-medium dark:text-foreground">Share %</th>
                            <th className="text-right py-2 px-2 font-medium dark:text-foreground">Sentiment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shareOfVoice.data.items.map((item, idx) => (
                            <tr key={item.competitor_id} className="border-b dark:border-border">
                              <td className="py-2 px-2 dark:text-foreground">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      backgroundColor: PARTY_COLORS[item.competitor_name.toUpperCase()] ||
                                                       PARTY_COLORS[item.competitor_name] ||
                                                       SHARE_OF_VOICE_COLORS[idx % SHARE_OF_VOICE_COLORS.length]
                                    }}
                                  />
                                  {item.competitor_name}
                                </div>
                              </td>
                              <td className="text-right py-2 px-2 dark:text-foreground">{item.mention_count.toLocaleString()}</td>
                              <td className="text-right py-2 px-2 dark:text-foreground">{item.percentage.toFixed(1)}%</td>
                              <td className="text-right py-2 px-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${
                                    item.avg_sentiment > 0.1
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : item.avg_sentiment < -0.1
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                  }`}
                                >
                                  {item.avg_sentiment > 0.1 ? 'Positive' : item.avg_sentiment < -0.1 ? 'Negative' : 'Neutral'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Priority Targets */}
          <Card className="dark:bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-base flex items-center gap-2 dark:text-foreground">
                  Priority Targets (Flippable Booths)
                </span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  Total gap: {overview.flippableBooths.totalGapToFlip} votes across {overview.flippableBooths.count} booths
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {priorityTargets.length === 0 ? (
                <div className="text-muted-foreground text-center py-4">No flippable booths found</div>
              ) : (
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <table className="w-full text-xs sm:text-sm min-w-[400px]">
                    <thead>
                      <tr className="border-b bg-muted/50 dark:bg-muted/20">
                        <th className="text-left py-2 px-2 font-medium dark:text-foreground">Booth</th>
                        <th className="text-right py-2 px-2 font-medium dark:text-foreground">Our Vote %</th>
                        <th className="text-right py-2 px-2 font-medium dark:text-foreground">Margin</th>
                        <th className="text-right py-2 px-2 font-medium dark:text-foreground">Gap to Flip</th>
                        <th className="text-right py-2 px-2 font-medium dark:text-foreground">Voters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priorityTargets.map((target) => (
                        <tr
                          key={target.boothNo}
                          className="border-b dark:border-border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/mla/booth/${target.boothNo}`)}
                        >
                          <td className="py-2 px-2">
                            <div className="font-medium dark:text-foreground">#{target.boothNo}</div>
                            <div className="text-muted-foreground text-xs truncate max-w-[120px]">{target.boothName}</div>
                          </td>
                          <td className="text-right py-2 px-2 dark:text-foreground">{target.ourVoteSharePercent}%</td>
                          <td className="text-right py-2 px-2 text-red-600 dark:text-red-400">
                            -{target.margin.votes} ({target.margin.percent}%)
                          </td>
                          <td className="text-right py-2 px-2 text-orange-600 dark:text-orange-400 font-semibold whitespace-nowrap">
                            {target.gapToFlip} votes
                          </td>
                          <td className="text-right py-2 px-2 dark:text-foreground">{target.totalVoters.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => navigate('/mla/booths?sentiment=favorable')} className="bg-green-600 hover:bg-green-700">
              View Favorable Booths ({overview.boothSentiment.favorable.count})
            </Button>
            <Button
              onClick={() => navigate('/mla/booths?sentiment=negative')}
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              View Negative Booths ({overview.boothSentiment.negative.count})
            </Button>
            <Button
              onClick={() => navigate('/mla/booths?sentiment=flippable')}
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
            >
              View Flippable Booths ({overview.flippableBooths.count})
            </Button>
            <Button onClick={() => navigate('/mla/booths')} variant="outline">
              View All Booths
            </Button>
          </div>
        </TabsContent>

        {/* Current Voter Roll (SIR 2026) Tab Content */}
        <TabsContent value="current" className="space-y-6 mt-0">
          {currentVoterStats?.available && currentVoterStats.currentVoterRoll && (
            <>
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="dark:bg-card">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold dark:text-foreground">{currentVoterStats.currentVoterRoll.totalBooths}</div>
                    <div className="text-sm text-muted-foreground">Total Booths</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{currentVoterStats.currentVoterRoll.activeVoters.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Active Voters</div>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{currentVoterStats.currentVoterRoll.removedVoters.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Removed Voters</div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentVoterStats.currentVoterRoll.newVoters.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">New Voters Added</div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Voter Status Donut */}
                <Card className="dark:bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base dark:text-foreground">Voter Status</CardTitle>
                    <p className="text-xs text-muted-foreground">Active vs Removed voters in current roll</p>
                  </CardHeader>
                  <CardContent>
                    <BeautifulDonutChart
                      data={[
                        { name: 'Active', value: currentVoterStats.currentVoterRoll.activeVoters, color: '#22c55e' },
                        { name: 'Removed', value: currentVoterStats.currentVoterRoll.removedVoters, color: '#ef4444' },
                      ]}
                      height={280}
                      valueLabel="Voters"
                      showMoreThreshold={2}
                      disableOthersGrouping={true}
                    />
                  </CardContent>
                </Card>

                {/* Gender Distribution Donut */}
                <Card className="dark:bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base dark:text-foreground">Gender Distribution (Active)</CardTitle>
                    <p className="text-xs text-muted-foreground">Gender breakdown of active voters</p>
                  </CardHeader>
                  <CardContent>
                    <BeautifulDonutChart
                      data={[
                        { name: 'Male', value: currentVoterStats.currentVoterRoll.genderDistribution?.male?.count || 0, color: '#3b82f6' },
                        { name: 'Female', value: currentVoterStats.currentVoterRoll.genderDistribution?.female?.count || 0, color: '#ec4899' },
                        { name: 'Others', value: currentVoterStats.currentVoterRoll.genderDistribution?.others?.count || 0, color: '#8b5cf6' },
                      ].filter(d => d.value > 0)}
                      height={280}
                      valueLabel="Voters"
                      showMoreThreshold={3}
                      disableOthersGrouping={true}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats Summary */}
              <Card className="dark:bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base dark:text-foreground">Voter Roll Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-muted-foreground">Total in Database</div>
                      <div className="text-lg font-bold dark:text-foreground">{currentVoterStats.currentVoterRoll.totalInDB.toLocaleString()}</div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-muted-foreground">Male Voters</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {(currentVoterStats.currentVoterRoll.genderDistribution?.male?.count || 0).toLocaleString()}
                        <span className="text-xs font-normal ml-1">({(currentVoterStats.currentVoterRoll.genderDistribution?.male?.percentage || 0).toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-muted-foreground">Female Voters</div>
                      <div className="text-lg font-bold text-pink-600 dark:text-pink-400">
                        {(currentVoterStats.currentVoterRoll.genderDistribution?.female?.count || 0).toLocaleString()}
                        <span className="text-xs font-normal ml-1">({(currentVoterStats.currentVoterRoll.genderDistribution?.female?.percentage || 0).toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-muted-foreground">Others</div>
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {(currentVoterStats.currentVoterRoll.genderDistribution?.others?.count || 0).toLocaleString()}
                        <span className="text-xs font-normal ml-1">
                          ({(currentVoterStats.currentVoterRoll.genderDistribution?.others?.count || 0) > 0 &&
                            (currentVoterStats.currentVoterRoll.genderDistribution?.others?.percentage || 0) < 0.1
                            ? '< 0.1'
                            : (currentVoterStats.currentVoterRoll.genderDistribution?.others?.percentage || 0).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions for SIR view */}
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => navigate('/mla/booths?view=sir')} className="bg-blue-600 hover:bg-blue-700">
                  View Booth-wise SIR Stats
                </Button>
                <Button onClick={() => navigate('/mla/booths')} variant="outline">
                  View All Booths
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
