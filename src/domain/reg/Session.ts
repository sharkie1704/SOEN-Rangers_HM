import { Role } from "./Role";
import { User } from "./User";
import { Staff } from "./Staff";

// The shape every other module sees as req.user
export interface AuthenticatedUser {
  id: string;
  role: Role;
  restaurantId?: string;
}

export class Session {
  constructor(
    public readonly userId: string,
    public readonly role: Role,
    public readonly restaurantId: string | null,
    public readonly expiresAt: Date,
  ) {
    if (!userId) throw new Error("Session requires a user id");
  }

  static forUser(user: User, ttlMs: number, now: Date = new Date()): Session {
    const restaurantId = user instanceof Staff ? user.restaurantId : null;
    return new Session(user.id, user.role, restaurantId, new Date(now.getTime() + ttlMs));
  }

  isExpired(now: Date = new Date()): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }

  toAuthenticatedUser(): AuthenticatedUser {
    return {
      id: this.userId,
      role: this.role,
      ...(this.restaurantId ? { restaurantId: this.restaurantId } : {}),
    };
  }
}