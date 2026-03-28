"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Eye, EyeOff } from "lucide-react";

type Plan = "launch" | "growth" | "portfolio";
type BillingCycle = "monthly" | "annual";

interface PlanInfo {
  id: Plan;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
}

const PLANS: PlanInfo[] = [
  {
    id: "launch",
    name: "Launch",
    monthlyPrice: 499,
    annualPrice: 399,
    description: "Perfect for getting started with 1-5 facilities",
    features: [
      "Up to 10 facilities",
      "Google & Meta ad management",
      "Monthly performance reports",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 999,
    annualPrice: 799,
    description: "For growing operators scaling their portfolio",
    features: [
      "Up to 50 facilities",
      "All Launch features",
      "A/B testing & optimization",
      "Priority support",
      "Custom landing pages",
    ],
  },
  {
    id: "portfolio",
    name: "Portfolio",
    monthlyPrice: 1499,
    annualPrice: 1199,
    description: "Full-service marketing for large operators",
    features: [
      "Unlimited facilities",
      "All Growth features",
      "White-label reports",
      "Dedicated account manager",
      "API access",
    ],
  },
];

function getPasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"] as const;
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] };
}

const STRENGTH_COLORS: Record<number, string> = {
  0: "var(--color-light-gray)",
  1: "var(--color-red)",
  2: "var(--color-gold)",
  3: "var(--color-blue)",
  4: "var(--color-green)",
};

