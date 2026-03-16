/**
 * Zepto Mail Service — NyayaSahayak
 * Uses Zepto Mail's Email Sending API (Transactional)
 * Docs: https://www.zeptomail.com/api-docs/
 */

const ZEPTO_API_URL = "https://api.zeptomail.in/v1.1/email";

interface EmailPayload {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

async function _sendEmail(payload: EmailPayload): Promise<boolean> {
  // Support both ZEPTO_API_TOKEN and ZEPTOMAIL_API_TOKEN naming conventions
  const apiToken = process.env.ZEPTO_API_TOKEN ?? process.env.ZEPTOMAIL_API_TOKEN;
  const fromEmail = process.env.ZEPTO_FROM_EMAIL ?? process.env.ZEPTOMAIL_FROM_EMAIL ?? "noreply@nyayasahayak.com";
  const fromName = process.env.ZEPTO_FROM_NAME ?? process.env.ZEPTOMAIL_FROM_NAME ?? "NyayaSahayak";

  if (!apiToken) {
    console.warn("[Email] ZEPTO_API_TOKEN / ZEPTOMAIL_API_TOKEN not set — skipping email send");
    console.log(`[Email] Would send to ${payload.to}: ${payload.subject}`);
    return true; // Don't block flow if email is not configured
  }

  const body = {
    from: { address: fromEmail, name: fromName },
    to: [{ email_address: { address: payload.to, name: payload.toName ?? payload.to } }],
    subject: payload.subject,
    htmlbody: payload.htmlBody,
    textbody: payload.textBody ?? stripHtml(payload.htmlBody),
  };

  try {
    const res = await fetch(ZEPTO_API_URL, {
      method: "POST",
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.text();
      console.error(`[Email] Zepto API error ${res.status}: ${errData}`);
      return false;
    }

    console.log(`[Email] ✅ Sent to ${payload.to}: ${payload.subject}`);
    return true;
  } catch (error) {
    console.error(`[Email] Network error sending to ${payload.to}:`, error);
    return false;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// ─── Email Templates ──────────────────────────────────────────────────────────

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 560px;
  margin: 0 auto;
  background: #f8fafc;
  padding: 20px;
`;

const cardStyle = `
  background: white;
  border-radius: 12px;
  padding: 32px;
  border: 1px solid #e2e8f0;
  margin: 16px 0;
`;

const btnStyle = `
  display: inline-block;
  background: #1e3a5f;
  color: white;
  text-decoration: none;
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  margin: 16px 0;
`;

const footerStyle = `
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  margin-top: 24px;
`;

function emailWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
    <body style="margin:0;padding:0;background:#f8fafc;">
      <div style="${baseStyle}">
        <!-- Header -->
        <div style="text-align:center;padding:16px 0 8px;">
          <span style="font-size:22px;font-weight:700;color:#1e3a5f;">⚖ NyayaSahayak</span>
        </div>
        <!-- Card -->
        <div style="${cardStyle}">
          ${content}
        </div>
        <!-- Footer -->
        <div style="${footerStyle}">
          <p>NyayaSahayak · Legal Case Management</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>© ${new Date().getFullYear()} NyayaSahayak. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ─── Public Functions ─────────────────────────────────────────────────────────

/**
 * Generic email send — used by cron jobs and other automated senders.
 */
export async function sendEmail(params: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  return _sendEmail({
    to: params.to,
    toName: params.toName,
    subject: params.subject,
    htmlBody: params.html,
  });
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationUrl: string
): Promise<boolean> {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Verify your email address</h2>
    <p style="color:#475569;margin:0 0 24px;">Hi ${name}, welcome to NyayaSahayak! Please verify your email address to activate your account and start your 14-day free trial.</p>
    <div style="text-align:center;">
      <a href="${verificationUrl}" style="${btnStyle}">Verify Email Address</a>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin-top:16px;">This link expires in <strong>24 hours</strong>. If you didn't sign up for NyayaSahayak, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0;" />
    <p style="color:#64748b;font-size:12px;word-break:break-all;">Or copy and paste this URL:<br/>${verificationUrl}</p>
  `);

  return _sendEmail({
    to: email,
    toName: name,
    subject: "Verify your NyayaSahayak email address",
    htmlBody: html,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Reset your password</h2>
    <p style="color:#475569;margin:0 0 24px;">Hi ${name}, we received a request to reset your NyayaSahayak password. Click the button below to set a new password.</p>
    <div style="text-align:center;">
      <a href="${resetUrl}" style="${btnStyle}">Reset Password</a>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin-top:16px;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
    <hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0;" />
    <p style="color:#64748b;font-size:12px;word-break:break-all;">Or copy and paste this URL:<br/>${resetUrl}</p>
  `);

  return _sendEmail({
    to: email,
    toName: name,
    subject: "Reset your NyayaSahayak password",
    htmlBody: html,
  });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const dashUrl = process.env.NEXTAUTH_URL ?? "https://case.ade-technologies.com";

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Welcome to NyayaSahayak, ${name}! 🎉</h2>
    <p style="color:#475569;margin:0 0 16px;">Your account is verified and your <strong>14-day free trial</strong> has started. Here's what you can do:</p>
    <ul style="color:#475569;padding-left:20px;line-height:1.8;margin:0 0 20px;">
      <li>📁 Create and manage your cases</li>
      <li>📄 Upload and AI-classify documents</li>
      <li>🗓 Track upcoming hearings</li>
      <li>🤖 Identify applicable BNS/IPC sections using AI</li>
      <li>💻 Install the desktop sync agent to auto-sync local files</li>
    </ul>
    <div style="text-align:center;">
      <a href="${dashUrl}/dashboard" style="${btnStyle}">Go to Dashboard →</a>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin-top:16px;">Need help? Reply to this email or contact <a href="mailto:support@nyayasahayak.com" style="color:#1e3a5f;">support@nyayasahayak.com</a></p>
  `);

  return _sendEmail({
    to: email,
    toName: name,
    subject: "Welcome to NyayaSahayak — your legal workspace is ready!",
    htmlBody: html,
  });
}
