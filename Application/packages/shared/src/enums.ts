export const PROJECT_STATUSES = ['todo', 'ongoing', 'completed', 'on_hold', 'scrapped'] as const;
export type ProjectStatus = typeof PROJECT_STATUSES[number];

export const TICKET_TYPES = ['task', 'bug', 'new_request'] as const;
export type TicketType = typeof TICKET_TYPES[number];

export const TICKET_STATUSES = ['open', 'in_progress', 'on_hold', 'resolved', 'closed'] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];

export const TICKET_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TicketPriority = typeof TICKET_PRIORITIES[number];

export const USER_STATUSES = ['active', 'invited', 'disabled'] as const;
export type UserStatus = typeof USER_STATUSES[number];
