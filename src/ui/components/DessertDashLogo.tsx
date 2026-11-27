import { Link } from "react-router-dom";
import "./DessertDashLogo.css";

type Props =
  | { to: string; onClick?: never }
  | { to?: never; onClick: () => void };

export default function DessertDashLogo({ to, onClick }: Props) {
  const mark = (
    <>
      <svg className="dessertdash-logo__mark" aria-hidden="true" viewBox="0 0 40 40" fill="none" focusable="false">
        <path d="M8 18h24l-2 18H10L8 18Z" />
        <path d="M12 18c0-4 3-6 8-6s8 2 8 6M15 10c0-3 2-4 4-5M22 10c0-3 2-4 4-5M14 22v10m6-10v10m6-10v10" />
      </svg>
      <span>Dessert<span>Dash</span></span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="dessertdash-logo" onClick={onClick} aria-label="DessertDash dashboard home">
        {mark}
      </button>
    );
  }

  return (
    <Link className="dessertdash-logo" to={to} aria-label="DessertDash home">
      {mark}
    </Link>
  );
}
