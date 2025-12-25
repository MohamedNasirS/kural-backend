/**
 * MLA Booth List - Page 2
 *
 * Shows:
 * - Search by booth name/number
 * - Filter tabs: All | Favorable | Negative | Balanced | Flippable
 * - Sort options: Margin | Turnout | Voters
 * - Booth cards with vote share %, margin %, and demographics
 * - SIR View: Shows current voter roll stats per booth
 *
 * See docs/MLA_DASHBOARD_CONTENT.md for full specification
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMLABooths, useMLABoothsSirStats } from '@/hooks/useMLADashboard';

// Types
interface Booth {
  boothNo: string;
  boothName: string;
  sentiment: 'favorable' | 'negative' | 'balanced' | 'flippable';
  result: 'won' | 'lost';
  ourVoteShare: { votes: number; percent: number };
  margin: { votes: number; percent: number };
  gapToFlip?: number;
  totalVoters: number;
  turnoutPercent: number;
  gender: {
    male: { count: number; percentage: number };
    female: { count: number; percentage: number };
    others: { count: number; percentage: number };
  };
}

interface SirBooth {
  boothNo: number | string;
  boothName: string;
  activeVoters: number;
  removedVoters: number;
  newVoters: number;
  male: number;
  female: number;
  others: number;
}

const SENTIMENT_TABS = ['all', 'favorable', 'negative', 'balanced', 'flippable'];
const SORT_OPTIONS = ['margin', 'turnout', 'voters'];

export default function MLABoothList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state from URL
  const sentiment = searchParams.get('sentiment') || 'all';
  const sort = searchParams.get('sort') || 'margin';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const view = searchParams.get('view') || 'election'; // 'election' or 'sir'

  const acId = user?.assignedAC;

  // Build params for booths query
  const boothsParams = useMemo(() => {
    const params = new URLSearchParams({
      sentiment,
      sort,
      order: 'asc',
      search,
      page: String(page),
      limit: '20',
    });
    return params;
  }, [sentiment, sort, search, page]);

  // React Query hooks - data is cached for 5 minutes
  const {
    data: boothsData,
    isLoading: boothsLoading,
    error: boothsError,
  } = useMLABooths(view === 'election' ? acId : undefined, boothsParams);

  const {
    data: sirData,
    isLoading: sirLoading,
    error: sirError,
  } = useMLABoothsSirStats(view === 'sir' ? acId : undefined);

  // Derived state from React Query data
  const booths: Booth[] = (boothsData as any)?.booths || [];
  const pagination = (boothsData as any)?.pagination || { total: 0, page: 1, pages: 1 };
  const sirBooths: SirBooth[] = (sirData as any)?.available ? (sirData as any).booths || [] : [];
  const loading = view === 'election' ? boothsLoading : sirLoading;
  const error = view === 'election' ? boothsError : sirError;

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(key, value);
    if (key !== 'page') newParams.set('page', '1'); // Reset page on filter change
    setSearchParams(newParams);
  };

  const getSentimentBadge = (sentiment: string) => {
    const badges: Record<string, string> = {
      favorable: 'bg-green-100 text-green-800',
      negative: 'bg-red-100 text-red-800',
      balanced: 'bg-yellow-100 text-yellow-800',
      flippable: 'bg-orange-100 text-orange-800',
    };
    return badges[sentiment] || 'bg-gray-100 text-gray-800';
  };

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {(error as Error).message}</div>;
  }

  // Filter SIR booths by search
  const filteredSirBooths = sirBooths.filter(b =>
    String(b.boothNo).includes(search) ||
    b.boothName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={view === 'election' ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilter('view', 'election')}
          className={view === 'election' ? '' : 'dark:border-muted-foreground/30'}
        >
          2021 Election
        </Button>
        <Button
          variant={view === 'sir' ? 'default' : 'outline'}
          size="sm"
          className={view === 'sir' ? 'bg-blue-600 hover:bg-blue-700' : 'dark:border-muted-foreground/30'}
          onClick={() => updateFilter('view', 'sir')}
        >
          SIR 2026
        </Button>
      </div>

      {view === 'election' ? (
        <>
          {/* Search and Filters for Election View */}
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search booth name or number..."
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="md:w-64 dark:bg-background"
            />
            <Select value={sort} onValueChange={(v) => updateFilter('sort', v)}>
              <SelectTrigger className="w-40 dark:bg-background">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sentiment Tabs */}
          <div className="flex gap-2 flex-wrap">
            {SENTIMENT_TABS.map((tab) => {
              const tabColors: Record<string, string> = {
                all: '',
                favorable: sentiment === tab ? 'bg-green-600 hover:bg-green-700' : 'border-green-500 text-green-600 dark:text-green-400',
                negative: sentiment === tab ? 'bg-red-600 hover:bg-red-700' : 'border-red-500 text-red-600 dark:text-red-400',
                balanced: sentiment === tab ? 'bg-yellow-600 hover:bg-yellow-700' : 'border-yellow-500 text-yellow-600 dark:text-yellow-400',
                flippable: sentiment === tab ? 'bg-orange-600 hover:bg-orange-700' : 'border-orange-500 text-orange-600 dark:text-orange-400',
              };
              return (
                <Button
                  key={tab}
                  variant={sentiment === tab ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateFilter('sentiment', tab)}
                  className={tabColors[tab]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Button>
              );
            })}
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            Showing {booths.length} of {pagination.total} booths
          </p>
        </>
      ) : (
        <>
          {/* Search for SIR View */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <Input
              placeholder="Search booth name or number..."
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="md:w-64 dark:bg-background"
            />
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              Current Voter Roll (SIR 2026) - {sirBooths.length} booths
            </div>
          </div>
        </>
      )}

      {/* Booth Cards */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : view === 'election' ? (
        // Election View Cards
        booths.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No booths found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {booths.map((booth) => (
              <Card
                key={booth.boothNo}
                className="cursor-pointer hover:shadow-md transition-shadow dark:bg-card"
                onClick={() => navigate(`/mla/booth/${booth.boothNo}`)}
              >
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold dark:text-foreground">#{booth.boothNo}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">{booth.boothName}</div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${getSentimentBadge(booth.sentiment)}`}
                    >
                      {booth.sentiment}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mt-4">
                    <div>
                      <span className="text-muted-foreground text-xs">Our Vote Share</span>
                      <div className="font-semibold dark:text-foreground">{booth.ourVoteShare.percent}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Margin</span>
                      <div
                        className={`font-semibold ${
                          booth.result === 'won' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {booth.result === 'won' ? '+' : '-'}{booth.margin.votes} ({booth.margin.percent}%)
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Voters</span>
                      <div className="font-semibold dark:text-foreground">{booth.totalVoters.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Turnout</span>
                      <div className="font-semibold dark:text-foreground">{booth.turnoutPercent}%</div>
                    </div>
                  </div>

                  {booth.gapToFlip && (
                    <div className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                      Gap to flip: {booth.gapToFlip} votes
                    </div>
                  )}

                  <div className="mt-3 text-xs text-muted-foreground">
                    M {booth.gender.male.percentage}% | F {booth.gender.female.percentage}%
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        // SIR View Cards
        filteredSirBooths.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No booths found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSirBooths.map((booth) => {
              const totalVoters = booth.activeVoters + booth.removedVoters;
              const activePercent = totalVoters > 0 ? (booth.activeVoters / totalVoters) * 100 : 0;

              return (
                <Card
                  key={booth.boothNo}
                  className="hover:shadow-md transition-shadow dark:bg-card"
                >
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-bold dark:text-foreground">#{booth.boothNo}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1" title={booth.boothName}>
                          {booth.boothName}
                        </div>
                      </div>
                      {booth.newVoters > 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          +{booth.newVoters} new
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 mt-4">
                      {/* Active/Removed */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-green-600 dark:text-green-400">{booth.activeVoters.toLocaleString()} Active</span>
                          <span className="text-red-500 dark:text-red-400">{booth.removedVoters.toLocaleString()} Removed</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                          <div className="bg-green-500 h-full" style={{ width: `${activePercent}%` }} />
                          <div className="bg-red-400 h-full" style={{ width: `${100 - activePercent}%` }} />
                        </div>
                      </div>

                      {/* Gender */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-blue-600 dark:text-blue-400">M {booth.male.toLocaleString()}</span>
                          <span className="text-pink-600 dark:text-pink-400">F {booth.female.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                          <div className="bg-blue-500 h-full" style={{ width: `${booth.activeVoters > 0 ? (booth.male / booth.activeVoters) * 100 : 0}%` }} />
                          <div className="bg-pink-500 h-full" style={{ width: `${booth.activeVoters > 0 ? (booth.female / booth.activeVoters) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t dark:border-border text-center">
                      <span className="text-lg font-bold dark:text-foreground">{booth.activeVoters.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground ml-1">total active</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Pagination - only for election view */}
      {view === 'election' && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateFilter('page', String(page - 1))}
            className="dark:border-muted-foreground/30"
          >
            Previous
          </Button>
          <span className="py-2 px-4 text-muted-foreground">
            Page {page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.pages}
            onClick={() => updateFilter('page', String(page + 1))}
            className="dark:border-muted-foreground/30"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
