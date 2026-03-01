"use client";

import { useSession, signOut } from "next-auth/react";
import { Menu, User, LogOut, Shield, BookOpen, Camera } from "lucide-react";

export default function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      <div className="flex-1 lg:flex-none" />

      {status === "authenticated" && session?.user ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-base text-gray-700 font-medium leading-tight">
                {session.user.name}
              </span>
              <span className={`text-xs font-medium leading-tight flex items-center gap-1 ${
                role === "admin" ? "text-purple-600" : role === "dokumentasi" ? "text-green-600" : "text-blue-600"
              }`}>
                {role === "admin" ? (
                  <><Shield className="w-3 h-3" /> Admin</>
                ) : role === "dokumentasi" ? (
                  <><Camera className="w-3 h-3" /> Dokumentasi</>
                ) : (
                  <><BookOpen className="w-3 h-3" /> Bendahara</>
                )}
              </span>
            </div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-base text-gray-500 hover:bg-red-50 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      ) : (
        <div className="w-40" />
      )}
    </header>
  );
}
