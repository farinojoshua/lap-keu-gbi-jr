import { NextAuthOptions, getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: string }).role;
        token.username = user.email || "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string; role: string; username: string }).id = token.sub!;
        (session.user as { id: string; role: string; username: string }).role = token.role as string;
        (session.user as { id: string; role: string; username: string }).username = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// ---------- Auth helpers for API routes ----------

interface AuthSession {
  user: { id: string; name: string; role: string; username: string };
}

/**
 * Require any authenticated user. Returns session or 401 response.
 */
export async function requireAuth(): Promise<AuthSession | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session as unknown as AuthSession;
}

/**
 * Require admin role. Returns session or 401/403 response.
 */
export async function requireAdmin(): Promise<AuthSession | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (result.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}

/**
 * Require admin or dokumentasi role. Returns session or 401/403 response.
 */
export async function requireDocOrAdmin(): Promise<AuthSession | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (result.user.role !== "admin" && result.user.role !== "dokumentasi") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}
