import { useId, useState, type FormEvent } from "react";
import type { RatingScale } from "../../domain/rvw/Rating.ts";
import { api, ApiError } from "../reg/api/client";
import { errorMessage } from "../reg/api/useApi";

type Props = {
  orderId: number;
  scale: RatingScale;
  onSaved: () => void;
  onDuplicate: (message: string) => void;
};

export default function OrderRatingForm({ orderId, scale, onSaved, onDuplicate }: Props) {
  const formId = useId();
  const [restaurantScore, setRestaurantScore] = useState<number>();
  const [courierScore, setCourierScore] = useState<number>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const scores = Array.from({ length: scale.max - scale.min + 1 }, (_, index) => scale.min + index);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || restaurantScore === undefined || courierScore === undefined) return;
    setPending(true);
    setError("");
    try {
      const result = await api<{ rating: { orderId: number; restaurantScore: number; courierScore: number } }>(`/api/orders/${orderId}/rating`, {
        method: "POST",
        body: { restaurantScore, courierScore },
      });
      onSaved(result.rating);
    } catch (cause) {
      // Other rating conflicts share the same HTTP status and error code.
      if (cause instanceof ApiError && cause.status === 409 && cause.message === "This order has already been rated.") {
        onDuplicate(cause.message);
      } else {
        setError(errorMessage(cause, "Could not submit your rating."));
      }
    } finally {
      setPending(false);
    }
  }

  const groups = [
    { name: "restaurant", label: "Restaurant rating", value: restaurantScore, select: setRestaurantScore },
    { name: "courier", label: "Courier rating", value: courierScore, select: setCourierScore },
  ];

  return (
    <form className="order-rating" aria-label={`Rate order #${orderId}`} onSubmit={submit}>
      {groups.map(({ name, label, value, select }) => (
        <fieldset key={name} disabled={pending}>
          <legend>{label}</legend>
          <div className="order-rating-stars">
            {scores.map((score) => (
              <label key={score} className="order-rating-star">
                <input
                  type="radio"
                  name={`${formId}-${name}`}
                  value={score}
                  checked={value === score}
                  onChange={() => select(score)}
                  required
                />
                <span><span aria-hidden="true">★ </span>{score} {score === 1 ? "star" : "stars"}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <button
        className="order-action"
        type="submit"
        disabled={pending || restaurantScore === undefined || courierScore === undefined}
      >
        {pending ? "Submitting…" : "Submit rating"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
