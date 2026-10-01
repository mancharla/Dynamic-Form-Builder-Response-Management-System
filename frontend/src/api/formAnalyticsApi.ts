import api from "./axios";

export interface ResponseTrendItem {
  date: string;
  count: number;
}

export interface FieldAnalyticsItem {
  field_id: number;
  field_name: string;
  field_label: string;
  field_type: string;
  total_answers: number;
  distribution: Record<string, number>;
}

export interface FormAnalytics {
  form_id: number;
  form_title: string;
  total_responses: number;
  response_trend: ResponseTrendItem[];
  field_analytics: FieldAnalyticsItem[];
}

export type AnalyticsExportFormat = "excel" | "pdf";

export const getFormAnalytics = async (
  formId: number,
): Promise<FormAnalytics> => {
  const response = await api.get<FormAnalytics>(
    `/forms/${formId}/analytics`,
  );

  return response.data;
};

export const downloadFormAnalyticsExport = async (
  formId: number,
  format: AnalyticsExportFormat,
): Promise<Blob> => {
  const response = await api.get<Blob>(
    `/forms/${formId}/export/${format}`,
    { responseType: "blob" },
  );

  return response.data;
};