import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Link2, Save, ArrowRight, ArrowLeft, CheckCircle2, User, Play, Power } from "lucide-react";
import {
  fetchMasterSections,
  MasterSection,
  MasterQuestion,
} from "@/lib/masterData";
import { fetchSurveys, Survey } from "@/lib/surveys";
import {
  fetchSurveyMasterDataMappings,
  createOrUpdateSurveyMasterDataMapping,
  updateMappingStatus,
  MappingItem,
  SurveyMasterDataMapping,
  ResponseValueMapping,
} from "@/lib/surveyMasterDataMapper";
import { applyMapping } from "@/lib/mappedFields";
import { api } from "@/lib/api";
import { CONSTITUENCIES } from "@/constants/constituencies";
import { useAuth } from "@/contexts/AuthContext";

interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_name: string;
  voter_id: string;
  booth: string;
  survey_date: string;
  status: string;
  answers: Record<string, any>;
}

interface Voter {
  id: string;
  name: string;
  voterId: string;
  familyId: string;
  booth: string;
  boothNo: string;
  phone: string;
  status: string;
  age?: number;
  gender?: string;
  verified: boolean;
  surveyed: boolean;
}

export const SurveyMasterDataMapper = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  
  // Data state
  const [masterSections, setMasterSections] = useState<MasterSection[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedMasterSection, setSelectedMasterSection] = useState<MasterSection | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [existingMapping, setExistingMapping] = useState<SurveyMasterDataMapping | null>(null);
  
  // AC and Voter state for Master Data
  const [selectedAC, setSelectedAC] = useState<number | null>(null);
  
  // AC and Voter state for Survey Responses (separate filtering)
  const [surveyAC, setSurveyAC] = useState<number | null>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [voterResponse, setVoterResponse] = useState<SurveyResponse | null>(null);
  const [loadingVoterResponse, setLoadingVoterResponse] = useState(false);
  
  // Filter surveys by AC
  const filteredSurveys = useMemo(() => {
    if (!surveyAC) return surveys;
    return surveys.filter((survey) => {
      if (!survey.assignedACs || survey.assignedACs.length === 0) return false;
      return survey.assignedACs.includes(surveyAC);
    });
  }, [surveys, surveyAC]);
  
  // Mapping state
  const [mappings, setMappings] = useState<Map<string, MappingItem>>(new Map());
  
  // Checkbox selection state for mapping
  const [selectedMasterQuestionId, setSelectedMasterQuestionId] = useState<string | null>(null);
  const [selectedMasterOptionValue, setSelectedMasterOptionValue] = useState<string | null>(null);
  const [selectedSurveyQuestionId, setSelectedSurveyQuestionId] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedMasterSection && selectedSurvey) {
      loadExistingMapping();
    }
  }, [selectedMasterSection, selectedSurvey]);

  useEffect(() => {
    if (selectedAC) {
      // Clear master section if it's not available for this AC
      if (selectedMasterSection) {
        const isAvailable = selectedMasterSection.aci_id?.includes(selectedAC);
        if (!isAvailable) {
          setSelectedMasterSection(null);
          setMappings(new Map());
          setExistingMapping(null);
        }
      }
    }
  }, [selectedAC]);

  useEffect(() => {
    if (surveyAC) {
      loadVotersForSurvey();
      // Clear survey if it's not assigned to this AC
      if (selectedSurvey) {
        const isAssigned = selectedSurvey.assignedACs?.includes(surveyAC);
        if (!isAssigned) {
          setSelectedSurvey(null);
          setMappings(new Map());
          setExistingMapping(null);
        }
      }
    } else {
      setVoters([]);
      setSelectedVoter(null);
      setVoterResponse(null);
    }
  }, [surveyAC]);

  useEffect(() => {
    if (selectedVoter && selectedSurvey) {
      loadVoterResponse();
    } else {
      setVoterResponse(null);
    }
  }, [selectedVoter, selectedSurvey]);

  // Filter master sections by AC
  const filteredMasterSections = useMemo(() => {
    if (!selectedAC) return [];
    return masterSections.filter((section) => {
      if (!section.aci_id || section.aci_id.length === 0) return false;
      return section.aci_id.includes(selectedAC);
    });
  }, [masterSections, selectedAC]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [sectionsData, surveysData] = await Promise.all([
        fetchMasterSections(),
        fetchSurveys({}),
      ]);
      
      setMasterSections(sectionsData.filter((s) => s.isVisible));
      setSurveys(surveysData.filter((s) => s.status === "Active"));
    } catch (error) {
      console.error("Failed to load initial data", error);
      toast({
        title: "Failed to load data",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVotersForSurvey = async () => {
    if (!surveyAC) return;
    
    try {
      setLoadingVoters(true);
      const data = await api.get(`/voters/${surveyAC}?limit=1000`);
      setVoters(data.voters || []);
      setSelectedVoter(null);
      setVoterResponse(null);
    } catch (error) {
      console.error("Failed to load voters", error);
      toast({
        title: "Failed to load voters",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingVoters(false);
    }
  };

  const loadVoterResponse = async () => {
    if (!selectedVoter || !selectedSurvey) return;
    
    try {
      setLoadingVoterResponse(true);
      
      // Search by voter ID (ObjectId), voterID field, or name
      const searchTerm = selectedVoter.id || selectedVoter.voterId || selectedVoter.name || "";
      
      const params = new URLSearchParams({
        survey: selectedSurvey.id,
        search: searchTerm,
        limit: "100", // Increase limit to ensure we find the voter
      });
      
      console.log("Loading voter response:", {
        surveyId: selectedSurvey.id,
        voterId: selectedVoter.id,
        voterID: selectedVoter.voterId,
        searchTerm,
      });
      
      const data = await api.get(`/survey-responses?${params.toString()}`);
      const responses = data.responses || [];
      
      console.log("Found responses:", responses.length);
      
      // Find response for this specific voter
      // Check multiple fields: voter_id (ObjectId string), voterID field, or name match
      const voterResp = responses.find(
        (r: SurveyResponse) => {
          const responseVoterId = r.voter_id || (r as any).voterId || "";
          const responseVoterID = (r as any).voterID || "";
          const responseName = r.respondent_name || (r as any).voterName || "";
          
          // Match by ObjectId
          if (responseVoterId && selectedVoter.id && responseVoterId.toString() === selectedVoter.id.toString()) {
            return true;
          }
          
          // Match by voterID field
          if (responseVoterID && selectedVoter.voterId && responseVoterID === selectedVoter.voterId) {
            return true;
          }
          
          // Match by name (fallback)
          if (responseName && selectedVoter.name && responseName.toLowerCase().includes(selectedVoter.name.toLowerCase())) {
            return true;
          }
          
          return false;
        }
      );
      
      if (voterResp) {
        console.log("Found voter response:", voterResp);
        setVoterResponse(voterResp);
      } else {
        console.log("No voter response found for:", selectedVoter);
        setVoterResponse(null);
      }
    } catch (error) {
      console.error("Failed to load voter response", error);
      toast({
        title: "Failed to load voter response",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
      setVoterResponse(null);
    } finally {
      setLoadingVoterResponse(false);
    }
  };

  const loadExistingMapping = async () => {
    if (!selectedMasterSection || !selectedSurvey) return;
    
    try {
      const existingMappings = await fetchSurveyMasterDataMappings(
        selectedSurvey.id,
        selectedMasterSection.id
      );
      
      if (existingMappings.length > 0) {
        const mapping = existingMappings[0];
        setExistingMapping(mapping);
        
        // Load existing mappings into state
        const mappingMap = new Map<string, MappingItem>();
        mapping.mappings.forEach((m) => {
          mappingMap.set(m.masterDataQuestionId, m);
        });
        setMappings(mappingMap);
      } else {
        setExistingMapping(null);
        setMappings(new Map());
      }
    } catch (error) {
      console.error("Failed to load existing mapping", error);
      // Silently fail - no existing mapping is okay
      setExistingMapping(null);
      setMappings(new Map());
    }
  };

  const handleCreateMapping = (
    masterQuestion: MasterQuestion,
    surveyQuestionId: string,
    surveyQuestionText: string,
    surveyResponseValue?: any,
    masterDataOptionValue?: string,
    masterDataOptionLabel?: string
  ) => {
    if (!selectedMasterSection || !selectedSurvey) return;
    
    const existingMappingItem = mappings.get(masterQuestion.id);
    const isValueMapping = surveyResponseValue !== undefined && surveyResponseValue !== null;
    
    let responseValueMappings: ResponseValueMapping[] = existingMappingItem?.responseValueMappings || [];
    
    // If this is a value mapping and master question has options
    if (isValueMapping && masterQuestion.type === "multiple-choice" && masterQuestion.options.length > 0) {
      // Check if this value (case-insensitive) is already mapped
      const valueStr = String(surveyResponseValue).trim();
      const existingValueMapping = responseValueMappings.find(
        (vm) => String(vm.surveyResponseValue).trim().toLowerCase() === valueStr.toLowerCase()
      );
      
      if (masterDataOptionValue) {
        // If a specific option is selected, map directly to it
        if (existingValueMapping) {
          // Update existing mapping
          responseValueMappings = responseValueMappings.map((vm) => 
            String(vm.surveyResponseValue).trim().toLowerCase() === valueStr.toLowerCase()
              ? {
                  ...vm,
                  masterDataAnswerValue: masterDataOptionValue,
                  masterDataAnswerLabel: masterDataOptionLabel || masterDataOptionValue,
                }
              : vm
          );
        } else {
          // Add new mapping with the selected option
          responseValueMappings.push({
            surveyResponseValue: surveyResponseValue, // Preserve original value
            masterDataAnswerValue: masterDataOptionValue,
            masterDataAnswerLabel: masterDataOptionLabel || masterDataOptionValue,
          });
        }
      } else if (!existingValueMapping) {
        // Add new value mapping without option (user will need to select later)
        responseValueMappings.push({
          surveyResponseValue: surveyResponseValue, // Preserve original value
        });
      }
    }
    
    const mapping: MappingItem = {
      masterDataSectionId: selectedMasterSection.id,
      masterDataQuestionId: masterQuestion.id,
      masterDataQuestionPrompt: masterQuestion.prompt,
      surveyQuestionId,
      surveyQuestionText,
      mappingType: isValueMapping ? "value-mapping" : "direct",
      responseValueMappings: responseValueMappings.length > 0 ? responseValueMappings : undefined,
    };
    
    setMappings((prev) => {
      const newMap = new Map(prev);
      newMap.set(masterQuestion.id, mapping);
      return newMap;
    });
  };

  const handleUpdateValueMapping = (
    masterQuestionId: string,
    surveyResponseValue: any,
    masterDataAnswerValue?: string,
    masterDataAnswerLabel?: string
  ) => {
    const mappingItem = mappings.get(masterQuestionId);
    if (!mappingItem) return;
    
    const valueStr = String(surveyResponseValue).trim();
    const existingValueMappings = mappingItem.responseValueMappings || [];
    
    // Check if this value (case-insensitive) already exists in mappings
    const existingIndex = existingValueMappings.findIndex(
      (vm) => String(vm.surveyResponseValue).trim().toLowerCase() === valueStr.toLowerCase()
    );
    
    let updatedValueMappings: ResponseValueMapping[];
    
    if (existingIndex >= 0) {
      // Update existing mapping
      updatedValueMappings = existingValueMappings.map((vm, idx) => {
        if (idx === existingIndex) {
          return {
            ...vm,
            masterDataAnswerValue,
            masterDataAnswerLabel,
          };
        }
        return vm;
      });
    } else {
      // Add new mapping - preserve original value (case-sensitive for storage)
      updatedValueMappings = [
        ...existingValueMappings,
        {
          surveyResponseValue: surveyResponseValue, // Keep original value
          masterDataAnswerValue,
          masterDataAnswerLabel,
        },
      ];
    }
    
    const updatedMapping: MappingItem = {
      ...mappingItem,
      responseValueMappings: updatedValueMappings,
      mappingType: updatedValueMappings.length > 0 ? "value-mapping" : "direct",
    };
    
    setMappings((prev) => {
      const newMap = new Map(prev);
      newMap.set(masterQuestionId, updatedMapping);
      return newMap;
    });
  };

  const handleRemoveValueMapping = (masterQuestionId: string, surveyResponseValue: any) => {
    const mappingItem = mappings.get(masterQuestionId);
    if (!mappingItem) return;
    
    const valueStr = String(surveyResponseValue).trim().toLowerCase();
    const updatedValueMappings = mappingItem.responseValueMappings?.filter(
      (vm) => String(vm.surveyResponseValue).trim().toLowerCase() !== valueStr
    ) || [];
    
    const updatedMapping: MappingItem = {
      ...mappingItem,
      responseValueMappings: updatedValueMappings.length > 0 ? updatedValueMappings : undefined,
      mappingType: updatedValueMappings.length > 0 ? "value-mapping" : "direct",
    };
    
    setMappings((prev) => {
      const newMap = new Map(prev);
      newMap.set(masterQuestionId, updatedMapping);
      return newMap;
    });
  };

  const handleRemoveMapping = (masterQuestionId: string) => {
    setMappings((prev) => {
      const newMap = new Map(prev);
      newMap.delete(masterQuestionId);
      return newMap;
    });
  };

  const handleMapSelected = async () => {
    if (!selectedMasterQuestionId || !selectedSurveyQuestionId) {
      toast({
        title: "Selection required",
        description: "Please select one master data question/option and one survey question to map.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedMasterSection || !selectedSurvey) {
      toast({
        title: "Missing selection",
        description: "Please select both a master data section and a survey.",
        variant: "destructive",
      });
      return;
    }

    const masterQuestion = selectedMasterSection.questions.find(
      (q) => q.id === selectedMasterQuestionId
    );

    const surveyQuestion = selectedSurvey.questions.find(
      (q) => q.id === selectedSurveyQuestionId
    );

    if (!masterQuestion || !surveyQuestion) {
      toast({
        title: "Invalid selection",
        description: "Selected question not found.",
        variant: "destructive",
      });
      return;
    }

    // Get the response value if available
    const responseValue = voterResponse?.answers?.[selectedSurveyQuestionId] || null;

    // Get option label if an option was selected
    let optionLabel = "";
    if (selectedMasterOptionValue && masterQuestion.type === "multiple-choice") {
      const option = masterQuestion.options.find(
        (opt) => opt.value === selectedMasterOptionValue || opt.label === selectedMasterOptionValue
      );
      optionLabel = option?.label || selectedMasterOptionValue;
    }

    // Build the new mapping item
    const existingMappingItem = mappings.get(masterQuestion.id);
    const isValueMapping = responseValue !== null && responseValue !== undefined;
    
    let responseValueMappings: ResponseValueMapping[] = existingMappingItem?.responseValueMappings || [];
    
    // If this is a value mapping and master question has options
    if (isValueMapping && masterQuestion.type === "multiple-choice" && masterQuestion.options.length > 0 && selectedMasterOptionValue) {
      // Check if this value (case-insensitive) is already mapped
      const valueStr = String(responseValue).trim();
      const existingValueMapping = responseValueMappings.find(
        (vm) => String(vm.surveyResponseValue).trim().toLowerCase() === valueStr.toLowerCase()
      );
      
      if (existingValueMapping) {
        // Update existing mapping
        responseValueMappings = responseValueMappings.map((vm) => 
          String(vm.surveyResponseValue).trim().toLowerCase() === valueStr.toLowerCase()
            ? {
                ...vm,
                masterDataAnswerValue: selectedMasterOptionValue,
                masterDataAnswerLabel: optionLabel || selectedMasterOptionValue,
              }
            : vm
        );
      } else {
        // Add new mapping with the selected option
        responseValueMappings.push({
          surveyResponseValue: responseValue,
          masterDataAnswerValue: selectedMasterOptionValue,
          masterDataAnswerLabel: optionLabel || selectedMasterOptionValue,
        });
      }
    } else if (isValueMapping && masterQuestion.type === "multiple-choice" && masterQuestion.options.length > 0 && !selectedMasterOptionValue) {
      // Add new value mapping without option (user will need to select later)
      const valueStr = String(responseValue).trim();
      const existingValueMapping = responseValueMappings.find(
        (vm) => String(vm.surveyResponseValue).trim().toLowerCase() === valueStr.toLowerCase()
      );
      if (!existingValueMapping) {
        responseValueMappings.push({
          surveyResponseValue: responseValue,
        });
      }
    }

    const newMapping: MappingItem = {
      masterDataSectionId: selectedMasterSection.id,
      masterDataQuestionId: masterQuestion.id,
      masterDataQuestionPrompt: masterQuestion.prompt,
      surveyQuestionId: surveyQuestion.id,
      surveyQuestionText: surveyQuestion.text,
      mappingType: isValueMapping ? "value-mapping" : "direct",
      responseValueMappings: responseValueMappings.length > 0 ? responseValueMappings : undefined,
    };

    // Save to database immediately
    try {
      setSaving(true);
      
      // Build the complete mappings array including the new mapping
      const updatedMappings = new Map(mappings);
      updatedMappings.set(masterQuestion.id, newMapping);
      const mappingsToSave = Array.from(updatedMappings.values());

      // Update local state
      setMappings(updatedMappings);

      const savedMapping = await createOrUpdateSurveyMasterDataMapping({
        surveyId: selectedSurvey.id,
        surveyTitle: selectedSurvey.title,
        masterDataSectionId: selectedMasterSection.id,
        masterDataSectionName: selectedMasterSection.name,
        mappings: mappingsToSave,
        status: existingMapping?.status || "draft",
        createdBy: user?.id,
        createdByRole: user?.role,
      });

      // Update state with saved mapping
      setExistingMapping(savedMapping);
      const mappingMap = new Map<string, MappingItem>();
      savedMapping.mappings.forEach((m) => {
        mappingMap.set(m.masterDataQuestionId, m);
      });
      setMappings(mappingMap);

      // Clear selections after mapping
      setSelectedMasterQuestionId(null);
      setSelectedMasterOptionValue(null);
      setSelectedSurveyQuestionId(null);

      const optionLetter = selectedMasterOptionValue 
        ? String.fromCharCode(65 + masterQuestion.options.findIndex(opt => opt.value === selectedMasterOptionValue || opt.label === selectedMasterOptionValue))
        : "";

      toast({
        title: "Mapping saved",
        description: `Mapped "${surveyQuestion.text}" to "${masterQuestion.prompt}"${optionLetter ? ` → Option ${optionLetter}` : ""} and saved to database.`,
      });
    } catch (error) {
      console.error("Failed to save mapping", error);
      toast({
        title: "Failed to save mapping",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMappings = async () => {
    if (!selectedMasterSection || !selectedSurvey) {
      toast({
        title: "Missing selection",
        description: "Please select both a master data section and a survey.",
        variant: "destructive",
      });
      return;
    }
    
    if (mappings.size === 0) {
      toast({
        title: "No mappings",
        description: "Please create at least one mapping before saving.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSaving(true);
      const mappingsArray = Array.from(mappings.values());
      
      const savedMapping = await createOrUpdateSurveyMasterDataMapping({
        surveyId: selectedSurvey.id,
        surveyTitle: selectedSurvey.title,
        masterDataSectionId: selectedMasterSection.id,
        masterDataSectionName: selectedMasterSection.name,
        mappings: mappingsArray,
        status: existingMapping?.status || "draft",
        createdBy: user?.id,
        createdByRole: user?.role,
      });
      
      toast({
        title: "Mappings saved",
        description: `${mappingsArray.length} mapping(s) saved successfully. ${savedMapping.status === "draft" ? "Activate the mapping to apply it." : ""}`,
      });
      
      // Update existing mapping state and reload mappings into local state
      setExistingMapping(savedMapping);
      
      // Update local mappings state with saved mappings
      const mappingMap = new Map<string, MappingItem>();
      savedMapping.mappings.forEach((m) => {
        mappingMap.set(m.masterDataQuestionId, m);
      });
      setMappings(mappingMap);
    } catch (error) {
      console.error("Failed to save mappings", error);
      toast({
        title: "Failed to save mappings",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyMapping = async () => {
    if (!existingMapping) {
      toast({
        title: "No mapping found",
        description: "Please save the mappings first before applying.",
        variant: "destructive",
      });
      return;
    }

    if (existingMapping.status !== "active") {
      toast({
        title: "Mapping not active",
        description: "Please activate the mapping before applying.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedVoter || !voterResponse) {
      toast({
        title: "Missing voter response",
        description: "Please select a voter with a survey response to apply the mapping.",
        variant: "destructive",
      });
      return;
    }

    if (!surveyAC) {
      toast({
        title: "Missing AC",
        description: "Please select a survey AC before applying the mapping.",
        variant: "destructive",
      });
      return;
    }

    try {
      setApplying(true);
      
      const mappedFields = await applyMapping({
        mappingId: existingMapping.id,
        surveyResponseId: voterResponse.id,
        voterId: selectedVoter.id,
        acNumber: surveyAC,
        applyToAll: false,
        createdBy: user?.id,
        createdByRole: user?.role,
      });

      toast({
        title: "Mapping applied successfully",
        description: `Mapped fields saved for ${mappedFields.length} record(s).`,
      });
    } catch (error) {
      console.error("Failed to apply mapping", error);
      toast({
        title: "Failed to apply mapping",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const getMappedSurveyQuestionId = (masterQuestionId: string): string | null => {
    return mappings.get(masterQuestionId)?.surveyQuestionId || null;
  };

  const getSurveyQuestionText = (questionId: string): string => {
    if (!selectedSurvey) return "";
    const question = selectedSurvey.questions.find((q) => q.id === questionId);
    return question?.text || "";
  };

  const getResponseValue = (questionId: string): any => {
    if (!voterResponse) return null;
    return voterResponse.answers?.[questionId] || null;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Survey to Master Data Mapper</h1>
            <p className="text-muted-foreground">
              Map survey form responses to master data questions
            </p>
          </div>
          <div className="flex gap-2">
            {mappings.size > 0 && (
              <Button onClick={handleSaveMappings} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Mappings ({mappings.size})
              </Button>
            )}
            {existingMapping && existingMapping.status === "draft" && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await updateMappingStatus(existingMapping.id, "active");
                    await loadExistingMapping();
                    toast({
                      title: "Mapping activated",
                      description: "Mapping is now active and can be applied.",
                    });
                  } catch (error) {
                    toast({
                      title: "Failed to activate mapping",
                      description: error instanceof Error ? error.message : "Please try again later.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Power className="mr-2 h-4 w-4" />
                Activate Mapping
              </Button>
            )}
            {existingMapping && existingMapping.status === "active" && selectedVoter && voterResponse && (
              <Button onClick={handleApplyMapping} disabled={applying} variant="default">
                {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Play className="mr-2 h-4 w-4" />
                Apply Mapping to Voter
              </Button>
            )}
          </div>
        </div>

        {/* Two Separate Filter Boxes */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Master Data Filter Box */}
          <Card>
            <CardHeader>
              <CardTitle>Master Data Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assembly Constituency (for Master Data)</label>
                <Select
                  value={selectedAC?.toString() || ""}
                  onValueChange={(value) => {
                    setSelectedAC(parseInt(value));
                    setSelectedMasterSection(null);
                    setMappings(new Map());
                    setExistingMapping(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AC for Master Data" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSTITUENCIES.map((ac) => (
                      <SelectItem key={ac.number} value={ac.number.toString()}>
                        {ac.number} - {ac.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedAC && (
                  <p className="text-xs text-muted-foreground">
                    Master data sections will be filtered by AC assignment.
                  </p>
                )}
              </div>
              
              {selectedAC && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Master Data Section</label>
                  <Select
                    value={selectedMasterSection?.id || ""}
                    onValueChange={(value) => {
                      const section = filteredMasterSections.find((s) => s.id === value);
                      setSelectedMasterSection(section || null);
                      setMappings(new Map());
                      setExistingMapping(null);
                    }}
                    disabled={filteredMasterSections.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={filteredMasterSections.length === 0 ? "No sections for this AC" : "Select master data section"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredMasterSections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name} ({section.questions.length} questions)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedMasterSection && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>{selectedMasterSection.description || "No description"}</p>
                    </div>
                  )}
                  {filteredMasterSections.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No master data sections are assigned to this AC.
                    </p>
                  )}
                  {filteredMasterSections.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {filteredMasterSections.length} section(s) available
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Survey Response Filter Box */}
          <Card>
            <CardHeader>
              <CardTitle>Survey Response Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assembly Constituency (for Survey)</label>
                <Select
                  value={surveyAC?.toString() || ""}
                  onValueChange={(value) => {
                    setSurveyAC(parseInt(value));
                    setSelectedVoter(null);
                    setVoterResponse(null);
                    setSelectedSurvey(null);
                    setMappings(new Map());
                    setExistingMapping(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AC for Survey Responses" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSTITUENCIES.map((ac) => (
                      <SelectItem key={ac.number} value={ac.number.toString()}>
                        {ac.number} - {ac.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!surveyAC && (
                  <p className="text-xs text-muted-foreground">
                    Survey forms and responses will be filtered by AC.
                  </p>
                )}
              </div>

              {surveyAC && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Survey Form</label>
                    <Select
                      value={selectedSurvey?.id || ""}
                      onValueChange={(value) => {
                        const survey = filteredSurveys.find((s) => s.id === value);
                        setSelectedSurvey(survey || null);
                        setMappings(new Map());
                        setExistingMapping(null);
                      }}
                      disabled={filteredSurveys.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={filteredSurveys.length === 0 ? "No surveys for this AC" : "Select survey form"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSurveys.map((survey) => (
                          <SelectItem key={survey.id} value={survey.id}>
                            {survey.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSurvey && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p>{selectedSurvey.description || "No description"}</p>
                        <p className="mt-1">{selectedSurvey.questions.length} questions</p>
                      </div>
                    )}
                    {filteredSurveys.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No surveys are assigned to this AC.
                      </p>
                    )}
                    {filteredSurveys.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {filteredSurveys.length} survey(s) available
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Voter</label>
                    <Select
                      value={selectedVoter?.id || ""}
                      onValueChange={(value) => {
                        const voter = voters.find((v) => v.id === value);
                        setSelectedVoter(voter || null);
                      }}
                      disabled={!surveyAC || loadingVoters || voters.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingVoters ? "Loading voters..." : voters.length === 0 ? "No voters found" : "Select voter"} />
                      </SelectTrigger>
                      <SelectContent>
                        {voters.map((voter) => (
                          <SelectItem key={voter.id} value={voter.id}>
                            {voter.name} ({voter.voterId}) - {voter.booth}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {surveyAC && voters.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {voters.length} voter(s) found in this AC
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Voter Response Info */}
        {selectedVoter && selectedSurvey && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Voter Response Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadingVoterResponse && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!loadingVoterResponse && voterResponse && (
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{voterResponse.respondent_name}</span>
                      <Badge variant="outline">{voterResponse.booth}</Badge>
                      <Badge variant="secondary">{new Date(voterResponse.survey_date).toLocaleDateString()}</Badge>
                    </div>
                    {existingMapping && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Mapping Status:</span>
                        <Badge variant={existingMapping.status === "active" ? "default" : "outline"}>
                          {existingMapping.status}
                        </Badge>
                        {existingMapping.status === "active" && (
                          <span className="text-success">Ready to apply</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!loadingVoterResponse && !voterResponse && (
                  <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                    No survey response found for this voter and selected survey.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Split Screen View */}
        {selectedMasterSection && selectedSurvey && (
          <div className="relative">
            {/* Map Button - Centered between panels */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <Button
                onClick={handleMapSelected}
                disabled={!selectedMasterQuestionId || !selectedSurveyQuestionId || saving}
                size="lg"
                className="rounded-full h-12 w-12 p-0 shadow-lg"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Link2 className="h-5 w-5" />
                )}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Master Data */}
              <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Master Data Questions</span>
                  <Badge variant="outline">{selectedMasterSection.questions.length} questions</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {selectedMasterSection.questions
                    .filter((q) => q.isVisible)
                    .map((question) => {
                      const mappedSurveyQuestionId = getMappedSurveyQuestionId(question.id);
                      const isMapped = mappedSurveyQuestionId !== null;
                      
                      return (
                        <Card
                          key={question.id}
                          className={`${
                            isMapped ? "border-primary bg-primary/5" : "border-muted"
                          }`}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                  <h4 className="font-semibold text-base">{question.prompt}</h4>
                                  {question.isRequired && (
                                    <Badge variant="secondary" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                  {isMapped && (
                                    <Badge variant="default" className="text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Mapped
                                    </Badge>
                                  )}
                                </div>
                                {question.helperText && (
                                  <p className="text-xs text-muted-foreground mb-3">{question.helperText}</p>
                                )}
                                {question.type === "multiple-choice" && question.options.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    {question.options.map((option, idx) => {
                                      const optionLabel = String.fromCharCode(65 + idx); // A, B, C, etc.
                                      const optionValue = option.value || option.label;
                                      const isOptionSelected = selectedMasterQuestionId === question.id && selectedMasterOptionValue === optionValue;
                                      return (
                                        <div key={idx} className="flex items-start gap-2 text-sm">
                                          <Checkbox
                                            checked={isOptionSelected}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                // Clear any previous selection and set new one
                                                setSelectedMasterQuestionId(question.id);
                                                setSelectedMasterOptionValue(optionValue);
                                              } else {
                                                if (selectedMasterQuestionId === question.id && selectedMasterOptionValue === optionValue) {
                                                  setSelectedMasterQuestionId(null);
                                                  setSelectedMasterOptionValue(null);
                                                }
                                              }
                                            }}
                                            className="mt-0.5"
                                          />
                                          <div className="flex-1">
                                            <span className="font-medium text-muted-foreground min-w-[3rem]">
                                              Option {optionLabel}:
                                            </span>
                                            <span className="ml-2">{option.label || option.value}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {question.type !== "multiple-choice" && (
                                  <div className="mt-3">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={selectedMasterQuestionId === question.id && !selectedMasterOptionValue}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            // Clear any previous selection and set new one
                                            setSelectedMasterQuestionId(question.id);
                                            setSelectedMasterOptionValue(null);
                                          } else {
                                            if (selectedMasterQuestionId === question.id) {
                                              setSelectedMasterQuestionId(null);
                                              setSelectedMasterOptionValue(null);
                                            }
                                          }
                                        }}
                                      />
                                      <span className="text-xs text-muted-foreground">Select to map</span>
                                    </div>
                                  </div>
                                )}
                                {question.type === "short-answer" && (
                                  <p className="text-sm text-muted-foreground mt-2">Short Answer</p>
                                )}
                                {isMapped && (
                                  <div className="mt-2 pt-2 border-t space-y-2">
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">
                                        Mapped to:
                                      </p>
                                      <p className="text-sm font-medium">
                                        {getSurveyQuestionText(mappedSurveyQuestionId!)}
                                      </p>
                                    </div>
                                    {/* Show value mappings if they exist */}
                                    {(() => {
                                      const mappingItem = mappings.get(question.id);
                                      if (mappingItem?.responseValueMappings && mappingItem.responseValueMappings.length > 0) {
                                        return (
                                          <div className="mt-2 space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">
                                              Response Value Mappings:
                                            </p>
                                            {mappingItem.responseValueMappings.map((vm, idx) => {
                                              // Find the option to get its letter label
                                              const mappedOption = question.options.find(
                                                (opt) => opt.value === vm.masterDataAnswerValue || opt.label === vm.masterDataAnswerValue
                                              );
                                              const optionIndex = question.options.findIndex(
                                                (opt) => opt.value === vm.masterDataAnswerValue || opt.label === vm.masterDataAnswerValue
                                              );
                                              const optionLabel = optionIndex >= 0 ? String.fromCharCode(65 + optionIndex) : null;
                                              
                                              return (
                                                <div key={idx} className="text-xs">
                                                  <Badge variant="outline" className="mr-1">
                                                    "{String(vm.surveyResponseValue)}"
                                                  </Badge>
                                                  <span className="text-muted-foreground">→</span>
                                                  <Badge variant="secondary" className="ml-1">
                                                    {optionLabel ? `Option ${optionLabel}: ` : ""}
                                                    {vm.masterDataAnswerLabel || mappedOption?.label || vm.masterDataAnswerValue || "Not mapped"}
                                                  </Badge>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                )}
                              </div>
                              {isMapped && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMapping(question.id)}
                                  >
                                    <ArrowLeft className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Right: Survey Questions & Voter Responses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Survey Questions & Voter Response</span>
                  <Badge variant="outline">{selectedSurvey.questions.length} questions</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedVoter && (
                  <div className="flex items-center justify-center min-h-[400px] text-center">
                    <div>
                      <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Please select an AC and voter to view responses</p>
                    </div>
                  </div>
                )}
                {selectedVoter && loadingVoterResponse && (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                {selectedVoter && !loadingVoterResponse && voterResponse && (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {selectedSurvey.questions.map((surveyQuestion) => {
                      const responseValue = getResponseValue(surveyQuestion.id);
                      const isMappedToMaster = Array.from(mappings.values()).some(
                        (m) => m.surveyQuestionId === surveyQuestion.id
                      );
                      
                      return (
                        <Card
                          key={surveyQuestion.id}
                          className={`${
                            isMappedToMaster ? "border-primary bg-primary/5" : "border-muted"
                          }`}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold">{surveyQuestion.text}</h4>
                                  {surveyQuestion.required && (
                                    <Badge variant="secondary" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                  {isMappedToMaster && (
                                    <Badge variant="default" className="text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Mapped
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {surveyQuestion.type}
                                </p>
                                {responseValue !== null && responseValue !== undefined && (
                                  <div className="mt-2 pt-2 border-t">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      Voter Response:
                                    </p>
                                    <p className="text-sm font-medium">
                                      {typeof responseValue === "object"
                                        ? JSON.stringify(responseValue, null, 2)
                                        : String(responseValue)}
                                    </p>
                                  </div>
                                )}
                                {responseValue === null || responseValue === undefined ? (
                                  <div className="mt-2 pt-2 border-t">
                                    <p className="text-xs text-muted-foreground italic">
                                      No response provided
                                    </p>
                                  </div>
                                ) : null}
                                {surveyQuestion.options && surveyQuestion.options.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {surveyQuestion.options.map((option, idx) => (
                                      <Badge 
                                        key={idx} 
                                        variant={responseValue === option ? "default" : "outline"} 
                                        className="text-xs"
                                      >
                                        {option}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                {!isMappedToMaster ? (
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={selectedSurveyQuestionId === surveyQuestion.id}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          // Only one survey question can be selected at a time
                                          setSelectedSurveyQuestionId(surveyQuestion.id);
                                        } else {
                                          if (selectedSurveyQuestionId === surveyQuestion.id) {
                                            setSelectedSurveyQuestionId(null);
                                          }
                                        }
                                      }}
                                    />
                                    <span className="text-xs text-muted-foreground">Select to map</span>
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                    Mapped
                                  </div>
                                )}
                                {/* Value Mapping UI - Map free text responses to standardized answers */}
                                {isMappedToMaster && selectedMasterSection && (() => {
                                  const mappingItem = Array.from(mappings.values()).find(
                                    (m) => m.surveyQuestionId === surveyQuestion.id
                                  );
                                  const masterQuestion = selectedMasterSection.questions.find(
                                    (q) => q.id === mappingItem?.masterDataQuestionId
                                  );
                                  
                                  if (!mappingItem || !masterQuestion) {
                                    return null;
                                  }
                                  
                                  // Show value mapping for current response value
                                  if (responseValue !== null && responseValue !== undefined) {
                                    const valueStr = String(responseValue).trim();
                                    const valueMapping = mappingItem.responseValueMappings?.find(
                                      (vm) => String(vm.surveyResponseValue).trim().toLowerCase() === valueStr.toLowerCase()
                                    );
                                    
                                    // Only show for multiple-choice master questions or short-answer with options
                                    if (masterQuestion.type === "multiple-choice" && masterQuestion.options.length > 0) {
                                      return (
                                        <div className="mt-2 pt-2 border-t space-y-2">
                                          <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">
                                              Standardize "{valueStr}" to:
                                            </p>
                                            <p className="text-xs text-muted-foreground mb-1">
                                              Map this response value to a standardized master data option for easier analysis
                                            </p>
                                            <Select
                                              value={valueMapping?.masterDataAnswerValue || ""}
                                              onValueChange={(answerValue) => {
                                                const answerOption = masterQuestion.options.find(
                                                  (opt) => opt.value === answerValue || opt.label === answerValue
                                                );
                                                handleUpdateValueMapping(
                                                  masterQuestion.id,
                                                  responseValue,
                                                  answerValue,
                                                  answerOption?.label || answerOption?.value || answerValue
                                                );
                                              }}
                                            >
                                              <SelectTrigger className="w-full text-xs">
                                                <SelectValue placeholder="Select master data option" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {masterQuestion.options.map((option, idx) => {
                                                  const optionLabel = String.fromCharCode(65 + idx); // A, B, C, etc.
                                                  return (
                                                    <SelectItem
                                                      key={option.id || option.value || idx}
                                                      value={option.value || option.label}
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <span className="font-medium text-muted-foreground">
                                                          Option {optionLabel}:
                                                        </span>
                                                        <span>{option.label || option.value}</span>
                                                      </div>
                                                    </SelectItem>
                                                  );
                                                })}
                                              </SelectContent>
                                            </Select>
                                            {valueMapping?.masterDataAnswerLabel && (
                                              <div className="flex items-center gap-1 mt-1">
                                                <Badge variant="outline" className="text-xs">
                                                  "{valueStr}"
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">→</span>
                                                <Badge variant="default" className="text-xs">
                                                  {valueMapping.masterDataAnswerLabel}
                                                </Badge>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 w-5 p-0 ml-auto"
                                                  onClick={() => handleRemoveValueMapping(masterQuestion.id, responseValue)}
                                                  title="Remove mapping"
                                                >
                                                  ×
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    }
                                  }
                                  
                                  // Show all existing value mappings for this question
                                  if (mappingItem.responseValueMappings && mappingItem.responseValueMappings.length > 0) {
                                    return (
                                      <div className="mt-2 pt-2 border-t space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground mb-1">
                                          Response Standardization Mappings:
                                        </p>
                                        <div className="space-y-1">
                                          {mappingItem.responseValueMappings.map((vm, idx) => (
                                            <div key={idx} className="flex items-center gap-1 text-xs">
                                              <Badge variant="outline" className="text-xs">
                                                "{String(vm.surveyResponseValue)}"
                                              </Badge>
                                              <span className="text-muted-foreground">→</span>
                                              <Badge variant="default" className="text-xs">
                                                {vm.masterDataAnswerLabel || vm.masterDataAnswerValue || "Not mapped"}
                                              </Badge>
                                              {String(vm.surveyResponseValue).trim().toLowerCase() !== String(responseValue || "").trim().toLowerCase() && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-4 w-4 p-0 ml-auto"
                                                  onClick={() => handleRemoveValueMapping(masterQuestion.id, vm.surveyResponseValue)}
                                                  title="Remove mapping"
                                                >
                                                  ×
                                                </Button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  return null;
                                })()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                {selectedVoter && !loadingVoterResponse && !voterResponse && (
                  <div className="flex items-center justify-center min-h-[400px] text-center">
                    <div>
                      <p className="text-muted-foreground mb-2">No survey response found</p>
                      <p className="text-sm text-muted-foreground">
                        This voter hasn't completed the selected survey yet.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </div>
        )}

        {(!selectedMasterSection || !selectedSurvey) && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please select both a master data section and a survey form to start mapping.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SurveyMasterDataMapper;

