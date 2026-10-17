import { Role } from "./Role";

export interface UserProps {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

export abstract class User {
  public readonly id: string;
  public readonly name: string;
  public readonly email: string;
  public readonly passwordHash: string;

  protected constructor(props: UserProps) {
    if (!props.id.trim()) throw new Error("User id is required");
    if (!props.name.trim()) throw new Error("User name is required");
    if (!props.email.trim()) throw new Error("User email is required");
    if (!props.passwordHash) throw new Error("Password hash is required");
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
  }

  abstract get role(): Role;
}