import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { generateLegalNotice, type NoticeType } from "@/lib/ai/noticeGenerator";

const NOTICE_TYPES: NoticeType[] = [
  "CHEQUE_BOUNCE", "LANDLORD_EVICTION", "TENANT_NOTICE", "RECOVERY_OF_MONEY",
  "EMPLOYMENT_TERMINATION", "DEFAMATION", "CONSUMER_COMPLAINT", "PROPERTY_DISPUTE",
  "INSURANCE_CLAIM", "GENERAL",
];

const schema = z.object({
  noticeType: z.enum(NOTICE_TYPES as [NoticeType, ...NoticeType[]]),
  senderName: z.string().min(2),
  senderAddress: z.string().min(5),
  senderAdvocate: z.string().optional(),
  senderBarCouncil: z.string().optional(),
  recipientName: z.string().min(2),
  recipientAddress: z.string().min(5),
  facts: z.string().min(20).max(10000),
  demand: z.string().min(5).max(5000),
  timelineDays: z.number().int().min(1).max(365).default(15),
  additionalPoints: z.string().max(5000).optional(),
  chequeNumber: z.string().optional(),
  chequeDate: z.string().optional(),
  chequeAmount: z.string().optional(),
  bankName: z.string().optional(),
  dishonourDate: z.string().optional(),
  dishonourReason: z.string().optional(),
  propertyAddress: z.string().optional(),
  rentAmount: z.string().optional(),
  arrearsPeriod: z.string().optional(),
  employeeName: z.string().optional(),
  employeeDesignation: z.string().optional(),
  terminationDate: z.string().optional(),
  defamationDetails: z.string().optional(),
  productDetails: z.string().optional(),
  purchaseDate: z.string().optional(),
  policyNumber: z.string().optional(),
  claimAmount: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const params = schema.parse(body);
    const notice = await generateLegalNotice(params);
    return NextResponse.json({ notice });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    console.error("[notice-generator] Error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
