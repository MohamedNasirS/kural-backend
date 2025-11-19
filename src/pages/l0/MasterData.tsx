import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  addMasterQuestion,
  deleteMasterQuestion,
  fetchMasterSections,
  MasterQuestion,
  MasterSection,
  updateMasterQuestion,
} from "@/lib/masterData";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PenLine, Plus, Trash2 } from "lucide-react";

type QuestionFormState = {
  prompt: string;
  isRequired: boolean;
  isVisible: boolean;
  helperText: string;
  options: string[];
};

const defaultQuestionForm: QuestionFormState = {
  prompt: "",
  isRequired: false,
  isVisible: true,
  helperText: "",
  options: ["", ""],
};

export const MasterData = () => {
  const { toast } = useToast();
  const [defaultSection, setDefaultSection] = useState<MasterSection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(defaultQuestionForm);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  useEffect(() => {
    loadDefaultSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDefaultSection = async () => {
    try {
      setIsLoading(true);
      const sections = await fetchMasterSections();
      // Find or use the first section as default, or create a default one
      let section = sections.find((s) => s.name === "Default Master Questions") || sections[0];
      
      if (!section && sections.length > 0) {
        section = sections[0];
      }
      
      setDefaultSection(section || null);
    } catch (error) {
      console.error("Failed to load master data", error);
      toast({
        title: "Unable to fetch master data",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const allQuestions = useMemo(() => {
    if (!defaultSection) return [];
    return [...defaultSection.questions]
      .filter((q) => q.type === "multiple-choice")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [defaultSection]);

  const handleOpenQuestionDialog = (question?: MasterQuestion) => {
    if (!defaultSection) {
      toast({
        title: "No default section",
        description: "Please ensure a default section exists.",
        variant: "destructive",
      });
      return;
    }

    if (question) {
      setEditingQuestionId(question.id);
      setQuestionForm({
        prompt: question.prompt,
        isRequired: question.isRequired,
        isVisible: question.isVisible ?? true,
        helperText: question.helperText || "",
        options: question.options.map((option) => option.label || option.value || ""),
      });
    } else {
      setEditingQuestionId(null);
      setQuestionForm(defaultQuestionForm);
    }
    setQuestionDialogOpen(true);
  };

  const handleQuestionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!defaultSection) {
      toast({
        title: "Missing section",
        description: "Default section not found. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    const trimmedPrompt = questionForm.prompt.trim();
    if (!trimmedPrompt) {
      toast({
        title: "Question prompt required",
        description: "Please provide a prompt for this question.",
        variant: "destructive",
      });
      return;
    }

    const normalizedOptions = questionForm.options.map((option) => option.trim()).filter(Boolean);

    if (normalizedOptions.length === 0) {
      toast({
        title: "Add answer options",
        description: "Multiple choice questions need at least one answer option.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingQuestion(true);
    try {
      const payload = {
        prompt: trimmedPrompt,
        type: "multiple-choice" as const,
        isRequired: questionForm.isRequired,
        isVisible: questionForm.isVisible,
        helperText: questionForm.helperText.trim() || undefined,
        options: normalizedOptions,
      };

      let updatedSection: MasterSection;
      if (editingQuestionId) {
        const response = await updateMasterQuestion(defaultSection.id, editingQuestionId, payload);
        updatedSection = response.section;
      } else {
        const response = await addMasterQuestion(defaultSection.id, payload);
        updatedSection = response.section;
      }

      setDefaultSection(updatedSection);

      toast({
        title: editingQuestionId ? "Question updated" : "Question added",
        description: `"${payload.prompt}" saved successfully.`,
      });

      setQuestionDialogOpen(false);
      setEditingQuestionId(null);
      setQuestionForm(defaultQuestionForm);
    } catch (error) {
      console.error("Failed to save question", error);
      toast({
        title: "Unable to save question",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (question: MasterQuestion) => {
    if (!defaultSection) return;
    
    const confirmed = window.confirm(`Delete question "${question.prompt}"?`);
    if (!confirmed) return;

    try {
      const updatedSection = await deleteMasterQuestion(defaultSection.id, question.id);
      setDefaultSection(updatedSection);
      toast({
        title: "Question deleted",
        description: `"${question.prompt}" removed successfully.`,
      });
    } catch (error) {
      console.error("Failed to delete question", error);
      toast({
        title: "Unable to delete question",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleToggleQuestionVisibility = async (question: MasterQuestion) => {
    if (!defaultSection) return;
    
    try {
      const response = await updateMasterQuestion(defaultSection.id, question.id, {
        isVisible: !question.isVisible,
      });
      setDefaultSection(response.section);
      toast({
        title: question.isVisible ? "Question hidden" : "Question shown",
        description: `"${question.prompt}" visibility updated.`,
      });
    } catch (error) {
      console.error("Failed to toggle question visibility", error);
      toast({
        title: "Unable to update visibility",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const renderQuestionCard = (question: MasterQuestion) => (
    <Card key={question.id} className="border-muted">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">{question.prompt}</CardTitle>
          <p className="text-sm text-muted-foreground">Multiple choice</p>
        </div>
        <div className="flex items-center gap-2">
          {question.isRequired && <Badge variant="secondary">Required</Badge>}
          {!question.isVisible && <Badge variant="outline">Hidden</Badge>}
          <Switch
            checked={question.isVisible}
            onCheckedChange={() => handleToggleQuestionVisibility(question)}
            aria-label={`Toggle visibility for ${question.prompt}`}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenQuestionDialog(question)}
            aria-label={`Edit ${question.prompt}`}
          >
            <PenLine className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteQuestion(question)}
            aria-label={`Delete ${question.prompt}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {question.helperText && (
          <p className="text-sm text-muted-foreground">{question.helperText}</p>
        )}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Answer options
          </p>
          <div className="flex flex-wrap gap-2">
            {question.options.map((option, idx) => {
              const optionLabel = String.fromCharCode(65 + idx); // A, B, C, etc.
              return (
                <Badge key={option.id ?? option.value ?? idx} variant="outline">
                  {optionLabel}: {option.label || option.value}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderQuestions = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mb-2" />
          Loading master data questions...
        </div>
      );
    }

    if (!defaultSection) {
      return (
        <div className="text-center py-16 space-y-3">
          <p className="text-xl font-semibold">No default section found</p>
          <p className="text-muted-foreground">
            Please ensure a default master data section exists in the system.
          </p>
        </div>
      );
    }

    if (allQuestions.length === 0) {
      return (
        <div className="text-center py-16 space-y-3">
          <p className="text-xl font-semibold">No questions yet</p>
          <p className="text-muted-foreground">
            Create your first master data question to get started.
          </p>
          <Button onClick={() => handleOpenQuestionDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {allQuestions.map((question) => renderQuestionCard(question))}
      </div>
    );
  };

  const questionOptionsFields = (
    <div className="space-y-3">
      <Label>Answer options</Label>
      {questionForm.options.map((option, index) => (
        <div key={index} className="flex gap-2">
          <Input
            placeholder={`Option ${index + 1}`}
            value={option}
            onChange={(event) => {
              const value = event.target.value;
              setQuestionForm((prev) => {
                const next = [...prev.options];
                next[index] = value;
                return { ...prev, options: next };
              });
            }}
          />
          {questionForm.options.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setQuestionForm((prev) => ({
                  ...prev,
                  options: prev.options.filter((_, optIndex) => optIndex !== index),
                }))
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setQuestionForm((prev) => ({
            ...prev,
            options: [...prev.options, ""],
          }))
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Option
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Master Data</h1>
            <p className="text-muted-foreground">
              Create reusable multiple-choice questions to power survey forms.
            </p>
          </div>
          <Button onClick={() => handleOpenQuestionDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>

        {renderQuestions()}
      </div>

      <Dialog
        open={questionDialogOpen}
        onOpenChange={(open) => {
          setQuestionDialogOpen(open);
          if (!open) {
            setQuestionForm(defaultQuestionForm);
            setEditingQuestionId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingQuestionId ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>Create a multiple-choice question with answer options.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuestionSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question-prompt">Question Prompt</Label>
              <Input
                id="question-prompt"
                placeholder="e.g. What is your primary occupation?"
                required
                value={questionForm.prompt}
                onChange={(event) =>
                  setQuestionForm((prev) => ({ ...prev, prompt: event.target.value }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-4">
              <div className="space-y-0.5">
                <Label className="text-base">Required</Label>
                <p className="text-sm text-muted-foreground">
                  Mark question as mandatory for respondents.
                </p>
              </div>
              <Switch
                checked={questionForm.isRequired}
                onCheckedChange={(checked) =>
                  setQuestionForm((prev) => ({ ...prev, isRequired: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-4">
              <div className="space-y-0.5">
                <Label className="text-base">Visible</Label>
                <p className="text-sm text-muted-foreground">
                  Show this question in the master data list.
                </p>
              </div>
              <Switch
                checked={questionForm.isVisible}
                onCheckedChange={(checked) =>
                  setQuestionForm((prev) => ({ ...prev, isVisible: checked }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="question-helper">Helper Text</Label>
              <Textarea
                id="question-helper"
                placeholder="Add optional context or instructions"
                value={questionForm.helperText}
                onChange={(event) =>
                  setQuestionForm((prev) => ({ ...prev, helperText: event.target.value }))
                }
              />
            </div>
            {questionOptionsFields}
            <DialogFooter>
              <Button type="submit" disabled={isSavingQuestion}>
                {isSavingQuestion && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingQuestionId ? "Save Question" : "Add Question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MasterData;


