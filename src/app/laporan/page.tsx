"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Fragment } from "react";
import {
  formatRupiah,
  getMonthName,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  FUND_TYPES,
} from "@/lib/utils";

const PDFExportButton = dynamic(() => import("@/components/report/PDFExportButton"), {
  ssr: false,
  loading: () => <button disabled className="bg-red-600 text-white px-4 py-1.5 rounded-md opacity-50 text-sm">Menyiapkan...</button>,
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

  // Saldo edit
  const [editSaldo, setEditSaldo] = useState(false);
  const [saldoRekening, setSaldoRekening] = useState("");
  const [saldoCash, setSaldoCash] = useState("");
  const [fundEdits, setFundEdits] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/report?month=${month}&year=${year}`);
    const reportData = await res.json();
    setData(reportData);
    setSaldoRekening(String(reportData.period.saldoRekening));
    setSaldoCash(String(reportData.period.saldoCash));
    const fe: Record<string, string> = {};
    Object.keys(FUND_TYPES).forEach((key) => {
      fe[key] = String(reportData.fundBalances[key] || 0);
    });
    setFundEdits(fe);
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleClosePeriod() {
    if (!data || !confirm(`Tutup periode ${getMonthName(month)} ${year}? Saldo akan dipindahkan ke bulan berikutnya.`)) return;
    setClosing(true);
    await fetch("/api/periods/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodId: data.period.id }),
    });
    setClosing(false);
    loadData();
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

    // Update fund balances
    for (const [fundType, balance] of Object.entries(fundEdits)) {
      await fetch("/api/fund-balances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId: data.period.id,
          fundType,
          balance: Number(balance),
        }),
      });
    }

    setEditSaldo(false);
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Memuat laporan...</div>
      </div>
    );
  }

  if (!data) return null;

  const daysInMonth = new Date(year, month, 0).getDate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Laporan Bulanan</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border rounded-md px-3 py-1.5 text-sm">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border rounded-md px-3 py-1.5 text-sm">
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <PDFExportButton data={data} month={month} year={year} />

          {!data.period.isLocked && (
            <button
              onClick={handleClosePeriod}
              disabled={closing}
              className="bg-orange-600 text-white px-4 py-1.5 rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm"
            >
              {closing ? "Menutup..." : "Tutup Periode"}
            </button>
          )}
        </div>
      </div>

      {data.period.isLocked && (
        <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm">
          Periode ini sudah ditutup dan dikunci.
        </div>
      )}

      {/* Report View */}
      <div className="bg-white rounded-lg shadow-sm border print:shadow-none print:border-none">
        {/* Header */}
        <div className="text-center p-6 border-b">
          <h2 className="text-lg font-bold">LAPORAN KEUANGAN</h2>
          <p className="text-sm text-gray-600">
            PERIODE 1 - {daysInMonth} {getMonthName(month).toUpperCase()} {year}
          </p>
          <p className="text-sm font-medium">{data.churchInfo.church_name || "GBI JONGGOL RAYA"}</p>
        </div>

        <div className="p-4 space-y-6">
          {/* Saldo Pindahan */}
          <div className="bg-blue-50 p-4 rounded-md flex justify-between items-center">
            <span className="font-semibold text-gray-700">SALDO PINDAHAN</span>
            <span className="font-bold text-lg">{formatRupiah(data.period.saldoPindahan)}</span>
          </div>

          {/* PEMASUKAN */}
          <div>
            <h3 className="text-base font-bold text-gray-800 bg-green-50 p-3 rounded-md">
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
                          <td className="px-3 py-1.5 text-gray-600">{entry.date}</td>
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
            <h3 className="text-base font-bold text-gray-800 bg-red-50 p-3 rounded-md">
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
                          <td className="px-3 py-1.5 text-gray-600">{entry.date}</td>
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
          <div className="bg-blue-100 p-4 rounded-md flex justify-between items-center">
            <span className="font-bold text-gray-800">SALDO (Pindahan + Debit - Kredit)</span>
            <span className="font-bold text-xl text-blue-700">{formatRupiah(data.saldo)}</span>
          </div>

          {/* KETERANGAN */}
          <div className="border rounded-md p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800">KETERANGAN</h3>
              {!data.period.isLocked && (
                <button
                  onClick={() => (editSaldo ? handleSaveSaldo() : setEditSaldo(true))}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {editSaldo ? "Simpan" : "Edit"}
                </button>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b">
                <span>Kas Tersedia</span>
                <span className="font-semibold">{formatRupiah(data.saldo)}</span>
              </div>
              <div className="flex justify-between py-1 border-b items-center">
                <span>Saldo Rekening</span>
                {editSaldo ? (
                  <input
                    type="number"
                    value={saldoRekening}
                    onChange={(e) => setSaldoRekening(e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-40 text-right"
                  />
                ) : (
                  <span>{formatRupiah(data.period.saldoRekening)}</span>
                )}
              </div>
              <div className="flex justify-between py-1 border-b items-center">
                <span>Saldo Cash</span>
                {editSaldo ? (
                  <input
                    type="number"
                    value={saldoCash}
                    onChange={(e) => setSaldoCash(e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-40 text-right"
                  />
                ) : (
                  <span>{formatRupiah(data.period.saldoCash)}</span>
                )}
              </div>
              {Object.entries(FUND_TYPES).map(([key, label]) => (
                <div key={key} className="flex justify-between py-1 border-b items-center">
                  <span>{label}</span>
                  {editSaldo ? (
                    <input
                      type="number"
                      value={fundEdits[key] || "0"}
                      onChange={(e) => setFundEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="border rounded px-2 py-1 text-sm w-40 text-right"
                    />
                  ) : (
                    <span>{formatRupiah(data.fundBalances[key] || 0)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SIGNATURES */}
          <div className="grid grid-cols-2 gap-8 mt-8 text-center text-sm">
            <div>
              <p className="text-gray-600">Gembala Sidang,</p>
              <div className="h-20" />
              <p className="font-bold border-t border-gray-300 pt-2 inline-block px-4">
                {data.churchInfo.pastor_name || "________________"}
              </p>
              <p className="text-xs text-gray-500">Gembala</p>
            </div>
            <div>
              <p className="text-gray-600">Bendahara,</p>
              <div className="h-20" />
              <p className="font-bold border-t border-gray-300 pt-2 inline-block px-4">
                {data.churchInfo.treasurer_name || "________________"}
              </p>
              <p className="text-xs text-gray-500">Bendahara</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
