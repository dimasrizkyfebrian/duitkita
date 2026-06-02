import api from "@/lib/api";
import { isApiError } from "@/lib/api-envelope";
import { API_ROUTES } from "@/lib/constants";
import type {
  User,
  Partner,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "@/types";

export async function fetchProfile(): Promise<User> {
  const res = await api.get<User>(API_ROUTES.users.me);
  return res.data;
}

export async function updateProfile(
  payload: UpdateProfileRequest,
): Promise<User> {
  const res = await api.patch<User>(API_ROUTES.users.updateMe, { name: payload.name });
  return res.data;
}

export async function uploadAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post<User>(API_ROUTES.users.avatar, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteAvatar(): Promise<User> {
  const res = await api.delete<User>(API_ROUTES.users.avatar);
  return res.data;
}

export async function fetchAvatarBlob(userId: string): Promise<Blob> {
  const res = await api.get(API_ROUTES.users.userAvatar(userId), {
    responseType: "blob",
  });
  return res.data as Blob;
}

export async function changePassword(
  payload: ChangePasswordRequest,
): Promise<void> {
  await api.patch(API_ROUTES.users.changePassword, payload);
}

export async function fetchPartner(): Promise<Partner | null> {
  try {
    const res = await api.get<Partner>(API_ROUTES.couples.partner);
    return res.data ?? null;
  } catch (error) {
    if (isApiError(error) && error.code === "NOT_FOUND") {
      return null;
    }
    throw error;
  }
}

export async function linkPartner(partnerEmail: string): Promise<Partner> {
  const res = await api.post<Partner>(API_ROUTES.couples.link, {
    partnerEmail,
  });
  return res.data;
}

export async function unlinkPartner(): Promise<void> {
  await api.delete(API_ROUTES.couples.unlink);
}
