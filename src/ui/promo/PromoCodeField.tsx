import { useState, type FormEvent } from "react";

interface PromoCodeFieldProps {
    appliedCode: string;
    onApply: (code: string) => void;
    onRemove: () => void;
}

const rowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    margin: "0 0 16px",
    color: "#4B3028",
} as const;

const buttonStyle = {
    padding: "8px 14px",
    backgroundColor: "#FFF9F2",
    color: "#4B3028",
    border: "1px solid #C89F7A",
    borderRadius: 8,
    fontFamily: "inherit",
    fontWeight: 600,
    cursor: "pointer",
} as const;

const visuallyHidden = {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
} as const;

export default function PromoCodeField({ appliedCode, onApply, onRemove }: PromoCodeFieldProps) {
    const [draft, setDraft] = useState("");

    if (appliedCode) {
        return (
            <div aria-label="Promo code" style={rowStyle}>
                <span>Promo code <strong>{appliedCode}</strong></span>
                <button type="button" className="interactive-button" onClick={onRemove} style={buttonStyle}>Remove</button>
            </div>
        );
    }

    function apply(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const code = draft.trim().toUpperCase();
        if (!code) return;
        onApply(code);
        setDraft("");
    }

    return (
        <form aria-label="Promo code" onSubmit={apply} style={rowStyle}>
            <label style={{ flex: 1 }}>
                <span style={visuallyHidden}>Promo code</span>
                <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Promo code"
                    autoComplete="off"
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #C89F7A", borderRadius: 8, fontFamily: "inherit", color: "#4B3028", backgroundColor: "#FFF9F2" }}
                />
            </label>
            <button type="submit" className="interactive-button" disabled={!draft.trim()} style={{ ...buttonStyle, cursor: draft.trim() ? "pointer" : "not-allowed" }}>Apply</button>
        </form>
    );
}
