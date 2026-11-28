import { Link } from "react-router-dom";
import PublicHeader from "./PublicHeader";

const categories = [
  { name: "Waffles", image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=560&q=85" },
  { name: "Cakes", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=560&q=85" },
  { name: "Ice cream", image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=560&q=85" },
  { name: "Cookies", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=560&q=85" },
  { name: "Brownies", image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=560&q=85" },
  { name: "Macarons", image: "https://images.unsplash.com/photo-1558326567-98ae2405596b?auto=format&fit=crop&w=560&q=85" },
];

export default function PublicLandingPage() {
  return (
    <main className="public-landing">
      <PublicHeader showAccountLinks />

      <section className="public-hero" aria-labelledby="public-hero-title">
        <div className="public-hero__content">
          <p className="public-eyebrow">A LITTLE JOY, DELIVERED</p>
          <h1 id="public-hero-title">Craving something sweet?</h1>
          <p>Order from your favourite dessert spots right here in Montréal.</p>
          <Link className="public-hero__action" to="/login">Find desserts <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <div className="public-home-content">
        <section className="public-categories" aria-labelledby="category-title">
          <div className="public-section-heading">
            <div><p className="public-eyebrow">FIND YOUR FAVOURITE</p><h2 id="category-title">Explore by category</h2></div>
          </div>
          <div className="public-category-grid">
            {categories.map((category) => (
              <Link className="public-category" key={category.name} to="/login">
                <img src={category.image} alt="" loading="lazy" />
                <span>{category.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
