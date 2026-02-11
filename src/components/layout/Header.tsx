"use client";

import { useSession, signOut } from "next-auth/react";

export default function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { data: session } = useSession();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-md hover:bg-gray-100"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1 lg:flex-none" />

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {session?.user?.name}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
