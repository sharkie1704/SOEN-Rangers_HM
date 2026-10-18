import { Role } from "../../domain/reg/Role.ts";

export type OrderActor =
  | { readonly userId: string; readonly role: Role.CUSTOMER }
  | { readonly userId: string; readonly role: Role.RESTAURANT; readonly restaurantId: string };
