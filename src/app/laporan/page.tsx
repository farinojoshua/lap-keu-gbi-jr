"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Fragment } from "react";
import {
  formatRupiah,
  getMonthName,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  generateYears,
  formatDateID,
} from "@/lib/utils";
import { showSuccess, showConfirmAction } from "@/lib/swal";
import NumericInput from "@/components/ui/NumericInput";
import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";
import { Lock } from "lucide-react";
import ComparisonReport from "@/components/report/ComparisonReport";

const PDFExportButton = dynamic(() => import("@/components/report/PDFExportButton"), {
  ssr: false,
  loading: () => <button disabled className="bg-red-600 text-white px-5 py-2.5 rounded-lg opacity-50 text-base">Menyiapkan...</button>,
});

interface ReportData {
  period: {
    id: string;
    month: number;
    year: number;
    saldoPindahan: number;
    saldoRekening: number;
    saldoCash: number;
    isLocked: boolean;
  };
  incomeByCategory: Record<
    string,
    {
      entries: {
        date: string;
        description: string;
        amount: number;
        attendance?: number | null;
      }[];
      subtotal: number;
    }
  >;
  expenseByCategory: Record<
    string,
    {
      entries: { date: string; description: string; amount: number }[];
      subtotal: number;
    }
  >;
  totalIncome: number;
  totalExpense: number;
  saldo: number;
  totalKomsel: number;
  churchInfo: Record<string, string>;
  fundBalances: Record<string, number>;
}

