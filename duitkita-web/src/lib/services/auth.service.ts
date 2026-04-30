import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@/types";

export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>(API_ROUTES.auth.login, data);
  return response.data;
}

export async function registerUser(
  data: RegisterRequest,
): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>(API_ROUTES.auth.register, data);
  return response.data;
}
