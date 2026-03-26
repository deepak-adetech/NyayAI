# NyayaSahayak — AI Legal Assistant for Indian Lawyers
## Complete Production Developer Specification v1.0

> **Purpose**: This document is the single source of truth for building NyayaSahayak from scratch. It is written for an AI coding agent (Claude Code) or a development team to implement end-to-end. Every technical decision, database schema, API contract, security requirement, and integration detail is specified below.

> **Prepared by**: Techmagify (Tech Magify, LLP) — Zoho Advanced Implementation Partner
> **Date**: March 2026
> **Classification**: Internal — Developer Reference

---

## TABLE OF CONTENTS

1. [Product Overview & Pain Points Addressed](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema (PostgreSQL)](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [User Roles & Permissions (RBAC)](#6-user-roles--permissions)
7. [Razorpay Subscription Billing](#7-razorpay-subscription-billing)
8. [Email System — ZeptoMail SMTP](#8-email-system--zeptomail)
9. [SMS Integration](#9-sms-integration)
10. [Inbound Email Parsing — Court Email Forwarding](#10-inbound-email-parsing)
11. [LLM Strategy & RAG Architecture](#11-llm-strategy--rag-architecture)
12. [BNS/IPC Section Identification Engine](#12-bns-ipc-section-engine)
13. [OCR Pipeline for Indian Legal Documents](#13-ocr-pipeline)
14. [eCourts Integration — Case Tracking](#14-ecourts-integration)
15. [Microsoft Word Add-in Plugin](#15-microsoft-word-add-in)
16. [Client Portal](#16-client-portal)
17. [Reminder & Notification System](#17-reminder--notification-system)
18. [Security & Compliance (DPDP Act 2023)](#18-security--compliance)
19. [API Design & Endpoints](#19-api-design)
20. [Deployment & Infrastructure (AWS Mumbai)](#20-deployment--infrastructure)
21. [Future Expansion Roadmap](#21-future-expansion)
22. [Environment Variables Reference](#22-environment-variables)
23. [NPM Dependencies](#23-npm-dependencies)

---

## 1. PRODUCT OVERVIEW

### 1.1 What is NyayaSahayak?

NyayaSahayak (न्यायसहायक — "Justice Helper") is a SaaS AI legal assistant for Indian lawyers. It is a subscription-based platform where lawyers sign up, pay monthly via Razorpay, and get an AI-powered workspace that handles their daily pain points.

### 1.2 Lawyer Pain Points Addressed (from market research)

| # | Pain Point | How NyayaSahayak Solves It |
|---|-----------|---------------------------|
| 1 | **IPC-to-BNS confusion**: Since July 1, 2024, 511 IPC sections were replaced by 358 BNS sections. Lawyers who practiced for decades under IPC now struggle with new section numbers. | Auto-identifies applicable BNS sections from case facts, provides bidirectional IPC↔BNS mapping, shows punishment/bail status for each section. |
| 2 | **Scanned/handwritten FIR processing**: FIRs are often handwritten in Hindi/regional languages, scanned at police stations as low-quality PDFs. Lawyers manually read and transcribe them. | OCR pipeline with handwriting recognition in Hindi, Marathi, Tamil, Telugu, Kannada, Bengali, Gujarati. Auto-extracts parties, dates, sections cited, police station details. |
| 3 | **Missing court hearing dates**: Lawyers manage 50-200+ active cases across multiple courts. They miss hearing dates, resulting in ex-parte orders against their clients. | Auto-syncs with eCourts for real-time case status. Generates daily cause list. Sends reminders via SMS, email, and WhatsApp 3 days, 1 day, and morning-of each hearing. |
| 4 | **Time-consuming legal research**: Finding relevant precedents across Supreme Court, 25 High Courts, and thousands of tribunal decisions takes hours per case. | RAG-powered AI research across Indian case law. Finds relevant precedents, generates research memos with citations. |
| 5 | **Repetitive document drafting**: Bail applications, written statements, plaints, and petitions follow standard formats but require manual customization for each case. | AI drafting module with court-specific templates. Auto-populates party details, section citations from uploaded case documents. |
| 6 | **No central case management**: Case files are scattered across WhatsApp, email, physical folders, and handwritten diaries. | Unified digital case workspace with document storage, timeline, notes, hearing history, and client communication log. |
| 7 | **Court communications buried in email**: Lawyers receive hearing updates, court notices, and orders via email mixed with personal/spam emails. | Dedicated forwarding email address (cases@[firm].nyayasahayak.com). AI parses forwarded emails, extracts case numbers, hearing dates, attachments, and auto-files them to the correct case. |
| 8 | **Client communication overhead**: Clients call repeatedly asking "What happened in my case?" Lawyers spend hours updating clients manually. | Client portal where clients log in, see AI-summarized case status, next hearing date, documents, and timeline. Automatic updates sent via email/SMS after each hearing. |
| 9 | **No AI assistance while drafting in Word**: Lawyers draft in Microsoft Word but have no contextual legal suggestions while writing. | Word Add-in plugin that provides real-time BNS section suggestions, case law citations, and template clauses as the lawyer types. |
| 10 | **Billing and collection issues**: Solo practitioners and small firms struggle with fee tracking, invoice generation, and collection from clients. | Built-in time tracking, invoice generation, and payment tracking per case/client. |

### 1.3 User Types

1. **Lawyer (Primary User)** — Signs up, pays subscription, manages cases, uses all AI features
2. **Client (Secondary User)** — Invited by lawyer, read-only access to their own case(s), receives notifications
3. **Admin (Internal)** — Techmagify admin panel for managing plans, viewing analytics, managing legal databases

---

## 2. SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Next.js Web  │  │ React Native│  │ Word Add-in  │  │ Client Portal│  │
│  │ (Lawyer App) │  │ Mobile App  │  │ (Office.js)  │  │ (Read-only)  │  │
│  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼────────────────┼─────────────────┼──────────┘
          │                 │                │                 │
          ▼                 ▼                ▼                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Next.js API Routes)                  │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌────────────────────┐    │
│  │ Auth API │  │ Cases API │  │ Billing   │  │ AI/LLM API         │    │
│  │ (JWT)    │  │           │  │ (Razorpay)│  │ (Claude/OpenAI)    │    │
│  └──────────┘  └───────────┘  └───────────┘  └────────────────────┘    │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│  PostgreSQL  │  │   Redis      │  │  AWS S3           │
│  (Primary DB)│  │ (Cache/Queue)│  │ (Documents/OCR)   │
│  + pgvector  │  │              │  │                    │
└──────────────┘  └──────────────┘  └──────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       BACKGROUND SERVICES                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ OCR Worker   │  │ Email Parser │  │ eCourts Sync │  │ Reminder   │  │
│  │ (Bull Queue) │  │ (AWS SES     │  │ (Cron Job)   │  │ Scheduler  │  │
│  │              │  │  Inbound)    │  │              │  │ (node-cron)│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Architecture Decisions

- **Monorepo with Next.js 14+ (App Router)**: Single codebase for frontend + API routes. Simpler deployment, shared types.
- **PostgreSQL + pgvector**: Primary database with vector extension for RAG embeddings. No need for separate vector DB.
- **Redis (Bull MQ)**: Job queue for OCR processing, email parsing, eCourts sync, reminder scheduling.
- **AWS S3 (Mumbai region)**: Document storage for case files, OCR outputs, email attachments. Data residency compliance.
- **Server-Side Rendering (SSR)**: SEO for marketing pages; real-time dashboard for logged-in users.

---

## 3. TECHNOLOGY STACK

### 3.1 Core Stack

| Layer | Technology | Version | Reason |
|-------|-----------|---------|--------|
| **Runtime** | Node.js | 20 LTS | Stable, long-term support |
| **Framework** | Next.js (App Router) | 14.x+ | Full-stack React, API routes, SSR/SSG |
| **Language** | TypeScript | 5.x | Type safety across full stack |
| **Database** | PostgreSQL | 16+ | ACID compliance, pgvector, RLS |
| **Vector Search** | pgvector extension | 0.7+ | Embeddings for RAG, no separate vector DB needed |
| **ORM** | Prisma | 5.x+ | Type-safe DB access, migrations, introspection |
| **Cache/Queue** | Redis + BullMQ | 7.x / 5.x | Job queues for OCR, email parsing, reminders |
| **Object Storage** | AWS S3 | — | Document storage, Mumbai region |
| **Auth** | NextAuth.js (Auth.js) | 5.x | JWT + Session, OAuth providers |
| **UI Framework** | Tailwind CSS + shadcn/ui | — | Rapid UI development, consistent design |
| **State Management** | Zustand | 4.x | Lightweight client state |
| **Email (Outbound)** | ZeptoMail (Zoho) | SMTP/API | Transactional emails |
| **Email (Inbound)** | AWS SES Inbound | — | Receive forwarded court emails |
| **Payments** | Razorpay Subscriptions | — | Indian payment gateway, recurring billing |
| **SMS** | Configurable (MSG91/Twilio) | — | SMS API provided later by client |
| **LLM Primary** | Claude API (Anthropic) | claude-sonnet-4-20250514 | Best legal reasoning + cost balance |
| **LLM Fallback** | OpenAI GPT-4o | — | Fallback + comparison |
| **OCR** | Google Cloud Document AI | — | Best for Indian scripts + handwriting |
| **Scheduling** | node-cron + BullMQ | — | Hearing reminders, eCourts sync |

### 3.2 npm Packages (Key Dependencies)

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0",
    "@auth/prisma-adapter": "^2.0.0",
    "next-auth": "^5.0.0",
    "razorpay": "^2.9.0",
    "bullmq": "^5.0.0",
    "ioredis": "^5.0.0",
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/client-ses": "^3.600.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "openai": "^4.60.0",
    "zeptomail": "^1.0.0",
    "mailparser": "^3.7.0",
    "pdf-parse": "^1.1.1",
    "sharp": "^0.33.0",
    "node-cron": "^3.0.0",
    "zod": "^3.23.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "crypto": "built-in",
    "uuid": "^9.0.0",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.0.0",
    "react-pdf": "^9.0.0",
    "lucide-react": "^0.400.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",
    "recharts": "^2.12.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^16.0.0"
  }
}
```

---

## 4. DATABASE SCHEMA

### 4.1 Multi-Tenancy Strategy

Use **Row-Level Security (RLS)** on PostgreSQL. Every table that contains tenant-specific data has a `lawyer_id` column. RLS policies ensure a lawyer can only access their own data. Prisma middleware enforces this at the application level as well.

### 4.2 Complete Schema (Prisma format)

```prisma
// schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector", schema: "public")]
}

// ============================================================
// ENUMS
// ============================================================

enum UserRole {
  LAWYER
  CLIENT
  ADMIN
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAUSED
  CANCELLED
  EXPIRED
  PAYMENT_FAILED
}

enum PlanTier {
  STARTER       // Solo practitioner — Rs 999/mo
  PROFESSIONAL  // Small firm (up to 5 users) — Rs 2999/mo
  ENTERPRISE    // Mid firm (up to 20 users) — Rs 9999/mo
}

enum CaseStatus {
  ACTIVE
  DISPOSED
  ARCHIVED
  TRANSFERRED
  STAYED
}

enum CaseType {
  CRIMINAL
  CIVIL
  FAMILY
  CONSUMER
  LABOUR
  TAX
  WRIT
  ARBITRATION
  OTHER
}

enum DocumentType {
  FIR
  CHARGESHEET
  JUDGMENT
  ORDER
  PETITION
  BAIL_APPLICATION
  WRITTEN_STATEMENT
  PLAINT
  REPLY
  AFFIDAVIT
  VAKALATNAMA
  AGREEMENT
  NOTICE
  CAUSE_LIST
  EVIDENCE
  CLIENT_DOCUMENT
  COURT_EMAIL
  OTHER
}

enum HearingStatus {
  SCHEDULED
  COMPLETED
  ADJOURNED
  CANCELLED
}

enum ReminderChannel {
  EMAIL
  SMS
  WHATSAPP
  PUSH
}

enum ReminderStatus {
  PENDING
  SENT
  FAILED
}

enum InboundEmailStatus {
  RECEIVED
  PARSING
  PARSED
  MATCHED_TO_CASE
  UNMATCHED
  FAILED
}

// ============================================================
// USER & AUTH TABLES
// ============================================================

model User {
  id                String             @id @default(uuid())
  email             String             @unique
  emailVerified     DateTime?
  phone             String?            @unique
  phoneVerified     Boolean            @default(false)
  passwordHash      String
  name              String
  role              UserRole           @default(LAWYER)
  avatarUrl         String?
  barCouncilNumber  String?            // For lawyer verification (e.g., "MH/1234/2015")
  barCouncilState   String?            // e.g., "Maharashtra"
  firmName          String?
  address           String?
  city              String?
  state             String?
  pincode           String?
  timezone          String             @default("Asia/Kolkata")
  isActive          Boolean            @default(true)
  lastLoginAt       DateTime?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  // Relations
  subscription      Subscription?
  cases             Case[]             @relation("LawyerCases")
  clientCases       CaseClient[]       // Cases where this user is a client
  documents         Document[]
  hearings          Hearing[]
  reminders         Reminder[]
  auditLogs         AuditLog[]
  invoices          Invoice[]
  inboundEmails     InboundEmail[]     // Lawyer's forwarded emails
  sessions          Session[]
  accounts          Account[]

  // Invited clients
  invitedClients    ClientInvite[]

  @@index([email])
  @@index([role])
  @@index([barCouncilNumber])
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

// ============================================================
// SUBSCRIPTION & BILLING
// ============================================================

model Plan {
  id                String            @id @default(uuid())
  tier              PlanTier          @unique
  name              String            // e.g., "Starter Plan"
  description       String?
  priceMonthlyPaise Int               // Price in paise (99900 = Rs 999)
  priceYearlyPaise  Int?              // Annual price in paise (discount)
  maxCases          Int               // -1 for unlimited
  maxDocumentsPerCase Int             @default(100)
  maxUsers          Int               @default(1)
  hasClientPortal   Boolean           @default(false)
  hasWordAddin      Boolean           @default(false)
  hasAdvancedAI     Boolean           @default(false)
  hasPrioritySupport Boolean          @default(false)
  razorpayPlanIdMonthly String?       // Razorpay plan_id for monthly
  razorpayPlanIdYearly  String?       // Razorpay plan_id for yearly
  isActive          Boolean           @default(true)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  subscriptions     Subscription[]
}

model Subscription {
  id                    String             @id @default(uuid())
  userId                String             @unique
  planId                String
  status                SubscriptionStatus @default(TRIAL)
  razorpaySubscriptionId String?           // sub_XXXXX from Razorpay
  razorpayCustomerId    String?            // cust_XXXXX from Razorpay
  billingCycle          String             @default("monthly") // "monthly" | "yearly"
  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  trialEndsAt           DateTime?
  cancelledAt           DateTime?
  pausedAt              DateTime?
  failedPaymentCount    Int                @default(0)
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  user                  User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan                  Plan               @relation(fields: [planId], references: [id])
  payments              Payment[]

  @@index([userId])
  @@index([status])
  @@index([razorpaySubscriptionId])
}

model Payment {
  id                    String     @id @default(uuid())
  subscriptionId        String
  razorpayPaymentId     String?    @unique // pay_XXXXX
  razorpayOrderId       String?    // order_XXXXX
  razorpaySignature     String?
  amountPaise           Int        // Amount in paise
  currency              String     @default("INR")
  status                String     // "authorized" | "captured" | "failed" | "refunded"
  method                String?    // "card" | "upi" | "netbanking" | "wallet"
  invoiceId             String?    // Razorpay invoice
  failureReason         String?
  paidAt                DateTime?
  createdAt             DateTime   @default(now())

  subscription          Subscription @relation(fields: [subscriptionId], references: [id])

  @@index([subscriptionId])
  @@index([razorpayPaymentId])
  @@index([status])
}

// ============================================================
// CASE MANAGEMENT
// ============================================================

model Case {
  id                String        @id @default(uuid())
  lawyerId          String
  title             String        // e.g., "State vs Ramesh Kumar"
  caseNumber        String?       // e.g., "SC/1234/2025" (court-assigned)
  cnrNumber         String?       // Unique CNR from eCourts (e.g., "MHAU010012342025")
  firNumber         String?       // FIR number if criminal
  policeStation     String?       // Police station name
  caseType          CaseType      @default(CRIMINAL)
  status            CaseStatus    @default(ACTIVE)

  // Court details
  courtName         String?       // e.g., "Sessions Court, Pune"
  courtComplex      String?       // e.g., "Shivajinagar Court Complex"
  courtDistrict     String?
  courtState        String?
  benchJudge        String?       // Judge name

  // Parties
  petitionerNames   String[]      // Array of petitioner names
  respondentNames   String[]      // Array of respondent names
  petitionerAdvocates String[]
  respondentAdvocates String[]

  // BNS/IPC sections
  bnsSections       String[]      // e.g., ["103(1)", "115(2)"]
  ipcSections       String[]      // e.g., ["302", "307"] — old IPC reference
  otherSections     String[]      // NDPS, POCSO, IT Act, etc.

  // Dates
  filingDate        DateTime?
  nextHearingDate   DateTime?
  lastHearingDate   DateTime?
  disposalDate      DateTime?

  // AI-generated
  aiSummary         String?       // AI-generated case summary for client portal
  aiSuggestedSections String[]    // AI-suggested sections (may differ from charged sections)
  aiRiskAssessment  String?       // AI assessment of case strength

  // Metadata
  notes             String?       // Lawyer's internal notes
  tags              String[]      // Custom tags for categorization
  priority          Int           @default(0) // 0=normal, 1=high, 2=urgent

  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  // Relations
  lawyer            User          @relation("LawyerCases", fields: [lawyerId], references: [id])
  clients           CaseClient[]
  documents         Document[]
  hearings          Hearing[]
  reminders         Reminder[]
  inboundEmails     InboundEmail[]
  caseTimeline      CaseTimeline[]
  invoices          Invoice[]

  @@index([lawyerId])
  @@index([caseNumber])
  @@index([cnrNumber])
  @@index([status])
  @@index([nextHearingDate])
  @@index([lawyerId, status])
}

model CaseClient {
  id        String   @id @default(uuid())
  caseId    String
  clientId  String
  role      String   @default("client") // "client" | "petitioner" | "respondent"
  addedAt   DateTime @default(now())

  case      Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)
  client    User     @relation(fields: [clientId], references: [id])

  @@unique([caseId, clientId])
  @@index([clientId])
}

model ClientInvite {
  id        String   @id @default(uuid())
  lawyerId  String
  email     String
  phone     String?
  name      String
  caseId    String
  token     String   @unique @default(uuid())
  accepted  Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())

  lawyer    User     @relation(fields: [lawyerId], references: [id])

  @@index([token])
  @@index([email])
}

// ============================================================
// DOCUMENTS
// ============================================================

model Document {
  id              String        @id @default(uuid())
  caseId          String
  uploadedById    String
  type            DocumentType  @default(OTHER)
  title           String
  description     String?
  fileName        String
  fileSize        Int           // bytes
  mimeType        String
  s3Key           String        // S3 object key
  s3Bucket        String        @default("nyayasahayak-documents")

  // OCR & AI processing
  ocrStatus       String?       @default("pending") // "pending" | "processing" | "completed" | "failed"
  ocrText         String?       // Extracted text from OCR
  ocrLanguage     String?       // Detected language
  ocrConfidence   Float?        // OCR confidence score
  aiSummary       String?       // AI-generated document summary
  extractedEntities Json?       // JSON of extracted entities (names, dates, sections, etc.)
  extractedSections String[]    // BNS/IPC sections found in document

  // Embedding for RAG
  embedding       Unsupported("vector(1536)")?  // pgvector embedding

  isFromEmail     Boolean       @default(false) // Was this uploaded via forwarded email?
  inboundEmailId  String?       // Link to inbound email if applicable

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  case            Case          @relation(fields: [caseId], references: [id], onDelete: Cascade)
  uploadedBy      User          @relation(fields: [uploadedById], references: [id])

  @@index([caseId])
  @@index([type])
  @@index([ocrStatus])
}

// ============================================================
// HEARINGS
// ============================================================

model Hearing {
  id              String         @id @default(uuid())
  caseId          String
  lawyerId        String
  hearingDate     DateTime
  hearingTime     String?        // e.g., "10:30 AM"
  courtRoom       String?        // e.g., "Court Room No. 5"
  purpose         String?        // e.g., "Arguments", "Evidence", "Bail Hearing"
  status          HearingStatus  @default(SCHEDULED)
  judge           String?
  boardNumber     Int?           // Board/serial number in cause list

  // Post-hearing data
  orderSummary    String?        // What happened at the hearing
  nextDate        DateTime?      // Next date given (auto-updates Case.nextHearingDate)
  aiNotes         String?        // AI-generated hearing notes

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  // Relations
  case            Case           @relation(fields: [caseId], references: [id], onDelete: Cascade)
  lawyer          User           @relation(fields: [lawyerId], references: [id])
  reminders       Reminder[]

  @@index([caseId])
  @@index([hearingDate])
  @@index([lawyerId, hearingDate])
  @@index([status])
}

// ============================================================
// REMINDERS & NOTIFICATIONS
// ============================================================

model Reminder {
  id              String          @id @default(uuid())
  userId          String
  caseId          String?
  hearingId       String?
  channel         ReminderChannel
  status          ReminderStatus  @default(PENDING)
  scheduledFor    DateTime
  sentAt          DateTime?
  subject         String
  body            String
  failureReason   String?
  retryCount      Int             @default(0)
  maxRetries      Int             @default(3)

  createdAt       DateTime        @default(now())

  // Relations
  user            User            @relation(fields: [userId], references: [id])
  case            Case?           @relation(fields: [caseId], references: [id])
  hearing         Hearing?        @relation(fields: [hearingId], references: [id])

  @@index([userId])
  @@index([scheduledFor])
  @@index([status])
  @@index([status, scheduledFor])
}

// ============================================================
// INBOUND EMAIL PARSING
// ============================================================

model InboundEmail {
  id              String              @id @default(uuid())
  lawyerId        String
  caseId          String?             // Matched case (null if unmatched)

  // Raw email data
  fromAddress     String
  toAddress       String              // The lawyer's forwarding address
  subject         String
  bodyText        String?
  bodyHtml        String?
  receivedAt      DateTime
  s3RawEmailKey   String?             // Raw .eml stored in S3

  // Parsed data
  status          InboundEmailStatus  @default(RECEIVED)
  extractedCaseNumber String?
  extractedHearingDate DateTime?
  extractedCourtName   String?
  extractedSections    String[]
  attachmentCount Int                 @default(0)

  // AI analysis
  aiClassification String?            // "court_order" | "hearing_notice" | "lawyer_communication" | "other"
  aiSummary        String?

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  // Relations
  lawyer          User                @relation(fields: [lawyerId], references: [id])
  case            Case?               @relation(fields: [caseId], references: [id])

  @@index([lawyerId])
  @@index([caseId])
  @@index([status])
  @@index([receivedAt])
}

// ============================================================
// LEGAL KNOWLEDGE BASE — BNS/IPC SECTION MAPPING
// ============================================================

model LegalSection {
  id              String   @id @default(uuid())
  law             String   // "BNS" | "IPC" | "BNSS" | "CrPC" | "BSA" | "IEA" | "NDPS" | "POCSO" | "IT_ACT"
  sectionNumber   String   // e.g., "103(1)" or "302"
  title           String   // Short title of the section
  fullText        String   // Complete text of the section
  chapter         String?  // Chapter number/name
  punishment      String?  // e.g., "Imprisonment for life or death, and fine"
  minSentence     String?  // e.g., "7 years"
  maxSentence     String?  // e.g., "Life imprisonment"
  fineAmount      String?
  isBailable      Boolean?
  isCognizable    Boolean?
  isCompoundable  Boolean?
  isNonBailable   Boolean?

  // Cross-reference mapping
  mappedToLaw     String?  // e.g., "IPC" (what does this map to?)
  mappedToSection String?  // e.g., "302" (corresponding section in mapped law)

  // Search & AI
  keywords        String[] // Keywords for search matching
  embedding       Unsupported("vector(1536)")? // For semantic search

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([law, sectionNumber])
  @@index([law])
  @@index([sectionNumber])
  @@index([isBailable])
  @@index([isCognizable])
}

// ============================================================
// CASE TIMELINE
// ============================================================

model CaseTimeline {
  id          String   @id @default(uuid())
  caseId      String
  eventType   String   // "hearing" | "document_uploaded" | "email_received" | "status_change" | "note_added" | "client_update"
  title       String
  description String?
  metadata    Json?    // Additional data
  eventDate   DateTime
  createdAt   DateTime @default(now())

  case        Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)

  @@index([caseId])
  @@index([eventDate])
}

// ============================================================
// INVOICING (BASIC)
// ============================================================

model Invoice {
  id              String   @id @default(uuid())
  lawyerId        String
  caseId          String?
  clientName      String
  clientEmail     String?
  invoiceNumber   String   @unique // e.g., "INV-2026-001"
  description     String
  amountPaise     Int
  taxPaise        Int      @default(0) // GST
  totalPaise      Int
  status          String   @default("draft") // "draft" | "sent" | "paid" | "overdue" | "cancelled"
  dueDate         DateTime?
  paidAt          DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  lawyer          User     @relation(fields: [lawyerId], references: [id])
  case            Case?    @relation(fields: [caseId], references: [id])

  @@index([lawyerId])
  @@index([status])
}

// ============================================================
// AUDIT LOG
// ============================================================

model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  action      String   // "login" | "case_created" | "document_uploaded" | "case_viewed" | "export" | etc.
  resource    String?  // "case" | "document" | "hearing" | etc.
  resourceId  String?
  ipAddress   String?
  userAgent   String?
  metadata    Json?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

### 4.3 Database Indexes Strategy

The schema above includes indexes on all foreign keys and common query patterns. Additionally, create these composite indexes for performance:

```sql
-- Frequently queried: lawyer's active cases with upcoming hearings
CREATE INDEX idx_cases_lawyer_active_hearing ON "Case" ("lawyerId", "status", "nextHearingDate")
  WHERE status = 'ACTIVE';

-- Reminder scheduler: find pending reminders due now
CREATE INDEX idx_reminders_pending_due ON "Reminder" ("status", "scheduledFor")
  WHERE status = 'PENDING';

-- Full-text search on case title and notes
CREATE INDEX idx_cases_fts ON "Case" USING gin(to_tsvector('english', title || ' ' || COALESCE(notes, '')));

-- Vector similarity search on legal sections
CREATE INDEX idx_legal_sections_embedding ON "LegalSection" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Vector similarity search on documents
CREATE INDEX idx_documents_embedding ON "Document" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 4.4 Row-Level Security (RLS) Policies

```sql
-- Enable RLS on tenant-specific tables
ALTER TABLE "Case" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Hearing" ENABLE ROW LEVEL SECURITY;

-- Policy: Lawyers can only see their own cases
CREATE POLICY lawyer_cases_policy ON "Case"
  USING ("lawyerId" = current_setting('app.current_user_id')::text);

-- Policy: Clients can see cases they're associated with
CREATE POLICY client_cases_policy ON "Case"
  USING (id IN (
    SELECT "caseId" FROM "CaseClient"
    WHERE "clientId" = current_setting('app.current_user_id')::text
  ));
```

---

## 5. AUTHENTICATION & AUTHORIZATION

### 5.1 Auth Flow

```
1. Lawyer signs up with email + password (+ phone for OTP)
2. Email verification via ZeptoMail
3. Phone OTP verification via SMS API
4. JWT issued on login (access_token: 15min, refresh_token: 7 days)
5. JWT stored in httpOnly secure cookie (not localStorage)
6. API routes validate JWT on every request
7. Prisma middleware sets RLS user context: SET app.current_user_id = 'user_uuid'
```

### 5.2 NextAuth.js Configuration

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 }, // 7 days
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { subscription: { include: { plan: true } } },
        });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        // Audit log
        await prisma.auditLog.create({
          data: { userId: user.id, action: "login", ipAddress: "from-request" },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionStatus: user.subscription?.status || "TRIAL",
          planTier: user.subscription?.plan?.tier || "STARTER",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.subscriptionStatus = user.subscriptionStatus;
        token.planTier = user.planTier;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.subscriptionStatus = token.subscriptionStatus as string;
      session.user.planTier = token.planTier as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
    error: "/auth/error",
  },
});
```

### 5.3 Middleware for Subscription Enforcement

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isAuthPage = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/signup");
  const isDashboard = nextUrl.pathname.startsWith("/dashboard");
  const isClientPortal = nextUrl.pathname.startsWith("/portal");
  const isAPI = nextUrl.pathname.startsWith("/api");

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Protect dashboard routes
  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Check subscription status for dashboard access
  if (isDashboard && isLoggedIn) {
    const status = session.user.subscriptionStatus;
    if (status === "EXPIRED" || status === "CANCELLED") {
      return NextResponse.redirect(new URL("/billing/reactivate", nextUrl));
    }
  }

  // Client portal: must be logged in as CLIENT role
  if (isClientPortal && (!isLoggedIn || session.user.role !== "CLIENT")) {
    return NextResponse.redirect(new URL("/portal/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*", "/login", "/signup", "/api/:path*"],
};
```

---

## 6. USER ROLES & PERMISSIONS

```typescript
// src/lib/permissions.ts
export const PERMISSIONS = {
  LAWYER: {
    cases: ["create", "read", "update", "delete", "export"],
    documents: ["upload", "read", "delete", "download", "ocr"],
    hearings: ["create", "read", "update", "delete"],
    clients: ["invite", "read", "remove"],
    ai: ["research", "draft", "section_identify", "summarize"],
    billing: ["view", "manage_subscription"],
    settings: ["profile", "team", "integrations"],
  },
  CLIENT: {
    cases: ["read_own"],           // Only cases they're linked to
    documents: ["read_own"],       // Only documents in their cases
    hearings: ["read_own"],        // Only hearings for their cases
    ai: [],                        // No AI access
    billing: [],                   // No billing access
  },
  ADMIN: {
    all: ["*"],                    // Full access
  },
} as const;
```

---

## 7. RAZORPAY SUBSCRIPTION BILLING

### 7.1 Plan Setup

Create plans in Razorpay Dashboard or via API. Plans are created once and stored in both Razorpay and local DB.

```typescript
// src/lib/razorpay.ts
import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// One-time plan creation (run once via seed script)
export async function createPlans() {
  const plans = [
    {
      period: "monthly",
      interval: 1,
      item: {
        name: "NyayaSahayak Starter",
        amount: 99900, // Rs 999 in paise
        currency: "INR",
        description: "Solo practitioner plan — up to 50 cases",
      },
    },
    {
      period: "monthly",
      interval: 1,
      item: {
        name: "NyayaSahayak Professional",
        amount: 299900, // Rs 2999
        currency: "INR",
        description: "Small firm — up to 5 users, 200 cases, client portal",
      },
    },
    {
      period: "monthly",
      interval: 1,
      item: {
        name: "NyayaSahayak Enterprise",
        amount: 999900, // Rs 9999
        currency: "INR",
        description: "Mid firm — up to 20 users, unlimited cases, Word add-in, priority support",
      },
    },
  ];

  for (const plan of plans) {
    const created = await razorpay.plans.create(plan);
    console.log(`Created plan: ${created.id} — ${plan.item.name}`);
    // Store created.id in local Plan table as razorpayPlanIdMonthly
  }
}
```

### 7.2 Subscription Creation Flow

```typescript
// src/app/api/billing/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { razorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planTier, billingCycle } = await req.json();

  // Get plan from DB
  const plan = await prisma.plan.findUnique({ where: { tier: planTier } });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const razorpayPlanId = billingCycle === "yearly"
    ? plan.razorpayPlanIdYearly
    : plan.razorpayPlanIdMonthly;

  // Create Razorpay subscription
  const subscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId!,
    customer_notify: 1,
    total_count: billingCycle === "yearly" ? 1 : 12, // 12 months or 1 year
    notes: {
      userId: session.user.id,
      planTier: planTier,
    },
  });

  // Store in local DB
  await prisma.subscription.upsert({
    where: { userId: session.user.id },
    update: {
      planId: plan.id,
      razorpaySubscriptionId: subscription.id,
      status: "TRIAL", // Will be updated via webhook
      billingCycle,
    },
    create: {
      userId: session.user.id,
      planId: plan.id,
      razorpaySubscriptionId: subscription.id,
      status: "TRIAL",
      billingCycle,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
    },
  });

  // Return subscription_id for Razorpay Checkout on frontend
  return NextResponse.json({
    subscriptionId: subscription.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  });
}
```

### 7.3 Frontend Checkout Integration

```tsx
// src/components/billing/SubscriptionCheckout.tsx
"use client";
import { useCallback } from "react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function SubscriptionCheckout({ planTier }: { planTier: string }) {
  const handleSubscribe = useCallback(async () => {
    // Step 1: Create subscription on backend
    const res = await fetch("/api/billing/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planTier, billingCycle: "monthly" }),
    });
    const { subscriptionId, razorpayKeyId } = await res.json();

    // Step 2: Open Razorpay Checkout
    const options = {
      key: razorpayKeyId,
      subscription_id: subscriptionId,
      name: "NyayaSahayak",
      description: `${planTier} Plan — Monthly`,
      handler: async (response: any) => {
        // Step 3: Verify payment on backend
        await fetch("/api/billing/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });
        window.location.href = "/dashboard?subscribed=true";
      },
      theme: { color: "#1B4F72" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }, [planTier]);

  return (
    <button onClick={handleSubscribe} className="btn btn-primary">
      Subscribe Now
    </button>
  );
}
```

### 7.4 Webhook Handler

```typescript
// src/app/api/webhooks/razorpay/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);
  const eventType = event.event;

  switch (eventType) {
    case "subscription.authenticated":
      await handleSubscriptionAuthenticated(event.payload.subscription.entity);
      break;
    case "subscription.activated":
      await handleSubscriptionActivated(event.payload.subscription.entity);
      break;
    case "subscription.charged":
      await handleSubscriptionCharged(event.payload);
      break;
    case "subscription.cancelled":
      await handleSubscriptionCancelled(event.payload.subscription.entity);
      break;
    case "subscription.paused":
      await handleSubscriptionPaused(event.payload.subscription.entity);
      break;
    case "subscription.resumed":
      await handleSubscriptionResumed(event.payload.subscription.entity);
      break;
    case "subscription.pending":
      await handlePaymentFailed(event.payload.subscription.entity);
      break;
    case "subscription.halted":
      await handleSubscriptionHalted(event.payload.subscription.entity);
      break;
  }

  return NextResponse.json({ status: "ok" });
}

async function handleSubscriptionActivated(sub: any) {
  await prisma.subscription.update({
    where: { razorpaySubscriptionId: sub.id },
    data: {
      status: "ACTIVE",
      currentPeriodStart: new Date(sub.current_start * 1000),
      currentPeriodEnd: new Date(sub.current_end * 1000),
    },
  });
}

async function handleSubscriptionCharged(payload: any) {
  const sub = payload.subscription.entity;
  const payment = payload.payment?.entity;

  // Update subscription
  await prisma.subscription.update({
    where: { razorpaySubscriptionId: sub.id },
    data: {
      status: "ACTIVE",
      currentPeriodStart: new Date(sub.current_start * 1000),
      currentPeriodEnd: new Date(sub.current_end * 1000),
      failedPaymentCount: 0,
    },
  });

  // Record payment
  if (payment) {
    const subscription = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: sub.id },
    });
    if (subscription) {
      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          razorpayPaymentId: payment.id,
          amountPaise: payment.amount,
          currency: payment.currency,
          status: "captured",
          method: payment.method,
          paidAt: new Date(payment.created_at * 1000),
        },
      });
    }
  }
}

async function handleSubscriptionCancelled(sub: any) {
  await prisma.subscription.update({
    where: { razorpaySubscriptionId: sub.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });
}

async function handleSubscriptionPaused(sub: any) {
  await prisma.subscription.update({
    where: { razorpaySubscriptionId: sub.id },
    data: { status: "PAUSED", pausedAt: new Date() },
  });
}

async function handleSubscriptionResumed(sub: any) {
  await prisma.subscription.update({
    where: { razorpaySubscriptionId: sub.id },
    data: { status: "ACTIVE", pausedAt: null },
  });
}

async function handlePaymentFailed(sub: any) {
  await prisma.subscription.update({
    where: { razorpaySubscriptionId: sub.id },
    data: {
      status: "PAYMENT_FAILED",
      failedPaymentCount: { increment: 1 },
    },
  });
}

async function handleSubscriptionHalted(sub: any) {
  // After 3 failed payment retries, Razorpay halts the subscription
  await prisma.subscription.update({
    where: { razorpaySubscriptionId: sub.id },
    data: { status: "EXPIRED" },
  });
}

// Required: Cancel subscription API
// src/app/api/billing/cancel/route.ts
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (!subscription?.razorpaySubscriptionId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  // Cancel at end of current billing period (cancel_at_cycle_end)
  await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId, {
    cancel_at_cycle_end: true, // Don't cancel immediately; let current period finish
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelledAt: new Date() },
  });

  return NextResponse.json({ message: "Subscription will cancel at end of current period" });
}
```

### 7.5 Key Razorpay Webhook Events to Subscribe To

| Event | When Triggered | Action |
|-------|---------------|--------|
| `subscription.authenticated` | Customer authorizes mandate | Update status |
| `subscription.activated` | First successful charge | Set ACTIVE |
| `subscription.charged` | Each recurring charge | Record payment, extend period |
| `subscription.pending` | Payment attempt failed | Increment failure count, email user |
| `subscription.halted` | 3 failed retries | Set EXPIRED, restrict access |
| `subscription.cancelled` | User or admin cancels | Set CANCELLED |
| `subscription.paused` | Subscription paused | Set PAUSED |
| `subscription.resumed` | Subscription resumed | Set ACTIVE |

---

## 8. EMAIL SYSTEM — ZEPTOMAIL

### 8.1 SMTP Configuration

```
SMTP Host: smtp.zeptomail.com
SMTP Port: 587
Encryption: TLS v1.2
Username: emailapikey
Password: <Your ZeptoMail SMTP API Key>
```

### 8.2 Nodemailer Integration

```typescript
// src/lib/email.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.zeptomail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: "emailapikey",
    pass: process.env.ZEPTOMAIL_SMTP_KEY!,
  },
  tls: {
    minVersion: "TLSv1.2",
  },
});

// Alternative: ZeptoMail REST API (recommended for better tracking)
import { SendMailClient } from "zeptomail";

const zeptoClient = new SendMailClient({
  url: "api.zeptomail.com/",
  token: process.env.ZEPTOMAIL_API_TOKEN!,
});

export async function sendEmail(options: {
  to: string;
  toName: string;
  subject: string;
  htmlBody: string;
  from?: string;
  fromName?: string;
}) {
  try {
    const response = await zeptoClient.sendMail({
      from: {
        address: options.from || "notifications@nyayasahayak.com",
        name: options.fromName || "NyayaSahayak",
      },
      to: [
        {
          email_address: {
            address: options.to,
            name: options.toName,
          },
        },
      ],
      subject: options.subject,
      htmlbody: options.htmlBody,
    });
    return { success: true, messageId: response.message };
  } catch (error) {
    console.error("Email send failed:", error);
    return { success: false, error };
  }
}

// Email templates
export const emailTemplates = {
  hearingReminder: (data: { lawyerName: string; caseName: string; hearingDate: string; courtName: string; purpose: string }) => ({
    subject: `Hearing Reminder: ${data.caseName} — ${data.hearingDate}`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B4F72; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">⚖️ Hearing Reminder</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear ${data.lawyerName},</p>
          <p>This is a reminder for your upcoming hearing:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 8px; font-weight: bold;">Case:</td><td style="padding: 8px;">${data.caseName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Date:</td><td style="padding: 8px;">${data.hearingDate}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Court:</td><td style="padding: 8px;">${data.courtName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Purpose:</td><td style="padding: 8px;">${data.purpose}</td></tr>
          </table>
          <a href="https://app.nyayasahayak.com/dashboard/cases" style="display: inline-block; background: #1B4F72; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">View Case Details</a>
        </div>
        <div style="padding: 10px 20px; background: #f5f5f5; font-size: 12px; color: #666;">
          <p>NyayaSahayak — AI Legal Assistant for Indian Lawyers</p>
        </div>
      </div>
    `,
  }),

  clientCaseUpdate: (data: { clientName: string; caseName: string; summary: string; nextDate: string }) => ({
    subject: `Case Update: ${data.caseName}`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B4F72; color: white; padding: 20px;">
          <h2>📋 Case Status Update</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear ${data.clientName},</p>
          <p>Here is the latest update on your case <strong>${data.caseName}</strong>:</p>
          <div style="background: #f0f7ff; padding: 15px; border-radius: 4px; margin: 15px 0;">
            ${data.summary}
          </div>
          <p><strong>Next Hearing Date:</strong> ${data.nextDate}</p>
          <a href="https://portal.nyayasahayak.com" style="display: inline-block; background: #1B4F72; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">View Your Case Portal</a>
        </div>
      </div>
    `,
  }),

  welcomeLawyer: (data: { name: string }) => ({
    subject: "Welcome to NyayaSahayak — Your AI Legal Assistant",
    htmlBody: `<div style="font-family: Arial, sans-serif;"><h2>Welcome, ${data.name}!</h2><p>Your NyayaSahayak account is ready. Start by adding your first case.</p></div>`,
  }),
};
```

---

## 9. SMS INTEGRATION

### 9.1 Abstracted SMS Service

The SMS provider will be configured later. Build an abstracted interface:

```typescript
// src/lib/sms.ts

interface SMSProvider {
  sendSMS(phone: string, message: string, templateId?: string): Promise<{ success: boolean; messageId?: string; error?: any }>;
}

// MSG91 Implementation (most popular in India for transactional SMS)
class MSG91Provider implements SMSProvider {
  private authKey: string;
  private senderId: string;
  private route: string;

  constructor() {
    this.authKey = process.env.SMS_AUTH_KEY!;
    this.senderId = process.env.SMS_SENDER_ID!; // 6-char sender ID registered with DLT
    this.route = "4"; // Transactional route
  }

  async sendSMS(phone: string, message: string, templateId?: string) {
    try {
      const response = await fetch("https://api.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          "authkey": this.authKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: templateId || process.env.SMS_DEFAULT_TEMPLATE_ID,
          short_url: "0",
          recipients: [
            {
              mobiles: phone.startsWith("91") ? phone : `91${phone}`,
              // Dynamic variables for DLT-approved templates
              var1: message, // Customize based on template
            },
          ],
        }),
      });
      const data = await response.json();
      return { success: data.type === "success", messageId: data.request_id };
    } catch (error) {
      return { success: false, error };
    }
  }
}

