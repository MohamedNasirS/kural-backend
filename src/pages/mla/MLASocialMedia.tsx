/**
 * MLA Social Media Analytics Page
 *
 * Shows:
 * - Share of Voice chart (competitor mentions)
 * - Social Media Sentiment breakdown
 * - Competitor mentions table
 *
 * Data is fetched from the production analytics API (kural.digital)
 * Currently shows state-wide aggregated data (All Constituencies)
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BeautifulDonutChart } from '@/components/charts';

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

const SOCIAL_SENTIMENT_COLORS = {
  positive: '#22c55e',
  neutral: '#6b7280',
  negative: '#ef4444',
};

const SHARE_OF_VOICE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];

export default function MLASocialMedia() {
  const { user } = useAuth();
  const acId = user?.assignedAC;

  const [shareOfVoice, setShareOfVoice] = useState<ShareOfVoiceData | null>(null);
  const [socialSentiment, setSocialSentiment] = useState<SentimentBreakdownData | null>(null);
  const [socialTimeRange, setSocialTimeRange] = useState<string>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSocialData = async () => {
      if (!acId) return;

      setLoading(true);
      setError(null);

      try {
        const [sovRes, sentimentRes] = await Promise.all([
          fetch(`/api/mla-dashboard/${acId}/social-media/share-of-voice?time_range=${socialTimeRange}`),
          fetch(`/api/mla-dashboard/${acId}/social-media/sentiment-breakdown?time_range=${socialTimeRange}`),
        ]);

        if (sovRes.ok) {
          const sovData = await sovRes.json();
          setShareOfVoice(sovData);
        } else {
          setShareOfVoice(null);
        }

        if (sentimentRes.ok) {
          const sentimentData = await sentimentRes.json();
          setSocialSentiment(sentimentData);
        } else {
          setSocialSentiment(null);
        }

        // Check if we got any data
        if (!sovRes.ok && !sentimentRes.ok) {
          setError('Analytics API is not available. Social media data cannot be fetched.');
        }
      } catch (err: any) {
        console.error('Error fetching social media data:', err);
        setError('Failed to connect to analytics API. Please ensure it is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchSocialData();
  }, [acId, socialTimeRange]);

  const hasData = shareOfVoice?.data?.items?.length || socialSentiment?.data;

  if (loading) {
    return <div className="text-center py-8">Loading social media analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Social Media Analytics</CardTitle>
              <Badge variant="secondary" className="text-xs">All Constituencies</Badge>
            </div>
            <Select value={socialTimeRange} onValueChange={setSocialTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track competitor mentions and sentiment across social media platforms (state-wide aggregated data)
          </p>
        </CardHeader>
      </Card>

      {error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 text-sm">{error}</span>
            </div>
            <p className="text-xs text-yellow-500 mt-1">
              Please contact the administrator if this issue persists.
            </p>
          </CardContent>
        </Card>
      )}

      {hasData ? (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Share of Voice Chart */}
            {shareOfVoice?.data?.items?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Share of Voice</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Distribution of mentions by competitor/party
                  </p>
                </CardHeader>
                <CardContent>
                  <BeautifulDonutChart
                    data={shareOfVoice.data.items.map((item, idx) => ({
                      name: item.competitor_name,
                      value: item.mention_count,
                      color: SHARE_OF_VOICE_COLORS[idx % SHARE_OF_VOICE_COLORS.length],
                    }))}
                    height={280}
                    valueLabel="Mentions"
                    showMoreThreshold={6}
                  />
                </CardContent>
              </Card>
            )}

            {/* Social Media Sentiment Chart */}
            {socialSentiment?.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Social Media Sentiment</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Overall sentiment of social media mentions
                  </p>
                </CardHeader>
                <CardContent>
                  <BeautifulDonutChart
                    data={[
                      { name: 'Positive', value: socialSentiment.data.positive, color: SOCIAL_SENTIMENT_COLORS.positive },
                      { name: 'Neutral', value: socialSentiment.data.neutral, color: SOCIAL_SENTIMENT_COLORS.neutral },
                      { name: 'Negative', value: socialSentiment.data.negative, color: SOCIAL_SENTIMENT_COLORS.negative },
                    ].filter(d => d.value > 0)}
                    height={280}
                    valueLabel="Mentions"
                    subtitle={`Total mentions: ${socialSentiment.data.total.toLocaleString()}`}
                    showMoreThreshold={3}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Competitor Mentions Table */}
          {shareOfVoice?.data?.items?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Competitor Mentions Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competitor</TableHead>
                      <TableHead className="text-right">Mentions</TableHead>
                      <TableHead className="text-right">Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shareOfVoice.data.items.map((item, idx) => (
                      <TableRow key={item.competitor_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: SHARE_OF_VOICE_COLORS[idx % SHARE_OF_VOICE_COLORS.length] }}
                            />
                            {item.competitor_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.mention_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        !error && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No social media data available for this time period.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try selecting a different time range or check back later.
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
