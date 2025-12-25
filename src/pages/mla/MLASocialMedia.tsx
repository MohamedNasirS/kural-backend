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

import { useState } from 'react';
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
import {
  SOCIAL_SENTIMENT_COLORS,
  SHARE_OF_VOICE_COLORS,
  PARTY_COLORS,
} from '@/lib/chartColors';
import { useMLAShareOfVoice, useMLASentimentBreakdown } from '@/hooks/useMLADashboard';

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

export default function MLASocialMedia() {
  const { user } = useAuth();
  const acId = user?.assignedAC;
  const [socialTimeRange, setSocialTimeRange] = useState<string>('30d');

  // React Query hooks - data is cached for 5 minutes
  const {
    data: shareOfVoiceData,
    isLoading: sovLoading,
    error: sovError,
  } = useMLAShareOfVoice(acId, socialTimeRange);

  const {
    data: socialSentimentData,
    isLoading: sentimentLoading,
    error: sentimentError,
  } = useMLASentimentBreakdown(acId, socialTimeRange);

  const shareOfVoice = shareOfVoiceData as ShareOfVoiceData | undefined;
  const socialSentiment = socialSentimentData as SentimentBreakdownData | undefined;
  const loading = sovLoading || sentimentLoading;
  const error = (sovError && sentimentError)
    ? 'Analytics API is not available. Social media data cannot be fetched.'
    : null;

  const hasData = shareOfVoice?.data?.items?.length || socialSentiment?.data;

  if (loading) {
    return <div className="text-center py-8">Loading social media analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <Card className="dark:bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg dark:text-foreground">Social Media Analytics</CardTitle>
              <Badge variant="secondary" className="text-xs">All Constituencies</Badge>
            </div>
            <Select value={socialTimeRange} onValueChange={setSocialTimeRange}>
              <SelectTrigger className="w-[120px] dark:bg-background">
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
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 dark:text-yellow-400 text-sm">{error}</span>
            </div>
            <p className="text-xs text-yellow-500 dark:text-yellow-500/80 mt-1">
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
              <Card className="dark:bg-card">
                <CardHeader>
                  <CardTitle className="text-base dark:text-foreground">Share of Voice</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Distribution of mentions by competitor/party
                  </p>
                </CardHeader>
                <CardContent>
                  <BeautifulDonutChart
                    data={shareOfVoice.data.items.map((item, idx) => ({
                      name: item.competitor_name,
                      value: item.mention_count,
                      // Use party-specific color if available, otherwise use index-based color
                      color: PARTY_COLORS[item.competitor_name.toUpperCase()] ||
                             PARTY_COLORS[item.competitor_name] ||
                             SHARE_OF_VOICE_COLORS[idx % SHARE_OF_VOICE_COLORS.length],
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
              <Card className="dark:bg-card">
                <CardHeader>
                  <CardTitle className="text-base dark:text-foreground">Social Media Sentiment</CardTitle>
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
                    disableOthersGrouping={true}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Competitor Mentions Table */}
          {shareOfVoice?.data?.items?.length > 0 && (
            <Card className="dark:bg-card">
              <CardHeader>
                <CardTitle className="text-base dark:text-foreground">Competitor Mentions Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:border-border">
                      <TableHead className="dark:text-foreground">Competitor</TableHead>
                      <TableHead className="text-right dark:text-foreground">Mentions</TableHead>
                      <TableHead className="text-right dark:text-foreground">Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shareOfVoice.data.items.map((item, idx) => (
                      <TableRow key={item.competitor_id} className="dark:border-border">
                        <TableCell className="font-medium dark:text-foreground">
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
                        </TableCell>
                        <TableCell className="text-right dark:text-foreground">{item.mention_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right dark:text-foreground">{item.percentage}%</TableCell>
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
          <Card className="dark:bg-card">
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
