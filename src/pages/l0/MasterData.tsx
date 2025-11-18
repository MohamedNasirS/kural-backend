import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  addMasterQuestion,
  createMasterSection,
  deleteMasterQuestion,
  deleteMasterSection,
  fetchMasterSections,
  MasterQuestion,
  MasterQuestionType,
  MasterSection,
  updateMasterQuestion,
  updateMasterSection,
} from "@/lib/masterData";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, PenLine, Plus, Trash2 } from "lucide-react";
import { CONSTITUENCIES } from "@/constants/constituencies";

type SectionFormState = {
  name: string;
  description: string;
  aci_id: number[];
  aci_name: string[];
  isVisible: boolean;
};

type QuestionFormState = {
  prompt: string;
  type: MasterQuestionType;
  isRequired: boolean;
  isVisible: boolean;
  helperText: string;
  options: string[];
};

const defaultQuestionForm: QuestionFormState = {
  prompt: "",
  type: "short-answer",
  isRequired: false,
  isVisible: true,
  helperText: "",
  options: ["", ""],
};

export const MasterData = () => {
  const { toast } = useToast();
  const [sections, setSections] = useState<MasterSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState<SectionFormState>({ 
    name: "", 
    description: "", 
    aci_id: [], 
    aci_name: [], 
    isVisible: true 
  });
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [isSavingSection, setIsSavingSection] = useState(false);

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(defaultQuestionForm);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  useEffect(() => {
    loadSections();
  }, []);

  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });
  }, [sections]);

  const loadSections = async () => {
    try {
      setIsLoading(true);
      const data = await fetchMasterSections();
      setSections(data);
    } catch (error) {
      console.error("Failed to load master data sections", error);
      toast({
        title: "Unable to fetch master data",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateSection = () => {
    setSectionForm({ name: "", description: "", aci_id: [], aci_name: [], isVisible: true });
    setEditingSectionId(null);
    setSectionDialogOpen(true);
  };

  const handleEditSection = (section: MasterSection) => {
    setSectionForm({
      name: section.name,
      description: section.description || "",
      aci_id: Array.isArray(section.aci_id) ? section.aci_id : [],
      aci_name: Array.isArray(section.aci_name) ? section.aci_name : [],
      isVisible: section.isVisible ?? true,
    });
    setEditingSectionId(section.id);
    setSectionDialogOpen(true);
  };

  const handleSectionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingSection(true);
    try {
      const payload = {
        name: sectionForm.name.trim(),
        description: sectionForm.description.trim() || undefined,
        aci_id: sectionForm.aci_id,
        aci_name: sectionForm.aci_name,
        isVisible: sectionForm.isVisible,
      };
      
      console.log("Submitting section payload:", payload);

      let updatedSection: MasterSection;
      if (editingSectionId) {
        updatedSection = await updateMasterSection(editingSectionId, payload);
      } else {
        updatedSection = await createMasterSection(payload);
      }

      setSections((prev) => {
        const exists = prev.some((section) => section.id === updatedSection.id);
        if (exists) {
          return prev
            .map((section) => (section.id === updatedSection.id ? updatedSection : section))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
        return [...prev, updatedSection];
      });

      toast({
        title: editingSectionId ? "Section updated" : "Section created",
        description: `"${updatedSection.name}" saved successfully.`,
      });

      setSectionDialogOpen(false);
      setEditingSectionId(null);
      setSectionForm({ name: "", description: "", aci_id: [], aci_name: [], isVisible: true });
    } catch (error) {
      console.error("Failed to save section", error);
      toast({
        title: "Unable to save section",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSection(false);
    }
  };

  const handleDeleteSection = async (section: MasterSection) => {
    const confirmed = window.confirm(
      `Delete section "${section.name}" and all its questions? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteMasterSection(section.id);
      setSections((prev) => prev.filter((item) => item.id !== section.id));
      toast({
        title: "Section deleted",
        description: `"${section.name}" removed successfully.`,
      });
    } catch (error) {
      console.error("Failed to delete section", error);
      toast({
        title: "Unable to delete section",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleOpenQuestionDialog = (sectionId: string, question?: MasterQuestion) => {
    setActiveSectionId(sectionId);
    if (question) {
      setEditingQuestionId(question.id);
      setQuestionForm({
        prompt: question.prompt,
        type: question.type,
        isRequired: question.isRequired,
        isVisible: question.isVisible ?? true,
        helperText: question.helperText || "",
        options:
          question.type === "multiple-choice"
            ? question.options.map((option) => option.label || option.value || "")
            : ["", ""],
      });
    } else {
      setEditingQuestionId(null);
      setQuestionForm(defaultQuestionForm);
    }
    setQuestionDialogOpen(true);
  };

  const handleQuestionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeSectionId) {
      toast({
        title: "Missing section",
        description: "Select a section before adding questions.",
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

    const normalizedOptions =
      questionForm.type === "multiple-choice"
        ? questionForm.options.map((option) => option.trim()).filter(Boolean)
        : [];

    if (questionForm.type === "multiple-choice" && normalizedOptions.length === 0) {
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
        type: questionForm.type,
        isRequired: questionForm.isRequired,
        isVisible: questionForm.isVisible,
        helperText: questionForm.helperText.trim() || undefined,
        options: questionForm.type === "multiple-choice" ? normalizedOptions : undefined,
      };

      let updatedSection: MasterSection;
      if (editingQuestionId) {
        const response = await updateMasterQuestion(activeSectionId, editingQuestionId, payload);
        updatedSection = response.section;
      } else {
        const response = await addMasterQuestion(activeSectionId, payload);
        updatedSection = response.section;
      }

      setSections((prev) =>
        prev.map((section) => (section.id === updatedSection.id ? updatedSection : section)),
      );

      toast({
        title: editingQuestionId ? "Question updated" : "Question added",
        description: `"${payload.prompt}" saved successfully.`,
      });

      setQuestionDialogOpen(false);
      setEditingQuestionId(null);
      setActiveSectionId(null);
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

  const handleDeleteQuestion = async (sectionId: string, question: MasterQuestion) => {
    const confirmed = window.confirm(`Delete question "${question.prompt}"?`);
    if (!confirmed) return;

    try {
      const updatedSection = await deleteMasterQuestion(sectionId, question.id);
      setSections((prev) =>
        prev.map((section) => (section.id === updatedSection.id ? updatedSection : section)),
      );
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

  const handleToggleQuestionVisibility = async (sectionId: string, question: MasterQuestion) => {
    try {
      const updatedSection = await updateMasterQuestion(sectionId, question.id, {
        isVisible: !question.isVisible,
      });
      setSections((prev) =>
        prev.map((section) => (section.id === updatedSection.section.id ? updatedSection.section : section)),
      );
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

  const handleToggleSectionVisibility = async (section: MasterSection) => {
    try {
      const updatedSection = await updateMasterSection(section.id, {
        isVisible: !section.isVisible,
      });
      setSections((prev) =>
        prev.map((s) => (s.id === updatedSection.id ? updatedSection : s)),
      );
      toast({
        title: section.isVisible ? "Section hidden" : "Section shown",
        description: `"${section.name}" visibility updated.`,
      });
    } catch (error) {
      console.error("Failed to toggle section visibility", error);
      toast({
        title: "Unable to update visibility",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const renderQuestionCard = (section: MasterSection, question: MasterQuestion) => (
    <Card key={question.id} className="border-muted">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">{question.prompt}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {question.type === "short-answer" ? "Short answer" : "Multiple choice"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {question.isRequired && <Badge variant="secondary">Required</Badge>}
          {!question.isVisible && <Badge variant="outline">Hidden</Badge>}
          <Switch
            checked={question.isVisible}
            onCheckedChange={() => handleToggleQuestionVisibility(section.id, question)}
            aria-label={`Toggle visibility for ${question.prompt}`}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenQuestionDialog(section.id, question)}
            aria-label={`Edit ${question.prompt}`}
          >
            <PenLine className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteQuestion(section.id, question)}
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
        {question.type === "multiple-choice" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Answer options
            </p>
            <div className="flex flex-wrap gap-2">
              {question.options.map((option) => (
                <Badge key={option.id ?? option.value} variant="outline">
                  {option.label || option.value}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSections = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mb-2" />
          Loading master data...
        </div>
      );
    }

    if (!sortedSections.length) {
      return (
        <div className="text-center py-16 space-y-3">
          <p className="text-xl font-semibold">No sections yet</p>
          <p className="text-muted-foreground">
            Organize your question bank by creating your first section.
          </p>
          <Button onClick={handleOpenCreateSection}>
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>
      );
    }

    return (
      <Accordion type="multiple" className="space-y-4">
        {sortedSections.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 text-left">
              <div className="flex flex-col gap-2 text-left w-full">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-lg font-semibold">{section.name}</span>
                  <Badge variant="outline">{section.questions.length} questions</Badge>
                  {Array.isArray(section.aci_name) && section.aci_name.length > 0 && (
                    <>
                      {section.aci_name.map((name, index) => (
                        <Badge key={`${section.aci_id[index]}-${index}`} variant="secondary">
                          AC: {section.aci_id[index]} - {name}
                        </Badge>
                      ))}
                    </>
                  )}
                  {!section.isVisible && <Badge variant="outline">Hidden</Badge>}
                </div>
                {section.description && (
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <Button variant="outline" onClick={() => handleEditSection(section)}>
                    <PenLine className="mr-2 h-4 w-4" />
                    Edit Section
                  </Button>
                  <Button variant="outline" onClick={() => handleOpenQuestionDialog(section.id)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                    <Label htmlFor={`section-visibility-${section.id}`} className="text-sm">
                      Visible
                    </Label>
                    <Switch
                      id={`section-visibility-${section.id}`}
                      checked={section.isVisible}
                      onCheckedChange={() => handleToggleSectionVisibility(section)}
                    />
                  </div>
                  <Button variant="destructive" onClick={() => handleDeleteSection(section)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Section
                  </Button>
                </div>
                <Separator />
                <div className="space-y-3">
                  {section.questions.length
                    ? section.questions
                        .slice()
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                        .map((question) => renderQuestionCard(section, question))
                    : (
                      <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
                        No questions yet. Add your first question to this section.
                      </div>
                    )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  const questionOptionsFields =
    questionForm.type === "multiple-choice" ? (
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
    ) : null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Master Data</h1>
            <p className="text-muted-foreground">
              Create reusable sections and questions to power other workflows.
            </p>
          </div>
          <Button onClick={handleOpenCreateSection}>
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>

        {renderSections()}
      </div>

      <Dialog
        open={sectionDialogOpen}
        onOpenChange={(open) => {
          setSectionDialogOpen(open);
          if (!open) {
            setEditingSectionId(null);
            setSectionForm({ name: "", description: "", aci_id: [], aci_name: [], isVisible: true });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSectionId ? "Edit Section" : "Create Section"}</DialogTitle>
            <DialogDescription>Group related questions under descriptive sections.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSectionSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="section-name">Section Name</Label>
              <Input
                id="section-name"
                placeholder="e.g. Family Background"
                required
                value={sectionForm.name}
                onChange={(event) =>
                  setSectionForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-description">Description</Label>
              <Textarea
                id="section-description"
                placeholder="Optional details about this section"
                value={sectionForm.description}
                onChange={(event) =>
                  setSectionForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Assembly Constituencies (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Select one or more constituencies to assign this section to.
              </p>
              <div className="max-h-60 overflow-y-auto border rounded-md p-4 space-y-2">
                {CONSTITUENCIES.map((constituency) => {
                  const isSelected = sectionForm.aci_id.includes(constituency.number);
                  return (
                    <div key={constituency.number} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`aci-${constituency.number}`}
                        checked={isSelected}
                        onChange={(e) => {
                          setSectionForm((prev) => {
                            const currentIndex = prev.aci_id.indexOf(constituency.number);
                            if (e.target.checked && currentIndex === -1) {
                              // Add: ensure arrays stay in sync
                              return {
                                ...prev,
                                aci_id: [...prev.aci_id, constituency.number],
                                aci_name: [...prev.aci_name, constituency.name],
                              };
                            } else if (!e.target.checked && currentIndex > -1) {
                              // Remove: ensure both arrays are updated at the same index
                              const newAciId = prev.aci_id.filter((id) => id !== constituency.number);
                              const newAciName = prev.aci_name.filter((_, idx) => prev.aci_id[idx] !== constituency.number);
                              return {
                                ...prev,
                                aci_id: newAciId,
                                aci_name: newAciName,
                              };
                            }
                            return prev;
                          });
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label
                        htmlFor={`aci-${constituency.number}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {constituency.number} - {constituency.name}
                      </Label>
                    </div>
                  );
                })}
              </div>
              {sectionForm.aci_id.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {sectionForm.aci_id.length} {sectionForm.aci_id.length === 1 ? "constituency" : "constituencies"} selected
                </p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div className="space-y-0.5">
                <Label className="text-base">Visible</Label>
                <p className="text-sm text-muted-foreground">
                  Show this section in the master data list.
                </p>
              </div>
              <Switch
                checked={sectionForm.isVisible}
                onCheckedChange={(checked) =>
                  setSectionForm((prev) => ({ ...prev, isVisible: checked }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSavingSection}>
                {isSavingSection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSectionId ? "Save Changes" : "Create Section"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={questionDialogOpen}
        onOpenChange={(open) => {
          setQuestionDialogOpen(open);
          if (!open) {
            setQuestionForm(defaultQuestionForm);
            setEditingQuestionId(null);
            setActiveSectionId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingQuestionId ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>Specify the prompt, answer type, and options.</DialogDescription>
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Answer Type</Label>
                <Select
                  value={questionForm.type}
                  onValueChange={(value: MasterQuestionType) =>
                    setQuestionForm((prev) => ({
                      ...prev,
                      type: value,
                      options: value === "multiple-choice" ? prev.options : ["", ""],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select answer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short-answer">Short Answer</SelectItem>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
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