// Factory
export function getSMSProvider(): SMSProvider {
  const provider = process.env.SMS_PROVIDER || "msg91";
  switch (provider) {
    case "msg91": return new MSG91Provider();
    // Add more providers here as needed
    default: return new MSG91Provider();
  }
}

// Usage
export async function sendHearingReminderSMS(phone: string, caseName: string, hearingDate: string, courtName: string) {
  const sms = getSMSProvider();
  // DLT-registered template: "Reminder: Your hearing for {#var1#} is on {#var2#} at {#var3#}. - NyayaSahayak"
  return sms.sendSMS(phone, "", process.env.SMS_TEMPLATE_HEARING_REMINDER);
}
```

### 9.2 DLT Registration Requirements (TRAI India)

> **IMPORTANT**: All transactional SMS in India requires DLT (Distributed Ledger Technology) registration with telecom operators.

**Steps:**
1. Register as an "Enterprise" on any telecom DLT portal (Jio, Airtel, Vodafone-Idea, BSNL)
2. Register your "Header" (Sender ID) — 6-character alphanumeric, e.g., "NYAYSK"
3. Register message templates with variables like `{#var1#}` for dynamic content
4. Get `template_id` for each approved template
5. Configure template IDs in environment variables

**Required SMS Templates to Register:**

| Template Name | Content | Variables |
|--------------|---------|-----------|
| Hearing Reminder | "Reminder: Your hearing for {#var1#} is on {#var2#} at {#var3#}. View details at {#var4#} - NyayaSahayak" | caseName, date, court, link |
| OTP Verification | "Your NyayaSahayak verification code is {#var1#}. Valid for 10 minutes. Do not share. - NyayaSahayak" | otpCode |
| Payment Confirmation | "Payment of Rs {#var1#} received for NyayaSahayak {#var2#} plan. Invoice: {#var3#} - NyayaSahayak" | amount, plan, invoiceNo |
| Case Update (Client) | "Update on your case {#var1#}: Next hearing {#var2#} at {#var3#}. Check portal: {#var4#} - NyayaSahayak" | caseName, date, court, link |

---

## 10. INBOUND EMAIL PARSING

### 10.1 Architecture

```
Lawyer forwards court email to:
  cases+<lawyer_id>@inbound.nyayasahayak.com
        │
        ▼
  AWS SES Inbound (Receipt Rule)
        │
        ├── Store raw email → S3 bucket
        │
        └── Trigger → AWS Lambda / SNS → BullMQ Job
                                │
                                ▼
                    Email Parser Worker (Node.js)
                        │
                        ├── Parse with `mailparser` (extract body, attachments, metadata)
                        ├── Save attachments to S3
                        ├── AI Analysis (Claude API):
                        │     ├── Classify email type (court_order, hearing_notice, lawyer_comm, other)
                        │     ├── Extract case number, hearing date, court name, sections
                        │     └── Generate summary
                        ├── Match to existing case (by case number, party names, or manual)
                        └── Create InboundEmail record + link Documents + update Case
```

### 10.2 AWS SES Inbound Setup

```
1. Verify domain: inbound.nyayasahayak.com in AWS SES
2. Add MX record to DNS:
   - Name: inbound.nyayasahayak.com
   - Type: MX
   - Value: 10 inbound-smtp.ap-south-1.amazonaws.com
   - (ap-south-1 = Mumbai region)

3. Create SES Receipt Rule Set:
   - Rule: "process-inbound-legal-emails"
   - Recipients: cases@inbound.nyayasahayak.com (catch-all with +addressing)
   - Actions:
     a. S3: Store to bucket "nyayasahayak-inbound-emails"
     b. SNS: Publish to topic "inbound-email-received"
     c. Lambda: Invoke email-parser function (optional, can use SNS→SQS→Worker)
```

### 10.3 Email Parser Worker

```typescript
// src/workers/emailParser.ts
import { Worker, Queue } from "bullmq";
import { simpleParser } from "mailparser";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { analyzeEmailWithAI } from "@/lib/ai/emailAnalyzer";

const s3 = new S3Client({ region: "ap-south-1" });

export const emailParserQueue = new Queue("email-parser", {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
});

const worker = new Worker("email-parser", async (job) => {
  const { s3Key, lawyerId } = job.data;

  // 1. Fetch raw email from S3
  const s3Response = await s3.send(new GetObjectCommand({
    Bucket: "nyayasahayak-inbound-emails",
    Key: s3Key,
  }));
  const rawEmail = await s3Response.Body?.transformToString();

  // 2. Parse email
  const parsed = await simpleParser(rawEmail!);

  // 3. Save attachments to S3
  const attachmentKeys: string[] = [];
  for (const attachment of parsed.attachments || []) {
    const attachmentKey = `documents/${lawyerId}/${Date.now()}_${attachment.filename}`;
    await s3.send(new PutObjectCommand({
      Bucket: "nyayasahayak-documents",
      Key: attachmentKey,
      Body: attachment.content,
      ContentType: attachment.contentType,
    }));
    attachmentKeys.push(attachmentKey);
  }

  // 4. AI Analysis with Claude
  const aiAnalysis = await analyzeEmailWithAI({
    subject: parsed.subject || "",
    body: parsed.text || "",
    from: parsed.from?.text || "",
  });

  // 5. Try to match to existing case
  let matchedCaseId: string | null = null;
  if (aiAnalysis.extractedCaseNumber) {
    const matchedCase = await prisma.case.findFirst({
      where: {
        lawyerId,
        OR: [
          { caseNumber: { contains: aiAnalysis.extractedCaseNumber } },
          { cnrNumber: { contains: aiAnalysis.extractedCaseNumber } },
        ],
      },
    });
    matchedCaseId = matchedCase?.id || null;
  }

  // 6. Create InboundEmail record
  const inboundEmail = await prisma.inboundEmail.create({
    data: {
      lawyerId,
      caseId: matchedCaseId,
      fromAddress: parsed.from?.text || "",
      toAddress: parsed.to?.text || "",
      subject: parsed.subject || "",
      bodyText: parsed.text?.substring(0, 50000), // Limit storage
      receivedAt: parsed.date || new Date(),
      s3RawEmailKey: s3Key,
      status: matchedCaseId ? "MATCHED_TO_CASE" : "UNMATCHED",
      extractedCaseNumber: aiAnalysis.extractedCaseNumber,
      extractedHearingDate: aiAnalysis.extractedHearingDate,
      extractedCourtName: aiAnalysis.extractedCourtName,
      extractedSections: aiAnalysis.extractedSections,
      attachmentCount: attachmentKeys.length,
      aiClassification: aiAnalysis.classification,
      aiSummary: aiAnalysis.summary,
    },
  });

  // 7. Create Document records for attachments
  for (const key of attachmentKeys) {
    await prisma.document.create({
      data: {
        caseId: matchedCaseId || "UNMATCHED", // Handle unmatched
        uploadedById: lawyerId,
        type: "COURT_EMAIL",
        title: `Email Attachment: ${parsed.subject}`,
        fileName: key.split("/").pop()!,
        fileSize: 0,
        mimeType: "application/pdf",
        s3Key: key,
        isFromEmail: true,
        inboundEmailId: inboundEmail.id,
        ocrStatus: "pending", // Queue for OCR
      },
    });
  }

  // 8. Update case if matched and hearing date found
  if (matchedCaseId && aiAnalysis.extractedHearingDate) {
    await prisma.case.update({
      where: { id: matchedCaseId },
      data: { nextHearingDate: aiAnalysis.extractedHearingDate },
    });
  }

}, { connection: { host: process.env.REDIS_HOST, port: 6379 } });
```

### 10.4 AI Email Analyzer

```typescript
// src/lib/ai/emailAnalyzer.ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function analyzeEmailWithAI(email: { subject: string; body: string; from: string }) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You are an AI assistant specialized in analyzing Indian court-related emails. Extract structured information from forwarded court emails, lawyer communications, and legal notices. Always respond in valid JSON only, no markdown.`,
    messages: [{
      role: "user",
      content: `Analyze this email and extract information. Respond ONLY in JSON format:

Subject: ${email.subject}
From: ${email.from}
Body: ${email.body.substring(0, 5000)}

Extract:
{
  "classification": "court_order" | "hearing_notice" | "cause_list" | "lawyer_communication" | "client_communication" | "other",
  "extractedCaseNumber": "string or null",
  "extractedHearingDate": "ISO date string or null",
  "extractedCourtName": "string or null",
  "extractedSections": ["array of BNS/IPC sections mentioned"],
  "summary": "2-3 sentence summary of the email content",
  "urgency": "high" | "medium" | "low"
}`,
    }],
  });

  try {
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return {
      classification: "other",
      extractedCaseNumber: null,
      extractedHearingDate: null,
      extractedCourtName: null,
      extractedSections: [],
      summary: "Failed to parse email",
      urgency: "low",
    };
  }
}
```

---

## 11. LLM STRATEGY & RAG ARCHITECTURE

### 11.1 LLM Selection

| Model | Use Case | Why |
|-------|----------|-----|
| **Claude Sonnet 4 (Primary)** | Section identification, legal research, document drafting, email analysis | Best legal reasoning benchmarks, strong at following structured output formats, 200K context window for long judgments. Claude models demonstrate strong format compliance crucial for legal docs. |
| **Claude Haiku 4.5 (Fast)** | Quick section lookups, simple classifications, real-time Word add-in suggestions | Low latency (<1s), cost-effective for high-volume queries |
| **OpenAI GPT-4o (Fallback)** | Backup when Claude is unavailable, A/B testing for accuracy | Good alternative, slightly different strengths in legal reasoning |
| **text-embedding-3-small (OpenAI)** | Generate vector embeddings for RAG | 1536 dimensions, best cost/quality ratio for embeddings |

### 11.2 RAG Pipeline Architecture

```
┌────────────────────────────────────────────────────┐
│                 DATA INGESTION                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Indian      │  │ BNS/IPC/    │  │ Case Law    │ │
│  │ Kanoon API  │  │ BNSS/BSA    │  │ (SCC/Manu)  │ │
│  │ (Judgments) │  │ Bare Acts   │  │             │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │         │
│         ▼                ▼                ▼         │
│  ┌──────────────────────────────────────────────┐   │
│  │           TEXT CHUNKING                       │   │
│  │  Split into 500-1000 token chunks with        │   │
│  │  200 token overlap. Preserve section          │   │
│  │  boundaries and paragraph integrity.          │   │
│  └──────────────────────────────────────────────┘   │
│         │                                           │
│         ▼                                           │
│  ┌──────────────────────────────────────────────┐   │
│  │         EMBEDDING GENERATION                  │   │
│  │  OpenAI text-embedding-3-small (1536 dim)     │   │
│  │  Batch process in groups of 100               │   │
│  └──────────────────────────────────────────────┘   │
│         │                                           │
│         ▼                                           │
│  ┌──────────────────────────────────────────────┐   │
│  │         VECTOR STORAGE                        │   │
│  │  PostgreSQL + pgvector extension              │   │
│  │  IVFFlat index for fast similarity search     │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│                 QUERY PIPELINE                       │
│                                                      │
│  User Query: "What are the bail provisions for       │
│  murder under BNS section 103?"                      │
│         │                                           │
│         ▼                                           │
│  1. Generate query embedding                         │
│  2. Vector similarity search (pgvector):             │
│     SELECT * FROM legal_sections                     │
│     ORDER BY embedding <=> query_embedding           │
│     LIMIT 10;                                        │
│  3. Re-rank results with cross-encoder (optional)    │
│  4. Construct prompt with retrieved context          │
│  5. Send to Claude Sonnet with system prompt:        │
│     "You are an Indian legal research assistant..."  │
│  6. Return answer with citations                     │
└────────────────────────────────────────────────────┘
```

### 11.3 RAG Implementation

```typescript
// src/lib/ai/rag.ts
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Generate embedding for a text
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.substring(0, 8000), // Token limit
  });
  return response.data[0].embedding;
}

