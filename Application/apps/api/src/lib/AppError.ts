import { ERROR_CODES, type ErrorCode } from '@ticketing/shared';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  get status(): number {
    return ERROR_CODES[this.code];
  }
}
