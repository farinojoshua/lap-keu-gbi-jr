"use client";

import { useState } from "react";
import { formatRupiah, getMonthName, INCOME_CATEGORIES, EXPENSE_CATEGORIES, generateYears } from "@/lib/utils";
import { showError } from "@/lib/swal";
import { Skeleton } from "@/components/ui/Skeleton";

interface MonthResult {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  saldoPindahan: number;
  saldo: number;
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
}

interface ComparisonData {
  results: MonthResult[];
  allIncomeCategories: string[];
  allExpenseCategories: string[];
  churchInfo: Record<string, string>;
}

type RangeType = "quarter" | "semester" | "year";

export default function ComparisonReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [rangeType, setRangeType] = useState<RangeType>("quarter");
  const [startMonth, setStartMonth] = useState(Math.max(1, now.getMonth() + 1 - 2));
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);

  function getMonths(): number[] {
    if (rangeType === "year") return Array.from({ length: 12 }, (_, i) => i + 1);
    if (rangeType === "semester") {
      const start = startMonth <= 6 ? 1 : 7;
      return Array.from({ length: 6 }, (_, i) => start + i);
    }
    // quarter — 3 months starting from startMonth
    return Array.from({ length: 3 }, (_, i) => {
      const m = startMonth + i;
      return m > 12 ? m - 12 : m;
    });
  }

  async function loadComparison() {
    setLoading(true);
    try {
      const months = getMonths();
      const res = await fetch(`/api/report/comparison?months=${months.join(",")}&year=${year}`);
      const json = await res.json();
      setData(json);
    } catch {
      showError("Gagal memuat data perbandingan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Jenis</label>
            <select
              value={rangeType}
              onChange={(e) => setRangeType(e.target.value as RangeType)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-base"
            >
              <option value="quarter">3 Bulan (Triwulan)</option>
              <option value="semester">6 Bulan (Semester)</option>
              <option value="year">12 Bulan (Tahunan)</option>
            </select>
          </div>

          {rangeType === "quarter" && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Mulai Bulan</label>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-base"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                ))}
              </select>
            </div>
          )}

          {rangeType === "semester" && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Semester</label>
              <select
                value={startMonth <= 6 ? 1 : 7}
                onChange={(e) => setStartMonth(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-base"
              >
                <option value={1}>Semester 1 (Jan–Jun)</option>
                <option value={7}>Semester 2 (Jul–Des)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tahun</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-base"
            >
              {generateYears().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={loadComparison}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-base shadow-sm"
          >
            {loading ? "Memuat..." : "Tampilkan"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      )}

      {/* Comparison Table */}
      {!loading && data && data.results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="text-center p-4 border-b">
            <h2 className="text-lg font-bold text-gray-800">
              Perbandingan Keuangan — {data.results.map((r) => getMonthName(r.month)).join(", ")} {year}
            </h2>
            {data.churchInfo.church_name && (
              <p className="text-sm text-gray-500">{data.churchInfo.church_name}</p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold text-gray-500 sticky left-0 bg-gray-50 z-10">
                    Kategori
                  </th>
                  {data.results.map((r) => (
                    <th key={r.month} className="text-right px-4 py-3 text-xs uppercase tracking-wider font-semibold text-gray-500 min-w-[120px]">
                      {getMonthName(r.month)}
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wider font-semibold text-blue-600 min-w-[120px] bg-blue-50/50">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* INCOME SECTION */}
                <tr className="bg-green-50/50">
                  <td colSpan={data.results.length + 2} className="px-4 py-2 font-bold text-green-800 text-xs uppercase tracking-wider">
                    Pemasukan
                  </td>
                </tr>

                {/* Saldo Bulan Lalu */}
                <tr className="border-t">
                  <td className="px-4 py-2 text-gray-600 italic sticky left-0 bg-white z-10">Saldo Bulan Lalu</td>
                  {data.results.map((r) => (
                    <td key={r.month} className="px-4 py-2 text-right text-gray-500 italic">
                      {formatRupiah(r.saldoPindahan)}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right text-gray-500 italic bg-blue-50/30">—</td>
                </tr>

                {data.allIncomeCategories.map((cat) => (
                  <tr key={`inc-${cat}`} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700 sticky left-0 bg-white z-10">
                      {INCOME_CATEGORIES[cat] || cat}
                    </td>
                    {data.results.map((r) => (
                      <td key={r.month} className="px-4 py-2 text-right text-gray-800">
                        {formatRupiah(r.incomeByCategory[cat] || 0)}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-medium text-blue-800 bg-blue-50/30">
                      {formatRupiah(data.results.reduce((s, r) => s + (r.incomeByCategory[cat] || 0), 0))}
                    </td>
                  </tr>
                ))}

                {/* Total Income */}
                <tr className="border-t-2 border-green-300 bg-green-50/80 font-semibold">
                  <td className="px-4 py-2 text-green-800 sticky left-0 bg-green-50/80 z-10">Total Pemasukan</td>
                  {data.results.map((r) => (
                    <td key={r.month} className="px-4 py-2 text-right text-green-800">
                      {formatRupiah(r.totalIncome)}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right text-green-800 bg-blue-50/30">
                    {formatRupiah(data.results.reduce((s, r) => s + r.totalIncome, 0))}
                  </td>
                </tr>

                {/* EXPENSE SECTION */}
                <tr className="bg-red-50/50">
                  <td colSpan={data.results.length + 2} className="px-4 py-2 font-bold text-red-800 text-xs uppercase tracking-wider">
                    Pengeluaran
                  </td>
                </tr>

                {data.allExpenseCategories.map((cat) => (
                  <tr key={`exp-${cat}`} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700 sticky left-0 bg-white z-10">
                      {EXPENSE_CATEGORIES[cat] || cat}
                    </td>
                    {data.results.map((r) => (
                      <td key={r.month} className="px-4 py-2 text-right text-gray-800">
                        {formatRupiah(r.expenseByCategory[cat] || 0)}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-medium text-blue-800 bg-blue-50/30">
                      {formatRupiah(data.results.reduce((s, r) => s + (r.expenseByCategory[cat] || 0), 0))}
                    </td>
                  </tr>
                ))}

                {/* Total Expense */}
                <tr className="border-t-2 border-red-300 bg-red-50/80 font-semibold">
                  <td className="px-4 py-2 text-red-800 sticky left-0 bg-red-50/80 z-10">Total Pengeluaran</td>
                  {data.results.map((r) => (
                    <td key={r.month} className="px-4 py-2 text-right text-red-800">
                      {formatRupiah(r.totalExpense)}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right text-red-800 bg-blue-50/30">
                    {formatRupiah(data.results.reduce((s, r) => s + r.totalExpense, 0))}
                  </td>
                </tr>

                {/* SALDO */}
                <tr className="border-t-2 border-blue-300 bg-blue-50 font-bold">
                  <td className="px-4 py-2 text-blue-900 sticky left-0 bg-blue-50 z-10">Saldo Akhir</td>
                  {data.results.map((r) => (
                    <td key={r.month} className="px-4 py-2 text-right text-blue-900">
                      {formatRupiah(r.saldo)}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right text-blue-900 bg-blue-100/50">
                    {formatRupiah(data.results[data.results.length - 1].saldo)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !data && (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-400">
          Pilih jenis perbandingan dan klik &quot;Tampilkan&quot; untuk melihat data.
        </div>
      )}
    </div>
  );
}