export default function LaporanPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<"monthly" | "comparison">("monthly");

  // Saldo edit
  const [editSaldo, setEditSaldo] = useState(false);
  const [saldoRekening, setSaldoRekening] = useState("");
  const [saldoCash, setSaldoCash] = useState("");

  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/report?month=${month}&year=${year}`);
      if (!res.ok) throw new Error();
      const reportData = await res.json();
      setData(reportData);
      setSaldoRekening(String(reportData.period.saldoRekening));
      setSaldoCash(String(reportData.period.saldoCash));
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleClosePeriod() {
    if (!data) return;
    const result = await showConfirmAction(
      `Tutup Periode ${getMonthName(month)} ${year}?`,
      "Data tidak bisa diubah lagi setelah ditutup."
    );
    if (!result.isConfirmed) return;
    setClosing(true);
    await fetch("/api/periods/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodId: data.period.id }),
    });
    setClosing(false);
    loadData();
    showSuccess("Periode berhasil ditutup");
  }

  async function handleSaveSaldo() {
    if (!data) return;

    // Update period saldo
    await fetch("/api/periods", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: data.period.id,
        saldoRekening: Number(saldoRekening),
        saldoCash: Number(saldoCash),
      }),
    });

    setEditSaldo(false);
    loadData();
    showSuccess("Keterangan berhasil disimpan");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-20 rounded-lg" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="text-center p-6 border-b">
            <Skeleton className="h-5 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-56 mx-auto mb-2" />
            <Skeleton className="h-4 w-40 mx-auto" />
          </div>
          <div className="p-4 space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div>
              <Skeleton className="h-10 w-full rounded-lg mb-2" />
              <SkeletonTable cols={3} rows={4} />
            </div>
            <div>
              <Skeleton className="h-10 w-full rounded-lg mb-2" />
              <SkeletonTable cols={3} rows={4} />
            </div>
            <div className="bg-blue-100 p-4 rounded-lg flex justify-between items-center">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-7 w-36" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg font-medium">Gagal memuat laporan</p>
        <button
          onClick={() => loadData()}
          className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );

  const daysInMonth = new Date(year, month, 0).getDate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("monthly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "monthly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Laporan Bulanan
          </button>
          <button
            onClick={() => setActiveTab("comparison")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "comparison"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Perbandingan
          </button>
        </div>

        {activeTab === "monthly" && (
          <div className="flex gap-2 items-center flex-wrap">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-4 py-2.5 text-base">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-4 py-2.5 text-base">
              {generateYears().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <PDFExportButton data={data} month={month} year={year} />

            {!data?.period.isLocked && (
              <button
                onClick={handleClosePeriod}
                disabled={closing}
                className="bg-orange-600 text-white px-5 py-2.5 rounded-lg hover:bg-orange-700 disabled:opacity-50 text-base shadow-sm flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {closing ? "Menutup..." : "Tutup Periode"}
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === "comparison" ? (
        <ComparisonReport />
      ) : (
        <>
          {data.period.isLocked && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg border border-green-200 text-base flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              Periode ini sudah ditutup dan dikunci.
            </div>
          )}

          {/* Report View */}
      <div className="bg-white rounded-xl shadow-sm border print:shadow-none print:border-none">
        {/* Header */}
        <div className="text-center p-6 border-b bg-gradient-to-b from-gray-50 to-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_gbi.png" alt="Logo GBI" width={56} height={56} className="mx-auto mb-3 rounded-full" />
          <h2 className="text-lg font-bold">LAPORAN KEUANGAN</h2>
          <p className="text-sm text-gray-600">
            PERIODE 1 - {daysInMonth} {getMonthName(month).toUpperCase()} {year}
          </p>
          <p className="text-sm font-medium">{data.churchInfo.church_name || "GBI JONGGOL RAYA"}</p>
        </div>

        <div className="p-4 space-y-6">
          {/* Saldo Bulan Lalu */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
            <span className="font-semibold text-gray-700">SALDO BULAN LALU</span>
            <span className="font-bold text-lg">{formatRupiah(data.period.saldoPindahan)}</span>
          </div>

          {/* PEMASUKAN */}
          <div>
            <h3 className="text-base font-bold text-gray-800 bg-green-50 p-3 rounded-lg border border-green-100">
              PEMASUKAN (DEBIT)
            </h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-3 py-2 font-medium">Tanggal</th>
                    <th className="text-left px-3 py-2 font-medium">Keterangan</th>
                    <th className="text-right px-3 py-2 font-medium">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.incomeByCategory).map(([category, { entries, subtotal }]) => (
                    <Fragment key={category}>
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="px-3 py-2 font-semibold text-gray-700">
                          {INCOME_CATEGORIES[category] || category}
                        </td>
                      </tr>
                      {entries.map((entry, idx) => (
                        <tr key={`${category}-${idx}`} className="border-t border-gray-100">
                          <td className="px-3 py-1.5 text-gray-600">{formatDateID(entry.date)}</td>
                          <td className="px-3 py-1.5 text-gray-600">{entry.description}</td>
                          <td className="px-3 py-1.5 text-right">{formatRupiah(entry.amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t">
                        <td colSpan={2} className="px-3 py-1.5 text-right text-sm font-medium text-gray-600">
                          Subtotal:
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold">{formatRupiah(subtotal)}</td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-green-100 font-bold">
                    <td colSpan={2} className="px-3 py-2">TOTAL PEMASUKAN</td>
                    <td className="px-3 py-2 text-right text-green-700">{formatRupiah(data.totalIncome)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* PENGELUARAN */}
          <div>
            <h3 className="text-base font-bold text-gray-800 bg-red-50 p-3 rounded-lg border border-red-100">
              PENGELUARAN (KREDIT)
            </h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-3 py-2 font-medium">Tanggal</th>
                    <th className="text-left px-3 py-2 font-medium">Keterangan</th>
                    <th className="text-right px-3 py-2 font-medium">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.expenseByCategory).map(([category, { entries, subtotal }]) => (
                    <Fragment key={category}>
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="px-3 py-2 font-semibold text-gray-700">
                          {EXPENSE_CATEGORIES[category] || category}
                        </td>
                      </tr>
                      {entries.map((entry, idx) => (
                        <tr key={`${category}-${idx}`} className="border-t border-gray-100">
                          <td className="px-3 py-1.5 text-gray-600">{formatDateID(entry.date)}</td>
                          <td className="px-3 py-1.5 text-gray-600">{entry.description}</td>
                          <td className="px-3 py-1.5 text-right">{formatRupiah(entry.amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t">
                        <td colSpan={2} className="px-3 py-1.5 text-right text-sm font-medium text-gray-600">
                          Subtotal:
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold">{formatRupiah(subtotal)}</td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-red-100 font-bold">
                    <td colSpan={2} className="px-3 py-2">TOTAL PENGELUARAN</td>
                    <td className="px-3 py-2 text-right text-red-700">{formatRupiah(data.totalExpense)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* SALDO */}
          <div className="bg-blue-100 p-4 rounded-lg border border-blue-200 flex justify-between items-center">
            <span className="font-bold text-gray-800">SALDO (Bulan Lalu + Debit - Kredit)</span>
            <span className="font-bold text-xl text-blue-700">{formatRupiah(data.saldo)}</span>
          </div>

          {/* KETERANGAN */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800">KETERANGAN</h3>
              {!data.period.isLocked && (
                <button
                  onClick={() => (editSaldo ? handleSaveSaldo() : setEditSaldo(true))}
                  className="text-base text-blue-600 hover:underline"
                >
                  {editSaldo ? "Simpan" : "Edit"}
                </button>
              )}
            </div>
            <div className="space-y-2 text-base">
              {/* Kas Tersedia */}
              <div className="flex justify-between py-1 border-b font-semibold">
                <span>Kas Tersedia</span>
                <span>{formatRupiah(data.saldo)}</span>
              </div>
              {/* Sub-baris: Saldo Rekening */}
              <div className="flex justify-between py-1 border-b items-center pl-5 text-gray-600">
                <span>- Saldo Rekening</span>
                {editSaldo ? (
                  <NumericInput
                    value={saldoRekening}
                    onChange={setSaldoRekening}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-base w-44 text-right"
                  />
                ) : (
                  <span>{formatRupiah(data.period.saldoRekening)}</span>
                )}
              </div>
              {/* Sub-baris: Saldo Cash */}
              <div className="flex justify-between py-1 border-b items-center pl-5 text-gray-600">
                <span>- Saldo Cash</span>
                {editSaldo ? (
                  <NumericInput
                    value={saldoCash}
                    onChange={setSaldoCash}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-base w-44 text-right"
                  />
                ) : (
                  <span>{formatRupiah(data.period.saldoCash)}</span>
                )}
              </div>
              {/* Kas Komsel */}
              <div className="flex justify-between py-1 border-b">
                <span>Kas Komsel</span>
                <span>{formatRupiah(data.totalKomsel)}</span>
              </div>
            </div>
          </div>

          {/* SIGNATURES */}
          <div className="bg-gray-50/50 p-6 rounded-lg">
            <div className="grid grid-cols-2 gap-8 text-center text-base">
              <div>
                <p className="text-gray-600">Gembala Sidang,</p>
                <div className="h-20" />
                <p className="font-bold border-t border-gray-300 pt-2 inline-block px-4">
                  {data.churchInfo.pastor_name || "________________"}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Bendahara,</p>
                <div className="h-20" />
                <p className="font-bold border-t border-gray-300 pt-2 inline-block px-4">
                  {data.churchInfo.treasurer_name || "________________"}
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </>
      )}
    </div>
  );
}
