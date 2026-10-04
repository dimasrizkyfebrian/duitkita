export interface Partner {
  id: string
  name: string
  email: string
  avatar_url?: string
  created_at: string
}

export interface Couple {
  id: string
  partner: Partner
  linked_at: string
}

export interface Invitation {
  id: string
  sender_id: string
  receiver_id: string
  status: string
  expires_at: string
  created_at: string
  // Only present on GET /couples/invitations/incoming.
  sender?: Partner
}
