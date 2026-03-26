/**
 * WhatsApp Webhook — NyayAI
 *
 * GET  — Meta verification challenge (required during webhook setup)
 * POST — Incoming messages from WhatsApp (placeholder for future chatbot)
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "nyayasahayak_webhook_verify";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? "";

/**
 * GET — Webhook Verification
 * Meta sends: hub.mode=subscribe, hub.verify_token=<token>, hub.challenge=<challenge>
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verification successful");
    return new Response(challenge, { status: 200 });
  }

  console.warn("[WhatsApp Webhook] Verification failed — token mismatch");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST — Incoming Messages
 * Logs the message; placeholder for future AI chatbot responses.
 */
export async function POST(req: NextRequest) {
  // Verify signature if APP_SECRET is configured
  if (APP_SECRET) {
    const signature = req.headers.get("x-hub-signature-256");
    if (signature) {
      const body = await req.text();
      const expectedSig = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex");
      if (signature !== expectedSig) {
        console.warn("[WhatsApp Webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      // Parse the body we already read
      try {
        const data = JSON.parse(body);
        await handleIncomingMessage(data);
      } catch {
        console.error("[WhatsApp Webhook] Failed to parse body");
      }
      return NextResponse.json({ status: "ok" });
    }
  }

  // No signature verification — parse body directly
  try {
    const data = await req.json();
    await handleIncomingMessage(data);
  } catch {
    console.error("[WhatsApp Webhook] Failed to parse body");
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ status: "ok" });
}

async function handleIncomingMessage(data: Record<string, unknown>) {
  // Extract message details from Meta's webhook payload
  const entry = (data.entry as Array<Record<string, unknown>>)?.[0];
  const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
  const value = changes?.value as Record<string, unknown> | undefined;
  const messages = (value?.messages as Array<Record<string, unknown>>) ?? [];

  for (const msg of messages) {
    const from = msg.from as string;
    const msgType = msg.type as string;
    const textBody = (msg.text as Record<string, string>)?.body ?? "";

    console.log(`[WhatsApp Webhook] Message from ${from} (${msgType}): ${textBody.slice(0, 100)}`);

    // TODO: Future chatbot implementation
    // - Parse client query (case status, next hearing, payment status)
    // - Look up client by phone number
    // - Query case data
    // - Send automated response via sendTextMessage()
  }
}
