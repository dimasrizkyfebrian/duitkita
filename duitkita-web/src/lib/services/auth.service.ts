import api from "@/lib/api";
import { unwrapApiData } from "@/lib/api-envelope";
import { API_ROUTES } from "@/lib/constants";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@/types";

export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  const response = await api.post(API_ROUTES.auth.login, data);
  return unwrapApiData<AuthResponse>(response.data);
}

export async function registerUser(
  data: RegisterRequest,
): Promise<AuthResponse> {
  const response = await api.post(API_ROUTES.auth.register, data);
  return unwrapApiData<AuthResponse>(response.data);
}
