import { User } from "../User";
import { UserRepository } from "../ports/UserRepository";
import { PasswordHasher } from "../ports/PasswordHasher";

export class InMemoryUserRepository implements UserRepository {
  public readonly users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users.push(user);
  }
}

export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return "hashed:" + plain;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === "hashed:" + plain;
  }
}