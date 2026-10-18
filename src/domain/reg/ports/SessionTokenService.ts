import { Session } from "../Session";

export interface SessionTokenService {
  issue(session: Session): string;
  verify(token: string): Session | null; // null = missing, tampered, or expired
}