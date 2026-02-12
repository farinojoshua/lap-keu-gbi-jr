"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { formatRupiah, getMonthName, EXPENSE_CATEGORIES, formatDateID, generateYears } from "@/lib/utils";
import { showSuccess, showConfirmDelete, showError, showConfirmAction } from "@/lib/swal";
import NumericInput from "@/components/ui/NumericInput";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Save, Pencil, Trash2, Lock, Check, X, CalendarPlus, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortKey = "date" | "amount";
type SortDir = "asc" | "desc";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
    try {
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
    } catch {
      showError("Gagal memuat data. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
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

    try {
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
      loadData();
      showSuccess("Pengeluaran mingguan berhasil disimpan");
    } catch {
      showError("Gagal menyimpan pengeluaran mingguan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!periodId || isLocked) return;
    setSaving(true);

    try {
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
      loadData();
      showSuccess("Pengeluaran berhasil disimpan");
    } catch {
      showError("Gagal menyimpan pengeluaran.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (isLocked) return;
    const result = await showConfirmDelete();
    if (!result.isConfirmed) return;
    try {
      await fetch(`/api/expense?id=${id}`, { method: "DELETE" });
      loadData();
      showSuccess("Data berhasil dihapus");
    } catch {
      showError("Gagal menghapus data.");
    }
  }

  async function handleEditSave() {
    if (!editingId || isLocked) return;
    setSaving(true);
    try {
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
      loadData();
      showSuccess("Data berhasil diperbarui");
    } catch {
      showError("Gagal memperbarui data.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(entry: ExpenseEntry) {
    setEditingId(entry.id);
    setEditDate(entry.date);
    setEditDesc(entry.description);
    setEditAmount(String(entry.amount));
  }

  const totalExpense = entries.reduce((s, e) => s + e.amount, 0);

  // Search & Sort
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (EXPENSE_CATEGORIES[e.category] || "").toLowerCase().includes(q) ||
          e.date.includes(q) ||
          formatDateID(e.date).toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "date") return a.date.localeCompare(b.date) * mul;
      return (a.amount - b.amount) * mul;
    });
  }, [entries, searchQuery, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function getSortIcon(key: SortKey) {
    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  }

  // Unsaved form warning
  const hasUnsavedData =
    weeklyDate !== "" ||
    weeklyItems.length > 0 ||
    manualDate !== "" ||
    manualDesc !== "" ||
    manualAmount !== "";

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedData) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedData]);

  async function handleMonthChange(newMonth: number) {
    if (hasUnsavedData) {
      const result = await showConfirmAction(
        "Data belum disimpan",
        "Ada form yang belum disimpan. Yakin ingin pindah periode?"
      );
      if (!result.isConfirmed) return;
    }
    setMonth(newMonth);
  }

  async function handleYearChange(newYear: number) {
    if (hasUnsavedData) {
      const result = await showConfirmAction(
        "Data belum disimpan",
        "Ada form yang belum disimpan. Yakin ingin pindah periode?"
      );
      if (!result.isConfirmed) return;
    }
    setYear(newYear);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const dateMin = `${year}-${String(month).padStart(2, "0")}-01`;
  const dateMax = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Pengeluaran</h1>
        <div className="flex gap-2 items-center">
          <select value={month} onChange={(e) => handleMonthChange(Number(e.target.value))} className="border border-gray-300 rounded-lg px-4 py-2.5 text-base">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => handleYearChange(Number(e.target.value))} className="border border-gray-300 rounded-lg px-4 py-2.5 text-base">
            {generateYears().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {isLocked && (
        <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg border border-yellow-200 text-base flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          Periode ini sudah ditutup. Data tidak bisa diubah.
        </div>
      )}

      {!isLocked && (
        <div className="space-y-4">
          {/* Weekly Expense Button */}
          {!showWeeklyForm ? (
            <button
              onClick={initWeeklyForm}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 text-base shadow-sm flex items-center gap-2"
            >
              <CalendarPlus className="w-4 h-4" />
              Tambah Pengeluaran Mingguan
            </button>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-800 mb-4">Pengeluaran Mingguan</h3>
              <form onSubmit={handleWeeklySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Tanggal Minggu</label>
                  <input type="date" required min={dateMin} max={dateMax} value={weeklyDate} onChange={(e) => setWeeklyDate(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2.5 text-base" />
                </div>

                <div className="space-y-2">
                  {weeklyItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <span className="flex-1 text-base text-gray-700">{item.description}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-base text-gray-500">Rp</span>
                        <NumericInput
                          value={String(item.amount || "")}
                          onChange={(val) => updateWeeklyItem(idx, Number(val))}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-base w-36 text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setWeeklyItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add FT Pelayan */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Tambah PK Pelayan FT:</p>
                  <div className="flex gap-2 items-end">
                    <input
                      type="text"
                      value={ftName}
                      onChange={(e) => setFtName(e.target.value)}
                      placeholder="Nama Pendeta"
                      className="border border-gray-300 rounded-lg px-4 py-2.5 text-base flex-1"
                    />
                    <NumericInput
                      value={ftAmount}
                      onChange={setFtAmount}
                      placeholder="Jumlah"
                      className="border border-gray-300 rounded-lg px-4 py-2.5 text-base w-32"
                    />
                    <button type="button" onClick={addFtPelayan} className="bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-base hover:bg-gray-300">
                      Tambah
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-base shadow-sm flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? "Menyimpan..." : "Simpan Semua"}
                  </button>
                  <button type="button" onClick={() => setShowWeeklyForm(false)} className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-300 text-base">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Tanggal</label>
                  <input type="date" required min={dateMin} max={dateMax} value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Kategori</label>
                  <select required value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base">
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Keterangan</label>
                  <input type="text" required value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base" placeholder="Keterangan" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Jumlah (Rp)</label>
                  <NumericInput value={manualAmount} onChange={setManualAmount} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base" placeholder="0" />
                </div>
              </div>
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-base shadow-sm flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? "Menyimpan..." : "Simpan Pengeluaran"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h2 className="font-semibold text-gray-800">
              Data Pengeluaran - {getMonthName(month)} {year}
            </h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-700 text-base font-medium">
              Total: {formatRupiah(totalExpense)}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari keterangan, kategori, tanggal..."
              className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <SkeletonTable cols={5} rows={5} />
          ) : filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {entries.length === 0 ? "Belum ada data pengeluaran" : "Tidak ada data yang cocok dengan pencarian"}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th onClick={() => toggleSort("date")} className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                    <span className="inline-flex items-center">Tanggal{getSortIcon("date")}</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold text-gray-500">Kategori</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold text-gray-500">Keterangan</th>
                  <th onClick={() => toggleSort("amount")} className="text-right px-4 py-3 text-xs uppercase tracking-wider font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                    <span className="inline-flex items-center justify-end">Jumlah{getSortIcon("amount")}</span>
                  </th>
                  {!isLocked && <th className="text-center px-4 py-3 text-xs uppercase tracking-wider font-semibold text-gray-500">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-t hover:bg-gray-50">
                    {editingId === entry.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input type="date" min={dateMin} max={dateMax} value={editDate} onChange={(e) => setEditDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-base w-full" />
                        </td>
                        <td className="px-4 py-2 text-gray-600">{EXPENSE_CATEGORIES[entry.category] || entry.category}</td>
                        <td className="px-4 py-2">
                          <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-base w-full" />
                        </td>
                        <td className="px-4 py-2">
                          <NumericInput value={editAmount} onChange={setEditAmount} className="border border-gray-300 rounded-lg px-3 py-1.5 text-base w-full text-right" />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={handleEditSave} disabled={saving} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50" title="Simpan">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Batal">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 text-gray-800">{formatDateID(entry.date)}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {EXPENSE_CATEGORIES[entry.category] || entry.category}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{entry.description}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-800">{formatRupiah(entry.amount)}</td>
                        {!isLocked && (
                          <td className="px-4 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => startEdit(entry)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50" title="Edit">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" title="Hapus">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
