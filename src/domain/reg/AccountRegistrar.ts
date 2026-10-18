import { randomUUID } from "node:crypto";
import { User } from "./User";
import { UserRepository } from "./ports/UserRepository";
import { PasswordHasher } from "./ports/PasswordHasher";
import { DuplicateEmailError, ValidationError } from "./Errors";

export interface BaseRegistrationData {
  name: string;
  email: string;
  password: string;
}

export interface NewAccountProps {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

export abstract class AccountRegistrar<T extends BaseRegistrationData = BaseRegistrationData> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  // Shared flow: validate -> unique check -> hash -> create -> store
  async register(data: T): Promise<User> {
    this.validate(data);
    const email = data.email.trim().toLowerCase();

    if (await this.users.findByEmail(email)) {
      throw new DuplicateEmailError();
    }

    const props: NewAccountProps = {
      id: randomUUID(),                       
      name: data.name.trim(),
      email,
      passwordHash: await this.hasher.hash(data.password),
    };

    const user = this.createAccount(props, data);   // factory method
    await this.users.save(user);
    return user;
  }

  // Common checks
  protected validate(data: T): void {
    if (!data.name?.trim()) throw new ValidationError("Name is required");
    if (!/^\S+@\S+\.\S+$/.test((data.email ?? "").trim())) throw new ValidationError("Valid email is required");
    if ((data.password ?? "").length < 8) throw new ValidationError("Password must be at least 8 characters");
  }

  // Factory method:
  protected abstract createAccount(props: NewAccountProps, data: T): User;
}