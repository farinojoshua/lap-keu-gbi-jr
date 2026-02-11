"use client";

import { useEffect, useState } from "react";
import { formatRupiah, getMonthName } from "@/lib/utils";

interface DashboardData {
  currentMonth: number;
  currentYear: number;
  saldoPindahan: number;
  totalIncome: number;
  totalExpense: number;
  saldo: number;
  avgAttendance: number;
  totalPersembahan: number;
  trend: { month: number; year: number; income: number; expense: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Memuat data...</div>
      </div>
    );
  }

  if (!data) return null;

  const maxTrendValue = Math.max(...data.trend.flatMap((t) => [t.income, t.expense]), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">
          Periode {getMonthName(data.currentMonth)} {data.currentYear}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-base text-gray-500">Saldo Pindahan</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {formatRupiah(data.saldoPindahan)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-base text-gray-500">Total Pemasukan</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {formatRupiah(data.totalIncome)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-base text-gray-500">Total Pengeluaran</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatRupiah(data.totalExpense)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-base text-gray-500">Saldo</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {formatRupiah(data.saldo)}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-base text-gray-500">Rata-rata Kehadiran Ibadah</p>
          <p className="text-4xl font-bold text-gray-800 mt-1">{data.avgAttendance}</p>
          <p className="text-sm text-gray-400 mt-1">orang per minggu</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-base text-gray-500">Total Persembahan Bulan Ini</p>
          <p className="text-4xl font-bold text-gray-800 mt-1">
            {formatRupiah(data.totalPersembahan)}
          </p>
          <p className="text-sm text-gray-400 mt-1">kantong ungu + hitam + sekolah minggu</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-lg shadow-sm border p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Tren Pemasukan vs Pengeluaran
        </h2>
        {data.trend.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Belum ada data</p>
        ) : (
          <>
            <div className="space-y-4">
              {data.trend.map((t) => (
                <div key={`${t.year}-${t.month}`} className="space-y-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{getMonthName(t.month)} {t.year}</span>
                    <span className="text-sm">
                      <span className="text-green-600">{formatRupiah(t.income)}</span>
                      {" / "}
                      <span className="text-red-600">{formatRupiah(t.expense)}</span>
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div
                      className="h-5 bg-green-400 rounded-sm transition-all"
                      style={{ width: `${(t.income / maxTrendValue) * 100}%`, minWidth: t.income > 0 ? "4px" : "0" }}
                    />
                  </div>
                  <div className="flex gap-1">
                    <div
                      className="h-5 bg-red-400 rounded-sm transition-all"
                      style={{ width: `${(t.expense / maxTrendValue) * 100}%`, minWidth: t.expense > 0 ? "4px" : "0" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-6 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-400 rounded-sm" /> Pemasukan
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-400 rounded-sm" /> Pengeluaran
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
