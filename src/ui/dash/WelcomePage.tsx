import { useId, useState } from "react";
import "./welcome-page.css";

interface WelcomePageProps {
  name: string;
}

export default function WelcomePage({ name }: WelcomePageProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const firstName = name.trim().split(/\s+/)[0] || "there";

  return (
    <section className="welcome-page" aria-label="Welcome">
      <button
        className="welcome-page__toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span>Welcome back, {firstName}!</span>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <span className="welcome-page__sparkle" aria-hidden="true">✦</span>
      <div id={detailsId} className="welcome-page__details" hidden={!expanded}>
        Your next favourite dessert might be just around the corner. Explore local spots and find a little treat to love.
      </div>
    </section>
  );
}
