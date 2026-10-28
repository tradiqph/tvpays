"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ClipboardList,
  Gift,
  KeyRound,
  RefreshCw,
  Send,
  ShieldOff,
  ShieldPlus,
  UserCheck,
  UserPlus,
  UserX,
  Wallet,
  X,
} from "lucide-react";
import { Button, ErrorNote, Modal, TextArea, useHqAction } from "@/components/hq/controls";
import { SUBSCRIPTION_PLANS } from "@/lib/plans";
import { HQ_WALLET_CREDIT_MAX_PHP } from "@/lib/hq/member-admin";

const php = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function WithdrawalActions({
  id,
  status,
  net,
  gross,
  member,
  destination,
}: {
  id: string;
  status: string;
  net: number;
  gross: number;
  member: string;
  destination: string;
}) {
  const { run, loading, error, setError } = useHqAction();
  const [dialog, setDialog] = useState<"pay" | "reject" | null>(null);
  const [reason, setReason] = useState("");

  const close = () => {
    setDialog(null);
    setError(null);
  };

  if (status === "processing" || status === "frozen") {
    return (
      <div className="flex flex-col gap-1.5">
        <Button variant="secondary" loading={loading} onClick={() => run("/api/hq/withdrawals/sync", { withdrawal_id: id })}>
          <RefreshCw className="h-3.5 w-3.5" /> Sync status
        </Button>
        {status === "frozen" && (
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="danger"
              loading={loading}
              onClick={() =>
                run("/api/hq/withdrawals/resolve", {
                  withdrawal_id: id,
                  outcome: "refund",
                })
              }
            >
              Confirm failed & refund
            </Button>
            <Button
              variant="success"
              loading={loading}
              onClick={() =>
                run("/api/hq/withdrawals/resolve", {
                  withdrawal_id: id,
                  outcome: "completed",
                })
              }
            >
              Mark completed
            </Button>
          </div>
        )}
        {error && <p className="mt-1 text-[11px] text-rose-300">{error}</p>}
      </div>
    );
  }
  if (status !== "pending") return null;

  return (
    <>
      <div className="flex gap-1.5">
        <Button variant="success" onClick={() => setDialog("pay")}>
          <Send className="h-3.5 w-3.5" /> Pay
        </Button>
        <Button variant="secondary" onClick={() => setDialog("reject")}>
          <X className="h-3.5 w-3.5" /> Reject
        </Button>
      </div>

      <Modal open={dialog === "pay"} onClose={close} title="Send payout?">
        <dl className="space-y-2 rounded-xl bg-white/[0.03] p-3 text-sm ring-1 ring-white/[0.06]">
          <div className="flex justify-between"><dt className="text-slate-400">Member</dt><dd className="text-white">{member}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-400">Destination</dt><dd className="text-right text-white">{destination}</dd></div>
          <div className="flex justify-between border-t border-white/[0.06] pt-2"><dt className="text-slate-400">Amount sent</dt><dd className="text-lg font-bold text-emerald-300">{php(net)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-slate-400">This sends the net amount to the member&apos;s e-wallet now. This can&apos;t be undone.</p>
        <ErrorNote error={error} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button
            variant="success"
            loading={loading}
            onClick={async () => (await run("/api/hq/withdrawals/pay", { withdrawal_id: id })) && close()}
          >
            <Send className="h-3.5 w-3.5" /> Send {php(net)}
          </Button>
        </div>
      </Modal>

      <Modal open={dialog === "reject"} onClose={close} title="Reject withdrawal?" tone="danger">
        <p className="mb-3 text-sm text-slate-300">
          {php(gross)} will be returned to {member}&apos;s withdrawable balance and they&apos;ll get an email.
        </p>
        <TextArea
          rows={3}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required, kept in the audit log)"
        />
        <ErrorNote error={error} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button
            variant="danger"
            loading={loading}
            disabled={!reason.trim()}
            onClick={async () => {
              if (await run("/api/hq/withdrawals/reject", { withdrawal_id: id, reason })) {
                setReason("");
                close();
              }
            }}
          >
            Reject & refund
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function AgentActions({ userId, name }: { userId: string; name: string }) {
  const { run, loading, error, setError } = useHqAction();
  const [decision, setDecision] = useState<boolean | null>(null);
  const close = () => {
    setDecision(null);
    setError(null);
  };

  return (
    <>
      <div className="flex gap-1.5">
        <Button variant="success" onClick={() => setDecision(true)}>
          <Check className="h-3.5 w-3.5" /> Approve
        </Button>
        <Button variant="secondary" onClick={() => setDecision(false)}>
          <X className="h-3.5 w-3.5" /> Reject
        </Button>
      </div>
      <Modal
        open={decision !== null}
        onClose={close}
        title={decision ? "Approve agent?" : "Reject application?"}
        tone={decision ? "default" : "danger"}
      >
        <p className="text-sm text-slate-300">
          {name} will be notified by email.
        </p>
        <ErrorNote error={error} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button
            variant={decision ? "success" : "danger"}
            loading={loading}
            onClick={async () => (await run("/api/hq/agents", { user_id: userId, approve: decision })) && close()}
          >
            {decision ? "Approve" : "Reject"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

const PAID_PLANS = SUBSCRIPTION_PLANS.filter(
  (p) => p.pricePhp > 0 && p.slug !== "trial",
);

type UplineOption = {
  id: string;
  display_name: string | null;
  email: string | null;
  referral_code: string;
};

type MemberDialog =
  | "suspend"
  | "reactivate"
  | "reset"
  | "credit"
  | "grant"
  | "upline"
  | "setPassword";

export function MemberAdminActions({
  id,
  suspended,
  canReset,
  isSuper,
  hasUpline,
}: {
  id: string;
  suspended: boolean;
  canReset: boolean;
  isSuper: boolean;
  hasUpline: boolean;
}) {
  const { run, loading, error, setError } = useHqAction();
  const [dialog, setDialog] = useState<MemberDialog | null>(null);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("500");
  const [creditBucket, setCreditBucket] = useState<"deposit" | "withdrawal">(
    "deposit",
  );
  const [adminNote, setAdminNote] = useState("");
  const [planSlug, setPlanSlug] = useState<string>(
    PAID_PLANS[0]?.slug ?? "elite",
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uplineSearch, setUplineSearch] = useState("");
  const [uplineOptions, setUplineOptions] = useState<UplineOption[]>([]);
  const [selectedUpline, setSelectedUpline] = useState<UplineOption | null>(
    null,
  );

  const close = () => {
    setDialog(null);
    setError(null);
  };

  useEffect(() => {
    if (dialog !== "upline") return;
    const q = uplineSearch.trim();
    if (q.length < 2) {
      setUplineOptions([]);
      return;
    }
    const t = window.setTimeout(() => {
      void fetch(
        `/api/hq/members/lookup?q=${encodeURIComponent(q)}&excludeId=${encodeURIComponent(id)}`,
      )
        .then((r) => (r.ok ? r.json() : { rows: [] }))
        .then((json: { rows?: UplineOption[] }) =>
          setUplineOptions(json.rows ?? []),
        );
    }, 300);
    return () => window.clearTimeout(t);
  }, [dialog, uplineSearch, id]);

  async function confirmAction() {
    if (!dialog) return;

    if (dialog === "credit") {
      const amount = Number(creditAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Enter a valid amount");
        return;
      }
      if (
        await run(`/api/hq/members/${id}/credit-wallet`, {
          amount,
          bucket: creditBucket,
          note: adminNote.trim() || undefined,
        })
      ) {
        setDone("Wallet credited.");
        close();
      }
      return;
    }

    if (dialog === "grant") {
      if (
        await run(`/api/hq/members/${id}/grant-plan`, {
          slug: planSlug,
          note: adminNote.trim() || undefined,
        })
      ) {
        setDone("Plan granted.");
        close();
      }
      return;
    }

    if (dialog === "upline") {
      if (!selectedUpline) {
        setError("Select an upline member");
        return;
      }
      if (
        await run(`/api/hq/members/${id}/assign-upline`, {
          uplineId: selectedUpline.id,
        })
      ) {
        setDone("Upline assigned.");
        close();
      }
      return;
    }

    if (dialog === "setPassword") {
      if (newPassword.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (
        await run(`/api/hq/members/${id}/set-password`, {
          password: newPassword,
        })
      ) {
        setDone("Password updated.");
        setNewPassword("");
        setConfirmPassword("");
        close();
      }
      return;
    }

    const action = dialog === "reset" ? "reset_password" : dialog;
    if (await run(`/api/hq/members/${id}`, { action, reason })) {
      setDone(dialog === "reset" ? "Reset email sent." : null);
      setReason("");
      close();
    }
  }

  const modalTitle = (() => {
    switch (dialog) {
      case "suspend":
        return "Suspend this member?";
      case "reactivate":
        return "Reactivate this member?";
      case "reset":
        return "Send password reset?";
      case "credit":
        return "Credit wallet";
      case "grant":
        return "Grant plan";
      case "upline":
        return "Assign upline";
      case "setPassword":
        return "Set password";
      default:
        return "";
    }
  })();

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/hq/members/${id}/audit`}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.1]"
        >
          <ClipboardList className="h-3.5 w-3.5" /> Audit account
        </Link>
        {canReset && (
          <Button variant="secondary" onClick={() => setDialog("reset")}>
            <KeyRound className="h-3.5 w-3.5" /> Send password reset
          </Button>
        )}
        {isSuper && (
          <>
            <Button variant="secondary" onClick={() => setDialog("setPassword")}>
              <KeyRound className="h-3.5 w-3.5" /> Set password
            </Button>
            <Button variant="secondary" onClick={() => setDialog("credit")}>
              <Wallet className="h-3.5 w-3.5" /> Credit wallet
            </Button>
            <Button variant="secondary" onClick={() => setDialog("grant")}>
              <Gift className="h-3.5 w-3.5" /> Grant plan
            </Button>
            {!hasUpline && (
              <Button variant="secondary" onClick={() => setDialog("upline")}>
                <UserPlus className="h-3.5 w-3.5" /> Assign upline
              </Button>
            )}
          </>
        )}
        {suspended ? (
          <Button variant="success" onClick={() => setDialog("reactivate")}>
            <UserCheck className="h-3.5 w-3.5" /> Reactivate
          </Button>
        ) : (
          <Button variant="danger" onClick={() => setDialog("suspend")}>
            <UserX className="h-3.5 w-3.5" /> Suspend
          </Button>
        )}
      </div>
      {done && <p className="mt-2 text-xs text-emerald-300">{done}</p>}

      <Modal
        open={dialog !== null}
        onClose={close}
        tone={dialog === "suspend" ? "danger" : "default"}
        title={modalTitle}
      >
        {dialog === "suspend" && (
          <>
            <p className="mb-3 text-sm text-slate-300">
              They won&apos;t be able to sign in. Sessions already open end within about an hour.
            </p>
            <TextArea
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (kept in the audit log)"
            />
          </>
        )}
        {dialog === "reactivate" && (
          <p className="mb-3 text-sm text-slate-300">
            They&apos;ll be able to sign in again.
          </p>
        )}
        {dialog === "reset" && (
          <p className="mb-3 text-sm text-slate-300">
            We&apos;ll email them a link to set a new password (Supabase Auth).
          </p>
        )}
        {dialog === "credit" && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-400">
              Adds balance with an HQ audit ledger entry. Max ₱
              {HQ_WALLET_CREDIT_MAX_PHP.toLocaleString("en-PH")}.
            </p>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Bucket
              <select
                value={creditBucket}
                onChange={(e) =>
                  setCreditBucket(e.target.value as "deposit" | "withdrawal")
                }
                className="rounded-xl border border-white/10 bg-[#0a1630] px-3 py-2 text-slate-200"
              >
                <option value="deposit">Deposit (top-up balance)</option>
                <option value="withdrawal">Withdrawable (earnings)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Amount (PHP)
              <input
                type="number"
                min={1}
                max={HQ_WALLET_CREDIT_MAX_PHP}
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Note (optional)
              <input
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                maxLength={500}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
              />
            </label>
          </div>
        )}
        {dialog === "grant" && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-400">
              Activates the plan without charging the member. No referral payouts.
            </p>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Plan
              <select
                value={planSlug}
                onChange={(e) => setPlanSlug(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0a1630] px-3 py-2 text-slate-200"
              >
                {PAID_PLANS.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Note (optional)
              <input
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                maxLength={500}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
              />
            </label>
          </div>
        )}
        {dialog === "upline" && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-400">
              One-time link to an upline. Retroactive referral commissions are not applied.
            </p>
            <input
              value={uplineSearch}
              onChange={(e) => {
                setUplineSearch(e.target.value);
                setSelectedUpline(null);
              }}
              placeholder="Search name, code, or email…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
            />
            <ul className="max-h-36 space-y-1 overflow-y-auto">
              {uplineOptions.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedUpline(opt)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                      selectedUpline?.id === opt.id
                        ? "bg-sky-500/20 ring-1 ring-sky-400/40"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="font-medium text-white">
                      {opt.display_name ?? "Unnamed"}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {opt.email ?? opt.referral_code}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {dialog === "setPassword" && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-400">
              Set a new sign-in password directly. Share it with the member securely.
            </p>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
            />
          </div>
        )}
        <ErrorNote error={error} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant={dialog === "suspend" ? "danger" : "primary"}
            loading={loading}
            onClick={confirmAction}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </>
  );
}

/** @deprecated use MemberAdminActions */
export const MemberActions = MemberAdminActions;

export function GrantAccessForm() {
  const { run, loading, error } = useHqAction();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"hq" | "super_admin">("hq");
  const [ok, setOk] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setOk(null);
        if (await run("/api/hq/team", { email, role })) {
          setOk(`${email} now has ${role === "super_admin" ? "super admin" : "HQ"} access.`);
          setEmail("");
        }
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="member@email.com"
          className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50 md:text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "hq" | "super_admin")}
          className="h-10 rounded-xl border border-white/10 bg-[#0a1630] px-3 text-base text-slate-200 md:text-sm"
        >
          <option value="hq">HQ staff</option>
          <option value="super_admin">Super admin</option>
        </select>
        <Button type="submit" loading={loading} className="h-10">
          <ShieldPlus className="h-4 w-4" /> Grant access
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        The person must already have a TvPays account. They need to sign out and back in for it to take effect.
      </p>
      <ErrorNote error={error} />
      {ok && <p className="mt-2 text-xs text-emerald-300">{ok}</p>}
    </form>
  );
}

export function StaffRowActions({
  email,
  role,
  isSelf,
}: {
  email: string;
  role: "hq" | "super_admin";
  isSelf: boolean;
}) {
  const { run, loading, error, setError } = useHqAction();
  const [confirm, setConfirm] = useState<"revoke" | "swap" | null>(null);
  if (isSelf) return <span className="text-xs text-slate-500">You</span>;
  const other = role === "hq" ? "super_admin" : "hq";
  const close = () => {
    setConfirm(null);
    setError(null);
  };

  return (
    <>
      <div className="flex gap-1.5">
        <Button variant="secondary" onClick={() => setConfirm("swap")}>
          Make {other === "hq" ? "HQ staff" : "super admin"}
        </Button>
        <Button variant="ghost" onClick={() => setConfirm("revoke")} className="text-rose-300">
          <ShieldOff className="h-3.5 w-3.5" /> Revoke
        </Button>
      </div>
      <Modal
        open={confirm !== null}
        onClose={close}
        tone={confirm === "revoke" ? "danger" : "default"}
        title={confirm === "revoke" ? "Revoke HQ access?" : "Change role?"}
      >
        <p className="text-sm text-slate-300">
          {confirm === "revoke"
            ? `${email} will lose access to the HQ console.`
            : `${email} will become ${other === "hq" ? "HQ staff" : "a super admin"}.`}
        </p>
        <ErrorNote error={error} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button
            variant={confirm === "revoke" ? "danger" : "primary"}
            loading={loading}
            onClick={async () =>
              (await run("/api/hq/team", { email, role: confirm === "revoke" ? "none" : other })) && close()
            }
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </>
  );
}

type Health = {
  provider: string;
  label: string;
  ok: boolean;
  items: number;
  ms: number;
  error: string | null;
};

export function ProviderHealthCheck({ providers }: { providers: { key: string; label: string }[] }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Health[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hq/system/health", { method: "POST" });
      const json = (await res.json()) as { results?: Health[]; checkedAt?: string; error?: string };
      if (!res.ok || !json.results) throw new Error(json.error ?? "Check failed");
      setResults(json.results);
      setCheckedAt(json.checkedAt ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setLoading(false);
    }
  }

  const byKey = new Map(results?.map((r) => [r.provider, r]));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          {checkedAt
            ? `Checked ${new Date(checkedAt).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila" })}`
            : "Uses one API request per source. Results may be cached up to 5 minutes."}
        </p>
        <Button onClick={check} loading={loading}>
          <RefreshCw className="h-3.5 w-3.5" /> Run check
        </Button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {providers.map((p) => {
          const r = byKey.get(p.key);
          const state = !r ? "unknown" : r.ok ? "ok" : "down";
          return (
            <li
              key={p.key}
              className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.06]"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  state === "ok"
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : state === "down"
                      ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"
                      : "bg-slate-600"
                } ${loading ? "animate-pulse" : ""}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100">{p.label}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {!r ? p.key : r.ok ? `${r.items} titles · ${r.ms} ms` : r.error}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <ErrorNote error={error} />
    </div>
  );
}
