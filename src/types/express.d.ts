// this file is outside of the layer folders as it is a type-only augmentation of the Express Request interface, 
// which is used throughout the application

import { AuthenticatedUser } from "../domain/reg/Session";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
export {};