import { useAuth } from "../reg/auth/AuthContext";

type HeaderProps = {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  onLogout: () => Promise<void>;
};

const roleLabels: Record<string, string> = {
  CUSTOMER: "Customer",
  RESTAURANT: "Restaurant Staff",
  OPERATOR: "Operator",
  COURIER: "Courier",
};

export default function Header({ user, onLogout }: HeaderProps) {
  return (
    <header>
      <strong>DessertDash</strong>
      <span>
        {user.name ?? user.id} ({roleLabels[user.role] ?? user.role})
      </span>
      <button onClick={onLogout}>Log out</button>
    </header>
  );
}