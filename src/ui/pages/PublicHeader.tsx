import { Link } from "react-router-dom";
import DessertDashLogo from "../components/DessertDashLogo";
import "./public-landing.css";

export default function PublicHeader({ showAccountLinks = false }: { showAccountLinks?: boolean }) {
  return (
    <header className="public-header dessertdash-header">
      <DessertDashLogo to={showAccountLinks ? "/" : "/discover"} />
      {showAccountLinks && (
        <nav aria-label="Account">
          <Link className="public-header__login" to="/login">Log in</Link>
          <Link className="public-header__signup" to="/register">Sign up</Link>
        </nav>
      )}
    </header>
  );
}
