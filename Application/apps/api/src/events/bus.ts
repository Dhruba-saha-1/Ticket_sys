import { EventEmitter } from 'node:events';
import { logger } from '../config/logger';
import type { DomainEventName, DomainEvents } from './events';

type Handler<K extends DomainEventName> = (payload: DomainEvents[K]) => void | Promise<void>;

/** In-process event bus. Handler failures are logged and never reach the emitter. */
class EventBus {
  private readonly emitter = new EventEmitter();

  emit<K extends DomainEventName>(event: K, payload: DomainEvents[K]): void {
    this.emitter.emit(event, payload);
  }

  on<K extends DomainEventName>(event: K, handler: Handler<K>): void {
    this.emitter.on(event, (payload: DomainEvents[K]) => {
      try {
        Promise.resolve(handler(payload)).catch((err: unknown) =>
          logger.error({ err, event }, 'Event handler failed'),
        );
      } catch (err) {
        logger.error({ err, event }, 'Event handler failed');
      }
    });
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export const bus = new EventBus();
