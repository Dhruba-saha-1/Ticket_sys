export interface TokenEmailPayload {
  userId: string;
  email: string;
  name: string;
  token: string;
  expiresAt: Date;
}

export interface DomainEvents {
  'user.invited': TokenEmailPayload;
  'user.password_reset_requested': TokenEmailPayload;
}

export type DomainEventName = keyof DomainEvents;
