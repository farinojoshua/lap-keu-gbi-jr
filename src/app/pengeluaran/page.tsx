"use client";

import { useEffect, useState, useCallback } from "react";
import { formatRupiah, getMonthName, EXPENSE_CATEGORIES } from "@/lib/utils";
import { showSuccess, showConfirmDelete } from "@/lib/swal";
import NumericInput from "@/components/ui/NumericInput";

interface ExpenseEntry {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  isFixed: boolean;
}

interface Template {
  id: string;
  category: string;
  description: string;
  defaultAmount: number;
}

interface WeeklyItem {
  category: string;
  description: string;
  amount: number;
  isFixed: boolean;
}

export default function PengeluaranPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [periodId, setPeriodId] = useState("");
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showWeeklyForm, setShowWeeklyForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Weekly form
  const [weeklyDate, setWeeklyDate] = useState("");
  const [weeklyItems, setWeeklyItems] = useState<WeeklyItem[]>([]);
  const [ftName, setFtName] = useState("");
  const [ftAmount, setFtAmount] = useState("");

  // Manual form
  const [manualDate, setManualDate] = useState("");
  const [manualCategory, setManualCategory] = useState("konsumsi");
  const [manualDesc, setManualDesc] = useState("");
  const [manualAmount, setManualAmount] = useState("");

  // Edit form
  const [editDate, setEditDate] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const periodRes = await fetch(`/api/periods?month=${month}&year=${year}`);
    const period = await periodRes.json();
    setPeriodId(period.id);
    setIsLocked(period.isLocked);

    const [entriesData, templatesData] = await Promise.all([
      fetch(`/api/expense?periodId=${period.id}`).then((r) => r.json()),
      fetch("/api/expense/templates").then((r) => r.json()),
    ]);
    setEntries(entriesData);
    setTemplates(templatesData);
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function initWeeklyForm() {
    setWeeklyItems(
      templates.map((t) => ({
        category: t.category,
        description: t.description,
        amount: t.defaultAmount,
        isFixed: true,
      }))
    );
    setShowWeeklyForm(true);
  }

  function updateWeeklyItem(index: number, amount: number) {
    setWeeklyItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, amount } : item))
    );
  }

  function addFtPelayan() {
    if (!ftName || !ftAmount) return;
    setWeeklyItems((prev) => [
      ...prev,
      {
        category: "pk_pelayan_ft",
        description: `PK Pelayan FT - ${ftName}`,
        amount: Number(ftAmount),
        isFixed: true,
      },
    ]);
    setFtName("");
    setFtAmount("");
  }

  async function handleWeeklySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!periodId || isLocked) return;
    setSaving(true);

    const batch = weeklyItems
      .filter((item) => item.amount > 0)
      .map((item) => ({
        periodId,
        date: weeklyDate,
        category: item.category,
        description: item.description,
        amount: item.amount,
        isFixed: item.isFixed,
      }));

    if (batch.length > 0) {
      await fetch("/api/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
    }

    setShowWeeklyForm(false);
    setWeeklyDate("");
    setWeeklyItems([]);
    setSaving(false);
    loadData();
    showSuccess("Pengeluaran mingguan berhasil disimpan");
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!periodId || isLocked) return;
    setSaving(true);

    await fetch("/api/expense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodId,
        date: manualDate,
        category: manualCategory,
        description: manualDesc,
        amount: Number(manualAmount),
        isFixed: false,
      }),
    });

    setManualDate("");
    setManualDesc("");
    setManualAmount("");
    setSaving(false);
    loadData();
    showSuccess("Pengeluaran berhasil disimpan");
  }

  async function handleDelete(id: string) {
    if (isLocked) return;
    const result = await showConfirmDelete();
    if (!result.isConfirmed) return;
    await fetch(`/api/expense?id=${id}`, { method: "DELETE" });
    loadData();
    showSuccess("Data berhasil dihapus");
  }

  async function handleEditSave() {
    if (!editingId || isLocked) return;
    setSaving(true);
    await fetch("/api/expense", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        date: editDate,
        description: editDesc,
        amount: Number(editAmount),
      }),
    });
    setEditingId(null);
    setSaving(false);
    loadData();
    showSuccess("Data berhasil diperbarui");
  }

  function startEdit(entry: ExpenseEntry) {
    setEditingId(entry.id);
    setEditDate(entry.date);
    setEditDesc(entry.description);
    setEditAmount(String(entry.amount));
  }

  const totalExpense = entries.reduce((s, e) => s + e.amount, 0);

  const daysInMonth = new Date(year, month, 0).getDate();
  const dateMin = `${year}-${String(month).padStart(2, "0")}-01`;
  const dateMax = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Pengeluaran</h1>
        <div className="flex gap-2 items-center">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border rounded-md px-4 py-2.5 text-base">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border rounded-md px-4 py-2.5 text-base">
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {isLocked && (
        <div className="bg-yellow-50 text-yellow-700 p-3 rounded-md text-base">
          Periode ini sudah ditutup. Data tidak bisa diubah.
        </div>
      )}

      {!isLocked && (
        <div className="space-y-4">
          {/* Weekly Expense Button */}
          {!showWeeklyForm ? (
            <button
              onClick={initWeeklyForm}
              className="bg-green-600 text-white px-5 py-2.5 rounded-md hover:bg-green-700 text-base"
            >
              + Tambah Pengeluaran Mingguan
            </button>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-800 mb-4">Pengeluaran Mingguan</h3>
              <form onSubmit={handleWeeklySubmit} className="space-y-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">Tanggal Minggu</label>
                  <input type="date" required min={dateMin} max={dateMax} value={weeklyDate} onChange={(e) => setWeeklyDate(e.target.value)} className="border rounded-md px-4 py-2.5 text-base" />
                </div>

                <div className="space-y-2">
                  {weeklyItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
                      <span className="flex-1 text-base text-gray-700">{item.description}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-base text-gray-500">Rp</span>
                        <NumericInput
                          value={String(item.amount || "")}
                          onChange={(val) => updateWeeklyItem(idx, Number(val))}
                          className="border rounded px-3 py-1.5 text-base w-36 text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setWeeklyItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add FT Pelayan */}
                <div className="border-t pt-4">
                  <p className="text-base font-medium text-gray-700 mb-2">Tambah PK Pelayan FT:</p>
                  <div className="flex gap-2 items-end">
                    <input
                      type="text"
                      value={ftName}
                      onChange={(e) => setFtName(e.target.value)}
                      placeholder="Nama Pendeta"
                      className="border rounded-md px-4 py-2.5 text-base flex-1"
                    />
                    <NumericInput
                      value={ftAmount}
                      onChange={setFtAmount}
                      placeholder="Jumlah"
                      className="border rounded-md px-4 py-2.5 text-base w-32"
                    />
                    <button type="button" onClick={addFtPelayan} className="bg-gray-200 text-gray-700 px-4 py-2.5 rounded-md text-base hover:bg-gray-300">
                      Tambah
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 text-base">
                    {saving ? "Menyimpan..." : "Simpan Semua"}
                  </button>
                  <button type="button" onClick={() => setShowWeeklyForm(false)} className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-md hover:bg-gray-300 text-base">
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Manual Expense Form */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold text-gray-800 mb-4">Pengeluaran Manual</h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">Tanggal</label>
                  <input type="date" required min={dateMin} max={dateMax} value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">Kategori</label>
                  <select required value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base">
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">Keterangan</label>
                  <input type="text" required value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="Keterangan" />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
                  <NumericInput value={manualAmount} onChange={setManualAmount} required className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="0" />
                </div>
              </div>
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 text-base">
                {saving ? "Menyimpan..." : "Simpan Pengeluaran"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">
            Data Pengeluaran - {getMonthName(month)} {year}
          </h2>
          <p className="text-base font-medium text-red-600">
            Total: {formatRupiah(totalExpense)}
          </p>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Memuat data...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Belum ada data pengeluaran</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Keterangan</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Jumlah</th>
                  {!isLocked && <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t hover:bg-gray-50">
                    {editingId === entry.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input type="date" min={dateMin} max={dateMax} value={editDate} onChange={(e) => setEditDate(e.target.value)} className="border rounded px-3 py-1.5 text-base w-full" />
                        </td>
                        <td className="px-4 py-2 text-gray-600">{EXPENSE_CATEGORIES[entry.category] || entry.category}</td>
                        <td className="px-4 py-2">
                          <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="border rounded px-3 py-1.5 text-base w-full" />
                        </td>
                        <td className="px-4 py-2">
                          <NumericInput value={editAmount} onChange={setEditAmount} className="border rounded px-3 py-1.5 text-base w-full text-right" />
                        </td>
                        <td className="px-4 py-2 text-center space-x-1">
                          <button onClick={handleEditSave} disabled={saving} className="text-green-600 hover:underline text-sm">Simpan</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:underline text-sm">Batal</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 text-gray-800">{entry.date}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {EXPENSE_CATEGORIES[entry.category] || entry.category}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{entry.description}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-800">{formatRupiah(entry.amount)}</td>
                        {!isLocked && (
                          <td className="px-4 py-2 text-center space-x-2">
                            <button onClick={() => startEdit(entry)} className="text-blue-600 hover:underline text-sm">Edit</button>
                            <button onClick={() => handleDelete(entry.id)} className="text-red-600 hover:underline text-sm">Hapus</button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
