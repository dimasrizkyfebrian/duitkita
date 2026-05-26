import axios from "axios";
import api from "@/lib/api";
import { unwrapApiData } from "@/lib/api-envelope";
import { API_ROUTES } from "@/lib/constants";
import type {
  User,
  Partner,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "@/types";

export async function fetchProfile(): Promise<User> {
  const res = await api.get(API_ROUTES.users.me);
  return unwrapApiData<User>(res.data);
}

export async function updateProfile(
  payload: UpdateProfileRequest,
): Promise<User> {
  const res = await api.patch(API_ROUTES.users.updateMe, { name: payload.name });
  return unwrapApiData<User>(res.data);
}

export async function uploadAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post(API_ROUTES.users.avatar, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrapApiData<User>(res.data);
}

export async function deleteAvatar(): Promise<User> {
  const res = await api.delete(API_ROUTES.users.avatar);
  return unwrapApiData<User>(res.data);
}

export async function fetchAvatarBlobUrl(userId: string): Promise<string> {
  const res = await api.get(API_ROUTES.users.userAvatar(userId), {
    responseType: "blob",
  });
  return URL.createObjectURL(res.data);
}

export async function changePassword(
  payload: ChangePasswordRequest,
): Promise<void> {
  await api.patch(API_ROUTES.users.changePassword, payload);
}

export async function fetchPartner(): Promise<Partner | null> {
  try {
    const res = await api.get(API_ROUTES.couples.partner);
    return unwrapApiData<Partner | null>(res.data) ?? null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function linkPartner(partnerEmail: string): Promise<Partner> {
  const res = await api.post(API_ROUTES.couples.link, {
    partnerEmail,
  });
  return unwrapApiData<Partner>(res.data);
}

export async function unlinkPartner(): Promise<void> {
  await api.delete(API_ROUTES.couples.unlink);
}
