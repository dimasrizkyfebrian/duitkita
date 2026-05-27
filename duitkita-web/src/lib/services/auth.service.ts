import axios from "axios";
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

/**
 * Calls POST /auth/refresh with the given refresh token.
 * Uses a raw axios instance to bypass the api interceptors and avoid
 * infinite loops when the access token is expired.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<AuthResponse> {
  const response = await axios.post<{
    success: true;
    data: AuthResponse;
  }>(
    `${process.env.NEXT_PUBLIC_API_URL}${API_ROUTES.auth.refresh}`,
    { refreshToken },
  );
  return response.data.data;
}
