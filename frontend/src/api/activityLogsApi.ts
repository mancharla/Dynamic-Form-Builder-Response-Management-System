import api from "./axios";

export interface ActivityLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityLogPage {
  items: ActivityLog[];
  total: number;
  page: number;
  page_size: number;
}

export interface ActivityLogFilters {
  page: number;
  page_size: number;
  action?: string;
  entity_type?: string;
}

export const getActivityLogs = async (
  filters: ActivityLogFilters,
): Promise<ActivityLogPage> => {
  const response = await api.get<ActivityLogPage>(
    "/activity-logs",
    { params: filters },
  );

  return response.data;
};