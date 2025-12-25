import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Users, Home, FileCheck, User, Phone, Calendar,
  CheckCircle, AlertCircle, MapPin, Mail, CreditCard,
  Heart, Briefcase, Clock, Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { VoterDocuments } from '@/components/VoterDocuments';

interface CompletedSurvey {
  surveyId: string;
  surveyName: string;
  completedAt?: string;
  responseId?: string;
}

interface VoterDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  voterData: {
    id: number | string;
    name: string;
    nameTamil?: string;
    age?: number;
    gender?: string;
    booth?: string;
    boothTamil?: string;
    boothNo?: number | string;
    boothId?: string;
    family?: string;
    familyId?: string;
    phone?: string;
    surveyed?: boolean;
    verified?: boolean;
    voterId?: string;
    voterID?: string;
    // Additional fields
    address?: string;
    addressTamil?: string;
    doorNumber?: string | number;
    fatherName?: string;
    guardian?: string;
    dob?: string;
    email?: string;
    aadhar?: string;
    pan?: string;
    religion?: string;
    caste?: string;
    subcaste?: string;
    bloodGroup?: string;
    annualIncome?: string;
    aciId?: number;
    aciName?: string;
    boothAgentId?: string;
    verifiedAt?: string;
    surveyedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    status?: string;
    relationship?: string;
    // NEW: Multi-survey tracking
    surveysTaken?: number;
    lastSurveyAt?: string;
    completedSurveys?: CompletedSurvey[];
    // NEW: SIR Fields
    isActive?: boolean;
    isNewFromSir?: boolean;
    currentSirStatus?: 'passed' | 'removed' | 'reinstated' | 'new';
    currentSirRevision?: string;
    // NEW: Relative Info (replaces fatherName/guardian)
    relative?: {
      name?: { english?: string; tamil?: string };
      relation?: string;
    };
    // NEW: Ward Info
    wardNo?: number;
    wardName?: string;
    wardNameEnglish?: string;
  } | null;
}

// Helper to format date
const formatDate = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

// Helper to mask sensitive data
const maskAadhar = (aadhar?: string) => {
  if (!aadhar) return null;
  const cleaned = aadhar.replace(/[^0-9]/g, '');
  if (cleaned.length >= 4) {
    return `XXXX-XXXX-${cleaned.slice(-4)}`;
  }
  return aadhar;
};

