"use client";

import { useEffect, useState, useCallback } from "react";
import { formatRupiah, getMonthName, INCOME_CATEGORIES } from "@/lib/utils";
import { showSuccess, showConfirmDelete } from "@/lib/swal";
import NumericInput from "@/components/ui/NumericInput";

interface IncomeEntry {
  id: string;
  date: string;
  category: string;
  subcategory: string;
  description: string;
  amount: number;
  attendance: number | null;
}

interface KomselGroup {
  id: string;
  name: string;
}

type FormType = "ibadah" | "perpuluhan" | "komsel" | "ucapan_syukur" | "lainnya";

export default function PemasukanPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [periodId, setPeriodId] = useState("");
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [komselGroups, setKomselGroups] = useState<KomselGroup[]>([]);
  const [activeForm, setActiveForm] = useState<FormType>("ibadah");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Form states
  const [ibadahDate, setIbadahDate] = useState("");
  const [ibadahHadir, setIbadahHadir] = useState("");
  const [kantongUngu, setKantongUngu] = useState("");
  const [kantongHitam, setKantongHitam] = useState("");
  const [smHadir, setSmHadir] = useState("");
  const [smAmount, setSmAmount] = useState("");

  const [perpuluhanDate, setPerpuluhanDate] = useState("");
  const [perpuluhanNama, setPerpuluhanNama] = useState("");
  const [perpuluhanAmount, setPerpuluhanAmount] = useState("");

  const [komselDate, setKomselDate] = useState("");
  const [komselNama, setKomselNama] = useState("");
  const [komselHadir, setKomselHadir] = useState("");
  const [komselAmount, setKomselAmount] = useState("");

  const [syukurDate, setSyukurDate] = useState("");
  const [syukurNama, setSyukurNama] = useState("");
  const [syukurAmount, setSyukurAmount] = useState("");

  const [lainDate, setLainDate] = useState("");
  const [lainCategory, setLainCategory] = useState("pembangunan");
  const [lainDesc, setLainDesc] = useState("");
  const [lainAmount, setLainAmount] = useState("");

  // Edit form
  const [editDate, setEditDate] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editAttendance, setEditAttendance] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const periodRes = await fetch(`/api/periods?month=${month}&year=${year}`);
    const period = await periodRes.json();
    setPeriodId(period.id);
    setIsLocked(period.isLocked);

    const entriesRes = await fetch(`/api/income?periodId=${period.id}`);
    const entriesData = await entriesRes.json();
    setEntries(entriesData);
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    loadData();
    fetch("/api/settings/komsel")
      .then((r) => r.json())
      .then(setKomselGroups);
  }, [loadData]);

  async function handleIbadahSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!periodId || isLocked) return;
    setSaving(true);

    const batch = [];
    if (Number(kantongUngu) > 0) {
      batch.push({
        periodId,
        date: ibadahDate,
        category: "persembahan",
        subcategory: "kantong_ungu",
        description: "Persembahan Kantong Ungu",
        amount: Number(kantongUngu),
        attendance: Number(ibadahHadir) || null,
      });
    }
    if (Number(kantongHitam) > 0) {
      batch.push({
        periodId,
        date: ibadahDate,
        category: "persembahan",
        subcategory: "kantong_hitam",
        description: "Persembahan Kantong Hitam",
        amount: Number(kantongHitam),
      });
    }
    if (Number(smAmount) > 0) {
      batch.push({
        periodId,
        date: ibadahDate,
        category: "persembahan",
        subcategory: "sekolah_minggu",
        description: "Persembahan Sekolah Minggu",
        amount: Number(smAmount),
        attendance: Number(smHadir) || null,
      });
    }

    if (batch.length > 0) {
      await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
    }

    setIbadahDate("");
    setIbadahHadir("");
    setKantongUngu("");
    setKantongHitam("");
    setSmHadir("");
    setSmAmount("");
    setSaving(false);
    loadData();
    showSuccess("Data ibadah berhasil disimpan");
  }

  async function handleSingleSubmit(
    e: React.FormEvent,
    data: { date: string; category: string; subcategory: string; description: string; amount: number; attendance?: number | null },
    resetFn: () => void
  ) {
    e.preventDefault();
    if (!periodId || isLocked) return;
    setSaving(true);

    await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodId, ...data }),
    });

    resetFn();
    setSaving(false);
    loadData();
    showSuccess("Data berhasil disimpan");
  }

  async function handleDelete(id: string) {
    if (isLocked) return;
    const result = await showConfirmDelete();
    if (!result.isConfirmed) return;
    await fetch(`/api/income?id=${id}`, { method: "DELETE" });
    loadData();
    showSuccess("Data berhasil dihapus");
  }

  async function handleEditSave() {
    if (!editingId || isLocked) return;
    setSaving(true);
    await fetch("/api/income", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        date: editDate,
        description: editDesc,
        amount: Number(editAmount),
        attendance: editAttendance ? Number(editAttendance) : null,
      }),
    });
    setEditingId(null);
    setSaving(false);
    loadData();
    showSuccess("Data berhasil diperbarui");
  }

  function startEdit(entry: IncomeEntry) {
    setEditingId(entry.id);
    setEditDate(entry.date);
    setEditDesc(entry.description);
    setEditAmount(String(entry.amount));
    setEditAttendance(entry.attendance ? String(entry.attendance) : "");
  }

  const totalIncome = entries.reduce((s, e) => s + e.amount, 0);

  const daysInMonth = new Date(year, month, 0).getDate();
  const dateMin = `${year}-${String(month).padStart(2, "0")}-01`;
  const dateMax = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Pemasukan</h1>
        <div className="flex gap-2 items-center">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border rounded-md px-4 py-2.5 text-base"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded-md px-4 py-2.5 text-base"
          >
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

      {/* Form Tabs */}
      {!isLocked && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b overflow-x-auto">
            <div className="flex min-w-max">
              {([
                ["ibadah", "Ibadah Minggu"],
                ["perpuluhan", "Perpuluhan"],
                ["komsel", "Komsel"],
                ["ucapan_syukur", "Ucapan Syukur"],
                ["lainnya", "Lainnya"],
              ] as [FormType, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveForm(key)}
                  className={`px-5 py-3.5 text-base font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeForm === key
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {/* Form Ibadah */}
            {activeForm === "ibadah" && (
              <form onSubmit={handleIbadahSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Tanggal</label>
                    <input type="date" required min={dateMin} max={dateMax} value={ibadahDate} onChange={(e) => setIbadahDate(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Jumlah Hadir Ibadah</label>
                    <NumericInput value={ibadahHadir} onChange={setIbadahHadir} className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Kantong Ungu (Rp)</label>
                    <NumericInput value={kantongUngu} onChange={setKantongUngu} className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Kantong Hitam (Rp)</label>
                    <NumericInput value={kantongHitam} onChange={setKantongHitam} className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Persembahan SM (Rp)</label>
                    <NumericInput value={smAmount} onChange={setSmAmount} className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Jumlah Hadir SM</label>
                    <NumericInput value={smHadir} onChange={setSmHadir} className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="0" />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 text-base">
                  {saving ? "Menyimpan..." : "Simpan Data Ibadah"}
                </button>
              </form>
            )}

            {/* Form Perpuluhan */}
            {activeForm === "perpuluhan" && (
              <form
                onSubmit={(e) =>
                  handleSingleSubmit(e, {
                    date: perpuluhanDate,
                    category: "perpuluhan",
                    subcategory: perpuluhanNama,
                    description: `Perpuluhan - ${perpuluhanNama}`,
                    amount: Number(perpuluhanAmount),
                  }, () => {
                    setPerpuluhanDate("");
                    setPerpuluhanNama("");
                    setPerpuluhanAmount("");
                  })
                }
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Tanggal</label>
                    <input type="date" required min={dateMin} max={dateMax} value={perpuluhanDate} onChange={(e) => setPerpuluhanDate(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Nama</label>
                    <input type="text" required value={perpuluhanNama} onChange={(e) => setPerpuluhanNama(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="Nama pemberi" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
                    <NumericInput value={perpuluhanAmount} onChange={setPerpuluhanAmount} required className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="0" />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 text-base">
                  {saving ? "Menyimpan..." : "Simpan Perpuluhan"}
                </button>
              </form>
            )}

            {/* Form Komsel */}
            {activeForm === "komsel" && (
              <form
                onSubmit={(e) =>
                  handleSingleSubmit(e, {
                    date: komselDate,
                    category: "komsel",
                    subcategory: komselNama,
                    description: `Komsel ${komselNama}`,
                    amount: Number(komselAmount),
                    attendance: Number(komselHadir) || null,
                  }, () => {
                    setKomselDate("");
                    setKomselNama("");
                    setKomselHadir("");
                    setKomselAmount("");
                  })
                }
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Tanggal</label>
                    <input type="date" required min={dateMin} max={dateMax} value={komselDate} onChange={(e) => setKomselDate(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Nama Komsel</label>
                    <select required value={komselNama} onChange={(e) => setKomselNama(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base">
                      <option value="">Pilih Komsel</option>
                      {komselGroups.map((g) => (
                        <option key={g.id} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Jumlah Hadir</label>
                    <NumericInput value={komselHadir} onChange={setKomselHadir} className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
                    <NumericInput value={komselAmount} onChange={setKomselAmount} required className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="0" />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 text-base">
                  {saving ? "Menyimpan..." : "Simpan Komsel"}
                </button>
              </form>
            )}

            {/* Form Ucapan Syukur */}
            {activeForm === "ucapan_syukur" && (
              <form
                onSubmit={(e) =>
                  handleSingleSubmit(e, {
                    date: syukurDate,
                    category: "ucapan_syukur",
                    subcategory: syukurNama,
                    description: `Ucapan Syukur - ${syukurNama}`,
                    amount: Number(syukurAmount),
                  }, () => {
                    setSyukurDate("");
                    setSyukurNama("");
                    setSyukurAmount("");
                  })
                }
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Tanggal</label>
                    <input type="date" required min={dateMin} max={dateMax} value={syukurDate} onChange={(e) => setSyukurDate(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Nama</label>
                    <input type="text" required value={syukurNama} onChange={(e) => setSyukurNama(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="Nama pemberi" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
                    <NumericInput value={syukurAmount} onChange={setSyukurAmount} required className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="0" />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 text-base">
                  {saving ? "Menyimpan..." : "Simpan Ucapan Syukur"}
                </button>
              </form>
            )}

            {/* Form Lainnya */}
            {activeForm === "lainnya" && (
              <form
                onSubmit={(e) =>
                  handleSingleSubmit(e, {
                    date: lainDate,
                    category: lainCategory,
                    subcategory: "",
                    description: lainDesc,
                    amount: Number(lainAmount),
                  }, () => {
                    setLainDate("");
                    setLainDesc("");
                    setLainAmount("");
                  })
                }
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Tanggal</label>
                    <input type="date" required min={dateMin} max={dateMax} value={lainDate} onChange={(e) => setLainDate(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Kategori</label>
                    <select required value={lainCategory} onChange={(e) => setLainCategory(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base">
                      {["pembangunan", "diakonia", "donasi", "dll"].map((c) => (
                        <option key={c} value={c}>{INCOME_CATEGORIES[c]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Keterangan</label>
                    <input type="text" required value={lainDesc} onChange={(e) => setLainDesc(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="Keterangan" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
                    <NumericInput value={lainAmount} onChange={setLainAmount} required className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="0" />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 text-base">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">
            Data Pemasukan - {getMonthName(month)} {year}
          </h2>
          <p className="text-base font-medium text-green-600">
            Total: {formatRupiah(totalIncome)}
          </p>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Memuat data...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Belum ada data pemasukan</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Keterangan</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Hadir</th>
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
                        <td className="px-4 py-2 text-gray-600">{INCOME_CATEGORIES[entry.category] || entry.category}</td>
                        <td className="px-4 py-2">
                          <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="border rounded px-3 py-1.5 text-base w-full" />
                        </td>
                        <td className="px-4 py-2">
                          <NumericInput value={editAttendance} onChange={setEditAttendance} className="border rounded px-3 py-1.5 text-base w-24" />
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
                        <td className="px-4 py-2 text-gray-600">{INCOME_CATEGORIES[entry.category] || entry.category}</td>
                        <td className="px-4 py-2 text-gray-600">{entry.description}</td>
                        <td className="px-4 py-2 text-gray-600">{entry.attendance || "-"}</td>
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
