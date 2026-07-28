import type { AuthTokenPayload } from "../interfaces/api.interface.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export {};
