import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "@/lib/email/zepto";

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile")
    .optional()
    .or(z.literal("")),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify case access (ADMIN can access any case)
  const caseWhere: any = { id };
  if (role !== "ADMIN") caseWhere.lawyerId = session.user.id!;
  const case_ = await prisma.case.findFirst({ where: caseWhere });
  if (!case_) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  try {
    const body = await req.json();
    const { email, name, phone } = inviteSchema.parse(body);

    // Check if user already exists
    let clientUser = await prisma.user.findUnique({ where: { email } });
    let tempPassword: string | null = null;
    let isNewUser = false;

    if (clientUser) {
      // Ensure the user is a CLIENT role or can be connected
      if (clientUser.role !== "CLIENT" && clientUser.role !== "LAWYER") {
        return NextResponse.json(
          { error: "User already exists with a different role" },
          { status: 409 }
        );
      }
    } else {
      // Create a new CLIENT user with a temporary password
      isNewUser = true;
      tempPassword = uuidv4().replace(/-/g, "").slice(0, 12) + "A1!";
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      // Find starter plan
      const starterPlan = await prisma.plan.findFirst({
        where: { tier: "STARTER" },
      });

      clientUser = await prisma.user.create({
        data: {
          email,
          name,
          phone: phone && phone.trim().length > 0 ? phone.trim() : undefined,
          passwordHash,
          emailVerified: new Date(), // Lawyer-invited clients are pre-verified
          role: "CLIENT",
          subscription: starterPlan
            ? {
                create: {
                  planId: starterPlan.id,
                  status: "ACTIVE",
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: new Date(
                    Date.now() + 365 * 24 * 60 * 60 * 1000
                  ),
                },
              }
            : undefined,
        },
      });
    }

    // Check if already linked
    const existingLink = await prisma.caseClient.findFirst({
      where: { caseId: id, clientId: clientUser.id },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "Client already linked to this case" },
        { status: 409 }
      );
    }

    // Link client to case
    await prisma.caseClient.create({
      data: {
        caseId: id,
        clientId: clientUser.id,
        role: "client",
      },
    });

    // Create invite record
    const token = uuidv4();
    await prisma.clientInvite.create({
      data: {
        caseId: id,
        lawyerId: session.user.id!,
        email,
        name,
        phone: phone || undefined,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: "client_invited",
        resource: "case",
        resourceId: id,
        metadata: { clientEmail: email, clientName: name },
      },
    });

    // Timeline
    await prisma.caseTimeline.create({
      data: {
        caseId: id,
        eventType: "client_added",
        title: `Client added: ${name}`,
        description: `${name} (${email}) was granted portal access`,
        eventDate: new Date(),
      },
    });

    // Send welcome email with portal login details
    const appUrl = (process.env.NEXTAUTH_URL ?? "https://case.ade-technologies.com").replace(/\/$/, "");
    const portalUrl = `${appUrl}/portal/login`;

    const emailHtml = isNewUser && tempPassword
      ? `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"/></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:560px;margin:0 auto;padding:20px;">
            <div style="text-align:center;padding:16px 0 8px;">
              <span style="font-size:22px;font-weight:700;color:#1e3a5f;">⚖ NyayAI</span>
            </div>
            <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;margin:16px 0;">
              <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">You've been added to a case</h2>
              <p style="color:#475569;margin:0 0 16px;line-height:1.6;">
                Hi <strong>${name}</strong>, your lawyer has granted you access to view your case details through the NyayAI Client Portal.
              </p>
              <div style="background:#eff6ff;border-left:4px solid #1e3a5f;border-radius:4px;padding:16px;margin:20px 0;">
                <p style="margin:0 0 8px;font-weight:600;color:#1e3a5f;font-size:14px;">Your Login Credentials</p>
                <p style="margin:0 0 6px;color:#334155;font-size:14px;"><strong>Portal URL:</strong> <a href="${portalUrl}" style="color:#1e3a5f;">${portalUrl}</a></p>
                <p style="margin:0 0 6px;color:#334155;font-size:14px;"><strong>Email:</strong> ${email}</p>
                <p style="margin:0;color:#334155;font-size:14px;"><strong>Temporary Password:</strong> <span style="font-family:monospace;background:#f1f5f9;padding:2px 6px;border-radius:4px;">${tempPassword}</span></p>
              </div>
              <p style="color:#64748b;font-size:13px;margin:0 0 16px;">Please change your password after your first login for security.</p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${portalUrl}" style="display:inline-block;background:#1e3a5f;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">Access Client Portal</a>
              </div>
              <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">Through the portal you can view your case details, upcoming hearings, and documents your lawyer shares with you.</p>
            </div>
            <div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
              <p>NyayAI · AI-Powered Legal Intelligence</p>
              <p>© ${new Date().getFullYear()} NyayAI. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"/></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:560px;margin:0 auto;padding:20px;">
            <div style="text-align:center;padding:16px 0 8px;">
              <span style="font-size:22px;font-weight:700;color:#1e3a5f;">⚖ NyayAI</span>
            </div>
            <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;margin:16px 0;">
              <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">You've been added to a new case</h2>
              <p style="color:#475569;margin:0 0 16px;line-height:1.6;">
                Hi <strong>${name}</strong>, your lawyer has added you to a case on NyayAI. Log in to the client portal to view your case details.
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${portalUrl}" style="display:inline-block;background:#1e3a5f;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">Access Client Portal</a>
              </div>
              <p style="color:#64748b;font-size:13px;">Portal URL: <a href="${portalUrl}" style="color:#1e3a5f;">${portalUrl}</a></p>
            </div>
            <div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
              <p>NyayAI · AI-Powered Legal Intelligence</p>
              <p>© ${new Date().getFullYear()} NyayAI. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    // Fire and forget — don't block response on email
    sendEmail({
      to: email,
      toName: name,
      subject: isNewUser
        ? "You've been added to a case — NyayAI Client Portal Access"
        : "Case access updated — NyayAI",
      html: emailHtml,
    }).catch((err) => console.error("[invite-client] Email send failed:", err));

    return NextResponse.json({
      success: true,
      clientId: clientUser.id,
      isNewUser,
      message: `Client ${name} has been invited. A welcome email has been sent to ${email}.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Invite client error:", error);
    return NextResponse.json({ error: "Invite failed" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify case access
  const case_ = await prisma.case.findFirst({
    where: { id: id, lawyerId: session.user.id! },
    include: {
      clients: {
        include: {
          client: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
        },
      },
    },
  });

  if (!case_) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ clients: case_.clients });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const case_ = await prisma.case.findFirst({
    where: { id: id, lawyerId: session.user.id! },
  });
  if (!case_) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.caseClient.deleteMany({
    where: { caseId: id, clientId },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id!,
      action: "client_removed",
      resource: "case",
      resourceId: id,
      metadata: { clientId },
    },
  });

  return NextResponse.json({ message: "Client access revoked" });
}
