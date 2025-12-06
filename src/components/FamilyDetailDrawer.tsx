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

  useEffect(() => {
    if (open && familyData) {
      fetchFamilyDetails();
    }
  }, [open, familyData]);

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
      console.log('Fetching family details:', {
        familyData,
        acId,
        url
      });

      const response = await fetch(url, { credentials: 'include' });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Failed to fetch family details');
      }

      const data = await response.json();
      console.log('Family details received:', data);
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
                <Badge variant={details.demographics.surveyed === details.demographics.totalMembers ? 'default' : details.demographics.surveyed > 0 ? 'secondary' : 'destructive'}>
                  {details.demographics.surveyed}/{details.demographics.totalMembers} Surveyed
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    details.demographics.surveyed === details.demographics.totalMembers ? 'bg-success' : details.demographics.surveyed > 0 ? 'bg-warning' : 'bg-destructive'
                  }`}
                  style={{ width: `${(details.demographics.surveyed / details.demographics.totalMembers) * 100}%` }}
                />
              </div>
            </Card>

            {/* Family Members */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Family Members ({details.members.length})
              </h3>
              <div className="space-y-3">
                {details.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
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
                    <Badge variant={member.surveyed ? 'default' : 'secondary'}>
                      {member.surveyed ? 'Surveyed' : 'Pending'}
                    </Badge>
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
                  <p className="text-2xl font-bold text-primary">{details.demographics.totalMembers}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Male / Female</p>
                  <p className="text-lg font-bold">{details.demographics.male} / {details.demographics.female}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-success" />
                    Surveyed
                  </p>
                  <p className="text-2xl font-bold text-success">{details.demographics.surveyed}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-warning" />
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-warning">{details.demographics.pending}</p>
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
                  <span className="font-medium">{details.family.booth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booth Number:</span>
                  <span className="font-medium">{details.family.boothNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AC:</span>
                  <span className="font-medium">{details.family.acName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact:</span>
                  <span className="font-medium">{details.family.phone}</span>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
