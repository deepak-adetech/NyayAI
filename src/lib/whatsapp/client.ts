/**
 * WhatsApp Business API Client — NyayAI
 * Uses Meta's Cloud API for WhatsApp Business
 *
 * Same graceful-fallback pattern as ZeptoMail:
 * When WHATSAPP_API_TOKEN is not set, logs the message and returns true.
 */

const GRAPH_API_VERSION = "v18.0";

function getConfig() {
  return {
    apiToken: process.env.WHATSAPP_API_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  };
}

async function _callWhatsAppAPI(endpoint: string, body: object): Promise<boolean> {
  const { apiToken, phoneNumberId } = getConfig();

  if (!apiToken || !phoneNumberId) {
    console.log(`[WhatsApp] API not configured — skipping send`);
    console.log(`[WhatsApp] Would send:`, JSON.stringify(body).slice(0, 200));
    return true;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/${endpoint}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.text();
      console.error(`[WhatsApp] API error ${res.status}: ${errData}`);
      return false;
    }

    console.log(`[WhatsApp] Message sent successfully`);
    return true;
  } catch (error) {
    console.error(`[WhatsApp] Network error:`, error);
    return false;
  }
}

/**
 * Format phone number for WhatsApp API (must include country code, no + prefix)
 */
function formatPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  // If 10-digit Indian number, add 91 prefix
  if (/^[6-9]\d{9}$/.test(cleaned)) cleaned = `91${cleaned}`;
  return cleaned;
}

// ─── Public Functions ─────────────────────────────────────────────────────────

export async function sendTextMessage(phone: string, text: string): Promise<boolean> {
  const formattedPhone = formatPhone(phone);
  console.log(`[WhatsApp] Sending text to ${formattedPhone}: ${text.slice(0, 50)}...`);

  return _callWhatsAppAPI("messages", {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "text",
    text: { body: text },
  });
}

export async function sendDocumentMessage(
  phone: string,
  documentUrl: string,
  caption: string,
  fileName?: string
): Promise<boolean> {
  const formattedPhone = formatPhone(phone);
  console.log(`[WhatsApp] Sending document to ${formattedPhone}: ${caption.slice(0, 50)}...`);

  return _callWhatsAppAPI("messages", {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "document",
    document: {
      link: documentUrl,
      caption,
      filename: fileName ?? "document.pdf",
    },
  });
}

export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  languageCode: string = "en",
  params: string[] = []
): Promise<boolean> {
  const formattedPhone = formatPhone(phone);
  console.log(`[WhatsApp] Sending template '${templateName}' to ${formattedPhone}`);

  const components = params.length > 0
    ? [{ type: "body", parameters: params.map((p) => ({ type: "text", text: p })) }]
    : [];

  return _callWhatsAppAPI("messages", {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}

/**
 * Send a message with interactive buttons (for payment links, confirmations, etc.)
 */
export async function sendInteractiveMessage(
  phone: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<boolean> {
  const formattedPhone = formatPhone(phone);

  return _callWhatsAppAPI("messages", {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}
