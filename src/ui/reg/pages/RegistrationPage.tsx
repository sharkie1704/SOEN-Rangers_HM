import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type RegisterData } from "../auth/AuthContext";
import { registrationErrorMessage } from "../api/authErrorMessages";

type PublicRole = "CUSTOMER" | "COURIER" | "RESTAURANT"; // no OPERATOR: the API refuses it anyway

export default function RegistrationPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<PublicRole>("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lat, setLat] = useState("45.5017");
  const [lng, setLng] = useState("-73.5673");
  const [restaurantId, setRestaurantId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const base = { name, email, password };
    const data: RegisterData =
      role === "CUSTOMER"
        ? { ...base, role, address: { lat: Number(lat), lng: Number(lng) } }
        : role === "RESTAURANT"
          ? { ...base, role, restaurantId }
          : { ...base, role };
    try {
      await register(data);
      navigate("/");
    } catch (err) {
      setError(registrationErrorMessage(err));
    }
  }

  return (
    <main>
      <h1>Register</h1>
      <form onSubmit={onSubmit}>
        <label>Role
          <select value={role} onChange={(e) => setRole(e.target.value as PublicRole)}>
            <option value="CUSTOMER">Customer</option>
            <option value="RESTAURANT">Restaurant staff</option>
            <option value="COURIER">Courier</option>
          </select>
        </label>
        <label>Name <input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label>Email <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password (8-72 characters) <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={72} required /></label>

        {role === "CUSTOMER" && (
          <>
            <label>Latitude <input type="number" step="any" min={-90} max={90} value={lat} onChange={(e) => setLat(e.target.value)} required /></label>
            <label>Longitude <input type="number" step="any" min={-180} max={180} value={lng} onChange={(e) => setLng(e.target.value)} required /></label>
          </>
        )}
        {role === "RESTAURANT" && (
          <label>Restaurant id <input value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} required /></label>
        )}

        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit">Create account</button>
      </form>
      <p>Already registered? <Link to="/login">Log in</Link></p>
    </main>
  );
}