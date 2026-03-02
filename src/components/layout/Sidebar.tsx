"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home,
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  FileText,
  Settings,
  Images,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    group: "Utama",
    items: [
      { href: "/", label: "Beranda", icon: Home },
    ],
  },
  {
    group: "Keuangan",
    items: [
      { href: "/keuangan", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "bendahara"] },
      { href: "/pemasukan", label: "Pemasukan", icon: TrendingUp, roles: ["admin", "bendahara"] },
      { href: "/pengeluaran", label: "Pengeluaran", icon: TrendingDown, roles: ["admin", "bendahara"] },
      { href: "/laporan", label: "Laporan", icon: FileText, roles: ["admin", "bendahara"] },
    ],
  },
  {
    group: "Media",
    items: [
      { href: "/dokumentasi", label: "Dokumentasi", icon: Images },
    ],
  },
  {
    group: "Sistem",
    items: [
      { href: "/pengaturan", label: "Pengaturan", icon: Settings },
    ],
  },
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

  const visibleGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => !item.roles || (role !== undefined && item.roles.includes(role))),
    }))
    .filter((g) => g.items.length > 0);

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
          <p className="text-sm text-gray-500">Portal Gereja</p>
        </div>

        <nav className="p-4 sidebar-scroll overflow-y-auto space-y-4" style={{ maxHeight: "calc(100vh - 88px)" }}>
          {visibleGroups.map((group) => (
            <div key={group.group}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-1">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
