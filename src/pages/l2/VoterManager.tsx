import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { VoterDetailDrawer } from '@/components/VoterDetailDrawer';
import API_BASE_URL from '@/lib/api';

interface CompletedSurvey {
  surveyId: string;
  surveyName: string;
  completedAt?: string;
  responseId?: string;
}

interface Voter {
  id: string;
  name: string;
  nameTamil?: string;
  voterId: string;
  familyId: string;
  booth: string;
  boothTamil?: string;
  boothNo: number;
  boothId?: string;
  phone: string;
  status: string;
  age?: number;
  gender?: string;
  verified?: boolean;
  surveyed?: boolean;
  address?: string;
  addressTamil?: string;
  doorNumber?: string;
  // Survey history fields (populated when viewing details)
  surveysTaken?: number;
  lastSurveyAt?: string;
  completedSurveys?: CompletedSurvey[];
  // SIR Fields
  isActive?: boolean;
  isNewFromSir?: boolean;
  currentSirStatus?: 'passed' | 'removed' | 'reinstated' | 'new';
  currentSirRevision?: string;
  // Relative Info
  relative?: {
    name?: { english?: string; tamil?: string };
    relation?: string;
  };
  // Ward Info
  wardNo?: number;
  wardName?: string;
  wardNameEnglish?: string;
  // AC Info
  aciId?: number;
  aciName?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const VoterManager = () => {
  const { user } = useAuth();
  const fallbackAcIdentifier = "119";
  // Use assignedAC (numeric ID) for API calls, not aciName (string name)
  const acIdentifier =
    (user?.assignedAC !== undefined && user?.assignedAC !== null
      ? String(user.assignedAC)
      : fallbackAcIdentifier);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [boothFilter, setBoothFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sirFilter, setSirFilter] = useState<string>('active'); // 'all' | 'active' | 'removed'
  const [selectedVoter, setSelectedVoter] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // API state
  const [voters, setVoters] = useState<Voter[]>([]);
  const [booths, setBooths] = useState<{ boothId: string; boothNo: number; boothName: string; voterCount: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    setPagination({
      page: 1,
      limit: 50,
      total: 0,
      pages: 0
    });
  }, [acIdentifier]);

  // Fetch booths on mount
  useEffect(() => {
    fetchBooths();
  }, [acIdentifier]);

  // Fetch voters when filters change
  useEffect(() => {
    fetchVoters();
  }, [acIdentifier, boothFilter, statusFilter, sirFilter, pagination.page]);

  const fetchBooths = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/voters/${encodeURIComponent(acIdentifier)}/booths`,
        {
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch booths');
      }

      const responseData = await response.json();
      // Handle standardized API response format
      const data = responseData.data || responseData;
      setBooths(data.booths || []);
    } catch (err) {
      console.error('Error fetching booths:', err);
    }
  };

  const fetchVoters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (boothFilter && boothFilter !== 'all') {
        params.append('booth', boothFilter);
      }

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      // SIR Filter
      if (sirFilter === 'all') {
        params.append('includeRemoved', 'true');
      } else if (sirFilter === 'removed') {
        params.append('includeRemoved', 'true');
        params.append('sirStatus', 'removed');
      }
      // 'active' is default - no param needed

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await fetch(
        `${API_BASE_URL}/voters/${encodeURIComponent(acIdentifier)}?${params}`,
        {
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch voters');
      }

      const responseData = await response.json();
      // Handle standardized API response format
      const data = responseData.data || responseData;
      setVoters(data.voters || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
    } catch (err) {
      console.error('Error fetching voters:', err);
      setError(err instanceof Error ? err.message : 'Failed to load voters');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchVoters();
  };

  const handleViewDetails = async (voter: Voter) => {
    // Set voter first to show drawer immediately
    setSelectedVoter(voter);
    setIsDrawerOpen(true);

    // Then fetch survey history in background
    try {
      const response = await fetch(
        `${API_BASE_URL}/voters/${encodeURIComponent(acIdentifier)}/voter/${encodeURIComponent(voter.voterId)}/surveys`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const responseData = await response.json();
        const surveyData = responseData.data || responseData;

        // Update selected voter with survey history
        setSelectedVoter((prev: Voter | null) => prev ? {
          ...prev,
          surveysTaken: surveyData.surveysTaken || 0,
          lastSurveyAt: surveyData.lastSurveyAt,
          completedSurveys: surveyData.completedSurveys || []
        } : null);
      }
    } catch (err) {
      console.error('Error fetching voter survey history:', err);
      // Don't show error - drawer will just not show survey history
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Voter Manager</h1>
          <p className="text-muted-foreground">
            {user?.aciName
              ? `Manage voters for ${user.aciName}`
              : `Manage voters for AC ${user?.assignedAC ?? fallbackAcIdentifier}`}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or voter ID..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={boothFilter} onValueChange={setBoothFilter}>
              <SelectTrigger className="w-[350px]">
                <SelectValue placeholder="All Booths" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Booths</SelectItem>
                {booths.map((booth) => (
                  <SelectItem key={booth.boothId} value={booth.boothId}>
                    {booth.boothName} ({booth.voterCount} voters)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Surveyed">Surveyed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Not Contacted">Not Contacted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sirFilter} onValueChange={setSirFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="SIR Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (SIR Passed)</SelectItem>
                <SelectItem value="removed">Removed from SIR</SelectItem>
                <SelectItem value="all">All Voters</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              <Filter className="mr-2 h-4 w-4" />
              Apply
            </Button>
          </div>
        </Card>

        {/* Pagination Info */}
        {!loading && pagination.total > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} voters
            </div>
            {pagination.pages > 1 && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Voter ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Family ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Booth</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Survey</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">SIR Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Loading voters...
                    </td>
                  </tr>
                ) : voters.length > 0 ? (
                  voters.map((voter) => (
                    <tr key={voter.id} className={`hover:bg-muted/50 ${voter.isActive === false ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {voter.isActive === false && <span className="line-through">{voter.name}</span>}
                          {voter.isActive !== false && voter.name}
                          {(voter.isNewFromSir || voter.currentSirStatus === 'new') && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500 text-white">
                              NEW
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{voter.voterId}</td>
                      <td className="px-4 py-3 text-sm">{voter.familyId}</td>
                      <td className="px-4 py-3 text-sm">{voter.booth}</td>
                      <td className="px-4 py-3 text-sm">{voter.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          voter.status === 'Surveyed' ? 'bg-success/10 text-success' :
                          voter.status === 'Pending' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {voter.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          voter.isActive === false ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-800'
                        }`}>
                          {voter.isActive === false ? 'Removed' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(voter)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No voters found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <VoterDetailDrawer 
        open={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        voterData={selectedVoter} 
      />
    </DashboardLayout>
  );
};