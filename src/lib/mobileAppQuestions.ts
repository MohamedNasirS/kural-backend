import { api } from "./api";
import { MasterQuestion, MasterAnswerOption } from "./masterData";

export interface MobileAppAnswerOption extends MasterAnswerOption {
  masterOptionId?: string;
}

export interface MobileAppQuestion extends Omit<MasterQuestion, "options"> {
  masterQuestionId?: string;
  options: MobileAppAnswerOption[];
}

interface QuestionsResponse {
  questions: MobileAppQuestion[];
}

interface QuestionResponse {
  question: MobileAppQuestion;
  message?: string;
}

export async function fetchMobileAppQuestions(): Promise<MobileAppQuestion[]> {
  const response: QuestionsResponse = await api.get("/mobile-app-questions");
  return response.questions ?? [];
}

export async function addMobileAppQuestion(
  question: MasterQuestion & { masterQuestionId?: string; order?: number },
): Promise<MobileAppQuestion> {
  const response: QuestionResponse = await api.post("/mobile-app-questions", question);
  return response.question;
}

export async function deleteMobileAppQuestion(questionId: string): Promise<void> {
  await api.delete(`/mobile-app-questions/${questionId}`);
}

