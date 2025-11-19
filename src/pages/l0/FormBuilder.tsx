import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Save, Link2, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { createSurvey, fetchSurvey, updateSurvey, SurveyStatus } from '@/lib/surveys';
import { fetchMasterSections, MasterQuestion } from '@/lib/masterData';

const constituencies = [
  { number: 101, name: 'Dharapuram (SC)' },
  { number: 102, name: 'Kangayam' },
  { number: 108, name: 'Udhagamandalam' },
  { number: 109, name: 'Gudalur (SC)' },
  { number: 110, name: 'Coonoor' },
  { number: 111, name: 'Mettupalayam' },
  { number: 112, name: 'Avanashi (SC)' },
  { number: 113, name: 'Tiruppur North' },
  { number: 114, name: 'Tiruppur South' },
  { number: 115, name: 'Palladam' },
  { number: 116, name: 'Sulur' },
  { number: 117, name: 'Kavundampalayam' },
  { number: 118, name: 'Coimbatore North' },
  { number: 119, name: 'Thondamuthur' },
  { number: 120, name: 'Coimbatore South' },
  { number: 121, name: 'Singanallur' },
  { number: 122, name: 'Kinathukadavu' },
  { number: 123, name: 'Pollachi' },
  { number: 124, name: 'Valparai (SC)' },
  { number: 125, name: 'Udumalaipettai' },
  { number: 126, name: 'Madathukulam' },
];

interface OptionMapping {
  surveyOptionIndex: number;
  masterQuestionId: string;
  masterOptionValue: string;
}

interface Question {
  id: string;
  text: string;
  type: 'multiple-choice';
  required: boolean;
  options?: string[];
  optionMappings?: OptionMapping[];
}

interface FormData {
  title: string;
  description: string;
  questions: Question[];
  assignedACs: number[];
  status: SurveyStatus;
}

