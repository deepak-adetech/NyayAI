/**
 * WhatsApp Message Templates — NyayAI
 *
 * Pre-defined message builders for common legal practice notifications.
 * These generate plain-text messages (not Meta template payloads)
 * for use with sendTextMessage().
 *
 * For Meta-registered templates (required for 24h+ window messages),
 * use sendTemplateMessage() with the template name directly.
 */

export function hearingReminderMessage(params: {
  clientName: string;
  caseTitle: string;
  hearingDate: string;
  courtName: string;
  purpose?: string;
}): string {
  const lines = [
    `Namaste ${params.clientName},`,
    ``,
    `This is a reminder about your upcoming court hearing:`,
    ``,
    `Case: ${params.caseTitle}`,
    `Date: ${params.hearingDate}`,
    `Court: ${params.courtName}`,
  ];
  if (params.purpose) lines.push(`Purpose: ${params.purpose}`);
  lines.push(
    ``,
    `Please ensure all required documents are ready.`,
    ``,
    `— NyayAI`
  );
  return lines.join("\n");
}

export function invoicePaymentMessage(params: {
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate?: string;
  paymentUrl: string;
  upiLink?: string;
}): string {
  const lines = [
    `Dear ${params.clientName},`,
    ``,
    `Invoice ${params.invoiceNumber} for ${params.amount} has been generated.`,
  ];
  if (params.dueDate) lines.push(`Due date: ${params.dueDate}`);
  lines.push(
    ``,
    `Pay online: ${params.paymentUrl}`,
  );
  if (params.upiLink) lines.push(`UPI: ${params.upiLink}`);
  lines.push(
    ``,
    `— NyayAI`
  );
  return lines.join("\n");
}

export function orderDeliveryMessage(params: {
  clientName: string;
  caseTitle: string;
  orderDate: string;
  orderSummary: string;
}): string {
  return [
    `Dear ${params.clientName},`,
    ``,
    `A court order has been received for your case:`,
    `Case: ${params.caseTitle}`,
    `Order Date: ${params.orderDate}`,
    ``,
    `Summary: ${params.orderSummary.slice(0, 500)}`,
    ``,
    `Log in to the client portal for the full order document.`,
    ``,
    `— NyayAI`,
  ].join("\n");
}

export function caseUpdateMessage(params: {
  clientName: string;
  caseTitle: string;
  update: string;
}): string {
  return [
    `Dear ${params.clientName},`,
    ``,
    `Update on your case "${params.caseTitle}":`,
    ``,
    params.update,
    ``,
    `— NyayAI`,
  ].join("\n");
}

export function nextHearingChangedMessage(params: {
  clientName: string;
  caseTitle: string;
  oldDate?: string;
  newDate: string;
  courtName: string;
}): string {
  const lines = [
    `Dear ${params.clientName},`,
    ``,
    `Your next hearing date has been updated:`,
    `Case: ${params.caseTitle}`,
  ];
  if (params.oldDate) lines.push(`Previous date: ${params.oldDate}`);
  lines.push(
    `New date: ${params.newDate}`,
    `Court: ${params.courtName}`,
    ``,
    `Please note this change in your calendar.`,
    ``,
    `— NyayAI`,
  );
  return lines.join("\n");
}
