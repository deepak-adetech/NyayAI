import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
// Note: prisma is already imported above and used in JWT refresh callback

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

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
      async authorize(credentials, req) {
        // Validate input with Zod (prevents injection)
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { subscription: { include: { plan: true } } },
        });

        if (!user || !user.passwordHash || !user.isActive) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        // Block login if email not verified
        if (!user.emailVerified) {
          // Throw special error that login page can detect
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "login",
            metadata: { email },
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionStatus: user.subscription?.status ?? "TRIAL",
          planTier: user.subscription?.plan?.tier ?? "STARTER",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.subscriptionStatus = (user as any).subscriptionStatus;
        token.planTier = (user as any).planTier;
        token.lastRefreshed = Date.now();
      }

      // Refresh subscription status from DB every 5 minutes to pick up changes
      const shouldRefresh =
        trigger === "update" ||
        !token.lastRefreshed ||
        Date.now() - (token.lastRefreshed as number) > 5 * 60 * 1000;

      if (shouldRefresh && token.id && !user) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: { subscription: { include: { plan: true } } },
          });
          if (freshUser) {
            token.role = freshUser.role;
            token.subscriptionStatus = freshUser.subscription?.status ?? "TRIAL";
            token.planTier = freshUser.subscription?.plan?.tier ?? "STARTER";
            token.lastRefreshed = Date.now();
          }
        } catch {
          // Keep existing token values on DB error
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).subscriptionStatus = token.subscriptionStatus;
        (session.user as any).planTier = token.planTier;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name: "nyaya-session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});
