import api from "./axios";
import {
  getFormFields,
} from "./formFieldsApi";

import type {
  FormField,
} from "./formFieldsApi";

export interface ResponseDetail {
  id: number;
  response_id: number;
  field_id: number;
  value: string | null;
  structured_value:
    | Record<string, unknown>
    | unknown[]
    | null;
}

export interface FormResponse {
  id: number;
  form_id: number;
  user_id: number | null;
  status: string;
  submitted_at: string;
  updated_at: string;
  details: ResponseDetail[];
}

export interface ResponseAnswer {
  field_id: number;
  value: unknown;
}

export interface UpdateResponseRequest {
  answers: ResponseAnswer[];
}

export interface ResponseHistoryItem {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/*
 * Get all responses for a form.
 */
export const getFormResponses = async (
  formId: number,
): Promise<FormResponse[]> => {
  const response =
    await api.get<FormResponse[]>(
      `/forms/${formId}/responses`,
    );

  return response.data;
};

/*
 * Get a single response.
 */
export const getResponseById = async (
  responseId: number,
): Promise<FormResponse> => {
  const response =
    await api.get<FormResponse>(
      `/responses/${responseId}`,
    );

  return response.data;
};

/*
 * Get response + form fields.
 *
 * Used by the dynamic response editor.
 */
export const getResponseEditorData = async (
  responseId: number,
): Promise<{
  response: FormResponse;
  fields: FormField[];
}> => {
  const response =
    await getResponseById(
      responseId,
    );

  const fields =
    await getFormFields(
      response.form_id,
    );

  return {
    response,
    fields,
  };
};

/*
 * Update a response.
 */
export const updateResponse = async (
  responseId: number,
  data: UpdateResponseRequest,
): Promise<FormResponse> => {
  const response =
    await api.put<FormResponse>(
      `/responses/${responseId}`,
      data,
    );

  return response.data;
};

/*
 * Delete a response.
 */
export const deleteResponse = async (
  responseId: number,
): Promise<void> => {
  await api.delete(
    `/responses/${responseId}`,
  );
};

/*
 * Get response history.
 */
export const getResponseHistory = async (
  responseId: number,
): Promise<ResponseHistoryItem[]> => {
  const response =
    await api.get<ResponseHistoryItem[]>(
      `/responses/${responseId}/history`,
    );

  return response.data;
};