// Search similar legal sections
export async function searchLegalSections(query: string, limit: number = 10) {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const results = await prisma.$queryRaw`
    SELECT id, law, "sectionNumber", title, "fullText", punishment,
           "isBailable", "isCognizable", "mappedToLaw", "mappedToSection",
           embedding <=> ${embeddingStr}::vector AS distance
    FROM "LegalSection"
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit};
  `;
  return results;
}

// Main legal research function
export async function legalResearch(query: string, caseContext?: string) {
  // 1. Search relevant sections
  const relevantSections = await searchLegalSections(query, 15);

  // 2. Search relevant case law (from documents table)
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const relevantCaseLaw = await prisma.$queryRaw`
    SELECT id, title, "aiSummary", "ocrText"
    FROM "Document"
    WHERE type = 'JUDGMENT' AND embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT 5;
  `;

  // 3. Construct context
  const sectionContext = (relevantSections as any[])
    .map((s: any) => `[${s.law} Section ${s.sectionNumber}] ${s.title}\n${s.fullText}\nPunishment: ${s.punishment || "N/A"}\nBailable: ${s.isBailable ? "Yes" : "No"}\nMapped to: ${s.mappedToLaw} Section ${s.mappedToSection}`)
    .join("\n\n---\n\n");

  // 4. Query Claude
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: `You are NyayaSahayak, an expert Indian legal research assistant. You have deep knowledge of:
- Bharatiya Nyaya Sanhita (BNS), 2023 (replaced IPC)
- Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 (replaced CrPC)
- Bharatiya Sakshya Adhiniyam (BSA), 2023 (replaced Indian Evidence Act)
- Indian case law from Supreme Court, High Courts, and Tribunals

When answering legal queries:
1. Always cite specific section numbers (BNS/BNSS/BSA) with their old IPC/CrPC equivalents
2. Mention whether offences are bailable/non-bailable, cognizable/non-cognizable
3. Cite relevant Supreme Court and High Court precedents when available
4. Be precise about punishment provisions (minimum and maximum sentences)
5. Note any recent amendments or landmark judgments that modify interpretation
6. Always clarify that this is AI-assisted research and should be verified by the lawyer

Format your response with clear sections: Legal Position, Applicable Sections, Precedents, Bail Status, Practical Advice.`,
    messages: [{
      role: "user",
      content: `Legal Research Query: ${query}
${caseContext ? `\nCase Context: ${caseContext}` : ""}

Relevant Legal Sections from Database:
${sectionContext}

Based on the above context and your legal knowledge, provide comprehensive research analysis.`,
    }],
  });

  return {
    answer: response.content[0].type === "text" ? response.content[0].text : "",
    relevantSections: relevantSections,
    model: "claude-sonnet-4-20250514",
  };
}
```

### 11.4 Feeding More Data Over Time

**Strategy for continuous improvement:**

1. **Batch ingestion pipeline**: Cron job (weekly) scrapes new judgments from Indian Kanoon API → chunks → embeds → stores in pgvector
2. **User feedback loop**: When lawyers mark AI suggestions as correct/incorrect, log this in a `feedback` table. Use for evaluation metrics.
3. **Fine-tuning consideration**: Once 10,000+ feedback samples are collected, consider fine-tuning Claude via Amazon Bedrock or creating a LoRA-adapted open-source model (LLaMA 3) for specific tasks like section identification.
4. **Knowledge graph expansion**: Add new Supreme Court and High Court judgments monthly. Track landmark cases that change interpretation of BNS sections.

---

## 12. BNS/IPC SECTION IDENTIFICATION ENGINE

### 12.1 Database Seeding

Create a seed script that populates the `LegalSection` table with all 358 BNS sections + 511 IPC sections + mappings.

**Data sources for seeding:**
- India Code (indiacode.nic.in) — Official repository of all Central laws
- Vaquill BNS Handbook (for IPC↔BNS mapping tables)
- Government Gazette notifications

```typescript
// prisma/seed/legalSections.ts
// This is a massive seed file — structure shown, actual data must be compiled from official sources

