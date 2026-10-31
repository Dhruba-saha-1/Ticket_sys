export const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TICKET_TYPE_IN_USE: 409,
  MEMBER_HAS_OPEN_TICKETS: 409,
  ASSIGNEE_REQUIRED: 409,
  PROJECT_READ_ONLY: 409,
  INVALID_TRANSITION: 409,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export interface ApiError {
  error: { code: ErrorCode; message: string };
}
