export function passwordResetEmailHtml(opts: {
  resetUrl: string;
  expiresMinutes?: number;
}): string {
  const mins = opts.expiresMinutes ?? 60;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset your TvPays password</title>
</head>
<body style="margin:0;padding:0;background:#020814;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#020814 0%,#001428 100%);padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#061a3d;border:1px solid rgba(56,140,255,0.35);border-radius:20px;overflow:hidden;box-shadow:0 0 40px rgba(0,120,255,0.25);">
          <tr>
            <td style="padding:28px 32px 8px;text-align:center;background:linear-gradient(135deg,#0d2a6e 0%,#061a3d 100%);">
              <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#7dd3fc;">TvPays Security</p>
              <h1 style="margin:12px 0 0;font-size:24px;font-weight:800;color:#ffffff;">Reset your password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;color:#cbd5e1;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;">We received a request to reset the password for your TvPays account. Tap the button below to choose a new password.</p>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:13px;">This link expires in <strong style="color:#e2e8f0;">${mins} minutes</strong>. If you did not request this, you can ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 28px;">
              <a href="${opts.resetUrl}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#2563eb);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;box-shadow:0 0 24px rgba(37,99,235,0.45);">Reset password</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0;font-size:12px;color:#64748b;word-break:break-all;">Or copy this link:<br /><a href="${opts.resetUrl}" style="color:#7dd3fc;">${opts.resetUrl}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid rgba(148,163,184,0.15);text-align:center;">
              <p style="margin:0;font-size:11px;color:#64748b;">Watch • Click • Earn · © ${year} TvPays</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