const bnsSections = [
  {
    law: "BNS",
    sectionNumber: "101",
    title: "Murder",
    fullText: "Whoever causes death of any person... (full legal text here)",
    chapter: "VI - Of Offences Affecting the Human Body",
    punishment: "Death, or imprisonment for life, and shall also be liable to fine",
    minSentence: "Life imprisonment",
    maxSentence: "Death",
    isBailable: false,
    isCognizable: true,
    isCompoundable: false,
    mappedToLaw: "IPC",
    mappedToSection: "302",
    keywords: ["murder", "homicide", "death", "killing", "hatya"],
  },
  {
    law: "BNS",
    sectionNumber: "103(2)",
    title: "Murder by group of five or more (Mob Lynching)",
    fullText: "When a group of five or more persons acting in concert...",
    chapter: "VI - Of Offences Affecting the Human Body",
    punishment: "Death or life imprisonment, with minimum 7 years",
    isBailable: false,
    isCognizable: true,
    isCompoundable: false,
    mappedToLaw: "IPC",
    mappedToSection: "NEW — No IPC equivalent",
    keywords: ["mob lynching", "group murder", "five persons", "lynch", "bheed hatya"],
  },
  // ... 356 more BNS sections
  // ... 511 IPC sections with reverse mapping
  // ... BNSS sections
  // ... BSA sections
];
```

### 12.2 Section Identifier API

```typescript
// src/app/api/ai/identify-sections/route.ts
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { caseFacts, documentText } = await req.json();
  const inputText = caseFacts || documentText;

  // Step 1: Semantic search for relevant sections
  const embedding = await generateEmbedding(inputText);
  const embeddingStr = `[${embedding.join(",")}]`;

  const candidateSections = await prisma.$queryRaw`
    SELECT id, law, "sectionNumber", title, "fullText", punishment,
           "isBailable", "isCognizable", "mappedToLaw", "mappedToSection",
           keywords, embedding <=> ${embeddingStr}::vector AS distance
    FROM "LegalSection"
    WHERE law IN ('BNS', 'BNSS')
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT 30;
  `;

  // Step 2: Use Claude to narrow down and rank
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `You are an expert Indian criminal lawyer. Given case facts and a list of candidate BNS/BNSS sections, identify the MOST APPLICABLE sections. For each section, explain WHY it applies to these specific facts. Also suggest sections the police/prosecution may have MISSED. Respond in JSON only.`,
    messages: [{
      role: "user",
      content: `Case Facts: ${inputText.substring(0, 3000)}

Candidate Sections:
${(candidateSections as any[]).map((s: any) => `${s.law} ${s.sectionNumber}: ${s.title} — ${s.fullText?.substring(0, 200)}`).join("\n")}

Respond in this JSON format:
{
  "applicableSections": [
    {
      "law": "BNS",
      "section": "103(1)",
      "title": "Murder",
      "relevance": "The accused caused death by stabbing, which constitutes murder under BNS 103(1)",
      "confidence": 0.95,
      "ipcEquivalent": "302",
      "punishment": "Death or life imprisonment",
      "bailable": false,
      "cognizable": true
    }
  ],
  "missedSections": [
    {
      "law": "BNS",
      "section": "...",
      "reason": "Based on the facts, this section may also apply because..."
    }
  ],
  "summary": "Brief overall legal analysis of applicable charges"
}`,
    }],
  });

  const result = JSON.parse(
    (response.content[0] as any).text.replace(/```json|```/g, "").trim()
  );

  return NextResponse.json(result);
}
```

---

## 13. OCR PIPELINE

### 13.1 Recommended OCR Engine: Google Cloud Document AI

**Why Google Document AI over alternatives:**
- Best accuracy for Indian scripts (Devanagari, Tamil, Telugu, Kannada, Bengali)
- Handles handwritten text (crucial for FIRs)
- Processes low-quality scanned PDFs
- Entity extraction built-in
- Layout-aware processing preserves table structures

### 13.2 OCR Worker

```typescript
// src/workers/ocrWorker.ts
import { Worker, Queue } from "bullmq";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/ai/rag";

