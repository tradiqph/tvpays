"use client";

import { useEffect, useState } from "react";
import { SlideSheet } from "@/components/member/SlideSheet";
import { AlertDialog } from "@/components/member/AlertDialog";
import {
  clearSavedWithdrawDestination,
  getSavedWithdrawDestination,
  saveWithdrawDestination,
} from "@/lib/withdraw-destination";
import {
  filterGotymeAccountDigits,
  filterPayerNameLetters,
  filterPhMobileDigits,
  GOTYME_ACCOUNT_MAX_DIGITS,
  GOTYME_ACCOUNT_MIN_DIGITS,
  GOTYME_ACCOUNT_RULE_MESSAGE,
  normalizeGotymeAccount,
  normalizePhMobile,
  parseWithdrawMethod,
  validateGcashPayerName,
} from "@/lib/starpago";
import { WITHDRAWAL_TAX_RATE } from "@/lib/plans";
import { MAX_MEMBER_WITHDRAWALS_PER_DAY } from "@/lib/withdrawals";

type Props = {
  open: boolean;
  onClose: () => void;
  maxAmount: number;
  onSuccess: () => void;
  /** Super admins pay no withdrawal tax (net = gross). */
  taxExempt?: boolean;
};

export function WithdrawSheet({
  open,
  onClose,
  maxAmount,
  onSuccess,
  taxExempt = false,
}: Props) {
  const [amount, setAmount] = useState("200");
  const [destinationType, setDestinationType] = useState("gcash");
  const [destinationNumber, setDestinationNumber] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saveDetails, setSaveDetails] = useState(false);
  const [gotymeBlocked09, setGotymeBlocked09] = useState(false);
  const isGotyme = destinationType === "gotyme";

  useEffect(() => {
    if (!open) return;
    const saved = getSavedWithdrawDestination();
    if (saved) {
      setDestinationType(saved.destinationType);
      setDestinationNumber(
        saved.destinationType === "gotyme"
          ? filterGotymeAccountDigits(saved.destinationNumber)
          : filterPhMobileDigits(saved.destinationNumber),
      );
      setDestinationName(filterPayerNameLetters(saved.destinationName));
      setSaveDetails(true);
    }
  }, [open]);

  function changeDestinationType(next: string) {
    const wasGotyme = destinationType === "gotyme";
    setDestinationType(next);
    setGotymeBlocked09(false);
    // Account number and mobile number formats differ — don't carry one into the other.
    if (wasGotyme !== (next === "gotyme")) setDestinationNumber("");
  }

  function changeDestinationNumber(raw: string) {
    if (isGotyme) {
      const digits = raw.replace(/\D/g, "");
      setGotymeBlocked09(digits.startsWith("09"));
      setDestinationNumber(filterGotymeAccountDigits(raw));
    } else {
      setDestinationNumber(filterPhMobileDigits(raw));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const mobile = isGotyme
      ? normalizeGotymeAccount(destinationNumber)
      : normalizePhMobile(destinationNumber);
    if (!mobile) {
      setError(
        isGotyme
          ? `Enter a valid GoTyme account number (${GOTYME_ACCOUNT_MIN_DIGITS}–${GOTYME_ACCOUNT_MAX_DIGITS} digits). ${GOTYME_ACCOUNT_RULE_MESSAGE}.`
          : "Enter a valid mobile number: 11 digits starting with 09",
      );
      return;
    }
    const nameErr = validateGcashPayerName(destinationName);
    if (nameErr) {
      setError(nameErr);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        destination_type: destinationType,
        destination_number: mobile,
        destination_name: destinationName.trim(),
      }),
    });
    const json = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Withdrawal failed");
      return;
    }
    const destType = parseWithdrawMethod(destinationType) ?? "gcash";
    if (saveDetails) {
      saveWithdrawDestination({
        destinationType: destType,
        destinationNumber: mobile,
        destinationName: destinationName.trim(),
      });
    } else {
      clearSavedWithdrawDestination();
    }
    onSuccess();
    onClose();
    setSubmitted(true);
  }

  return (
    <>
    <SlideSheet open={open} onClose={onClose}>
      <form
        onSubmit={submit}
        className="rounded-t-3xl border border-emerald-500/30 bg-[#001428] p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Withdraw</h2>
          <button type="button" onClick={onClose} className="text-slate-400">
            Close
          </button>
        </div>
        <p className="mb-2 text-xs text-slate-400">
          Available: ₱{maxAmount.toFixed(2)} •{" "}
          {taxExempt
            ? "no tax"
            : `${Math.round(WITHDRAWAL_TAX_RATE * 100)}% tax`}{" "}
          • min ₱200 • max {MAX_MEMBER_WITHDRAWALS_PER_DAY}/day
        </p>
        <input
          type="number"
          min={200}
          max={maxAmount}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mb-3 w-full rounded-xl border border-sky-800 bg-slate-950 px-3 py-2 text-white"
        />
        <select
          value={destinationType}
          onChange={(e) => changeDestinationType(e.target.value)}
          className="mb-2 w-full rounded-xl border border-sky-800 bg-slate-950 px-3 py-2 text-white"
        >
          <option value="gcash">GCash</option>
          <option value="maya">Maya</option>
          <option value="gotyme">GoTyme Bank</option>
        </select>
        {isGotyme ? (
          <>
            <input
              key="gotyme-account"
              required
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={GOTYME_ACCOUNT_MAX_DIGITS}
              pattern={`(?!09)[0-9]{${GOTYME_ACCOUNT_MIN_DIGITS},${GOTYME_ACCOUNT_MAX_DIGITS}}`}
              title={GOTYME_ACCOUNT_RULE_MESSAGE}
              placeholder="12-digit GoTyme account number"
              value={destinationNumber}
              onChange={(e) => changeDestinationNumber(e.target.value)}
              aria-describedby="gotyme-number-hint"
              className={`mb-1 w-full rounded-xl border bg-slate-950 px-3 py-2 text-white ${
                gotymeBlocked09 ? "border-red-500" : "border-sky-800"
              }`}
            />
            <p
              id="gotyme-number-hint"
              className={`mb-2 text-xs ${gotymeBlocked09 ? "text-red-400" : "text-amber-300/90"}`}
            >
              {gotymeBlocked09
                ? "That looks like a mobile number. GoTyme account numbers do not start with 09."
                : "Enter your 12-digit GoTyme Bank account number (from the app). Not a phone number — does not start with 09."}
            </p>
          </>
        ) : (
          <input
            key="ewallet-mobile"
            required
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={11}
            pattern="09[0-9]{9}"
            title="11-digit mobile number starting with 09"
            placeholder="GCash / Maya mobile (09XXXXXXXXX)"
            value={destinationNumber}
            onChange={(e) => changeDestinationNumber(e.target.value)}
            className="mb-2 w-full rounded-xl border border-sky-800 bg-slate-950 px-3 py-2 text-white"
          />
        )}
        <input
          required
          autoComplete="name"
          placeholder="Account name (letters only)"
          value={destinationName}
          onChange={(e) => setDestinationName(filterPayerNameLetters(e.target.value))}
          className="mb-3 w-full rounded-xl border border-sky-800 bg-slate-950 px-3 py-2 text-white"
        />
        <label className="mb-4 flex cursor-pointer items-start gap-3 text-left">
          <input
            type="checkbox"
            checked={saveDetails}
            onChange={(e) => setSaveDetails(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-sky-700 bg-slate-950 accent-emerald-500"
          />
          <span className="text-sm text-slate-300">
            Save payment details for next time
            <span className="mt-0.5 block text-xs text-slate-500">
              Stored on this device only.
            </span>
          </span>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-green-700 py-3 font-semibold text-white"
        >
          {loading ? "Submitting…" : "Request withdrawal"}
        </button>
      </form>
    </SlideSheet>
    <AlertDialog
      open={error != null}
      onClose={() => setError(null)}
      title="Withdrawal failed"
      message={error}
    />
    <AlertDialog
      open={submitted}
      onClose={() => setSubmitted(false)}
      tone="success"
      title="Withdrawal requested"
      message="Your request was submitted. We'll notify you once it's processed."
    />
    </>
  );
}
