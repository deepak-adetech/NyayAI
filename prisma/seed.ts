import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create plans
  const starterPlan = await prisma.plan.upsert({
    where: { tier: "STARTER" },
    update: {},
    create: {
      tier: "STARTER",
      name: "Starter Plan",
      description: "For solo practitioners",
      priceMonthlyPaise: 99900,
      priceYearlyPaise: 999900,
      maxCases: 50,
      maxDocumentsPerCase: 100,
      maxUsers: 1,
      hasClientPortal: false,
      hasWordAddin: false,
      hasAdvancedAI: false,
      hasPrioritySupport: false,
    },
  });

  const professionalPlan = await prisma.plan.upsert({
    where: { tier: "PROFESSIONAL" },
    update: {},
    create: {
      tier: "PROFESSIONAL",
      name: "Professional Plan",
      description: "For small firms (up to 5 users)",
      priceMonthlyPaise: 299900,
      priceYearlyPaise: 2999900,
      maxCases: 200,
      maxDocumentsPerCase: 500,
      maxUsers: 5,
      hasClientPortal: true,
      hasWordAddin: true,
      hasAdvancedAI: true,
      hasPrioritySupport: false,
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { tier: "ENTERPRISE" },
    update: {},
    create: {
      tier: "ENTERPRISE",
      name: "Enterprise Plan",
      description: "For mid-size firms (up to 20 users)",
      priceMonthlyPaise: 999900,
      priceYearlyPaise: 9999900,
      maxCases: -1,
      maxDocumentsPerCase: -1,
      maxUsers: 20,
      hasClientPortal: true,
      hasWordAddin: true,
      hasAdvancedAI: true,
      hasPrioritySupport: true,
    },
  });

  console.log("✅ Plans created:", starterPlan.tier, professionalPlan.tier, enterprisePlan.tier);

  // Create demo lawyer
  const demoPassword = await bcrypt.hash("Demo@1234", 12);
  const demoLawyer = await prisma.user.upsert({
    where: { email: "demo@nyayasahayak.com" },
    update: {},
    create: {
      email: "demo@nyayasahayak.com",
      name: "Adv. Demo Lawyer",
      passwordHash: demoPassword,
      role: "LAWYER",
      phone: "9876543210",
      barCouncilNumber: "MH/9999/2020",
      barCouncilState: "Maharashtra",
      firmName: "Demo Legal Associates",
      city: "Mumbai",
      state: "Maharashtra",
      subscription: {
        create: {
          planId: professionalPlan.id,
          status: "TRIAL",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });
  console.log("✅ Demo lawyer created:", demoLawyer.email);

  // Create sample BNS sections
  const bnsSections = [
    {
      law: "BNS",
      sectionNumber: "103",
      title: "Murder",
      fullText: "Whoever commits murder shall be punished with death or with imprisonment for life, and shall also be liable to fine.",
      punishment: "Death or imprisonment for life, and fine",
      isBailable: false,
      isCognizable: true,
      isNonBailable: true,
      mappedToLaw: "IPC",
      mappedToSection: "302",
      keywords: ["murder", "homicide", "death", "killing"],
    },
    {
      law: "BNS",
      sectionNumber: "115",
      title: "Voluntarily causing hurt",
      fullText: "Whoever voluntarily causes hurt to any person shall be punished...",
      punishment: "Imprisonment up to 1 year, or fine up to Rs 10,000, or both",
      isBailable: true,
      isCognizable: true,
      isNonBailable: false,
      mappedToLaw: "IPC",
      mappedToSection: "323",
      keywords: ["hurt", "assault", "injury", "beating"],
    },
    {
      law: "BNS",
      sectionNumber: "316",
      title: "Criminal breach of trust",
      fullText: "Whoever, being in any manner entrusted with property...",
      punishment: "Imprisonment up to 3 years, or fine, or both",
      isBailable: false,
      isCognizable: false,
      isNonBailable: false,
      mappedToLaw: "IPC",
      mappedToSection: "406",
      keywords: ["trust", "property", "embezzlement", "misappropriation"],
    },
    {
      law: "IPC",
      sectionNumber: "302",
      title: "Punishment for murder",
      fullText: "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.",
      punishment: "Death or imprisonment for life, and fine",
      isBailable: false,
      isCognizable: true,
      isNonBailable: true,
      mappedToLaw: "BNS",
      mappedToSection: "103",
      keywords: ["murder", "homicide", "section 302", "IPC 302"],
    },
    {
      law: "IPC",
      sectionNumber: "420",
      title: "Cheating and dishonestly inducing delivery of property",
      fullText: "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property...",
      punishment: "Imprisonment up to 7 years and fine",
      isBailable: false,
      isCognizable: false,
      isNonBailable: false,
      mappedToLaw: "BNS",
      mappedToSection: "318",
      keywords: ["cheating", "fraud", "deception", "dishonest"],
    },
  ];

  for (const section of bnsSections) {
    await prisma.legalSection.upsert({
      where: { law_sectionNumber: { law: section.law, sectionNumber: section.sectionNumber } },
      update: {},
      create: {
        ...section,
        chapter: null,
        minSentence: null,
        maxSentence: null,
        fineAmount: null,
        isCompoundable: false,
      },
    });
  }
  console.log("✅ Sample legal sections created");

  // Create a demo case
  const demoCase = await prisma.case.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      lawyerId: demoLawyer.id,
      title: "State vs. Ramesh Kumar (Demo)",
      caseNumber: "SS/1234/2025",
      caseType: "CRIMINAL",
      status: "ACTIVE",
      courtName: "Sessions Court, Mumbai",
      courtDistrict: "Mumbai",
      courtState: "Maharashtra",
      petitionerNames: ["State of Maharashtra"],
      respondentNames: ["Ramesh Kumar"],
      bnsSections: ["103(1)"],
      ipcSections: ["302"],
      nextHearingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: "Demo case — murder trial. Client maintains innocence.",
    },
  });
  console.log("✅ Demo case created:", demoCase.title);

  console.log("\n🎉 Seed completed successfully!");
  console.log("\nDemo login:");
  console.log("  Email: demo@nyayasahayak.com");
  console.log("  Password: Demo@1234");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