const s3 = new S3Client({ region: "ap-south-1" });
const documentAI = new DocumentProcessorServiceClient();

export const ocrQueue = new Queue("ocr-processing", {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
});

const worker = new Worker("ocr-processing", async (job) => {
  const { documentId } = job.data;

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error("Document not found");

  // Update status
  await prisma.document.update({ where: { id: documentId }, data: { ocrStatus: "processing" } });

  try {
    // 1. Download from S3
    const s3Response = await s3.send(new GetObjectCommand({
      Bucket: doc.s3Bucket,
      Key: doc.s3Key,
    }));
    const fileBuffer = await s3Response.Body?.transformToByteArray();

    // 2. Process with Google Document AI
    const processorName = `projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.GCP_LOCATION}/processors/${process.env.GCP_PROCESSOR_ID}`;

    const [result] = await documentAI.processDocument({
      name: processorName,
      rawDocument: {
        content: Buffer.from(fileBuffer!).toString("base64"),
        mimeType: doc.mimeType,
      },
    });

    const extractedText = result.document?.text || "";
    const language = result.document?.pages?.[0]?.detectedLanguages?.[0]?.languageCode || "en";
    const confidence = result.document?.pages?.[0]?.detectedLanguages?.[0]?.confidence || 0;

    // 3. Extract entities using AI
    const entities = await extractEntitiesFromLegalDoc(extractedText, doc.type);

    // 4. Generate embedding for RAG
    const embedding = await generateEmbedding(extractedText.substring(0, 8000));

    // 5. Update document record
    await prisma.document.update({
      where: { id: documentId },
      data: {
        ocrStatus: "completed",
        ocrText: extractedText,
        ocrLanguage: language,
        ocrConfidence: confidence,
        extractedEntities: entities,
        extractedSections: entities.sections || [],
        aiSummary: entities.summary,
        // Store embedding via raw SQL since Prisma doesn't support pgvector natively
      },
    });

    // Store embedding
    const embeddingStr = `[${embedding.join(",")}]`;
    await prisma.$executeRaw`
      UPDATE "Document" SET embedding = ${embeddingStr}::vector WHERE id = ${documentId}
    `;

  } catch (error) {
    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: "failed" },
    });
    throw error;
  }
}, { connection: { host: process.env.REDIS_HOST, port: 6379 }, concurrency: 3 });
```

---

## 14. ECOURTS INTEGRATION

### 14.1 Approach

eCourts (services.ecourts.gov.in) does **not** have a public REST API. Integration requires web scraping with responsible rate limiting.

```typescript
// src/lib/ecourts/scraper.ts
// NOTE: Implement responsible scraping with:
// - Rate limiting: Max 1 request per 5 seconds
// - Caching: Cache results for 1 hour
// - User-Agent: Identify as NyayaSahayak bot
// - Respect robots.txt

