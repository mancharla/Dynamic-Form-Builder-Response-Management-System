import api from "./axios";
import type { FormField } from "./formFieldsApi";
import type { FormResponse, ResponseAnswer } from "./responsesApi";

export interface PublicForm {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  is_public: boolean;
  is_enabled: boolean;
  fields: FormField[];
}

export interface SubmitPublicFormRequest {
  answers: ResponseAnswer[];
}

export const getPublicForm = async (
  slug: string,
): Promise<PublicForm> => {
  const response = await api.get<PublicForm>(
    `/public/forms/${encodeURIComponent(slug)}`,
  );

  return response.data;
};

export const submitPublicForm = async (
  slug: string,
  data: SubmitPublicFormRequest,
): Promise<FormResponse> => {
  const response = await api.post<FormResponse>(
    `/public/forms/${encodeURIComponent(slug)}/responses`,
    data,
  );

  return response.data;
};