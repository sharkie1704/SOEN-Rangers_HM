import { Role } from "./Role";
import { User, UserProps } from "./User";

export class Operator extends User {
  constructor(props: UserProps) { super(props); }
  get role(): Role { return Role.OPERATOR; }
}