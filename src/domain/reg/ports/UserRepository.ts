import { User } from "../User";
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  //keep user when refresh 
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}