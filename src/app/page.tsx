"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  FileText,
  Images,
  Settings,
  ArrowRight,
  Church,
} from "lucide-react";

const quickLinks = [
  {
    href: "/keuangan",
    label: "Dashboard Keuangan",
    description: "Lihat ringkasan keuangan gereja",
    icon: LayoutDashboard,
    color: "bg-blue-50 text-blue-600",
    iconBg: "bg-blue-100",
    roles: ["admin", "bendahara"],
  },
  {
    href: "/pemasukan",
    label: "Pemasukan",
    description: "Kelola data pemasukan gereja",
    icon: TrendingUp,
    color: "bg-green-50 text-green-600",
    iconBg: "bg-green-100",
    roles: ["admin", "bendahara"],
  },
  {
    href: "/pengeluaran",
    label: "Pengeluaran",
    description: "Kelola data pengeluaran gereja",
    icon: TrendingDown,
    color: "bg-red-50 text-red-600",
    iconBg: "bg-red-100",
    roles: ["admin", "bendahara"],
  },
  {
    href: "/laporan",
    label: "Laporan",
    description: "Buat dan cetak laporan keuangan",
    icon: FileText,
    color: "bg-amber-50 text-amber-600",
    iconBg: "bg-amber-100",
    roles: ["admin", "bendahara"],
  },
  {
    href: "/dokumentasi",
    label: "Dokumentasi",
    description: "Kelola foto dan dokumentasi kegiatan",
    icon: Images,
    color: "bg-purple-50 text-purple-600",
    iconBg: "bg-purple-100",
  },
  {
    href: "/pengaturan",
    label: "Pengaturan",
    description: "Kelola pengguna dan konfigurasi",
    icon: Settings,
    color: "bg-gray-50 text-gray-600",
    iconBg: "bg-gray-100",
  },
];

export default function BerandaPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const userName = session?.user?.name || "Pengguna";

  const visibleLinks = quickLinks.filter(
    (link) => !link.roles || (role !== undefined && link.roles.includes(role))
  );

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Church className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              Selamat Datang, {userName}!
            </h1>
            <p className="text-blue-100 mt-1 text-lg">
              Portal Gereja GBI Jonggol Raya
            </p>
            <p className="text-blue-200 mt-3 text-sm leading-relaxed max-w-2xl">
              Kelola seluruh kebutuhan administrasi gereja dari satu tempat.
              Gunakan menu di bawah ini atau sidebar untuk mengakses fitur yang tersedia.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Akses Cepat
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 ${link.iconBg} rounded-lg flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-5 h-5 ${link.color.split(" ")[1]}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {link.label}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {link.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Info Section — Scalable placeholder for future modules */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Church className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-700">
            Fitur Lainnya Segera Hadir
          </h3>
          <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
            Jadwal ibadah, warta jemaat, pelayanan, dan fitur lainnya akan segera tersedia di portal ini.
          </p>
        </div>
      </div>
    </div>
  );
}
