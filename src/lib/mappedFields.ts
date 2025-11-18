import { api } from "./api";

export interface MappedValue {
  surveyQuestionId: string;
  surveyQuestionText?: string;
  surveyResponseValue: any;
  masterDataQuestionId: string;
  masterDataQuestionPrompt: string;
  mappedValue: any;
  mappingType: "direct" | "transformation" | "value-mapping";
  originalValue?: any;
}

export interface MappedField {
  id: string;
  voterId: string;
  voterName?: string;
  voterNameTamil?: string;
  voterID?: string;
  familyId?: string;
  acNumber: number;
  acName: string;
  aci_id?: number;
  aci_name?: string;
  boothId?: string;
  boothName?: string;
  boothNumber?: string;
  surveyId: string;
  surveyTitle?: string;
  surveyResponseId?: string;
  masterDataSectionId: string;
  masterDataSectionName: string;
  mappingId?: string;
  mappedFields: MappedValue[];
  mobile?: string;
  age?: number;
  gender?: string;
  address?: string;
  guardian?: string;
  mappedAt?: string;
  mappedBy?: string;
  mappedByRole?: string;
  status?: "active" | "archived";
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplyMappingPayload {
  mappingId: string;
  surveyResponseId: string;
  voterId: string;
  acNumber?: number;
  applyToAll?: boolean;
  createdBy?: string;
  createdByRole?: string;
}

export async function applyMapping(payload: ApplyMappingPayload): Promise<MappedField[]> {
  const response = await api.post("/mapped-fields/apply-mapping", payload);
  return response.mappedFields || [];
}

export async function fetchMappedFields(params?: {
  acNumber?: number;
  surveyId?: string;
  masterDataSectionId?: string;
  voterId?: string;
  voterID?: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ mappedFields: MappedField[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  
  if (params?.acNumber) queryParams.append("acNumber", params.acNumber.toString());
  if (params?.surveyId) queryParams.append("surveyId", params.surveyId);
  if (params?.masterDataSectionId) queryParams.append("masterDataSectionId", params.masterDataSectionId);
  if (params?.voterId) queryParams.append("voterId", params.voterId);
  if (params?.voterID) queryParams.append("voterID", params.voterID);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.search) queryParams.append("search", params.search);
  
  const queryString = queryParams.toString();
  const response = await api.get(`/mapped-fields${queryString ? `?${queryString}` : ""}`);
  return response;
}

export async function fetchMappedField(mappedFieldId: string): Promise<MappedField> {
  const response = await api.get(`/mapped-fields/${mappedFieldId}`);
  return response;
}

