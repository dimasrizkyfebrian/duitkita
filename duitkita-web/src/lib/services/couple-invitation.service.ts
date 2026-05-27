import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type { CoupleInvitation, Partner } from "@/types";

export async function sendInvitation(
  partnerEmail: string,
): Promise<CoupleInvitation> {
  const res = await api.post<CoupleInvitation>(API_ROUTES.couples.invitations, {
    partnerEmail,
  });
  return res.data;
}

export async function fetchIncomingInvitations(): Promise<CoupleInvitation[]> {
  const res = await api.get<CoupleInvitation[]>(
    API_ROUTES.couples.invitationsIncoming,
  );
  const payload = res.data;
  return Array.isArray(payload) ? payload : [];
}

export async function acceptInvitation(id: string): Promise<Partner> {
  const res = await api.post<Partner>(API_ROUTES.couples.invitationAccept(id));
  return res.data;
}

export async function rejectInvitation(id: string): Promise<void> {
  await api.post(API_ROUTES.couples.invitationReject(id));
}

export async function cancelInvitation(id: string): Promise<void> {
  await api.post(API_ROUTES.couples.invitationCancel(id));
}
