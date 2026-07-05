"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/config/constants";
import { env } from "@/config/env";
import { createDonationOrder } from "../actions/donationActions";

// Cloudflare Turnstile (security-review MED-1). Minimal shape of the global api.js
// exposes — explicit render so we own the container + capture the token.
interface TurnstileAPI {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  reset: (widgetId?: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/** Load Turnstile api.js once; resolve when window.turnstile is ready. */
function loadTurnstile(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.turnstile) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(!!window.turnstile));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(!!window.turnstile);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

// Razorpay Checkout is loaded from a script tag at runtime; this is the minimal shape
// we call. Kept local — no @types dependency for a scaffold that ships dark.
interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler?: () => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayInstance {
  open: () => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const PRESETS_RUPEES = [100, 500, 1000, 2500] as const;
const MIN_RUPEES = 10;

/** Inject the Razorpay Checkout script once; resolve when it's ready. */
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Donation form (PAY-03). Amount presets + custom, optional name/email. On submit it
 * asks the server to mint an order, then opens the Razorpay widget. The widget's
 * `handler` only shows a "thank you — receipt on its way" screen: it makes NO claim
 * that the payment succeeded, because the HMAC-verified webhook is the source of truth.
 */
export function DonateForm() {
  const t = useTranslations("donate");
  const [preset, setPreset] = useState<number | "custom">(PRESETS_RUPEES[1]);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Turnstile (MED-1): only active when the owner has set a site key. When unset, the
  // widget never renders and the server gate skips — donations work exactly as before.
  const turnstileSiteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!turnstileSiteKey || renderedRef.current) return;
    let cancelled = false;
    void loadTurnstile().then((ok) => {
      if (cancelled || !ok || !widgetRef.current || renderedRef.current) return;
      renderedRef.current = true;
      window.turnstile!.render(widgetRef.current, {
        sitekey: turnstileSiteKey,
        theme: "auto",
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(null),
        "error-callback": () => setTurnstileToken(null),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [turnstileSiteKey]);

  const rupees = preset === "custom" ? Number(custom) : preset;
  const validAmount = Number.isFinite(rupees) && rupees >= MIN_RUPEES;

  async function handleDonate() {
    setError(null);
    if (!validAmount) {
      setError(t("errorAmount"));
      return;
    }
    // MED-1: when Turnstile is armed, require a token before we call the server.
    if (turnstileSiteKey && !turnstileToken) {
      setError(t("errorVerify"));
      return;
    }
    setBusy(true);
    try {
      const res = await createDonationOrder(
        {
          amount: Math.round(rupees * 100), // ₹ → paise
          name: name.trim() || undefined,
          email: email.trim() || undefined,
        },
        turnstileToken ?? undefined,
      );
      if (!res.ok) {
        // Turnstile tokens are single-use — reset the widget so a retry gets a fresh one.
        if (renderedRef.current) window.turnstile?.reset();
        setTurnstileToken(null);
        setError(
          res.code === "VALIDATION"
            ? t("errorAmount")
            : res.code === "TURNSTILE"
              ? t("errorVerify")
              : t("errorGeneric"),
        );
        setBusy(false);
        return;
      }
      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) {
        setError(t("errorGeneric"));
        setBusy(false);
        return;
      }
      const rzp = new window.Razorpay({
        key: res.keyId,
        order_id: res.orderId,
        amount: res.amount,
        currency: "INR",
        name: "Rajyash Food Porter",
        description: t("title"),
        prefill: { name: name.trim() || undefined, email: email.trim() || undefined },
        theme: { color: "#2E7D46" },
        // Cosmetic only — truth comes from the webhook. Show the neutral thank-you.
        handler: () => setDone(true),
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
    } catch {
      setError(t("errorGeneric"));
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-10">
        <h2 className="rj-display text-2xl" style={{ color: "var(--rj-ink)" }}>
          {t("thanksTitle")}
        </h2>
        <p
          className="mt-3 text-[1.0625rem]"
          style={{ color: "var(--rj-ink-soft)", lineHeight: 1.65 }}
        >
          {t("thanksBody")}
        </p>
        <a
          href={ROUTES.home}
          className="mt-6 inline-block px-5 py-2.5 text-sm font-medium"
          style={{ background: "var(--rj-green-cta)", color: "#fff", borderRadius: "6px" }}
        >
          {t("thanksDone")}
        </a>
      </div>
    );
  }

  const fieldStyle = {
    background: "var(--rj-paper)",
    border: "1px solid var(--rj-hairline)",
    color: "var(--rj-ink)",
  } as const;

  return (
    <div className="mt-10">
      <p className="text-sm font-medium" style={{ color: "var(--rj-ink)" }}>
        {t("amountLabel")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS_RUPEES.map((amt) => {
          const active = preset === amt;
          return (
            <button
              key={amt}
              type="button"
              onClick={() => setPreset(amt)}
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{
                background: active ? "var(--rj-green-cta)" : "var(--rj-paper)",
                color: active ? "#fff" : "var(--rj-ink)",
                border: "1px solid var(--rj-hairline)",
              }}
            >
              ₹{amt.toLocaleString("en-IN")}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setPreset("custom")}
          className="rounded-md px-4 py-2 text-sm font-medium"
          style={{
            background: preset === "custom" ? "var(--rj-green-cta)" : "var(--rj-paper)",
            color: preset === "custom" ? "#fff" : "var(--rj-ink)",
            border: "1px solid var(--rj-hairline)",
          }}
        >
          {t("customLabel")}
        </button>
      </div>

      {preset === "custom" && (
        <input
          type="number"
          inputMode="numeric"
          min={MIN_RUPEES}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={t("customPlaceholder")}
          aria-label={t("customLabel")}
          className="mt-3 w-full rounded-md px-3 py-2 text-sm"
          style={fieldStyle}
        />
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium" style={{ color: "var(--rj-ink)" }}>
            {t("nameLabel")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="mt-1.5 w-full rounded-md px-3 py-2 text-sm"
            style={fieldStyle}
          />
        </div>
        <div>
          <label className="text-sm font-medium" style={{ color: "var(--rj-ink)" }}>
            {t("emailLabel")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="mt-1.5 w-full rounded-md px-3 py-2 text-sm"
            style={fieldStyle}
          />
        </div>
      </div>

      {/* Turnstile widget (MED-1) — rendered only when a site key is configured. */}
      {turnstileSiteKey && <div ref={widgetRef} className="mt-6" />}

      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--rj-danger, #b3261e)" }} role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleDonate}
        disabled={busy}
        className="mt-6 w-full rounded-md px-5 py-3 text-sm font-semibold disabled:opacity-60"
        style={{ background: "var(--rj-green-cta)", color: "#fff" }}
      >
        {busy
          ? t("processing")
          : `${t("donateCta")}${validAmount ? ` ₹${rupees.toLocaleString("en-IN")}` : ""}`}
      </button>

      <p className="mt-4 text-xs" style={{ color: "var(--rj-ink-soft)", lineHeight: 1.6 }}>
        {t("secured")}
      </p>
    </div>
  );
}
