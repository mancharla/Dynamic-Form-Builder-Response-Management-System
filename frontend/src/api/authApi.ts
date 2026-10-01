import api from "./axios";

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserProfileUpdate {
  name: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export const registerUser = async (
  data: RegisterRequest,
): Promise<UserResponse> => {
  const response = await api.post<UserResponse>("/auth/register", data);
  return response.data;
};

export const loginUser = async (
  data: LoginRequest,
): Promise<TokenResponse> => {
  const response = await api.post<TokenResponse>("/auth/login", data);
  return response.data;
};

export const getCurrentUser = async (): Promise<UserResponse> => {
  const response = await api.get<UserResponse>("/auth/me");
  return response.data;
};

export const updateCurrentUser = async (
  data: UserProfileUpdate,
): Promise<UserResponse> => {
  const response = await api.patch<UserResponse>("/auth/me", data);

  return response.data;
};