import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addLegalDocument, searchLegalKnowledge, getDocumentStats, seedInitialData } from "@/lib/rag";
import { getSupabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stats = await getDocumentStats();
  return NextResponse.json(stats);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  // Allow bulk-seed via cron secret (no session needed for initial setup)
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = cronSecret === process.env.CRON_SECRET && !!process.env.CRON_SECRET;

  if (!isCron) {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "add") {
    const { title, content, category, source, metadata } = body;
    if (!title || !content || !category) {
      return NextResponse.json({ error: "title, content, and category are required" }, { status: 400 });
    }
    const result = await addLegalDocument({ title, content, category, source, metadata });
    if (!result) return NextResponse.json({ error: "Failed to add document" }, { status: 500 });
    return NextResponse.json({ success: true, id: result.id });
  }

  if (action === "search") {
    const { query, topK = 5 } = body;
    if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });
    const results = await searchLegalKnowledge(query, topK);
    return NextResponse.json({ results });
  }

  if (action === "bulk-seed" || action === "seed") {
    const result = await seedInitialData();
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "delete") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("legal_documents").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "list") {
    const { page = 0, category } = body;
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("legal_documents")
      .select("id, title, category, source, created_at")
      .order("created_at", { ascending: false })
      .range(page * 20, (page + 1) * 20 - 1);

    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ documents: data ?? [] });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
