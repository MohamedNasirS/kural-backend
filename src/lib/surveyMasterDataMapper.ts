import { api } from "./api";

export interface ResponseValueMapping {
  surveyResponseValue: string | number | boolean;
  masterDataAnswerValue?: string;
  masterDataAnswerLabel?: string;
}

export interface MappingItem {
  masterDataSectionId: string;
  masterDataQuestionId: string;
  masterDataQuestionPrompt: string;
  surveyQuestionId: string;
  surveyQuestionText: string;
  mappingType: "direct" | "transformation" | "value-mapping";
  transformationRule?: string;
  responseValueMappings?: ResponseValueMapping[];
}

export interface SurveyMasterDataMapping {
  id: string;
  surveyId: string;
  surveyTitle: string;
  masterDataSectionId: string;
  masterDataSectionName: string;
  mappings: MappingItem[];
  createdBy?: string;
  createdByRole?: string;
  status: "draft" | "active" | "archived";
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMappingPayload {
  surveyId: string;
  surveyTitle: string;
  masterDataSectionId: string;
  masterDataSectionName: string;
  mappings: MappingItem[];
  createdBy?: string;
  createdByRole?: string;
  status?: "draft" | "active" | "archived";
  notes?: string;
}

export async function fetchSurveyMasterDataMappings(
  surveyId?: string,
  masterDataSectionId?: string
): Promise<SurveyMasterDataMapping[]> {
  try {
    const params = new URLSearchParams();
    if (surveyId) params.append("surveyId", surveyId);
    if (masterDataSectionId) params.append("masterDataSectionId", masterDataSectionId);
    
    const queryString = params.toString();
    const endpoint = `/survey-master-data-mappings${queryString ? `?${queryString}` : ""}`;
    console.log("Fetching mappings from:", endpoint);
    
    const response = await api.get(endpoint);
    return response.mappings ?? [];
  } catch (error) {
    console.error("Error in fetchSurveyMasterDataMappings:", error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
}

export async function fetchSurveyMasterDataMapping(
  mappingId: string
): Promise<SurveyMasterDataMapping> {
  const response = await api.get(`/survey-master-data-mappings/${mappingId}`);
  return response;
}

export async function createOrUpdateSurveyMasterDataMapping(
  payload: CreateMappingPayload
): Promise<SurveyMasterDataMapping> {
  const response = await api.post("/survey-master-data-mappings", payload);
  return response.mapping;
}

export async function updateMappingStatus(
  mappingId: string,
  status: "draft" | "active" | "archived"
): Promise<SurveyMasterDataMapping> {
  const response = await api.put(`/survey-master-data-mappings/${mappingId}/status`, {
    status,
  });
  return response.mapping;
}

export async function deleteSurveyMasterDataMapping(mappingId: string): Promise<void> {
  await api.delete(`/survey-master-data-mappings/${mappingId}`);
}