export async function fetchCaseStatus(cnrNumber: string) {
  // CNR format: SSDDCCCNNNNYYYY (State-District-Court-Number-Year)
  // Example: MHAU010012342025

  // Use puppeteer or playwright for dynamic page rendering
  // Navigate to: https://services.ecourts.gov.in/ecourtindia_v6/
  // Fill CNR number in search form
  // Extract: case status, next hearing date, orders, cause list position

  // Alternative: Use eCourts mobile app API (undocumented, reverse-engineered)
  // This is fragile but faster than browser scraping
}

// Scheduled sync job — runs every 6 hours for active cases
export async function syncAllActiveCases() {
  const activeCases = await prisma.case.findMany({
    where: { status: "ACTIVE", cnrNumber: { not: null } },
    select: { id: true, cnrNumber: true, nextHearingDate: true },
  });

  for (const c of activeCases) {
    // Rate limit: wait 5 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      const status = await fetchCaseStatus(c.cnrNumber!);
      if (status.nextHearingDate && status.nextHearingDate !== c.nextHearingDate) {
        await prisma.case.update({
          where: { id: c.id },
          data: {
            nextHearingDate: status.nextHearingDate,
            benchJudge: status.judgeName,
          },
        });
        // Create hearing record and schedule reminders
      }
    } catch (error) {
      console.error(`Failed to sync case ${c.cnrNumber}:`, error);
    }
  }
}
```

---

## 15. MICROSOFT WORD ADD-IN

### 15.1 Architecture

The Word Add-in is a **Task Pane Add-in** built with Office.js that communicates with the NyayaSahayak backend API.

```
┌─────────────────────────────────────────┐
│         Microsoft Word                    │
│  ┌──────────────────┐  ┌──────────────┐ │
│  │   Document        │  │ Task Pane    │ │
│  │   Content         │  │ (React App)  │ │
│  │                   │  │              │ │
│  │  User types...    │◄─┤ AI suggests: │ │
│  │                   │  │ - BNS Secs   │ │
│  │                   │  │ - Case Law   │ │
│  │                   │  │ - Templates  │ │
│  └──────────────────┘  └──────┬───────┘ │
└──────────────────────────────┬──────────┘
                               │
                               ▼ API Calls
                    NyayaSahayak Backend API
                    (/api/word-addin/suggest)
