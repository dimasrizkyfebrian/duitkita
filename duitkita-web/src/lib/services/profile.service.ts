import axios from "axios";
import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type {
  User,
  Partner,
  UpdateProfileRequest,
  ChangePasswordRequest,
  LinkPartnerResponse,
} from "@/types";

export async function fetchProfile(): Promise<User> {
  const res = await api.get<User>(API_ROUTES.users.me);
  return res.data;
}

export async function updateProfile(
  payload: UpdateProfileRequest,
): Promise<User> {
  const res = await api.patch<User>(API_ROUTES.users.updateMe, payload);
  return res.data;
}

export async function changePassword(
  payload: ChangePasswordRequest,
): Promise<void> {
  await api.patch(API_ROUTES.users.changePassword, payload);
}

export async function fetchPartner(): Promise<Partner | null> {
  try {
    const res = await api.get<Partner | null>(API_ROUTES.couples.partner);
    return res.data ?? null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function linkPartner(
  partnerEmail: string,
): Promise<LinkPartnerResponse> {
  const res = await api.post<LinkPartnerResponse>(API_ROUTES.couples.link, {
    partnerEmail,
  });
  return res.data;
}

export async function unlinkPartner(): Promise<void> {
  await api.delete(API_ROUTES.couples.unlink);
}