export const VoterDetailDrawer = ({ open, onClose, voterData }: VoterDetailDrawerProps) => {
  const { user } = useAuth();

  if (!voterData) return null;

  const voterIdDisplay = voterData.voterId || voterData.voterID || 'N/A';
  const canViewDocuments = ['L0', 'L1', 'L2'].includes(user?.role || '');

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {voterData.name}
            {voterData.nameTamil && (
              <span className="text-muted-foreground text-base font-normal">
                ({voterData.nameTamil})
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            Voter ID: {voterIdDisplay}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {/* NEW VOTER Badge - Prominent display for new voters from SIR */}
            {(voterData.isNewFromSir || voterData.currentSirStatus === 'new') && (
              <Badge className="bg-blue-500 hover:bg-blue-600 text-white animate-pulse">
                New Voter
              </Badge>
            )}
            {/* SIR Status Badge */}
            {voterData.isActive !== undefined && (
              <Badge variant={voterData.isActive ? 'default' : 'destructive'}>
                {voterData.isActive ? 'Active (SIR)' : 'Removed from SIR'}
              </Badge>
            )}
            <Badge variant={voterData.surveyed ? 'default' : 'secondary'}>
              {voterData.surveyed ? 'Surveyed' : 'Not Surveyed'}
            </Badge>
            <Badge variant={voterData.verified ? 'default' : 'outline'}>
              {voterData.verified ? 'Verified' : 'Not Verified'}
            </Badge>
            {voterData.status && (
              <Badge variant="outline">{voterData.status}</Badge>
            )}
            {voterData.currentSirRevision && (
              <Badge variant="outline" className="text-xs">
                SIR: {voterData.currentSirRevision}
              </Badge>
            )}
          </div>

          {/* Basic Information */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground">Age</p>
                <p className="text-sm font-medium">{voterData.age || 'N/A'} years</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="text-sm font-medium">{voterData.gender || 'N/A'}</p>
              </div>
              {voterData.dob && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="text-sm font-medium">{formatDate(voterData.dob)}</p>
                </div>
              )}
              {voterData.bloodGroup && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Blood Group</p>
                  <p className="text-sm font-medium">{voterData.bloodGroup}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Contact Information */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="p-2 bg-muted rounded flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{voterData.phone || 'N/A'}</p>
                </div>
              </div>
              {voterData.email && (
                <div className="p-2 bg-muted rounded flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{voterData.email}</p>
                  </div>
                </div>
              )}
              {voterData.address && (
                <div className="p-2 bg-muted rounded flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">
                      {voterData.doorNumber && `${voterData.doorNumber}, `}
                      {voterData.address}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Family & Relative Information */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Home className="h-4 w-4" />
              Family & Relative Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground">Family ID</p>
                <p className="text-sm font-medium">{voterData.familyId || voterData.family || 'N/A'}</p>
              </div>
              {/* New: Relative Info from SIR */}
              {(voterData.relative?.name?.english || voterData.fatherName) && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">
                    {voterData.relative?.relation || 'Relative'}'s Name
                  </p>
                  <p className="text-sm font-medium">
                    {voterData.relative?.name?.english || voterData.fatherName}
                  </p>
                  {voterData.relative?.name?.tamil && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {voterData.relative.name.tamil}
                    </p>
                  )}
                </div>
              )}
              {voterData.relative?.relation && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Relation Type</p>
                  <p className="text-sm font-medium">{voterData.relative.relation}</p>
                </div>
              )}
              {/* Legacy: Guardian (for backward compatibility) */}
              {voterData.guardian && !voterData.relative?.name?.english && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Guardian</p>
                  <p className="text-sm font-medium">{voterData.guardian}</p>
                </div>
              )}
              {voterData.relationship && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Relationship</p>
                  <p className="text-sm font-medium">{voterData.relationship}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Booth & Ward Information */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Booth & Ward Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Polling Station Name */}
              <div className="p-2 bg-muted rounded col-span-2">
                <p className="text-xs text-muted-foreground">Polling Station</p>
                <p className="text-sm font-medium">{voterData.booth || 'N/A'}</p>
                {voterData.boothTamil && (
                  <p className="text-xs text-muted-foreground mt-0.5">{voterData.boothTamil}</p>
                )}
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground">Booth No</p>
                <p className="text-sm font-medium">{voterData.boothNo || 'N/A'}</p>
              </div>
              {/* Ward Info */}
              {voterData.wardNo && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Ward</p>
                  <p className="text-sm font-medium">
                    {voterData.wardNo} - {voterData.wardNameEnglish || voterData.wardName || ''}
                  </p>
                  {voterData.wardName && voterData.wardNameEnglish && (
                    <p className="text-xs text-muted-foreground mt-0.5">{voterData.wardName}</p>
                  )}
                </div>
              )}
              {voterData.boothId && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Booth ID</p>
                  <p className="text-sm font-medium">{voterData.boothId}</p>
                </div>
              )}
              {voterData.aciName && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Assembly Constituency</p>
                  <p className="text-sm font-medium">{voterData.aciName} ({voterData.aciId})</p>
                </div>
              )}
              {voterData.boothAgentId && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Booth Agent ID</p>
                  <p className="text-sm font-medium">{voterData.boothAgentId}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Demographics */}
          {(voterData.religion || voterData.caste || voterData.subcaste) && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Demographics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {voterData.religion && (
                  <div className="p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">Religion</p>
                    <p className="text-sm font-medium">{voterData.religion}</p>
                  </div>
                )}
                {voterData.caste && (
                  <div className="p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">Caste</p>
                    <p className="text-sm font-medium">{voterData.caste}</p>
                  </div>
                )}
                {voterData.subcaste && (
                  <div className="p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">Sub-caste</p>
                    <p className="text-sm font-medium">{voterData.subcaste}</p>
                  </div>
                )}
                {voterData.annualIncome && voterData.annualIncome !== 'null' && (
                  <div className="p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">Annual Income</p>
                    <p className="text-sm font-medium">{voterData.annualIncome}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ID Documents */}
          {(voterData.aadhar || voterData.pan) && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                ID Documents
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {voterData.aadhar && (
                  <div className="p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">Aadhar</p>
                    <p className="text-sm font-medium">{maskAadhar(voterData.aadhar)}</p>
                  </div>
                )}
                {voterData.pan && (
                  <div className="p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">PAN</p>
                    <p className="text-sm font-medium">{voterData.pan}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Uploaded Documents - Only for L0, L1, L2 */}
          {canViewDocuments && voterData.id && (
            <VoterDocuments voterId={String(voterData.id)} />
          )}

          <Separator />

          {/* Survey Status */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Survey & Verification Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted rounded">
                {voterData.surveyed ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{voterData.surveyed ? 'Survey Completed' : 'Survey Pending'}</p>
                    {voterData.surveysTaken !== undefined && voterData.surveysTaken > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {voterData.surveysTaken} survey{voterData.surveysTaken > 1 ? 's' : ''} completed
                      </Badge>
                    )}
                  </div>
                  {voterData.lastSurveyAt && (
                    <p className="text-xs text-muted-foreground">
                      Last surveyed: {formatDate(voterData.lastSurveyAt)}
                    </p>
                  )}
                  {!voterData.lastSurveyAt && voterData.surveyedAt && (
                    <p className="text-xs text-muted-foreground">
                      Surveyed on: {formatDate(voterData.surveyedAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Completed Surveys List */}
              {voterData.completedSurveys && voterData.completedSurveys.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed Surveys</p>
                  {voterData.completedSurveys.map((survey, index) => (
                    <div key={survey.surveyId || index} className="flex items-center justify-between p-2 bg-green-500/5 border border-green-500/20 rounded">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">{survey.surveyName || 'Survey'}</span>
                      </div>
                      <div className="text-right">
                        {survey.completedAt && (
                          <p className="text-xs text-muted-foreground">{formatDate(survey.completedAt)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-muted rounded">
                {voterData.verified ? (
                  <Shield className="h-5 w-5 text-green-600" />
                ) : (
                  <Shield className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium">{voterData.verified ? 'Verified' : 'Not Verified'}</p>
                  {voterData.verifiedAt && (
                    <p className="text-xs text-muted-foreground">
                      Verified on: {formatDate(voterData.verifiedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Timestamps */}
          {(voterData.createdAt || voterData.updatedAt) && (
            <div className="text-xs text-muted-foreground flex justify-between px-2">
              {voterData.createdAt && (
                <span>Created: {formatDate(voterData.createdAt)}</span>
              )}
              {voterData.updatedAt && (
                <span>Updated: {formatDate(voterData.updatedAt)}</span>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
