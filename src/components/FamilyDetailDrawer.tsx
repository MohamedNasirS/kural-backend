import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Users, Home, UserCircle, CheckCircle, XCircle, Loader2, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import API_BASE_URL from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { VoterDetailDrawer } from './VoterDetailDrawer';

interface FamilyDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  familyData: {
    id: string; // This is the familyId
    family_head: string;
    members: number;
    booth: string;
    boothNo: number | string;
    booth_id?: string;
    address: string;
    phone: string;
    voters?: any[];
  } | null;
  acId?: number | string; // Optional acId prop for L0 admin
}

interface FamilyMember {
  id: string;
  name: string;
  voterID: string;
  age: number;
  gender: string;
  relationship: string;
  phone: string;
  surveyed: boolean;
  surveyedAt: string | null;
  religion: string;
  caste: string;
}

interface FamilyDetails {
  family: {
    id: string;
    headName: string;
    address: string;
    booth: string;
    boothNo: number;
    acId: number;
    acName: string;
    phone: string;
  };
  members: FamilyMember[];
  demographics: {
    totalMembers: number;
    male: number;
    female: number;
    surveyed: number;
    pending: number;
    averageAge: number;
  };
}

export const FamilyDetailDrawer = ({ open, onClose, familyData, acId: propAcId }: FamilyDetailDrawerProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<FamilyDetails | null>(null);
  const [selectedVoter, setSelectedVoter] = useState<any>(null);
  const [voterDrawerOpen, setVoterDrawerOpen] = useState(false);

  const handleVoterClick = (member: FamilyMember) => {
    // Convert FamilyMember to VoterDetailDrawer format
    const voterData = {
      id: member.id,
      name: member.name,
      age: member.age,
      gender: member.gender,
      booth: details?.family?.booth || familyData?.booth || '',
      boothNo: details?.family?.boothNo || familyData?.boothNo || 0,
      family: details?.family?.headName || familyData?.family_head || '',
      phone: member.phone,
      surveyed: member.surveyed,
      voterID: member.voterID,
      relationship: member.relationship,
      religion: member.religion,
      caste: member.caste
    };
    setSelectedVoter(voterData);
    setVoterDrawerOpen(true);
  };

  // Build details from familyData.voters (instant) or fetch from API (fallback)
  useEffect(() => {
    if (open && familyData) {
      // If voters data is already available, use it directly (instant loading)
      if (familyData.voters && familyData.voters.length > 0) {
        buildDetailsFromVoters();
      } else {
        // Fallback to API call if voters not available
        fetchFamilyDetails();
      }
    }
  }, [open, familyData]);

  const buildDetailsFromVoters = () => {
    if (!familyData || !familyData.voters || !Array.isArray(familyData.voters)) return;

    // Filter out any null/undefined voters
    const voters = familyData.voters.filter((v: any) => v != null);
    if (voters.length === 0) return;

    const acId = propAcId || user?.assignedAC || 119;

    // Calculate demographics from voters with null checks
    const demographics = {
      totalMembers: voters.length,
      male: voters.filter((v: any) => v?.gender === 'Male').length,
      female: voters.filter((v: any) => v?.gender === 'Female').length,
      surveyed: voters.filter((v: any) => v?.surveyed === true).length,
      pending: voters.filter((v: any) => v?.surveyed !== true).length,
      averageAge: voters.length > 0 ? Math.round(voters.reduce((sum: number, v: any) => sum + (v?.age || 0), 0) / voters.length) : 0
    };

    // Format members from voters
    const formattedMembers: FamilyMember[] = voters.map((voter: any) => ({
      id: voter.id?.toString() || voter._id?.toString() || '',
      name: voter.name || 'N/A',
      voterID: voter.voterID || 'N/A',
      age: voter.age || 0,
      gender: voter.gender || 'N/A',
      relationship: voter.relationToHead || 'Member',
      phone: voter.mobile ? `+91 ${voter.mobile}` : '',
      surveyed: voter.surveyed === true,
      surveyedAt: voter.surveyedAt || null,
      religion: voter.religion || 'N/A',
      caste: voter.caste || 'N/A'
    }));

    // Build family details
    const familyDetails: FamilyDetails = {
      family: {
        id: familyData.id,
        headName: familyData.family_head,
        address: familyData.address || 'N/A',
        booth: familyData.booth || 'N/A',
        boothNo: typeof familyData.boothNo === 'number' ? familyData.boothNo : parseInt(familyData.boothNo?.toString() || '0') || 0,
        acId: typeof acId === 'number' ? acId : parseInt(acId?.toString() || '119'),
        acName: `AC ${acId}`,
        phone: familyData.phone || 'N/A'
      },
      members: formattedMembers,
      demographics
    };

    setDetails(familyDetails);
    setLoading(false);
    setError(null);
  };

  const fetchFamilyDetails = async () => {
    if (!familyData || !user) return;

    try {
      setLoading(true);
      setError(null);

      // Use prop acId first (for L0), then user.assignedAC (for L1/L2), fallback to 119
      const acId = propAcId || user?.assignedAC || 119;
      const params = new URLSearchParams();

      // Use familyId as primary lookup method
      if (familyData.id) {
        params.append('familyId', familyData.id);
      }

      // Also pass address/booth as fallback
      if (familyData.address) {
        params.append('address', familyData.address);
      }
      if (familyData.booth) {
        params.append('booth', familyData.booth);
      }
      if (familyData.boothNo) {
        params.append('boothNo', familyData.boothNo?.toString() || '');
      }

      const url = `${API_BASE_URL}/families/${acId}/details?${params}`;

      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to fetch family details');
      }

      const data = await response.json();
      setDetails(data);
    } catch (err) {
      console.error('Error fetching family details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load family details');
    } finally {
      setLoading(false);
    }
  };

  if (!familyData) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            {familyData.family_head}
          </SheetTitle>
          <SheetDescription>{familyData.address}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading family details...</p>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mt-6">
            {error}
          </div>
        ) : details ? (
          <div className="space-y-6 mt-6">
            {/* Family Status */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Family Status</h3>
                <Badge variant={(details.demographics?.surveyed ?? 0) === (details.demographics?.totalMembers ?? 0) ? 'default' : (details.demographics?.surveyed ?? 0) > 0 ? 'secondary' : 'destructive'}>
                  {details.demographics?.surveyed ?? 0}/{details.demographics?.totalMembers ?? 0} Surveyed
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    (details.demographics?.surveyed ?? 0) === (details.demographics?.totalMembers ?? 0) ? 'bg-success' : (details.demographics?.surveyed ?? 0) > 0 ? 'bg-warning' : 'bg-destructive'
                  }`}
                  style={{ width: `${(details.demographics?.totalMembers ?? 0) > 0 ? ((details.demographics?.surveyed ?? 0) / (details.demographics?.totalMembers ?? 1)) * 100 : 0}%` }}
                />
              </div>
            </Card>

            {/* Family Members */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Family Members ({details.members?.length ?? 0})
              </h3>
              <div className="space-y-3">
                {(details.members ?? []).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleVoterClick(member)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.age} years, {member.gender} • {member.relationship}
                        </p>
                        {member.voterID !== 'N/A' && (
                          <p className="text-xs text-muted-foreground">ID: {member.voterID}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.surveyed ? 'default' : 'secondary'}>
                        {member.surveyed ? 'Surveyed' : 'Pending'}
                      </Badge>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Demographics */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Family Demographics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-bold text-primary">{details.demographics?.totalMembers ?? 0}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Male / Female</p>
                  <p className="text-lg font-bold">{details.demographics?.male ?? 0} / {details.demographics?.female ?? 0}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-success" />
                    Surveyed
                  </p>
                  <p className="text-2xl font-bold text-success">{details.demographics?.surveyed ?? 0}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-warning" />
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-warning">{details.demographics?.pending ?? 0}</p>
                </div>
              </div>
            </Card>

            <Separator />

            {/* Booth Information */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Home className="h-4 w-4" />
                Booth Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booth:</span>
                  <span className="font-medium">{details.family?.booth ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booth Number:</span>
                  <span className="font-medium">{details.family?.boothNo ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AC:</span>
                  <span className="font-medium">{details.family?.acName ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact:</span>
                  <span className="font-medium">{details.family?.phone ?? 'N/A'}</span>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </SheetContent>

      {/* Voter Detail Drawer - opens when clicking on a family member */}
      <VoterDetailDrawer
        open={voterDrawerOpen}
        onClose={() => {
          setVoterDrawerOpen(false);
          setSelectedVoter(null);
        }}
        voterData={selectedVoter}
      />
    </Sheet>
  );
};
