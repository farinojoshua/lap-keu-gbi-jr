"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pemasukan", label: "Pemasukan", icon: TrendingUp },
  { href: "/pengeluaran", label: "Pengeluaran", icon: TrendingDown },
  { href: "/laporan", label: "Laporan", icon: FileText },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || role === "admin"
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:sticky lg:z-auto lg:shrink-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-gray-200 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo_gbi.png"
            alt="Logo GBI"
            width={64}
            height={64}
            className="rounded-full mb-3"
          />
          <h1 className="text-xl font-bold text-gray-800">GBI Jonggol Raya</h1>
          <p className="text-sm text-gray-500">Laporan Keuangan</p>
        </div>

        <nav className="p-4 space-y-1 sidebar-scroll overflow-y-auto" style={{ maxHeight: "calc(100vh - 88px)" }}>
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
