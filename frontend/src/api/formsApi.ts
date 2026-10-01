import api from "./axios";

export interface Form {
  id: number;
  created_by: number;
  title: string;
  description: string | null;
  slug: string;
  is_public: boolean;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFormRequest {
  title: string;
  description?: string;
  slug: string;
  is_public: boolean;
  is_enabled?: boolean;
}

export interface UpdateFormRequest {
  title?: string;
  description?: string;
  slug?: string;
  is_public?: boolean;
  is_enabled?: boolean;
}

export const getForms = async (): Promise<Form[]> => {
  const response = await api.get<Form[]>("/forms");

  return response.data;
};

export const getFormById = async (
  formId: number,
): Promise<Form> => {
  const response = await api.get<Form>(
    `/forms/${formId}`,
  );

  return response.data;
};

export const createForm = async (
  data: CreateFormRequest,
): Promise<Form> => {
  const response = await api.post<Form>(
    "/forms",
    data,
  );

  return response.data;
};

export const updateForm = async (
  formId: number,
  data: UpdateFormRequest,
): Promise<Form> => {
  const response = await api.put<Form>(
    `/forms/${formId}`,
    data,
  );

  return response.data;
};

export const deleteForm = async (
  formId: number,
): Promise<void> => {
  await api.delete(`/forms/${formId}`);
};