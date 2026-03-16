/**
 * Email Templates for NyayaSahayak
 * Professional transactional email templates for subscription lifecycle and hearing reminders.
 */

const btnStyle = `display:inline-block;background:#1e3a5f;color:white!important;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:16px 0;`;
const btnDangerStyle = `display:inline-block;background:#dc2626;color:white!important;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:16px 0;`;
const btnSuccessStyle = `display:inline-block;background:#16a34a;color:white!important;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:16px 0;`;
const infoBoxStyle = `background:#eff6ff;border-left:4px solid #1e3a5f;border-radius:4px;padding:14px 18px;margin:20px 0;`;
const warningBoxStyle = `background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;padding:14px 18px;margin:20px 0;`;
const successBoxStyle = `background:#f0fdf4;border-left:4px solid #16a34a;border-radius:4px;padding:14px 18px;margin:20px 0;`;
const discountBoxStyle = `background:#fef2f2;border:2px dashed #ef4444;border-radius:8px;padding:18px;margin:20px 0;text-align:center;`;
const dividerStyle = `border:none;border-top:1px solid #f1f5f9;margin:20px 0;`;

function emailWrapper(content: string, previewText?: string): string {
  const preview = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>NyayaSahayak</title></head>
<body style="margin:0;padding:0;background:#f8fafc;">
  ${preview}
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:20px;">
    <div style="text-align:center;padding:20px 0 12px;">
      <span style="font-size:24px;font-weight:700;color:#1e3a5f;">NyayaSahayak</span>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Legal Case Management</p>
    </div>
    <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;margin:16px 0;">
      ${content}
    </div>
    <div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
      <p style="margin:0 0 4px;">NyayaSahayak &middot; Legal Case Management</p>
      <p style="margin:0 0 4px;">Questions? <a href="mailto:support@nyayasahayak.com" style="color:#1e3a5f;">support@nyayasahayak.com</a></p>
      <p style="margin:8px 0 0;">&copy; 2025 NyayaSahayak. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function trialEndingEmail(name: string, daysLeft: number, upgradeUrl: string, discountCode?: string): string {
  const urgency = daysLeft === 1 ? "high" : daysLeft <= 3 ? "medium" : "low";
  const urgencyColor = urgency === "high" ? "#dc2626" : urgency === "medium" ? "#f59e0b" : "#1e3a5f";
  const urgencyLabel = daysLeft === 1 ? "Last day of your trial" : `${daysLeft} days remaining in your trial`;
  const discountSection = discountCode
    ? `<div style="${discountBoxStyle}"><p style="margin:0 0 6px;font-size:13px;color:#991b1b;font-weight:600;text-transform:uppercase;">Special Upgrade Offer</p><p style="margin:0 0 10px;font-size:13px;color:#7f1d1d;">Use code for 20% off your first month:</p><div style="background:white;border:2px solid #ef4444;border-radius:6px;padding:10px 20px;display:inline-block;"><span style="font-size:22px;font-weight:700;color:#dc2626;letter-spacing:3px;">${discountCode}</span></div></div>`
    : "";
  const content = `
    <div style="background:${urgencyColor};border-radius:8px;padding:10px 16px;margin-bottom:20px;"><p style="margin:0;color:white;font-size:13px;font-weight:600;text-align:center;text-transform:uppercase;">${urgencyLabel}</p></div>
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Your free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}</h2>
    <p style="color:#475569;margin:0 0 20px;line-height:1.6;">Hi ${name}, your 14-day trial period ends in <strong>${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong>. Upgrade to continue without interruption.</p>
    <div style="${infoBoxStyle}"><p style="margin:0 0 8px;font-weight:600;color:#1e3a5f;font-size:14px;">What you will lose after your trial:</p><ul style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.8;"><li>All active cases and documents</li><li>Hearing schedules and reminders</li><li>AI section identification</li><li>eCourts case sync</li><li>Desktop file sync agent</li></ul></div>
    ${discountSection}
    <div style="text-align:center;"><a href="${upgradeUrl}" style="${urgency === "high" ? btnDangerStyle : btnStyle}">Upgrade Now and Keep Access</a></div>`;
  return emailWrapper(content, `Your NyayaSahayak trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Upgrade now to keep access.`);
}

export function subscriptionExpiredEmail(name: string, reactivateUrl: string, discountCode: string): string {
  const content = `
    <div style="background:#dc2626;border-radius:8px;padding:10px 16px;margin-bottom:20px;"><p style="margin:0;color:white;font-size:13px;font-weight:600;text-align:center;text-transform:uppercase;">Your Trial Has Ended</p></div>
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Your access to NyayaSahayak has paused</h2>
    <p style="color:#475569;margin:0 0 20px;line-height:1.6;">Hi ${name}, your trial has ended and your account is paused. Your data is safe for 30 days. Reactivate today to regain full access.</p>
    <div style="${discountBoxStyle}"><p style="margin:0 0 6px;font-size:13px;color:#991b1b;font-weight:600;text-transform:uppercase;">Welcome Back Offer</p><p style="margin:0 0 12px;font-size:13px;color:#7f1d1d;">Reactivate within 48 hours for <strong>20% off</strong> your first month:</p><div style="background:white;border:2px solid #ef4444;border-radius:6px;padding:10px 20px;display:inline-block;"><span style="font-size:24px;font-weight:700;color:#dc2626;letter-spacing:3px;">${discountCode}</span></div></div>
    <div style="text-align:center;"><a href="${reactivateUrl}" style="${btnDangerStyle}">Reactivate My Account</a></div>`;
  return emailWrapper(content, `Your NyayaSahayak trial ended. Use code ${discountCode} for 20% off when you reactivate.`);
}

export function paymentFailedEmail(name: string, updateUrl: string): string {
  const content = `
    <div style="background:#f59e0b;border-radius:8px;padding:10px 16px;margin-bottom:20px;"><p style="margin:0;color:white;font-size:13px;font-weight:600;text-align:center;text-transform:uppercase;">Payment Unsuccessful</p></div>
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">We could not process your payment</h2>
    <p style="color:#475569;margin:0 0 20px;line-height:1.6;">Hi ${name}, we were unable to process your subscription payment. Please update your payment details to restore access.</p>
    <div style="${warningBoxStyle}"><ul style="margin:0;padding-left:18px;color:#78350f;font-size:13px;line-height:1.8;"><li>Insufficient balance in linked account</li><li>Card expired or blocked</li><li>Bank declined the recurring charge</li><li>UPI mandate limit exceeded</li></ul></div>
    <div style="text-align:center;"><a href="${updateUrl}" style="${btnStyle}">Update Payment Details</a></div>`;
  return emailWrapper(content, "Action required: We could not process your NyayaSahayak subscription payment.");
}

export function paymentSuccessEmail(name: string, plan: string, amount: string, nextBillingDate: Date | string): string {
  const nextDate = formatDate(nextBillingDate);
  const appUrl = process.env.NEXTAUTH_URL ?? "https://case.ade-technologies.com";
  const content = `
    <div style="background:#16a34a;border-radius:8px;padding:10px 16px;margin-bottom:20px;"><p style="margin:0;color:white;font-size:13px;font-weight:600;text-align:center;text-transform:uppercase;">Payment Confirmed</p></div>
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Payment received. Thank you, ${name}!</h2>
    <div style="${successBoxStyle}"><table style="width:100%;border-collapse:collapse;font-size:14px;"><tr><td style="padding:6px 0;font-weight:600;">Plan</td><td style="text-align:right;">${plan}</td></tr><tr><td style="padding:6px 0;font-weight:600;">Amount Paid</td><td style="text-align:right;font-weight:700;">${amount}</td></tr><tr><td style="padding:6px 0;font-weight:600;">Next Billing Date</td><td style="text-align:right;">${nextDate}</td></tr></table></div>
    <div style="text-align:center;"><a href="${appUrl}/dashboard" style="${btnSuccessStyle}">Go to Dashboard</a></div>`;
  return emailWrapper(content, `Payment of ${amount} received. Your NyayaSahayak ${plan} subscription is active.`);
}

export function subscriptionRenewingEmail(name: string, plan: string, amount: string, nextBillingDate: Date | string): string {
  const nextDate = formatDate(nextBillingDate);
  const appUrl = process.env.NEXTAUTH_URL ?? "https://case.ade-technologies.com";
  const content = `
    <div style="background:#1e3a5f;border-radius:8px;padding:10px 16px;margin-bottom:20px;"><p style="margin:0;color:white;font-size:13px;font-weight:600;text-align:center;text-transform:uppercase;">Upcoming Renewal Reminder</p></div>
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Your subscription renews in 3 days</h2>
    <p style="color:#475569;margin:0 0 20px;line-height:1.6;">Hi ${name}, your NyayaSahayak subscription renews automatically in 3 days.</p>
    <div style="${infoBoxStyle}"><table style="width:100%;border-collapse:collapse;font-size:14px;"><tr><td style="padding:5px 0;font-weight:600;">Plan</td><td style="text-align:right;">${plan}</td></tr><tr><td style="padding:5px 0;font-weight:600;">Amount</td><td style="text-align:right;color:#1e3a5f;font-weight:700;">${amount}</td></tr><tr><td style="padding:5px 0;font-weight:600;">Renewal Date</td><td style="text-align:right;">${nextDate}</td></tr></table></div>
    <div style="text-align:center;"><a href="${appUrl}/settings/billing" style="${btnStyle}">Manage Subscription</a></div>`;
  return emailWrapper(content, `Reminder: Your NyayaSahayak ${plan} plan renews on ${nextDate} for ${amount}.`);
}

export function retentionOfferEmail(name: string, discountCode: string, discountPercent: number, expiryDate: Date | string): string {
  const expiry = formatDate(expiryDate);
  const appUrl = process.env.NEXTAUTH_URL ?? "https://case.ade-technologies.com";
  const content = `
    <div style="background:linear-gradient(135deg,#1e3a5f,#2d5fa6);border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;"><p style="margin:0 0 4px;color:#93c5fd;font-size:12px;font-weight:600;text-transform:uppercase;">Exclusive Offer</p><p style="margin:0;color:white;font-size:26px;font-weight:700;">${discountPercent}% Off Just For You</p></div>
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">We would love to have you back, ${name}</h2>
    <p style="color:#475569;margin:0 0 20px;line-height:1.6;">We have reserved a special offer exclusively for you to rejoin NyayaSahayak.</p>
    <div style="${discountBoxStyle}"><p style="margin:0 0 4px;font-size:13px;color:#991b1b;font-weight:600;text-transform:uppercase;">Your Exclusive Discount Code</p><div style="background:white;border:2px solid #ef4444;border-radius:6px;padding:12px 24px;display:inline-block;margin:10px 0;"><span style="font-size:28px;font-weight:700;color:#dc2626;letter-spacing:4px;">${discountCode}</span></div><p style="margin:8px 0 0;font-size:13px;color:#7f1d1d;"><strong>${discountPercent}% off</strong> your first month. Valid until <strong>${expiry}</strong>.</p></div>
    <div style="text-align:center;"><a href="${appUrl}/pricing?code=${discountCode}" style="${btnStyle}">Claim ${discountPercent}% Discount</a></div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:8px 0 0;">Offer expires on ${expiry}. Cannot be combined with other promotions.</p>`;
  return emailWrapper(content, `${name}, your exclusive ${discountPercent}% off offer for NyayaSahayak expires on ${expiry}.`);
}

export function hearingReminderEmail(advocateName: string, caseName: string, caseNumber: string, courtName: string, hearingDate: string, hearingPurpose: string, daysUntil: number, dashboardUrl: string): string {
  const urgencyColor = daysUntil === 0 ? "#dc2626" : daysUntil === 1 ? "#f59e0b" : "#1e3a5f";
  const urgencyLabel = daysUntil === 0 ? "Hearing is today" : daysUntil === 1 ? "Hearing is tomorrow" : `Hearing in ${daysUntil} days`;
  const content = `
    <div style="background:${urgencyColor};border-radius:8px;padding:10px 16px;margin-bottom:20px;"><p style="margin:0;color:white;font-size:13px;font-weight:600;text-align:center;text-transform:uppercase;">${urgencyLabel}</p></div>
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Upcoming hearing reminder</h2>
    <p style="color:#475569;margin:0 0 20px;line-height:1.6;">Hi ${advocateName}, this is a reminder about an upcoming court hearing.</p>
    <div style="${infoBoxStyle}"><table style="width:100%;border-collapse:collapse;font-size:14px;"><tr><td style="padding:6px 0;font-weight:600;">Case</td><td style="text-align:right;">${caseName}</td></tr><tr><td style="padding:6px 0;font-weight:600;">Case Number</td><td style="text-align:right;">${caseNumber}</td></tr><tr><td style="padding:6px 0;font-weight:600;">Court</td><td style="text-align:right;">${courtName}</td></tr><tr><td style="padding:6px 0;font-weight:600;">Hearing Date</td><td style="text-align:right;color:#1e3a5f;font-weight:700;">${hearingDate}</td></tr><tr><td style="padding:6px 0;font-weight:600;">Purpose</td><td style="text-align:right;">${hearingPurpose}</td></tr></table></div>
    <div style="text-align:center;"><a href="${dashboardUrl}" style="${btnStyle}">View Case Details</a></div>`;
  return emailWrapper(content, `${urgencyLabel}: ${caseName} at ${courtName}`);
}
