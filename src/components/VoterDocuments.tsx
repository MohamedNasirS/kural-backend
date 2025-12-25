import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  CheckCircle,
  Clock,
  Trash2,
  Shield,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Types
interface VoterDocument {
  documentType: string;
  documentLabel: string;
  fileName: string;
  originalName: string;
  publicUrl: string;
  uploadedAt: string;
  uploadedBy?: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
}

interface VoterDocumentsResponse {
  voterId: string;
  voterID: string;
  voterName: string;
  acId: number;
  documents: VoterDocument[];
  totalDocuments: number;
  verifiedCount: number;
}

interface VoterDocumentsProps {
  voterId: string;
  onUpdate?: () => void;
}

const DOCUMENT_ICONS: Record<string, React.ReactNode> = {
  aadhaar: <FileText className="h-5 w-5 text-blue-600" />,
  pan: <FileText className="h-5 w-5 text-amber-600" />,
  voterId: <FileText className="h-5 w-5 text-green-600" />,
  other: <FileText className="h-5 w-5 text-gray-600" />,
};

export function VoterDocuments({ voterId, onUpdate }: VoterDocumentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<VoterDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Verify dialog with notes
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [documentToVerify, setDocumentToVerify] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  // Check if user can manage documents (L0, L1, L2)
  const canManage = ['L0', 'L1', 'L2'].includes(user?.role || '');

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/voter-documents/${voterId}`);
      if (response.success && response.data) {
        setDocuments(response.data.documents || []);
      }
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (voterId) {
      loadDocuments();
    }
  }, [voterId]);

  const handleView = async (doc: VoterDocument) => {
    // Get presigned download URL from API (bucket is private)
    try {
      setActionLoading(`view-${doc.documentType}`);
      const response = await api.get(`/voter-documents/download/${voterId}/${doc.documentType}`);
      if (response.success && response.data?.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to get document URL',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to open document',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyClick = (documentType: string) => {
    setDocumentToVerify(documentType);
    setVerificationNotes('');
    setVerifyDialogOpen(true);
  };

  const handleVerifyConfirm = async () => {
    if (!documentToVerify) return;

    try {
      setActionLoading(`verify-${documentToVerify}`);
      await api.put(`/voter-documents/${voterId}/${documentToVerify}/verify`, {
        verified: true,
        notes: verificationNotes || undefined,
      });
      toast({
        title: 'Success',
        description: 'Document verified successfully',
      });
      loadDocuments();
      onUpdate?.();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to verify document',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setVerifyDialogOpen(false);
      setDocumentToVerify(null);
    }
  };

  const handleDeleteClick = (documentType: string) => {
    setDocumentToDelete(documentType);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      setActionLoading(`delete-${documentToDelete}`);
      await api.delete(`/voter-documents/${voterId}/${documentToDelete}`);
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
      loadDocuments();
      onUpdate?.();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading documents...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8 text-destructive">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Uploaded Documents
        </h3>
        <div className="text-center py-6 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No documents uploaded yet</p>
          <p className="text-xs mt-1">Documents are uploaded via the mobile app</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Uploaded Documents
          <Badge variant="secondary" className="ml-auto">
            {documents.filter((d) => d.verified).length}/{documents.length} verified
          </Badge>
        </h3>

        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.documentType}
              className={`p-3 rounded-lg border ${
                doc.verified
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-muted/50 border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  {DOCUMENT_ICONS[doc.documentType] || DOCUMENT_ICONS.other}
                  <div>
                    <p className="font-medium text-sm">{doc.documentLabel}</p>
                    <p className="text-xs text-muted-foreground">{doc.originalName}</p>
                    {doc.uploadedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded: {formatDate(doc.uploadedAt)}
                      </p>
                    )}
                  </div>
                </div>

                <Badge variant={doc.verified ? 'default' : 'secondary'}>
                  {doc.verified ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </>
                  )}
                </Badge>
              </div>

              {/* Verification info */}
              {doc.verified && doc.verifiedAt && (
                <div className="mt-2 pt-2 border-t border-green-500/20 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3 inline mr-1" />
                  Verified on {formatDate(doc.verifiedAt)}
                  {doc.verificationNotes && (
                    <p className="mt-1 italic">"{doc.verificationNotes}"</p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleView(doc)}
                  disabled={actionLoading === `view-${doc.documentType}`}
                >
                  {actionLoading === `view-${doc.documentType}` ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <ExternalLink className="h-3 w-3 mr-1" />
                  )}
                  View
                </Button>

                {canManage && !doc.verified && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleVerifyClick(doc.documentType)}
                    disabled={actionLoading === `verify-${doc.documentType}`}
                  >
                    {actionLoading === `verify-${doc.documentType}` ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    Verify
                  </Button>
                )}

                {canManage && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteClick(doc.documentType)}
                    disabled={actionLoading === `delete-${doc.documentType}`}
                  >
                    {actionLoading === `delete-${doc.documentType}` ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Trash2 className="h-3 w-3 mr-1" />
                    )}
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Verify Dialog */}
      <AlertDialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verify Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this document as verified? You can optionally add
              verification notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Verification notes (optional)"
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVerifyConfirm}>Verify Document</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone. The
              document will be permanently removed from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default VoterDocuments;
