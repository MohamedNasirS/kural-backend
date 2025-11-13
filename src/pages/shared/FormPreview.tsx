import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, ArrowLeft } from 'lucide-react';
import { fetchSurvey, Survey } from '@/lib/surveys';

interface Question {
  id: string;
  text: string;
  type: string;
  required: boolean;
  options?: string[];
}

export const FormPreview = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);

  const isL0 = user?.role === 'L0';
  const isL1 = user?.role === 'L1';
  const isL2 = user?.role === 'L2';

  useEffect(() => {
    if (!formId) {
      setLoading(false);
      return;
    }

    const loadSurvey = async () => {
      setLoading(true);
      try {
        const survey = await fetchSurvey(formId);
        setFormData(survey);
      } catch (error) {
        console.error('Failed to load survey preview', error);
        setFormData(null);
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [formId]);

  const handleBack = () => {
    if (isL0) {
      navigate('/l0/surveys');
    } else if (isL1) {
      navigate('/l1/surveys');
    } else {
      navigate('/l2/surveys');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!formData) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <Card className="p-8 text-center">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Form Not Found</h2>
            <p className="text-muted-foreground">
              The form you're looking for doesn't exist or has been deleted.
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={() => {
            // Navigate to edit mode
            if (isL0) {
              navigate(`/l0/surveys/builder/${formId}`);
            } else if (isL1) {
              navigate(`/l1/surveys/builder/${formId}`);
            } else {
              navigate(`/l2/surveys/builder/${formId}`);
            }
          }}>
            Edit Form
          </Button>
        </div>

        <Card className="p-6">
          <div className="space-y-2 mb-6">
            <h1 className="text-3xl font-bold">{formData.title}</h1>
            <p className="text-muted-foreground">{formData.description}</p>
          </div>

          {formData.assignedACs && formData.assignedACs.length > 0 && (
            <div className="mb-6">
              <Label className="text-sm font-medium">Assigned Constituencies</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.assignedACs.map((ac, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    AC {ac}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Questions</h2>
            {formData.questions.length > 0 ? (
              <div className="space-y-4">
                {formData.questions.map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="flex items-start">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-medium mr-3 mt-1">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{question.text}</h3>
                          {question.required && (
                            <span className="text-xs text-destructive">*</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Type: {question.type.replace('-', ' ')}
                        </div>
                        {question.options && question.options.length > 0 && (
                          <div className="mt-2">
                            <ul className="list-disc list-inside text-sm space-y-1">
                              {question.options.map((option, optIndex) => (
                                <li key={optIndex}>{option}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                This form doesn't have any questions yet.
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};