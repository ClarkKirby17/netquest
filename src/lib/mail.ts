/* Email delivery with two interchangeable providers.
 *
 * Brevo  — verifies a single SENDER ADDRESS, so it can deliver to any
 *          recipient without owning a domain. 300/day free.
 *          Set BREVO_API_KEY and MAIL_FROM (a verified address).
 *
 * Resend — verifies a DOMAIN. Until one is verified it only delivers
 *          to the address the Resend account was created with.
 *          Set RESEND_API_KEY.
 *
 * Neither configured: the code is logged to the server console and,
 * outside production, surfaced in the UI so the flow stays testable.
 *
 * Brevo wins if both are set, because it reaches every recipient.
 */

type Send = { to: string; subject: string; html: string };

async function viaBrevo({ to, subject, html }: Send, key: string) {
  const fromEmail = process.env.MAIL_FROM ?? "";
  if (!fromEmail) {
    console.error("BREVO_API_KEY is set but MAIL_FROM is missing — Brevo needs a verified sender address.");
    return false;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": key,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: process.env.MAIL_FROM_NAME ?? "NetQuest", email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    console.error("Brevo error:", res.status, await res.text());
    return false;
  }
  return true;
}

async function viaResend({ to, subject, html }: Send, key: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM
        ? `${process.env.MAIL_FROM_NAME ?? "NetQuest"} <${process.env.MAIL_FROM}>`
        : "NetQuest <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", res.status, await res.text());
    return false;
  }
  return true;
}

function codeEmailHtml(code: string) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 4px">Verify your email</h2>
      <p style="color:#555;margin:0 0 20px">
        Enter this code to finish creating your NetQuest account. It expires in 15 minutes.
      </p>
      <div style="font-size:34px;font-weight:700;letter-spacing:.35em;background:#0a1220;color:#00f5a0;padding:18px 0;text-align:center;border-radius:12px">${code}</div>
      <p style="color:#999;font-size:12px;margin-top:20px">
        Didn't create an account? You can ignore this email.
      </p>
    </div>`;
}

export async function sendVerificationCode(
  email: string,
  code: string
): Promise<{ delivered: boolean }> {
  const brevo = process.env.BREVO_API_KEY;
  const resend = process.env.RESEND_API_KEY;

  const payload: Send = {
    to: email,
    subject: `${code} is your NetQuest verification code`,
    html: codeEmailHtml(code),
  };

  /* Brevo first — it can reach any recipient. */
  if (brevo) {
    if (await viaBrevo(payload, brevo)) return { delivered: true };
  }
  if (resend) {
    if (await viaResend(payload, resend)) return { delivered: true };
  }

  console.log(`\n  ✉  [dev mail] verification code for ${email}: ${code}\n`);
  return { delivered: false };
}

function resetEmailHtml(code: string) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 4px">Reset your password</h2>
      <p style="color:#555;margin:0 0 20px">
        Enter this code to choose a new NetQuest password. It expires in 15 minutes.
      </p>
      <div style="font-size:34px;font-weight:700;letter-spacing:.35em;background:#0a1220;color:#00f5a0;padding:18px 0;text-align:center;border-radius:12px">${code}</div>
      <p style="color:#999;font-size:12px;margin-top:20px">
        Didn't ask for this? Ignore this email — your password stays unchanged.
      </p>
    </div>`;
}

export async function sendPasswordResetCode(
  email: string,
  code: string
): Promise<{ delivered: boolean }> {
  const brevo = process.env.BREVO_API_KEY;
  const resend = process.env.RESEND_API_KEY;

  const payload: Send = {
    to: email,
    subject: `${code} is your NetQuest password reset code`,
    html: resetEmailHtml(code),
  };

  if (brevo && (await viaBrevo(payload, brevo))) return { delivered: true };
  if (resend && (await viaResend(payload, resend))) return { delivered: true };

  console.log(`\n  ✉  [dev mail] password reset code for ${email}: ${code}\n`);
  return { delivered: false };
}
