import "server-only";
import { createLogger } from "@/lib/logger";
import type { Logger } from "pino";

/**
 * Base application service.
 *
 * Services encapsulate business logic and orchestrate repositories. They are the
 * only layer route handlers should call. Each service gets a context-bound
 * logger for structured, traceable logging.
 */
export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(context: string) {
    this.logger = createLogger({ service: context });
  }
}
