import { prisma } from "../db/PrismaClient";
import { User } from "../../domain/reg/User";
import { Role } from "../../domain/reg/Role";
import { Customer } from "../../domain/reg/Customer";
import { Staff } from "../../domain/reg/Staff";
import { Courier } from "../../domain/reg/Courier";
import { Operator } from "../../domain/reg/Operator";
import { UserRepository } from "../../domain/reg/ports/UserRepository";
import { DuplicateEmailError } from "../../domain/reg";


interface UserRow {
  id: string;
  name: string;
  role: string;
  email: string;
  passwordHash: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  restaurantId: string | null;
}

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    return row ? this.toDomain(row) : null;
  }
  async findById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({
    where: { id },
  });

  return row ? this.toDomain(row) : null;
}

  async save(user: User): Promise<void> {
    const data = this.toRow(user);
    try {
      await prisma.user.upsert({ where: { id: user.id }, create: data, update: data });
    } catch (e) {
      // Two simultaneous signups can both pass findByEmail; the DB constraint is the last line of defence.
      if ((e as { code?: string })?.code === "P2002") {
        throw new DuplicateEmailError();
      }
      throw e;
    }
  }

  // Convert a database row to a domain User object
  private toDomain(row: UserRow): User {
    const base = { id: row.id, name: row.name, email: row.email, passwordHash: row.passwordHash };
    switch (row.role as Role) {
      case Role.CUSTOMER:
        if (row.deliveryLat === null || row.deliveryLng === null) {
          throw new Error(`Customer ${row.id} has no delivery address in the database`);
        }
        return new Customer({ ...base, address: { lat: row.deliveryLat, lng: row.deliveryLng } });
      case Role.RESTAURANT:
        if (!row.restaurantId) throw new Error(`Staff ${row.id} has no restaurantId in the database`);
        return new Staff({ ...base, restaurantId: row.restaurantId });
      case Role.COURIER:
        return new Courier(base);
      case Role.OPERATOR:
        return new Operator(base);
      default:
        throw new Error(`Unknown role "${row.role}" for user ${row.id}`);
    }
  }

  private toRow(user: User) {
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      passwordHash: user.passwordHash,
      deliveryLat: user instanceof Customer ? user.address.lat : null,
      deliveryLng: user instanceof Customer ? user.address.lng : null,
      restaurantId: user instanceof Staff ? user.restaurantId : null,
    };
  }
}