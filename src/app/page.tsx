"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  formatRupiah,
  getMonthName,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  formatDateID,
  generateYears,
} from "@/lib/utils";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import {
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Plus,
  Lock,
  Unlock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CalendarDays,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DashboardData } from "@/types";

function DeltaBadge({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0) return null;
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  if (diff === 0)
    return (
      <span className="inline-flex items-center text-xs text-gray-400 mt-1">
        <Minus className="w-3 h-3 mr-0.5" /> Sama dengan bulan lalu
      </span>
    );
  const isUp = diff > 0;
  return (
    <span
      className={`inline-flex items-center text-xs mt-1 ${isUp ? "text-green-600" : "text-red-600"}`}
    >
      {isUp ? (
        <ArrowUpRight className="w-3 h-3 mr-0.5" />
      ) : (
        <ArrowDownRight className="w-3 h-3 mr-0.5" />
      )}
      {isUp ? "+" : ""}
      {pct}% vs bulan lalu
    </span>
  );
}

function HorizontalBar({
  data,
  labels,
  total,
  colorClass,
}: {
  data: Record<string, number>;
  labels: Record<string, string>;
  total: number;
  colorClass: string;
}) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0)
    return <p className="text-gray-400 text-center py-6">Belum ada data</p>;

  return (
    <div className="space-y-3">
      {sorted.map(([key, value]) => {
        const pct = total > 0 ? (value / total) * 100 : 0;
        return (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 truncate mr-2">
                {labels[key] || key}
              </span>
              <span className="text-gray-500 shrink-0 tabular-nums">
                {formatRupiah(value)}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${colorClass}`}
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/dashboard?month=${month}&year=${year}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [month, year]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-56 mb-2" />
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i}>
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-7 w-36" />
            </SkeletonCard>
          ))}
        </div>
        <SkeletonCard>
          <Skeleton className="h-5 w-56 mb-4" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </SkeletonCard>
      </div>
    );
  }

  if (error || !data)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg font-medium">Gagal memuat dashboard</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );

  const chartData = data.trend.map((t) => ({
    name: `${getMonthName(t.month).slice(0, 3)} ${t.year}`,
    Pemasukan: t.income,
    Pengeluaran: t.expense,
  }));

  const summaryCards = [
    {
      label: "Saldo Bulan Lalu",
      value: data.saldoPindahan,
      color: "border-gray-400",
      textColor: "text-gray-800",
      icon: ArrowRightLeft,
      iconBg: "bg-gray-100",
      iconColor: "text-gray-500",
    },
    {
      label: "Total Pemasukan",
      value: data.totalIncome,
      color: "border-green-500",
      textColor: "text-green-600",
      icon: TrendingUp,
      iconBg: "bg-green-100",
      iconColor: "text-green-500",
      delta: { current: data.totalIncome, previous: data.prevMonth.income },
    },
    {
      label: "Total Pengeluaran",
      value: data.totalExpense,
      color: "border-red-500",
      textColor: "text-red-600",
      icon: TrendingDown,
      iconBg: "bg-red-100",
      iconColor: "text-red-500",
      delta: {
        current: data.totalExpense,
        previous: data.prevMonth.expense,
      },
    },
    {
      label: "Saldo",
      value: data.saldo,
      color: "border-blue-500",
      textColor: "text-blue-600",
      icon: Wallet,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">
              {getMonthName(data.currentMonth)} {data.currentYear}
            </span>
            {data.isLocked ? (
              <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                <Lock className="w-3 h-3" /> Ditutup
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                <Unlock className="w-3 h-3" /> Terbuka
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-base"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-base"
          >
            {generateYears().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Link
            href="/pemasukan"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Pemasukan
          </Link>
          <Link
            href="/pengeluaran"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Pengeluaran
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-white rounded-lg shadow-sm border border-l-4 ${card.color} p-5`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p
                    className={`text-xl font-bold ${card.textColor} mt-1 truncate`}
                  >
                    {formatRupiah(card.value)}
                  </p>
                  {card.delta && (
                    <DeltaBadge
                      current={card.delta.current}
                      previous={card.delta.previous}
                    />
                  )}
                </div>
                <div
                  className={`w-10 h-10 ${card.iconBg} rounded-lg flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-lg shadow-sm border p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Tren Pemasukan vs Pengeluaran
        </h2>
        {data.trend.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Belum ada data</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(1)}jt`
                    : v >= 1_000
                      ? `${(v / 1_000).toFixed(0)}rb`
                      : String(v)
                }
                tick={{ fontSize: 12 }}
                width={55}
              />
              <Tooltip
                formatter={(value: number | undefined) =>
                  formatRupiah(value ?? 0)
                }
                labelStyle={{ fontWeight: "bold" }}
              />
              <Legend />
              <Bar
                dataKey="Pemasukan"
                fill="#4ade80"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Pengeluaran"
                fill="#f87171"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Category Breakdown - Horizontal Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Pemasukan per Kategori
          </h2>
          <HorizontalBar
            data={data.incomeByCategory}
            labels={INCOME_CATEGORIES}
            total={data.totalIncome}
            colorClass="bg-green-400"
          />
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Pengeluaran per Kategori
          </h2>
          <HorizontalBar
            data={data.expenseByCategory}
            labels={EXPENSE_CATEGORIES}
            total={data.totalExpense}
            colorClass="bg-red-400"
          />
        </div>
      </div>

      {/* Weekly Attendance Chart */}
      {data.weeklyData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-800">
              Kehadiran Minggu ke Minggu
            </h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Ibadah umum & Sekolah Minggu — {data.weeklyData.length} minggu
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={data.weeklyData.map((w, i) => ({
                name: `Mg ${i + 1}\n${formatDateID(w.date)}`,
                "Ibadah Umum": w.attendance || null,
                "Sekolah Minggu": w.smAttendance || null,
              }))}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={35} allowDecimals={false} />
              <Tooltip
                formatter={(value: number | string) => [`${value} orang`]}
                labelStyle={{ fontWeight: "bold" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="Ibadah Umum"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="Sekolah Minggu"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          {/* Summary row */}
          <div className="flex gap-6 mt-3 pt-3 border-t text-sm text-gray-600">
            {data.avgAttendance > 0 && (
              <span>Rata-rata ibadah: <strong className="text-indigo-600">{data.avgAttendance} org</strong></span>
            )}
            <span>Total persembahan: <strong className="text-amber-600">{formatRupiah(data.totalPersembahan)}</strong></span>
          </div>
        </div>
      )}

      {/* Top 5 Expenses */}
      {data.topExpenses.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            5 Pengeluaran Terbesar
          </h2>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">
                    #
                  </th>
                  <th className="text-left px-4 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">
                    Keterangan
                  </th>
                  <th className="text-left px-4 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">
                    Kategori
                  </th>
                  <th className="text-left px-4 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">
                    Tanggal
                  </th>
                  <th className="text-right px-4 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topExpenses.map((exp, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 font-medium">
                      {i + 1}
                    </td>
                    <td className="px-4 py-2.5 text-gray-800">
                      {exp.description || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {EXPENSE_CATEGORIES[exp.category] || exp.category}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {formatDateID(exp.date)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600">
                      {formatRupiah(exp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
