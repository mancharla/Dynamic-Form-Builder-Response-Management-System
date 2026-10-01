import api from "./axios";

export interface DashboardStatistics {
  total_users: number;
  total_forms: number;
  active_forms: number;
  disabled_forms: number;
  total_responses: number;
}

export const getDashboardStatistics =
  async (): Promise<DashboardStatistics> => {
    const response = await api.get<DashboardStatistics>("/dashboard");

    return response.data;
  };