interface FormErrors {
  companyName?: string;
  contactName?: string;
  email?: string;
  password?: string;
  general?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedPlan, setSelectedPlan] = useState<Plan>("launch");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [facilityCount, setFacilityCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (
      planParam &&
      (planParam === "launch" ||
        planParam === "growth" ||
        planParam === "portfolio")
    ) {
      setSelectedPlan(planParam);
    }
  }, [searchParams]);

  const passwordStrength = getPasswordStrength(password);

  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};
    if (!companyName.trim()) errs.companyName = "Company name is required";
    if (!contactName.trim()) errs.contactName = "Your name is required";
    if (!email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address";
    }
    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    }
    return errs;
  }, [companyName, contactName, email, password]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          email: email.trim().toLowerCase(),
          password,
          plan: selectedPlan,
          facilityCount: facilityCount ? parseInt(facilityCount, 10) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.error || "Something went wrong" });
        setSubmitting(false);
        return;
      }

      // Save session in same format as use-partner-auth.ts
      const session = {
        token: data.token,
        user: data.user,
        organization: data.organization,
      };
      localStorage.setItem(
        "storageads_partner_session",
        JSON.stringify(session)
      );

      router.push("/partner");
    } catch {
      setErrors({ general: "Network error. Please check your connection and try again." });
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen py-8 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: "var(--color-light)" }}
    >
      <div className="mx-auto max-w-4xl">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" aria-label="StorageAds home">
            <span
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <span style={{ color: "var(--color-dark)" }}>storage</span>
              <span style={{ color: "var(--color-gold)" }}>ads</span>
            </span>
          </Link>
        </div>

        {/* Heading */}
        <div className="mb-8 text-center">
          <h1
            className="mb-2 text-2xl font-semibold sm:text-3xl"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-dark)",
            }}
          >
            Start your 14-day free trial
          </h1>
          <p
            className="text-base"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-body-text)",
            }}
          >
            No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <span
            className="text-sm font-medium"
            style={{
              fontFamily: "var(--font-heading)",
              color:
                billingCycle === "monthly"
                  ? "var(--color-dark)"
                  : "var(--color-body-text)",
            }}
          >
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={billingCycle === "annual"}
            aria-label="Toggle annual billing"
            onClick={() =>
              setBillingCycle((c) =>
                c === "monthly" ? "annual" : "monthly"
              )
            }
            className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              backgroundColor:
                billingCycle === "annual"
                  ? "var(--color-gold)"
                  : "var(--color-light-gray)",
              outlineColor: "var(--color-gold)",
            }}
          >
            <span
              className="pointer-events-none block h-5 w-5 rounded-full shadow-sm transition-transform"
              style={{
                backgroundColor: "var(--color-light)",
                transform:
                  billingCycle === "annual"
                    ? "translateX(22px)"
                    : "translateX(4px)",
              }}
            />
          </button>
          <span
            className="text-sm font-medium"
            style={{
              fontFamily: "var(--font-heading)",
              color:
                billingCycle === "annual"
                  ? "var(--color-dark)"
                  : "var(--color-body-text)",
            }}
          >
            Annual
            <span
              className="ml-1 text-xs"
              style={{ color: "var(--color-green)" }}
            >
              Save 20%
            </span>
          </span>
        </div>

        {/* Plan cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const price =
              billingCycle === "monthly"
                ? plan.monthlyPrice
                : plan.annualPrice;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                aria-pressed={isSelected}
                className="relative rounded-lg p-5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: isSelected
                    ? "var(--color-gold-light)"
                    : "#ffffff",
                  border: isSelected
                    ? "2px solid var(--color-gold)"
                    : "2px solid var(--color-light-gray)",
                  outlineColor: "var(--color-gold)",
                }}
              >
                {isSelected && (
                  <span
                    className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--color-gold)" }}
                  >
                    <Check size={12} style={{ color: "var(--color-light)" }} />
                  </span>
                )}
                <h3
                  className="mb-1 text-lg font-semibold"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-dark)",
                  }}
                >
                  {plan.name}
                </h3>
                <div className="mb-2">
                  <span
                    className="text-2xl font-semibold"
                    style={{
                      fontFamily: "var(--font-heading)",
                      color: "var(--color-dark)",
                    }}
                  >
                    ${price}
                  </span>
                  <span
                    className="text-sm"
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-body-text)",
                    }}
                  >
                    /mo
                  </span>
                </div>
                <p
                  className="mb-3 text-sm leading-relaxed"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-body-text)",
                  }}
                >
                  {plan.description}
                </p>
                <ul className="space-y-1.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                      style={{
                        fontFamily: "var(--font-body)",
                        color: "var(--color-body-text)",
                      }}
                    >
                      <Check
                        size={14}
                        className="mt-0.5 shrink-0"
                        style={{ color: "var(--color-green)" }}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Signup form */}
        <div
          className="mx-auto max-w-lg rounded-lg p-6 sm:p-8"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid var(--color-light-gray)",
          }}
        >
          {errors.general && (
            <div
              className="mb-4 rounded-md px-4 py-3 text-sm"
              role="alert"
              style={{
                backgroundColor: "var(--color-red-light)",
                color: "var(--color-red)",
                fontFamily: "var(--font-body)",
              }}
            >
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              {/* Company name */}
              <div>
                <label
                  htmlFor="companyName"
                  className="mb-1 block text-sm font-medium"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-dark)",
                  }}
                >
                  Company name
                </label>
                <input
                  id="companyName"
                  type="text"
                  required
                  autoComplete="organization"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (errors.companyName)
                      setErrors((prev) => ({ ...prev, companyName: undefined }));
                  }}
                  className="w-full rounded-md px-3 py-2.5 text-sm transition-colors focus:outline-2 focus:outline-offset-1"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-dark)",
                    backgroundColor: "var(--color-light)",
                    border: errors.companyName
                      ? "1px solid var(--color-red)"
                      : "1px solid var(--color-light-gray)",
                    outlineColor: "var(--color-gold)",
                  }}
                  aria-invalid={!!errors.companyName}
                  aria-describedby={
                    errors.companyName ? "companyName-error" : undefined
                  }
                />
                {errors.companyName && (
                  <p
                    id="companyName-error"
                    className="mt-1 text-xs"
                    style={{
                      color: "var(--color-red)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {errors.companyName}
                  </p>
                )}
              </div>

              {/* Your name */}
              <div>
                <label
                  htmlFor="contactName"
                  className="mb-1 block text-sm font-medium"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-dark)",
                  }}
                >
                  Your name
                </label>
                <input
                  id="contactName"
                  type="text"
                  required
                  autoComplete="name"
                  value={contactName}
                  onChange={(e) => {
                    setContactName(e.target.value);
                    if (errors.contactName)
                      setErrors((prev) => ({ ...prev, contactName: undefined }));
                  }}
                  className="w-full rounded-md px-3 py-2.5 text-sm transition-colors focus:outline-2 focus:outline-offset-1"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-dark)",
                    backgroundColor: "var(--color-light)",
                    border: errors.contactName
                      ? "1px solid var(--color-red)"
                      : "1px solid var(--color-light-gray)",
                    outlineColor: "var(--color-gold)",
                  }}
                  aria-invalid={!!errors.contactName}
                  aria-describedby={
                    errors.contactName ? "contactName-error" : undefined
                  }
                />
                {errors.contactName && (
                  <p
                    id="contactName-error"
                    className="mt-1 text-xs"
                    style={{
                      color: "var(--color-red)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {errors.contactName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-dark)",
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email)
                      setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className="w-full rounded-md px-3 py-2.5 text-sm transition-colors focus:outline-2 focus:outline-offset-1"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-dark)",
                    backgroundColor: "var(--color-light)",
                    border: errors.email
                      ? "1px solid var(--color-red)"
                      : "1px solid var(--color-light-gray)",
                    outlineColor: "var(--color-gold)",
                  }}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p
                    id="email-error"
                    className="mt-1 text-xs"
                    style={{
                      color: "var(--color-red)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-dark)",
                  }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password)
                        setErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                    }}
                    className="w-full rounded-md px-3 py-2.5 pr-10 text-sm transition-colors focus:outline-2 focus:outline-offset-1"
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-dark)",
                      backgroundColor: "var(--color-light)",
                      border: errors.password
                        ? "1px solid var(--color-red)"
                        : "1px solid var(--color-light-gray)",
                      outlineColor: "var(--color-gold)",
                    }}
                    aria-invalid={!!errors.password}
                    aria-describedby="password-strength password-error"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={16}
                        style={{ color: "var(--color-mid-gray)" }}
                      />
                    ) : (
                      <Eye
                        size={16}
                        style={{ color: "var(--color-mid-gray)" }}
                      />
                    )}
                  </button>
                </div>
                {/* Strength indicator */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="mb-1 flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{
                            backgroundColor:
                              passwordStrength.score >= level
                                ? STRENGTH_COLORS[passwordStrength.score]
                                : "var(--color-light-gray)",
                          }}
                        />
                      ))}
                    </div>
                    <p
                      id="password-strength"
                      className="text-xs"
                      style={{
                        fontFamily: "var(--font-body)",
                        color: STRENGTH_COLORS[passwordStrength.score],
                      }}
                    >
                      {passwordStrength.label}
                    </p>
                  </div>
                )}
                {errors.password && (
                  <p
                    id="password-error"
                    className="mt-1 text-xs"
                    style={{
                      color: "var(--color-red)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Facility count */}
              <div>
                <label
                  htmlFor="facilityCount"
                  className="mb-1 block text-sm font-medium"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-dark)",
                  }}
                >
                  Number of facilities{" "}
                  <span
                    className="font-normal"
                    style={{ color: "var(--color-mid-gray)" }}
                  >
                    (optional)
                  </span>
                </label>
                <input
                  id="facilityCount"
                  type="number"
                  min="1"
                  max="9999"
                  value={facilityCount}
                  onChange={(e) => setFacilityCount(e.target.value)}
                  className="w-full rounded-md px-3 py-2.5 text-sm transition-colors focus:outline-2 focus:outline-offset-1"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-dark)",
                    backgroundColor: "var(--color-light)",
                    border: "1px solid var(--color-light-gray)",
                    outlineColor: "var(--color-gold)",
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-md px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--color-light)",
                backgroundColor: submitting
                  ? "var(--color-gold-hover)"
                  : "var(--color-gold)",
                outlineColor: "var(--color-gold)",
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "var(--color-gold-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "var(--color-gold)";
                }
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="opacity-25"
                    />
                    <path
                      d="M4 12a8 8 0 018-8"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Creating your account...
                </span>
              ) : (
                "Start 14-day free trial"
              )}
            </button>
          </form>

          <p
            className="mt-4 text-center text-sm"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-body-text)",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/partner"
              className="font-medium underline underline-offset-2 transition-colors"
              style={{ color: "var(--color-gold)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color =
                  "var(--color-gold-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color =
                  "var(--color-gold)";
              }}
            >
              Log in
            </Link>
          </p>
        </div>

        {/* Footer note */}
        <p
          className="mt-6 text-center text-xs"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-mid-gray)",
          }}
        >
          By signing up you agree to our{" "}
          <Link
            href="/terms"
            className="underline underline-offset-2"
            style={{ color: "var(--color-body-text)" }}
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2"
            style={{ color: "var(--color-body-text)" }}
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
