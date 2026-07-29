/* Email delivery. With RESEND_API_KEY set, sends through Resend's
   HTTP API (no SDK needed). Without it — local dev — the code is
   printed to the server console and surfaced on the verify page,
   so the whole flow is testable offline. */

const RESEND_URL = "https://api.resend.com/emails";

export async function sendVerificationCode(
  email: string,
  code: string
): Promise<{ delivered: boolean }> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.log(`\n  ✉  [dev mail] verification code for ${email}: ${code}\n`);
    return { delivered: false };
  }

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "NetQuest <onboarding@resend.dev>",
      to: [email],
      subject: `${code} is your NetQuest verification code`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 4px">Verify your email</h2>
          <p style="color:#555;margin:0 0 20px">Enter this code to finish creating your NetQuest account. It expires in 15 minutes.</p>
          <div style="font-size:34px;font-weight:700;letter-spacing:.35em;background:#0a1220;color:#00f5a0;padding:18px 0;text-align:center;border-radius:12px">${code}</div>
          <p style="color:#999;font-size:12px;margin-top:20px">Didn't create an account? You can ignore this email.</p>
        </div>`,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", res.status, await res.text());
    return { delivered: false };
  }
  return { delivered: true };
}