```

### 15.2 Project Setup

```bash
# Generate Word add-in project
npm install -g yo generator-office
yo office --name "NyayaSahayak" --host word --framework react --ts true

# Key files:
# manifest.xml — Add-in configuration
# src/taskpane/taskpane.tsx — Main React component
# src/taskpane/components/ — UI components
```

### 15.3 manifest.xml (Key sections)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1" xsi:type="TaskPaneApp">
  <Id>nyayasahayak-word-addin-uuid</Id>
  <Version>1.0.0</Version>
  <ProviderName>Techmagify</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="NyayaSahayak AI"/>
  <Description DefaultValue="AI-powered legal assistant for Indian lawyers. Get BNS section suggestions, case law citations, and template clauses while drafting."/>
  <Hosts>
    <Host Name="Document"/>
  </Hosts>
  <DefaultSettings>
    <SourceLocation DefaultValue="https://addin.nyayasahayak.com/taskpane.html"/>
  </DefaultSettings>
  <Permissions>ReadWriteDocument</Permissions>
</OfficeApp>
```

### 15.4 Task Pane Component

```tsx
// src/taskpane/components/SectionSuggester.tsx
import React, { useState, useEffect } from "react";

export function SectionSuggester() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const analyzeSelection = async () => {
    setLoading(true);
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load("text");
      await context.sync();

      const selectedText = selection.text;
      if (!selectedText || selectedText.length < 20) {
        setLoading(false);
        return;
      }

      // Call NyayaSahayak API
      const response = await fetch("https://api.nyayasahayak.com/api/word-addin/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getStoredToken()}`, // Token from login
        },
        body: JSON.stringify({ text: selectedText, context: "drafting" }),
      });
      const data = await response.json();
      setSuggestions(data.suggestions);
      setLoading(false);
    });
  };

  const insertSection = async (sectionText: string) => {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertText(sectionText, Word.InsertLocation.after);
      await context.sync();
    });
  };

  return (
    <div className="section-suggester">
      <button onClick={analyzeSelection} disabled={loading}>
        {loading ? "Analyzing..." : "🔍 Analyze Selected Text"}
      </button>
      {suggestions.map((s: any, i) => (
        <div key={i} className="suggestion-card">
          <strong>{s.law} Section {s.section}</strong>
          <p>{s.title}</p>
          <p className="relevance">{s.relevance}</p>
          <button onClick={() => insertSection(`(${s.law} Section ${s.section})`)}>
            Insert Citation
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 16. CLIENT PORTAL

### 16.1 Features

- **Login**: Email + OTP (no password for clients — simple and secure)
- **Dashboard**: List of their cases with AI-summarized status
- **Case Detail**: Timeline, next hearing date, key documents, order summaries
- **Notifications**: Email and SMS for hearing dates, order updates
- **Read-only**: Clients cannot modify any case data

### 16.2 Route Structure

```
/portal/login          — Email + OTP login
/portal/dashboard      — List of client's cases
/portal/case/[id]      — Case detail view
/portal/case/[id]/docs — Documents (view/download only)
```

---

## 17. REMINDER & NOTIFICATION SYSTEM

### 17.1 Reminder Scheduling

```typescript
// src/workers/reminderScheduler.ts
import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";
import { getSMSProvider } from "@/lib/sms";

// Run every 15 minutes: find and send due reminders
cron.schedule("*/15 * * * *", async () => {
  const dueReminders = await prisma.reminder.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: new Date() },
    },
    include: { user: true, case: true, hearing: true },
    take: 100,
  });

  for (const reminder of dueReminders) {
    try {
      if (reminder.channel === "EMAIL") {
        await sendEmail({
          to: reminder.user.email,
          toName: reminder.user.name,
          subject: reminder.subject,
          htmlBody: reminder.body,
        });
      } else if (reminder.channel === "SMS" && reminder.user.phone) {
        const sms = getSMSProvider();
        await sms.sendSMS(reminder.user.phone, reminder.body);
      }

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    } catch (error) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: reminder.retryCount >= reminder.maxRetries ? "FAILED" : "PENDING",
          retryCount: { increment: 1 },
          failureReason: String(error),
          scheduledFor: new Date(Date.now() + 30 * 60 * 1000), // Retry in 30 min
        },
      });
    }
  }
});

// When a hearing is created/updated, auto-create reminders
export async function createHearingReminders(hearingId: string) {
  const hearing = await prisma.hearing.findUnique({
    where: { id: hearingId },
    include: { case: { include: { clients: { include: { client: true } } } }, lawyer: true },
  });
  if (!hearing) return;

  const hearingDate = hearing.hearingDate;
  const reminders = [
    { offset: 3 * 24 * 60 * 60 * 1000, label: "3 days before" },   // 3 days
    { offset: 1 * 24 * 60 * 60 * 1000, label: "1 day before" },    // 1 day
    { offset: 2 * 60 * 60 * 1000, label: "2 hours before" },       // 2 hours (morning of)
  ];

  for (const r of reminders) {
    const scheduledFor = new Date(hearingDate.getTime() - r.offset);
    if (scheduledFor <= new Date()) continue; // Don't schedule past reminders

    // Email reminder for lawyer
    await prisma.reminder.create({
      data: {
        userId: hearing.lawyerId,
        caseId: hearing.caseId,
        hearingId: hearing.id,
        channel: "EMAIL",
        status: "PENDING",
        scheduledFor,
        subject: `Hearing Reminder (${r.label}): ${hearing.case?.title}`,
        body: emailTemplates.hearingReminder({
          lawyerName: hearing.lawyer.name,
          caseName: hearing.case?.title || "",
          hearingDate: hearingDate.toLocaleDateString("en-IN"),
          courtName: hearing.case?.courtName || "",
          purpose: hearing.purpose || "",
        }).htmlBody,
      },
    });

    // SMS reminder for lawyer
    if (hearing.lawyer.phone) {
      await prisma.reminder.create({
        data: {
          userId: hearing.lawyerId,
          caseId: hearing.caseId,
          hearingId: hearing.id,
          channel: "SMS",
          status: "PENDING",
          scheduledFor,
          subject: "Hearing Reminder",
          body: `Hearing for ${hearing.case?.title} on ${hearingDate.toLocaleDateString("en-IN")} at ${hearing.case?.courtName}`,
        },
      });
    }

    // Client reminders (email only for clients)
    for (const cc of hearing.case?.clients || []) {
      await prisma.reminder.create({
        data: {
          userId: cc.clientId,
          caseId: hearing.caseId,
          hearingId: hearing.id,
          channel: "EMAIL",
          status: "PENDING",
          scheduledFor,
          subject: `Your Case Hearing (${r.label}): ${hearing.case?.title}`,
          body: emailTemplates.clientCaseUpdate({
            clientName: cc.client.name,
            caseName: hearing.case?.title || "",
            summary: `Your next hearing is scheduled.`,
            nextDate: hearingDate.toLocaleDateString("en-IN"),
          }).htmlBody,
        },
      });
    }
  }
}
```

---

## 18. SECURITY & COMPLIANCE

### 18.1 DPDP Act 2023 Compliance

| Requirement | Implementation |
|------------|---------------|
| Data minimization | Collect only necessary data; no Aadhaar storage |
| Consent | Explicit consent at signup; consent for AI processing of case data |
| Right to erasure | Account deletion API that purges all user data, cases, documents from DB and S3 |
| Data breach notification | Audit log + alert system; notify within 72 hours if breach detected |
| Data residency | All data stored in AWS Mumbai (ap-south-1) region |
| Data processing agreements | Agreements with AWS, Anthropic, Google Cloud for data processing |

### 18.2 Encryption

```typescript
// Encryption at rest
// - PostgreSQL: Enable Transparent Data Encryption (TDE) on AWS RDS
// - S3: Server-Side Encryption with AWS KMS (SSE-KMS)
// - Redis: In-transit encryption enabled

// Encryption in transit
// - TLS 1.3 for all API connections
// - HTTPS enforced via Next.js middleware + ALB
// - ZeptoMail: TLS 1.2 for SMTP

// Application-level encryption for sensitive fields
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY!; // 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift()!, "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

### 18.3 Audit Logging

Every data access and modification is logged. The `AuditLog` table captures:
- Who (userId)
- What (action: "case_viewed", "document_downloaded", "ai_query", etc.)
- When (createdAt)
- From where (ipAddress, userAgent)
- What resource (resource + resourceId)

### 18.4 Rate Limiting

```typescript
// src/middleware/rateLimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 requests per minute
  analytics: true,
});

export const aiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 AI requests per minute
  analytics: true,
});
```

---

## 19. API DESIGN

### 19.1 API Route Structure

```
/api/auth/signup          POST    — Register new lawyer
/api/auth/login           POST    — Login (email + password)
/api/auth/verify-otp      POST    — Verify phone OTP
/api/auth/forgot-password  POST    — Request password reset
/api/auth/reset-password   POST    — Reset password

