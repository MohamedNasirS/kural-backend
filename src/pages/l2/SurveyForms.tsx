import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, FileText, Trash2, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { fetchSurveys, deleteSurvey, Survey, updateSurveyStatus } from '@/lib/surveys';

export const SurveyForms = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [forms, setForms] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    const loadSurveys = async () => {
      setIsLoading(true);
      try {
        const params: { assignedAC?: number } = {};
        if (user?.assignedAC !== undefined && user?.assignedAC !== null) {
          params.assignedAC = user.assignedAC;
        }
        const data = await fetchSurveys(params);
        setForms(data);
      } catch (error) {
        console.error('Failed to load surveys', error);
        toast({
          title: 'Unable to load surveys',
          description: error instanceof Error ? error.message : 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSurveys();
  }, [toast, user?.assignedAC]);
  
  // Filter forms assigned to this moderator's AC
  const filteredForms = forms.filter(form => {
    // If user has no assigned AC (for testing), show all forms
    if (!user?.assignedAC) {
      return true;
    }
    
    // Ensure assignedACs is an array before using includes
    const assignedACs = Array.isArray(form.assignedACs) ? form.assignedACs : [];
    // Show forms assigned to the user's AC
    return assignedACs.includes(user.assignedAC);
  });

  const handleStatusToggle = async (form: Survey, checked: boolean) => {
    const nextStatus = checked ? 'Active' : 'Draft';
    setUpdatingStatusId(form.id);
    try {
      const updated = await updateSurveyStatus(form.id, nextStatus);
      setForms((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
      );
      toast({
        title: 'Status Updated',
        description: `"${updated.title}" is now ${updated.status}.`,
      });
    } catch (error) {
      console.error('Failed to update survey status', error);
      toast({
        title: 'Unable to update status',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleEditForm = (formId: string) => {
    navigate(`/l2/surveys/builder/${formId}`);
  };

  const handleViewForm = (formId: string) => {
    navigate(`/l2/surveys/preview/${formId}`);
  };

  const handleDeleteForm = async (formId: string, formName: string) => {
    try {
      await deleteSurvey(formId);
      setForms((prev) => prev.filter((form) => form.id !== formId));
      toast({
        title: 'Form Deleted',
        description: `"${formName}" has been deleted successfully.`,
      });
    } catch (error) {
      console.error('Failed to delete survey', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Survey Forms</h1>
            <p className="text-muted-foreground">
              Manage survey forms assigned to AC {user?.assignedAC || 'Not assigned'}
            </p>
          </div>
          <Button onClick={() => navigate('/l2/surveys/builder/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Form
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Form Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date Created</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Questions</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Assigned ACs</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Loading surveys...
                    </td>
                  </tr>
                ) : filteredForms.length > 0 ? (
                  filteredForms.map((form) => (
                    <tr key={form.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span>{form.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {form.createdAt ? new Date(form.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">{form.questions.length}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(form.assignedACs) && form.assignedACs.length > 0 ? (
                            form.assignedACs.map(ac => (
                              <span key={ac} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                                {ac}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">No ACs assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              form.status === 'Active'
                                ? 'bg-success/10 text-success'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {form.status}
                          </span>
                          <Switch
                            checked={form.status === 'Active'}
                            onCheckedChange={(checked) => handleStatusToggle(form, Boolean(checked))}
                            disabled={updatingStatusId === form.id}
                            aria-label={`Toggle status for ${form.title}`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditForm(form.id)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewForm(form.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteForm(form.id, form.title)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No forms assigned to your AC yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};