import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { loginErrorMessage } from "../api/authErrorMessages";
import AuthWelcome from "./AuthWelcome";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(loginErrorMessage(err));
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <AuthWelcome />
        <section className="auth-card">
          <h2>Log in</h2>
          <form className="auth-form" onSubmit={onSubmit}>
            <label>Email <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Password <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit">Log in</button>
          </form>
          <p className="auth-switch">No account? <Link to="/register">Create one</Link></p>
        </section>
      </div>
    </main>
  );
}