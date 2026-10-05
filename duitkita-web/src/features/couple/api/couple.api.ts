import { authRequest } from '@/lib/http'
import type { Couple, Invitation } from '../types'

export function getPartner() {
  return authRequest<Couple>('/couples/partner')
}

export function unlinkPartner() {
  return authRequest<void>('/couples/partner', { method: 'DELETE' })
}

export function sendInvitation(receiverEmail: string) {
  return authRequest<Invitation>('/couples/invitations', {
    method: 'POST',
    body: { receiver_email: receiverEmail },
  })
}

export function listIncomingInvitations() {
  return authRequest<Invitation[]>('/couples/invitations/incoming')
}

export function acceptInvitation(id: string) {
  return authRequest<Couple>(`/couples/invitations/${id}/accept`, { method: 'POST' })
}

export function rejectInvitation(id: string) {
  return authRequest<void>(`/couples/invitations/${id}/reject`, { method: 'POST' })
}
