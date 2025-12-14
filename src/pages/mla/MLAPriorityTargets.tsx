/**
 * MLA Priority Targets Page
 * Shows all flippable booths sorted by gap to flip
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PriorityTarget {
  boothNo: string;
  boothName: string;
  ourVoteSharePercent: number;
  margin: { votes: number; percent: number };
  gapToFlip: number;
  totalVoters: number;
  reason: string;
}

interface PriorityData {
  priorityTargets: PriorityTarget[];
  summary: {
    totalFlippable: number;
    totalGapToFlip: number;
    avgGapPerBooth: number;
    potentialBoothGain: number;
  };
}

export default function MLAPriorityTargets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PriorityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const acId = user?.assignedAC;

  useEffect(() => {
    const fetchData = async () => {
      if (!acId) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/mla-dashboard/${acId}/priority-targets?limit=100`);
        if (!res.ok) throw new Error('Failed to fetch priority targets');
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
        <div className="text-lg">Loading priority targets...</div>
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-orange-600">{data.summary.totalFlippable}</div>
            <div className="text-sm text-gray-600">Flippable Booths</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{data.summary.totalGapToFlip.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Votes Needed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{data.summary.avgGapPerBooth}</div>
            <div className="text-sm text-gray-600">Avg Gap Per Booth</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-green-600">+{data.summary.potentialBoothGain}</div>
            <div className="text-sm text-gray-600">Potential Booth Gain</div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Targets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Flippable Booths - Sorted by Gap to Flip</CardTitle>
        </CardHeader>
        <CardContent>
          {data.priorityTargets.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No flippable booths found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">Rank</th>
                    <th className="text-left py-3 px-4">Booth</th>
                    <th className="text-right py-3 px-4">Our Vote %</th>
                    <th className="text-right py-3 px-4">Lost By</th>
                    <th className="text-right py-3 px-4">Gap to Flip</th>
                    <th className="text-right py-3 px-4">Total Voters</th>
                    <th className="text-left py-3 px-4">Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {data.priorityTargets.map((target, index) => (
                    <tr
                      key={target.boothNo}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/mla/booth/${target.boothNo}`)}
                    >
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${
                          index < 3 ? 'bg-orange-500' : index < 10 ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">Booth #{target.boothNo}</div>
                        <div className="text-gray-500 text-xs">{target.boothName}</div>
                      </td>
                      <td className="text-right py-3 px-4">{target.ourVoteSharePercent}%</td>
                      <td className="text-right py-3 px-4 text-red-600">
                        {target.margin.votes} votes ({target.margin.percent}%)
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="text-orange-600 font-bold text-lg">{target.gapToFlip}</span>
                        <span className="text-gray-500 text-xs block">votes</span>
                      </td>
                      <td className="text-right py-3 px-4">{target.totalVoters.toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs text-gray-600 max-w-xs">{target.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Back Button */}
      <Button variant="outline" onClick={() => navigate('/mla/dashboard')}>
        Back to Dashboard
      </Button>
    </div>
  );
}
