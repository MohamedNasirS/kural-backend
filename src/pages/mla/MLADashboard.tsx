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

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
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

  const [overview, setOverview] = useState<ACOverview | null>(null);
  const [priorityTargets, setPriorityTargets] = useState<PriorityTarget[]>([]);
  const [genderData, setGenderData] = useState<GenderDistribution | null>(null);
  const [marginData, setMarginData] = useState<MarginDistribution | null>(null);
  const [boothSizeData, setBoothSizeData] = useState<BoothSizeDistribution | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalTrends | null>(null);
  const [shareOfVoice, setShareOfVoice] = useState<ShareOfVoiceData | null>(null);
  const [socialSentiment, setSocialSentiment] = useState<SentimentBreakdownData | null>(null);
  const [socialTimeRange, setSocialTimeRange] = useState<string>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const acId = user?.assignedAC;

  useEffect(() => {
    const fetchData = async () => {
      if (!acId) return;

      try {
        setLoading(true);

        // Fetch all data in parallel
        const [overviewRes, targetsRes, genderRes, marginRes, boothSizeRes, historicalRes] = await Promise.all([
          fetch(`/api/mla-dashboard/${acId}/overview`),
          fetch(`/api/mla-dashboard/${acId}/priority-targets?limit=4`),
          fetch(`/api/mla-dashboard/${acId}/gender-distribution`),
          fetch(`/api/mla-dashboard/${acId}/margin-distribution`),
          fetch(`/api/mla-dashboard/${acId}/booth-size-distribution`),
          fetch(`/api/mla-dashboard/${acId}/historical-trends`),
        ]);

        if (!overviewRes.ok) throw new Error('Failed to fetch overview');

        const overviewData = await overviewRes.json();
        setOverview(overviewData);

        if (targetsRes.ok) {
          const targetsData = await targetsRes.json();
          setPriorityTargets(targetsData.priorityTargets || []);
        }

        if (genderRes.ok) {
          const genderJson = await genderRes.json();
          setGenderData(genderJson);
        }

        if (marginRes.ok) {
          const marginJson = await marginRes.json();
          setMarginData(marginJson);
        }

        if (boothSizeRes.ok) {
          const boothSizeJson = await boothSizeRes.json();
          setBoothSizeData(boothSizeJson);
        }

        if (historicalRes.ok) {
          const historicalJson = await historicalRes.json();
          setHistoricalData(historicalJson);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [acId]);

  // Fetch social media analytics data (separate effect for time range changes)
  useEffect(() => {
    const fetchSocialData = async () => {
      if (!acId) return;

      try {
        const [sovRes, sentimentRes] = await Promise.all([
          fetch(`/api/mla-dashboard/${acId}/social-media/share-of-voice?time_range=${socialTimeRange}`),
          fetch(`/api/mla-dashboard/${acId}/social-media/sentiment-breakdown?time_range=${socialTimeRange}`),
        ]);

        if (sovRes.ok) {
          const sovData = await sovRes.json();
          setShareOfVoice(sovData);
        }

        if (sentimentRes.ok) {
          const sentimentData = await sentimentRes.json();
          setSocialSentiment(sentimentData);
        }
      } catch (err) {
        console.error('Error fetching social media data:', err);
        // Don't set main error - social media is optional
      }
    };

    fetchSocialData();
  }, [acId, socialTimeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
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

  const genderChartData = genderData
    ? [
        { name: 'Male', value: genderData.genderDistribution.male.count },
        { name: 'Female', value: genderData.genderDistribution.female.count },
        { name: 'Others', value: genderData.genderDistribution.transgender.count },
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
      {/* Header with Last Election Result */}
      <Card className={overview.lastElection.result === 'won' ? 'border-green-500' : 'border-red-500'}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <span className={`text-2xl ${overview.lastElection.result === 'won' ? 'text-green-600' : 'text-red-600'}`}>
              {overview.lastElection.result === 'won' ? '🟢' : '🔴'}
            </span>
            <span>
              {overview.lastElection.year} Election:{' '}
              <span className={overview.lastElection.result === 'won' ? 'text-green-600' : 'text-red-600'}>
                {overview.lastElection.result.toUpperCase()}
              </span>{' '}
              by {overview.lastElection.margin.toLocaleString()} votes ({overview.lastElection.marginPercent}%)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Our Party ({overview.lastElection.ourParty.name}):</span>{' '}
              <span className="font-semibold">{overview.lastElection.ourParty.voteSharePercent}%</span>
              <span className="text-gray-400 ml-1">
                ({overview.lastElection.ourParty.votes.toLocaleString()} votes)
              </span>
            </div>
            <div className="text-gray-400">vs</div>
            <div>
              <span className="text-gray-500">{overview.lastElection.opponent.name}:</span>{' '}
              <span className="font-semibold">{overview.lastElection.opponent.voteSharePercent}%</span>
              <span className="text-gray-400 ml-1">
                ({overview.lastElection.opponent.votes.toLocaleString()} votes)
              </span>
            </div>
            {overview.predictedTurnout2026 && (
              <div className="ml-auto">
                <span className="text-gray-500">Predicted 2026 Turnout:</span>{' '}
                <span className="font-semibold">{overview.predictedTurnout2026}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{overview.stats.totalBooths}</div>
            <div className="text-sm text-gray-500">Total Booths</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{overview.stats.totalVoters.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Voters</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{overview.stats.avgVotersPerBooth.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Avg Voters/Booth</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{overview.boothSentiment.favorable.count}</div>
            <div className="text-sm text-gray-500">Favorable ({overview.boothSentiment.favorable.percentage}%)</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{overview.boothSentiment.negative.count}</div>
            <div className="text-sm text-gray-500">Negative ({overview.boothSentiment.negative.percentage}%)</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{overview.flippableBooths.count}</div>
            <div className="text-sm text-gray-500">Flippable</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Booth Sentiment Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Booth Sentiment Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">Distribution of booths by sentiment analysis</p>
          </CardHeader>
          <CardContent>
            <BeautifulDonutChart
              data={sentimentChartData}
              height={280}
              valueLabel="Booths"
              showMoreThreshold={4}
            />
          </CardContent>
        </Card>

        {/* Gender Distribution Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gender Distribution</CardTitle>
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
            />
          </CardContent>
        </Card>

        {/* Booth Size Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Booth Size Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">Number of booths by voter count range</p>
          </CardHeader>
          <CardContent>
            <BeautifulBarChart
              data={(boothSizeData?.boothSizeDistribution || []).map(item => ({
                name: item.range,
                value: item.count,
              }))}
              height={250}
              barColor="#8b5cf6"
              valueLabel="Booths"
            />
          </CardContent>
        </Card>

        {/* Victory Margin Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Victory Margin Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">Booths by win/loss margin ranges</p>
          </CardHeader>
          <CardContent>
            <BeautifulBarChart
              data={(marginData?.marginDistribution || []).map(item => ({
                name: item.range,
                value: item.count,
                type: item.type,
              }))}
              height={250}
              layout="vertical"
              valueLabel="Booths"
              showLegend={true}
              legendItems={[
                { name: 'Won', color: '#22c55e' },
                { name: 'Lost', color: '#ef4444' },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Historical Trends Chart - Full Width */}
      {historicalChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-base">Historical Vote Share Trends (2009-2021)</span>
              {historicalData?.leadingSummary && (
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">{historicalData.leadingSummary}</span>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-base">Social Media Analytics</span>
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
                      color: SHARE_OF_VOICE_COLORS[idx % SHARE_OF_VOICE_COLORS.length],
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
                  />
                </div>
              )}
            </div>

            {/* Share of Voice Table */}
            {shareOfVoice?.data?.items?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2 text-sm">Competitor Mentions</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-2 font-medium">Party/Brand</th>
                        <th className="text-right py-2 px-2 font-medium">Mentions</th>
                        <th className="text-right py-2 px-2 font-medium">Share %</th>
                        <th className="text-right py-2 px-2 font-medium">Sentiment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shareOfVoice.data.items.map((item, idx) => (
                        <tr key={item.competitor_id} className="border-b">
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: SHARE_OF_VOICE_COLORS[idx % SHARE_OF_VOICE_COLORS.length] }}
                              />
                              {item.competitor_name}
                            </div>
                          </td>
                          <td className="text-right py-2 px-2">{item.mention_count.toLocaleString()}</td>
                          <td className="text-right py-2 px-2">{item.percentage.toFixed(1)}%</td>
                          <td className="text-right py-2 px-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                item.avg_sentiment > 0.1
                                  ? 'bg-green-100 text-green-700'
                                  : item.avg_sentiment < -0.1
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-base">Priority Targets (Flippable Booths)</span>
            <span className="text-xs sm:text-sm font-normal text-gray-500">
              Total gap: {overview.flippableBooths.totalGapToFlip} votes across {overview.flippableBooths.count} booths
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {priorityTargets.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No flippable booths found</div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-xs sm:text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-2 font-medium">Booth</th>
                    <th className="text-right py-2 px-2 font-medium">Our Vote %</th>
                    <th className="text-right py-2 px-2 font-medium">Margin</th>
                    <th className="text-right py-2 px-2 font-medium">Gap to Flip</th>
                    <th className="text-right py-2 px-2 font-medium">Voters</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityTargets.map((target) => (
                    <tr
                      key={target.boothNo}
                      className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/mla/booth/${target.boothNo}`)}
                    >
                      <td className="py-2 px-2">
                        <div className="font-medium">#{target.boothNo}</div>
                        <div className="text-gray-500 text-xs truncate max-w-[120px]">{target.boothName}</div>
                      </td>
                      <td className="text-right py-2 px-2">{target.ourVoteSharePercent}%</td>
                      <td className="text-right py-2 px-2 text-red-600">
                        -{target.margin.votes} ({target.margin.percent}%)
                      </td>
                      <td className="text-right py-2 px-2 text-orange-600 font-semibold whitespace-nowrap">
                        {target.gapToFlip} votes
                      </td>
                      <td className="text-right py-2 px-2">{target.totalVoters.toLocaleString()}</td>
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
          className="border-red-500 text-red-600 hover:bg-red-50"
        >
          View Negative Booths ({overview.boothSentiment.negative.count})
        </Button>
        <Button
          onClick={() => navigate('/mla/booths?sentiment=flippable')}
          variant="outline"
          className="border-orange-500 text-orange-600 hover:bg-orange-50"
        >
          View Flippable Booths ({overview.flippableBooths.count})
        </Button>
        <Button onClick={() => navigate('/mla/booths')} variant="outline">
          View All Booths
        </Button>
      </div>
    </div>
  );
}