export const FormBuilder = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const resolvedFormId = formId ?? 'new';
  const isNewForm = resolvedFormId === 'new';
  const redirectPath =
    user?.role === 'L0' ? '/l0/surveys' : user?.role === 'L1' ? '/l1/surveys' : '/l2/surveys';

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    assignedACs: [],
    questions: [],
    status: 'Draft',
  });
  const [isLoading, setIsLoading] = useState(!isNewForm);
  const [isSaving, setIsSaving] = useState(false);
  const [masterQuestions, setMasterQuestions] = useState<MasterQuestion[]>([]);
  const [loadingMasterQuestions, setLoadingMasterQuestions] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    const loadMasterQuestions = async () => {
      try {
        setLoadingMasterQuestions(true);
        const sections = await fetchMasterSections();
        const defaultSection = sections.find((s) => s.name === "Default Master Questions") || sections[0];
        if (defaultSection) {
          const questions = defaultSection.questions
            .filter((q) => q.type === "multiple-choice" && q.isVisible)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setMasterQuestions(questions);
        }
      } catch (error) {
        console.error('Failed to load master questions', error);
      } finally {
        setLoadingMasterQuestions(false);
      }
    };

    loadMasterQuestions();
  }, []);

  useEffect(() => {
    if (isNewForm) {
      setIsLoading(false);
      setFormData({
        title: '',
        description: '',
        assignedACs: [],
        questions: [],
        status: 'Draft',
      });
      return;
    }

    const loadSurvey = async () => {
      setIsLoading(true);
      try {
        const survey = await fetchSurvey(resolvedFormId);
        setFormData({
          title: survey.title ?? '',
          description: survey.description ?? '',
          assignedACs: Array.isArray(survey.assignedACs) ? survey.assignedACs : [],
          questions: (survey.questions ?? []).map((q) => ({
            ...q,
            type: 'multiple-choice' as const,
            optionMappings: (q as any).optionMappings || undefined,
          })),
          status: survey.status ?? 'Draft',
        });
      } catch (error) {
        console.error('Failed to load survey form', error);
        toast({
          title: 'Unable to load form',
          description: error instanceof Error ? error.message : 'Please try again later.',
          variant: 'destructive',
        });
        navigate(redirectPath);
      } finally {
        setIsLoading(false);
      }
    };

    loadSurvey();
  }, [isNewForm, resolvedFormId, navigate, redirectPath, toast]);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      type: 'multiple-choice',
      required: false,
      options: ['Option 1', 'Option 2'],
      optionMappings: [],
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion],
    });
  };

  const importMasterQuestion = (masterQuestion: MasterQuestion) => {
    // Create survey options from master question options
    const surveyOptions = masterQuestion.options.map(opt => opt.label || opt.value);
    
    // Auto-map each survey option to its corresponding master option
    const autoMappings: OptionMapping[] = masterQuestion.options.map((opt, index) => ({
      surveyOptionIndex: index,
      masterQuestionId: masterQuestion.id,
      masterOptionValue: opt.value || opt.label,
    }));

    const importedQuestion: Question = {
      id: Date.now().toString(),
      text: masterQuestion.prompt,
      type: 'multiple-choice',
      required: masterQuestion.isRequired || false,
      options: surveyOptions,
      optionMappings: autoMappings,
    };

    setFormData({
      ...formData,
      questions: [...formData.questions, importedQuestion],
    });

    setImportDialogOpen(false);
    toast({
      title: 'Question imported',
      description: `"${masterQuestion.prompt}" has been imported with auto-mapped options.`,
    });
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setFormData({
      ...formData,
      questions: formData.questions.map(q => 
        q.id === id ? { ...q, ...updates } : q
      ),
    });
  };

  const deleteQuestion = (id: string) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter(q => q.id !== id),
    });
  };

  const addOption = (questionId: string) => {
    const question = formData.questions.find(q => q.id === questionId);
    if (!question) return;
    
    const newOptions = [...(question.options || []), ''];
    updateQuestion(questionId, { options: newOptions });
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = formData.questions.find(q => q.id === questionId);
    if (!question || !question.options) return;
    
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    
    // Preserve mappings - don't clear them when option text changes
    // User can still edit the mapping if needed
    updateQuestion(questionId, { options: newOptions });
  };

  const updateOptionMapping = (
    questionId: string,
    optionIndex: number,
    masterQuestionId: string | null,
    masterOptionValue: string | null
  ) => {
    const question = formData.questions.find(q => q.id === questionId);
    if (!question) return;

    let updatedMappings = [...(question.optionMappings || [])];
    
    // Remove existing mapping for this option
    updatedMappings = updatedMappings.filter(m => m.surveyOptionIndex !== optionIndex);
    
    // Add new mapping if provided
    if (masterQuestionId && masterOptionValue) {
      updatedMappings.push({
        surveyOptionIndex: optionIndex,
        masterQuestionId,
        masterOptionValue,
      });
    }
    
    updateQuestion(questionId, { optionMappings: updatedMappings });
  };

  const deleteOption = (questionId: string, optionIndex: number) => {
    const question = formData.questions.find(q => q.id === questionId);
    if (!question || !question.options) return;
    
    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    
    // Remove mappings for deleted option and adjust indices for options after it
    const updatedMappings = (question.optionMappings || [])
      .filter(m => m.surveyOptionIndex !== optionIndex)
      .map(m => ({
        ...m,
        surveyOptionIndex: m.surveyOptionIndex > optionIndex 
          ? m.surveyOptionIndex - 1 
          : m.surveyOptionIndex
      }));
    
    updateQuestion(questionId, { options: newOptions, optionMappings: updatedMappings });
  };

  const toggleAC = (acNumber: number) => {
    setFormData(prev => ({
      ...prev,
      assignedACs: prev.assignedACs.includes(acNumber)
        ? prev.assignedACs.filter(n => n !== acNumber)
        : [...prev.assignedACs, acNumber]
    }));
  };

  const handleSave = async () => {
    const title = formData.title.trim() || 'Untitled Form';
    const normalizedQuestions = formData.questions.map((question, index) => {
      const trimmedOptions = (question.options ?? [])
        .map((option) => option.trim())
        .filter((option) => option.length > 0);

      if (trimmedOptions.length === 0) {
        toast({
          title: 'Question options required',
          description: `Question ${index + 1} must have at least one option.`,
          variant: 'destructive',
        });
        throw new Error('Validation failed');
      }

      const result = {
        ...question,
        text: question.text.trim() || `Question ${index + 1}`,
        options: trimmedOptions,
      };
      
      // Always include optionMappings if it exists (even if empty array)
      if (question.optionMappings !== undefined) {
        result.optionMappings = question.optionMappings;
      }
      
      return result;
    });

    if (!formData.assignedACs.length) {
      toast({
        title: 'Select constituencies',
        description: 'Assign the form to at least one assembly constituency.',
        variant: 'destructive',
      });
      return;
    }

    if (normalizedQuestions.length === 0) {
      toast({
        title: 'Add at least one question',
        description: 'Please create a question before saving the survey form.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      title,
      description: formData.description,
      status: formData.status,
      questions: normalizedQuestions,
      assignedACs: formData.assignedACs,
      createdBy: isNewForm ? user?.id : undefined,
      createdByRole: isNewForm ? user?.role : undefined,
    };

    setIsSaving(true);
    try {
      // Debug: Log the payload to see if optionMappings are included
      console.log('Saving survey with payload:', JSON.stringify(payload, null, 2));
      
      if (isNewForm) {
        const created = await createSurvey(payload);
        console.log('Created survey:', JSON.stringify(created, null, 2));
        toast({
          title: 'Form Created',
          description: `"${title}" has been created successfully.`,
        });
      } else {
        const updated = await updateSurvey(resolvedFormId, payload);
        console.log('Updated survey:', JSON.stringify(updated, null, 2));
        toast({
          title: 'Form Updated',
          description: `"${title}" has been updated successfully.`,
        });
      }
      navigate(redirectPath);
    } catch (error) {
      console.error('Failed to save survey form', error);
      toast({
        title: 'Unable to save form',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">
              {isNewForm ? 'Create New Form' : 'Edit Form'}
            </h1>
            <p className="text-muted-foreground">Build your survey form</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(redirectPath)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Form'}
            </Button>
          </div>
        </div>

        {/* Form Details */}
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="formTitle">Form Title</Label>
            <Input
              id="formTitle"
              placeholder="e.g., Voter Intake Form 2025"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="text-lg font-semibold"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="formDescription">Form Description</Label>
            <Textarea
              id="formDescription"
              placeholder="Describe the purpose of this form..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
        </Card>

        {/* Status */}
        <Card className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Survey Status</h2>
            <p className="text-sm text-muted-foreground">
              Toggle to publish the survey immediately or keep it in draft.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Switch
              id="surveyStatus"
              checked={formData.status === 'Active'}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  status: checked ? 'Active' : 'Draft',
                }))
              }
            />
            <Label htmlFor="surveyStatus" className="text-sm font-medium uppercase tracking-wide">
              {formData.status}
            </Label>
          </div>
        </Card>

        {/* AC Assignment */}
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Assign to Assembly Constituencies</Label>
            <p className="text-sm text-muted-foreground">
              Select which constituencies will have access to this form
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-4 border rounded-md">
            {constituencies.map((ac) => (
              <div key={ac.number} className="flex items-center space-x-2">
                <Checkbox
                  id={`ac-${ac.number}`}
                  checked={formData.assignedACs.includes(ac.number)}
                  onCheckedChange={() => toggleAC(ac.number)}
                />
                <label
                  htmlFor={`ac-${ac.number}`}
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {ac.number} - {ac.name}
                </label>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {formData.assignedACs.length} constituency(ies) selected
          </p>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          {formData.questions.map((question, index) => (
            <Card key={question.id} className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-3 cursor-move">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label>Question {index + 1}</Label>
                    <Input
                      placeholder="Enter your question"
                      value={question.text}
                      onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                    />
                  </div>

                  {/* Options for Multiple Choice */}
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <Label className="text-sm text-muted-foreground">Answer Options</Label>
                    {question.options?.map((option, optionIndex) => {
                      const optionLabel = String.fromCharCode(65 + optionIndex); // A, B, C, etc.
                      const currentMapping = question.optionMappings?.find(
                        m => m.surveyOptionIndex === optionIndex
                      );
                      const mappedMasterQuestion = currentMapping
                        ? masterQuestions.find(q => q.id === currentMapping.masterQuestionId)
                        : null;
                      
                      return (
                        <div key={optionIndex} className="space-y-2 p-3 border rounded-md">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Option {optionLabel}:
                                </span>
                              </div>
                              <Input
                                placeholder={`Option ${optionIndex + 1}`}
                                value={option}
                                onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteOption(question.id, optionIndex)}
                              disabled={question.options && question.options.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Option Mapping to Master Question */}
                          <div className="space-y-2 mt-2 pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <Link2 className="h-3 w-3 text-muted-foreground" />
                              <Label className="text-xs text-muted-foreground">
                                Map to Master Question Option:
                              </Label>
                            </div>
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <Select
                                  value={currentMapping?.masterQuestionId || undefined}
                                  onValueChange={(masterQuestionId) => {
                                    const masterQ = masterQuestions.find(q => q.id === masterQuestionId);
                                    if (masterQ && masterQ.options.length > 0) {
                                      // Auto-select first option
                                      updateOptionMapping(
                                        question.id,
                                        optionIndex,
                                        masterQuestionId,
                                        masterQ.options[0].value || masterQ.options[0].label
                                      );
                                    } else {
                                      updateOptionMapping(question.id, optionIndex, masterQuestionId, null);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs flex-1">
                                    <SelectValue placeholder="Select master question" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {masterQuestions.map((mq) => (
                                      <SelectItem key={mq.id} value={mq.id}>
                                        {mq.prompt}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {currentMapping && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => updateOptionMapping(question.id, optionIndex, null, null)}
                                    title="Clear mapping"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              
                              {currentMapping && mappedMasterQuestion && (
                                <Select
                                  value={currentMapping.masterOptionValue || undefined}
                                  onValueChange={(masterOptionValue) => {
                                    updateOptionMapping(
                                      question.id,
                                      optionIndex,
                                      currentMapping.masterQuestionId,
                                      masterOptionValue
                                    );
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs w-full">
                                    <SelectValue placeholder="Select option" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {mappedMasterQuestion.options.map((opt, optIdx) => {
                                      const optLabel = String.fromCharCode(65 + optIdx);
                                      const optValue = opt.value || opt.label;
                                      // Ensure value is not empty string
                                      if (!optValue) return null;
                                      return (
                                        <SelectItem key={opt.id || optValue || optIdx} value={optValue}>
                                          Option {optLabel}: {opt.label || opt.value}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            {currentMapping && mappedMasterQuestion && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                <span>
                                  Mapped to: {mappedMasterQuestion.prompt} → {
                                    mappedMasterQuestion.options.find(
                                      opt => (opt.value || opt.label) === currentMapping.masterOptionValue
                                    )?.label || currentMapping.masterOptionValue
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(question.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Option
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`required-${question.id}`}
                        checked={question.required}
                        onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                      />
                      <Label htmlFor={`required-${question.id}`} className="text-sm">
                        Required
                      </Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Add Question Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={addQuestion}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setImportDialogOpen(true)}
            disabled={masterQuestions.length === 0 || loadingMasterQuestions}
          >
            <Download className="mr-2 h-4 w-4" />
            Import from Master Data
          </Button>
        </div>
      </div>

      {/* Import Master Question Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Import Question from Master Data</DialogTitle>
            <DialogDescription>
              Select a master question to import. The question and options will be pre-filled, and mappings will be automatically configured.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {loadingMasterQuestions ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading master questions...</p>
              </div>
            ) : masterQuestions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No master questions available.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create master questions in the Master Data page first.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {masterQuestions.map((masterQ) => (
                  <Card
                    key={masterQ.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => importMasterQuestion(masterQ)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base font-semibold mb-2">
                            {masterQ.prompt}
                          </CardTitle>
                          {masterQ.helperText && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {masterQ.helperText}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            {masterQ.isRequired && (
                              <Badge variant="secondary" className="text-xs">
                                Required
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {masterQ.options.length} option(s)
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            importMasterQuestion(masterQ);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Options:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {masterQ.options.map((opt, idx) => {
                            const optionLabel = String.fromCharCode(65 + idx);
                            return (
                              <Badge key={opt.id || opt.value || idx} variant="outline" className="text-xs">
                                {optionLabel}: {opt.label || opt.value}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};