/api/billing/subscribe    POST    — Create subscription
/api/billing/verify       POST    — Verify Razorpay payment
/api/billing/cancel       POST    — Cancel subscription
/api/billing/invoices     GET     — List payment history

/api/cases                GET     — List lawyer's cases
/api/cases                POST    — Create new case
/api/cases/[id]           GET     — Get case detail
/api/cases/[id]           PUT     — Update case
/api/cases/[id]           DELETE  — Archive case
/api/cases/[id]/timeline  GET     — Get case timeline
/api/cases/[id]/summary   GET     — AI-generated case summary

/api/documents            POST    — Upload document (multipart)
/api/documents/[id]       GET     — Get document metadata
/api/documents/[id]/download GET  — Download document from S3
/api/documents/[id]/ocr   POST    — Trigger OCR processing

/api/hearings             GET     — List hearings (with date filters)
/api/hearings             POST    — Create hearing
/api/hearings/[id]        PUT     — Update hearing
/api/hearings/today       GET     — Today's cause list
/api/hearings/upcoming    GET     — Next 7 days hearings

/api/ai/identify-sections POST    — Identify BNS sections from text
/api/ai/research          POST    — Legal research query
/api/ai/draft             POST    — Generate legal document draft
/api/ai/summarize         POST    — Summarize document/case

/api/sections/search      GET     — Search BNS/IPC sections
/api/sections/[id]        GET     — Get section detail
/api/sections/map         GET     — IPC↔BNS mapping

/api/clients              GET     — List lawyer's clients
/api/clients/invite       POST    — Invite client to portal

/api/inbound-emails       GET     — List parsed inbound emails
/api/inbound-emails/[id]/assign POST — Assign email to case

/api/word-addin/suggest   POST    — Get AI suggestions for Word Add-in

/api/webhooks/razorpay    POST    — Razorpay webhook handler
/api/webhooks/ses-inbound POST    — AWS SES inbound email webhook

/api/admin/plans          CRUD    — Manage subscription plans
/api/admin/users          GET     — List all users
/api/admin/analytics      GET     — Platform analytics

// Client Portal APIs (separate auth)
/api/portal/auth/login    POST    — Client OTP login
/api/portal/cases         GET     — Client's cases
/api/portal/cases/[id]    GET     — Case detail (AI summary, timeline, next hearing)
```

---

## 20. DEPLOYMENT & INFRASTRUCTURE

### 20.1 AWS Architecture (Mumbai Region — ap-south-1)

```
┌─────────────────────────────────────────────────────┐
│  Route 53 (DNS)                                       │
│  ├── app.nyayasahayak.com → ALB                      │
│  ├── api.nyayasahayak.com → ALB                      │
│  ├── portal.nyayasahayak.com → ALB                   │
│  ├── addin.nyayasahayak.com → CloudFront → S3        │
│  └── inbound.nyayasahayak.com → MX → SES             │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  Application Load Balancer (ALB)                      │
│  ├── SSL/TLS termination (ACM certificate)           │
│  └── Routes to ECS Fargate tasks                     │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  ECS Fargate (Containerized)                          │
│  ├── Web Service (Next.js app — 2-4 tasks)           │
│  ├── Worker Service (BullMQ workers — 1-2 tasks)     │
│  └── Cron Service (node-cron scheduler — 1 task)     │
└──────────────────────┬──────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│ RDS         │  │ ElastiCache│  │ S3 Buckets │
│ PostgreSQL  │  │ Redis      │  │ (Documents,│
│ (db.r6g.lg) │  │ (cache.m6g│  │  Emails,   │
│ Multi-AZ    │  │  .large)   │  │  OCR)      │
│ + pgvector  │  │            │  │            │
└────────────┘  └────────────┘  └────────────┘
```

### 20.2 Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 21. FUTURE EXPANSION ROADMAP

| Phase | Timeline | Features |
|-------|----------|----------|
| **Phase 1 (MVP)** | Months 1-3 | Auth, billing, case management, BNS section engine, basic OCR, email reminders |
| **Phase 2** | Months 4-6 | AI research (RAG), AI drafting, inbound email parsing, client portal |
| **Phase 3** | Months 7-9 | Word Add-in, eCourts sync, multilingual OCR (Hindi, Marathi, Tamil), mobile app |
| **Phase 4** | Months 10-12 | Advanced analytics, predictive outcomes, civil/family law expansion, Zoho Marketplace listing |
| **Phase 5** | Year 2 | WhatsApp Business API integration, voice-to-text for court proceedings, API marketplace for other legal tools, white-label for large firms |

### Plugin Architecture for Future Expansion

```typescript
// src/lib/plugins/interface.ts
export interface NyayaSahayakPlugin {
  name: string;
  version: string;
  description: string;
  initialize(): Promise<void>;
  onCaseCreated?(caseId: string): Promise<void>;
  onDocumentUploaded?(documentId: string): Promise<void>;
  onHearingCreated?(hearingId: string): Promise<void>;
  onEmailReceived?(emailId: string): Promise<void>;
}

// Future plugins:
// - Zoho CRM Sync Plugin
// - WhatsApp Business Plugin
// - Google Calendar Sync Plugin
// - Legal Analytics Dashboard Plugin
// - Multi-language Translation Plugin
```

---

## 22. ENVIRONMENT VARIABLES

```bash
# .env.example — Copy to .env and fill in values

# ── Application ──
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.nyayasahayak.com
NEXT_PUBLIC_PORTAL_URL=https://portal.nyayasahayak.com

# ── Database ──
DATABASE_URL=postgresql://user:password@rds-host:5432/nyayasahayak?schema=public

# ── Redis ──
REDIS_HOST=elasticache-host
REDIS_PORT=6379
REDIS_PASSWORD=

# ── Authentication ──
NEXTAUTH_URL=https://app.nyayasahayak.com
NEXTAUTH_SECRET=generate-a-32-char-random-string
JWT_SECRET=generate-another-32-char-random-string

# ── Razorpay ──
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
RAZORPAY_WEBHOOK_SECRET=XXXXXXXXXXXXXXXX
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXXX

# ── ZeptoMail (Outbound Email) ──
ZEPTOMAIL_SMTP_KEY=your-zeptomail-smtp-api-key
ZEPTOMAIL_API_TOKEN=zoho-enczapikey-your-send-mail-token
ZEPTOMAIL_FROM_EMAIL=notifications@nyayasahayak.com
ZEPTOMAIL_FROM_NAME=NyayaSahayak

# ── SMS ──
SMS_PROVIDER=msg91
SMS_AUTH_KEY=your-msg91-auth-key
SMS_SENDER_ID=NYAYSK
SMS_TEMPLATE_HEARING_REMINDER=your-dlt-template-id
SMS_TEMPLATE_OTP=your-dlt-otp-template-id

# ── AWS ──
AWS_ACCESS_KEY_ID=XXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXXXX
AWS_REGION=ap-south-1
AWS_S3_DOCUMENTS_BUCKET=nyayasahayak-documents
AWS_S3_INBOUND_EMAILS_BUCKET=nyayasahayak-inbound-emails

# ── Anthropic (Claude API) ──
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXXXXX

# ── OpenAI (Embeddings + Fallback) ──
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXX

# ── Google Cloud (Document AI OCR) ──
GCP_PROJECT_ID=your-gcp-project
GCP_LOCATION=us
GCP_PROCESSOR_ID=your-document-ai-processor-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# ── Encryption ──
FIELD_ENCRYPTION_KEY=64-char-hex-string-for-aes-256

# ── Rate Limiting (Upstash Redis) ──
UPSTASH_REDIS_URL=https://your-upstash-url
UPSTASH_REDIS_TOKEN=your-token
```

---

## 23. GETTING STARTED — FOR DEVELOPERS

### Step-by-step to run locally:

```bash
# 1. Clone and install
git clone https://github.com/techmagify/nyayasahayak.git
cd nyayasahayak
npm install

# 2. Set up PostgreSQL with pgvector
docker run -d --name nyayasahayak-db \
  -e POSTGRES_USER=nyaya \
  -e POSTGRES_PASSWORD=dev123 \
  -e POSTGRES_DB=nyayasahayak \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# 3. Set up Redis
docker run -d --name nyayasahayak-redis -p 6379:6379 redis:7-alpine

# 4. Copy env file and fill values
cp .env.example .env

# 5. Run database migrations
npx prisma migrate dev

# 6. Seed legal sections database
npx prisma db seed

# 7. Start development server
npm run dev

# 8. Start worker (separate terminal)
npm run worker

# 9. Access at http://localhost:3000
```

---

**END OF SPECIFICATION**

*This document should be treated as the complete technical blueprint for NyayaSahayak. Every feature described above should be implemented in the order specified in the Phase 1-5 roadmap. The database schema, API contracts, and integration code provided are production-ready patterns that should be adapted to the specific implementation context.*

*For questions or clarifications, contact the Techmagify engineering team.*
