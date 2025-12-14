/**
 * MLA Booth List - Page 2
 *
 * Shows:
 * - Search by booth name/number
 * - Filter tabs: All | Favorable | Negative | Balanced | Flippable
 * - Sort options: Margin | Turnout | Voters
 * - Booth cards with vote share %, margin %, and demographics
 *
 * See docs/MLA_DASHBOARD_CONTENT.md for full specification
 */

import { useEffect, useState } from 'react';
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

// TODO: Define types
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

const SENTIMENT_TABS = ['all', 'favorable', 'negative', 'balanced', 'flippable'];
const SORT_OPTIONS = ['margin', 'turnout', 'voters'];

export default function MLABoothList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  // Filter state from URL
  const sentiment = searchParams.get('sentiment') || 'all';
  const sort = searchParams.get('sort') || 'margin';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    const fetchBooths = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          sentiment,
          sort,
          order: 'asc',
          search,
          page: String(page),
          limit: '20',
        });
        const res = await fetch(
          `/api/mla-dashboard/${user?.assignedAC}/booths?${params}`
        );
        if (!res.ok) throw new Error('Failed to fetch booths');
        const data = await res.json();
        setBooths(data.booths || []);
        setPagination(data.pagination || { total: 0, page: 1, pages: 1 });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.assignedAC) {
      fetchBooths();
    }
  }, [user, sentiment, sort, search, page]);

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
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search booth name or number..."
          value={search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="md:w-64"
        />
        <Select value={sort} onValueChange={(v) => updateFilter('sort', v)}>
          <SelectTrigger className="w-40">
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
        {SENTIMENT_TABS.map((tab) => (
          <Button
            key={tab}
            variant={sentiment === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('sentiment', tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        Showing {booths.length} of {pagination.total} booths
      </p>

      {/* Booth Cards */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : booths.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No booths found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {booths.map((booth) => (
            <Card
              key={booth.boothNo}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/mla/booth/${booth.boothNo}`)}
            >
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold">#{booth.boothNo}</div>
                    <div className="text-sm text-gray-600">{booth.boothName}</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${getSentimentBadge(
                      booth.sentiment
                    )}`}
                  >
                    {booth.sentiment}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mt-4">
                  <div>
                    <span className="text-gray-500">Our Vote Share:</span>
                    <div className="font-semibold">{booth.ourVoteShare.percent}%</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Margin:</span>
                    <div
                      className={`font-semibold ${
                        booth.result === 'won' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {booth.result === 'won' ? '+' : '-'}
                      {booth.margin.votes} ({booth.margin.percent}%)
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Voters:</span>
                    <div className="font-semibold">
                      {booth.totalVoters.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Turnout:</span>
                    <div className="font-semibold">{booth.turnoutPercent}%</div>
                  </div>
                </div>

                {booth.gapToFlip && (
                  <div className="mt-2 text-sm text-orange-600">
                    Gap to flip: {booth.gapToFlip} votes
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  Gender: M {booth.gender.male.percentage}% | F{' '}
                  {booth.gender.female.percentage}%
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateFilter('page', String(page - 1))}
          >
            Previous
          </Button>
          <span className="py-2 px-4">
            Page {page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.pages}
            onClick={() => updateFilter('page', String(page + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
