import api from "./axios";

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "date"
  | "dropdown"
  | "checkbox"
  | "radio"
  | "file"
  | "rating";

export interface FieldOption {
  id: number;
  field_id: number;
  label: string;
  value: string;
  option_order: number;
}

export interface FormField {
  id: number;
  form_id: number;
  label: string;
  field_type: FieldType;
  name: string;
  placeholder: string | null;
  description: string | null;
  is_required: boolean;
  field_order: number;
  validation_rules: Record<string, unknown> | null;
  conditional_logic: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  options?: FieldOption[];
}

export interface CreateFieldRequest {
  label: string;
  field_type: FieldType;
  name: string;
  placeholder?: string;
  description?: string;
  is_required: boolean;
  field_order: number;
  validation_rules?: Record<string, unknown>;
  conditional_logic?: Record<string, unknown>;
  options?: CreateFieldOptionRequest[];
}

export interface UpdateFieldRequest {
  label?: string;
  field_type?: FieldType;
  name?: string;
  placeholder?: string;
  description?: string;
  is_required?: boolean;
  field_order?: number;
  validation_rules?: Record<string, unknown>;
  conditional_logic?: Record<string, unknown>;
  options?: CreateFieldOptionRequest[];
}

export interface CreateFieldOptionRequest {
  label: string;
  value: string;
  option_order: number;
}

export const getFormFields = async (
  formId: number,
): Promise<FormField[]> => {
  const response = await api.get<FormField[]>(
    `/forms/${formId}/fields`,
  );

  return response.data;
};

export const getFormFieldById = async (
  _formId: number,
  fieldId: number,
): Promise<FormField> => {
  const response = await api.get<FormField>(
    `/forms/fields/${fieldId}`,
  );

  return response.data;
};

export const createFormField = async (
  formId: number,
  data: CreateFieldRequest,
): Promise<FormField> => {
  const response = await api.post<FormField>(
    `/forms/${formId}/fields`,
    data,
  );

  return response.data;
};

export const updateFormField = async (
  _formId: number,
  fieldId: number,
  data: UpdateFieldRequest,
): Promise<FormField> => {
  const response = await api.put<FormField>(
    `/forms/fields/${fieldId}`,
    data,
  );

  return response.data;
};

export const deleteFormField = async (
  _formId: number,
  fieldId: number,
): Promise<void> => {
  await api.delete(
    `/forms/fields/${fieldId}`,
  );
};

export const createFieldOption = async (
  formId: number,
  fieldId: number,
  data: CreateFieldOptionRequest,
): Promise<FieldOption> => {
  const response = await api.post<FieldOption>(
    `/forms/${formId}/fields/${fieldId}/options`,
    data,
  );

  return response.data;
};

export const deleteFieldOption = async (
  formId: number,
  fieldId: number,
  optionId: number,
): Promise<void> => {
  await api.delete(
    `/forms/${formId}/fields/${fieldId}/options/${optionId}`,
  );
};