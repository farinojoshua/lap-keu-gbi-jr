"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatRupiah, getMonthName } from "@/lib/utils";
import { showSuccess, showError, showConfirmDelete, showConfirmAction } from "@/lib/swal";
import NumericInput from "@/components/ui/NumericInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { Church, FileSpreadsheet, Users2, UserCog, Banknote, Save, Pencil, Trash2, Tag, Check, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Template {
  id: string;
  category: string;
  description: string;
  defaultAmount: number;
  isActive: boolean;
}

interface KomselGroup {
  id: string;
  name: string;
  isActive: boolean;
}

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

type Tab = "church" | "templates" | "komsel" | "users" | "saldo" | "kategori";

interface CategoryItem {
  id: string;
  key: string;
  label: string;
}

export default function PengaturanPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [activeTab, setActiveTab] = useState<Tab>("saldo");

  // Church info
  const [churchName, setChurchName] = useState("");
  const [pastorName, setPastorName] = useState("");
  const [treasurerName, setTreasurerName] = useState("");
  const [churchSaving, setChurchSaving] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTplCategory, setNewTplCategory] = useState("");
  const [newTplDesc, setNewTplDesc] = useState("");
  const [newTplAmount, setNewTplAmount] = useState("");
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [editTplCategory, setEditTplCategory] = useState("");
  const [editTplDesc, setEditTplDesc] = useState("");
  const [editTplAmount, setEditTplAmount] = useState("");

  // Komsel
  const [komselGroups, setKomselGroups] = useState<KomselGroup[]>([]);
  const [newKomselName, setNewKomselName] = useState("");


  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("bendahara");

  // Loading
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);


  // Categories
  const [expenseCats, setExpenseCats] = useState<CategoryItem[]>([]);
  const [incomeCats, setIncomeCats] = useState<CategoryItem[]>([]);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatLabel, setEditCatLabel] = useState("");
  const [newExpKey, setNewExpKey] = useState("");
  const [newExpLabel, setNewExpLabel] = useState("");
  const [newIncKey, setNewIncKey] = useState("");
  const [newIncLabel, setNewIncLabel] = useState("");

  // Saldo awal
  const [saldoAmount, setSaldoAmount] = useState("");
  const [firstPeriod, setFirstPeriod] = useState<{ id: string; month: number; year: number; saldoPindahan: number } | null>(null);
  const [saldoEditing, setSaldoEditing] = useState(false);

  const isAdmin = role === "admin";

  useEffect(() => {
    if (status === "loading") return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Set default tab ke tab pertama yang boleh diakses role ini
  useEffect(() => {
    if (status === "loading" || !role) return;
    const allowed = allTabs.filter((t) => !t.roles || t.roles.includes(role));
    if (allowed.length > 0 && !allowed.find((t) => t.key === activeTab)) {
      setActiveTab(allowed[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status]);

  async function loadAll() {
    setLoading(true);
    setLoadError(false);
    try {
      const fetches: Promise<unknown>[] = [
        fetch("/api/expense/templates").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("/api/settings/komsel").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("/api/periods").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("/api/settings/categories?type=expense").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("/api/settings/categories?type=income_other").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      ];

      if (isAdmin) {
        fetches.push(
          fetch("/api/settings").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
          fetch("/api/settings/users").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
        );
      }

      const results = await Promise.all(fetches);
      setTemplates(Array.isArray(results[0]) ? results[0] as Template[] : []);
      setKomselGroups(Array.isArray(results[1]) ? results[1] as KomselGroup[] : []);

      // Set periode pertama (urutan asc by year/month — API return desc, jadi ambil index terakhir)
      type PeriodRaw = { id: string; month: number; year: number; saldoPindahan: number };
      const periodsRaw = Array.isArray(results[2]) ? (results[2] as PeriodRaw[]) : [];
      if (periodsRaw.length > 0) {
        const oldest = periodsRaw[periodsRaw.length - 1];
        setFirstPeriod(oldest);
        setSaldoAmount(String(oldest.saldoPindahan || ""));
      }

      const eCats = Array.isArray(results[3]) ? results[3] as CategoryItem[] : [];
      setExpenseCats(eCats);
      setNewTplCategory((prev) => prev || eCats[0]?.key || "");
      setIncomeCats(Array.isArray(results[4]) ? results[4] as CategoryItem[] : []);

      if (isAdmin && results.length > 5) {
        const settings = results[5] as Record<string, string>;
        setChurchName(settings.church_name || "");
        setPastorName(settings.pastor_name || "");
        setTreasurerName(settings.treasurer_name || "");
        setUsers(Array.isArray(results[6]) ? results[6] as User[] : []);
      }
    } catch {
      setLoadError(true);
      showError("Gagal memuat data pengaturan.");
    } finally {
      setLoading(false);
    }
  }

  async function saveChurchInfo() {
    setChurchSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          church_name: churchName,
          pastor_name: pastorName,
          treasurer_name: treasurerName,
        }),
      });
      showSuccess("Info gereja berhasil disimpan");
    } catch {
      showError("Gagal menyimpan info gereja.");
    } finally {
      setChurchSaving(false);
    }
  }

  async function addTemplate() {
    if (!newTplCategory || !newTplDesc || !newTplAmount) return;
    await fetch("/api/expense/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: newTplCategory,
        description: newTplDesc,
        defaultAmount: Number(newTplAmount),
      }),
    });
    setNewTplCategory("");
    setNewTplDesc("");
    setNewTplAmount("");
    const tpl = await fetch("/api/expense/templates").then((r) => r.json());
    setTemplates(tpl);
    showSuccess("Template berhasil ditambahkan");
  }

  async function deleteTemplate(id: string) {
    const result = await showConfirmDelete();
    if (!result.isConfirmed) return;
    await fetch(`/api/expense/templates?id=${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    showSuccess("Template berhasil dihapus");
  }

  function startEditTemplate(t: Template) {
    setEditingTplId(t.id);
    setEditTplCategory(t.category);
    setEditTplDesc(t.description);
    setEditTplAmount(String(t.defaultAmount));
  }

  async function saveEditTemplate() {
    if (!editingTplId || !editTplCategory || !editTplDesc || !editTplAmount) return;
    await fetch("/api/expense/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingTplId,
        category: editTplCategory,
        description: editTplDesc,
        defaultAmount: Number(editTplAmount),
      }),
    });
    setEditingTplId(null);
    const tpl = await fetch("/api/expense/templates").then((r) => r.json());
    setTemplates(tpl);
    showSuccess("Template berhasil diperbarui");
  }

  async function addKomsel() {
    if (!newKomselName) return;
    await fetch("/api/settings/komsel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKomselName }),
    });
    setNewKomselName("");
    const groups = await fetch("/api/settings/komsel").then((r) => r.json());
    setKomselGroups(groups);
    showSuccess("Komsel berhasil ditambahkan");
  }

  async function deleteKomsel(id: string) {
    const result = await showConfirmDelete();
    if (!result.isConfirmed) return;
    await fetch(`/api/settings/komsel?id=${id}`, { method: "DELETE" });
    setKomselGroups((prev) => prev.filter((g) => g.id !== id));
    showSuccess("Komsel berhasil dihapus");
  }

  async function addUser() {
    if (!newUsername || !newPassword || !newName) return;
    const res = await fetch("/api/settings/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: newUsername,
        password: newPassword,
        name: newName,
        role: newRole,
      }),
    });
    const data = await res.json();
    if (data.error) {
      showError(data.error);
      return;
    }
    setNewUsername("");
    setNewPassword("");
    setNewName("");
    const userList = await fetch("/api/settings/users").then((r) => r.json());
    setUsers(userList);
    showSuccess("User berhasil ditambahkan");
  }

  async function deleteUser(id: string) {
    const result = await showConfirmDelete("User yang dihapus tidak bisa dikembalikan.");
    if (!result.isConfirmed) return;
    const res = await fetch(`/api/settings/users?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) {
      showError(data.error);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    showSuccess("User berhasil dihapus");
  }

  async function confirmEditSaldo() {
    const result = await showConfirmAction(
      "Ubah Saldo Awal?",
      "Mengubah saldo awal akan mempengaruhi semua perhitungan keuangan dari awal pencatatan."
    );
    if (result.isConfirmed) setSaldoEditing(true);
  }

  async function setSaldoAwal() {
    if (!saldoAmount) return;

    let periodId = firstPeriod?.id;

    // Kalau belum ada periode sama sekali, buat periode bulan ini dulu
    if (!periodId) {
      const now = new Date();
      const res = await fetch(`/api/periods?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      if (!res.ok) { showError("Gagal membuat periode awal"); return; }
      const newPeriod = await res.json();
      if (!newPeriod.id) { showError("Gagal membuat periode awal"); return; }
      periodId = newPeriod.id;
      setFirstPeriod({ id: newPeriod.id, month: newPeriod.month, year: newPeriod.year, saldoPindahan: Number(saldoAmount) });
    }

    await fetch("/api/periods", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: periodId,
        saldoPindahan: Number(saldoAmount),
      }),
    });

    setFirstPeriod((prev) => prev ? { ...prev, saldoPindahan: Number(saldoAmount) } : prev);
    setSaldoEditing(false);
    showSuccess(`Saldo awal berhasil disimpan: ${formatRupiah(Number(saldoAmount))}`);
  }

  async function addCategory(type: "expense" | "income_other", key: string, label: string, resetFn: () => void) {
    if (!key || !label) return;
    const res = await fetch("/api/settings/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, key, label }),
    });
    const data = await res.json();
    if (data.error) { showError(data.error); return; }
    const cats = await fetch(`/api/settings/categories?type=${type}`).then((r) => r.json());
    if (type === "expense") setExpenseCats(cats);
    else setIncomeCats(cats);
    resetFn();
    showSuccess("Kategori berhasil ditambahkan");
  }

  async function saveCatLabel(id: string, type: "expense" | "income_other") {
    if (!editCatLabel.trim()) return;
    const res = await fetch("/api/settings/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label: editCatLabel }),
    });
    const data = await res.json();
    if (data.error) { showError(data.error); return; }
    const cats = await fetch(`/api/settings/categories?type=${type}`).then((r) => r.json());
    if (type === "expense") setExpenseCats(cats);
    else setIncomeCats(cats);
    setEditingCatId(null);
    showSuccess("Label berhasil diperbarui");
  }

  async function deleteCategory(id: string, type: "expense" | "income_other") {
    const result = await showConfirmDelete();
    if (!result.isConfirmed) return;
    const res = await fetch(`/api/settings/categories?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) { showError(data.error); return; }
    if (type === "expense") setExpenseCats((prev) => prev.filter((c) => c.id !== id));
    else setIncomeCats((prev) => prev.filter((c) => c.id !== id));
    showSuccess("Kategori berhasil dihapus");
  }

  const allTabs: { key: Tab; label: string; icon: LucideIcon; roles?: string[] }[] = [
    { key: "saldo", label: "Saldo Pembuka", icon: Banknote, roles: ["admin", "bendahara"] },
    { key: "templates", label: "Template Pengeluaran", icon: FileSpreadsheet, roles: ["admin", "bendahara"] },
    { key: "kategori", label: "Kategori Keuangan", icon: Tag, roles: ["admin"] },
    { key: "komsel", label: "Daftar Komsel", icon: Users2, roles: ["admin"] },
    { key: "users", label: "Pengguna", icon: UserCog, roles: ["admin"] },
    { key: "church", label: "Info Gereja", icon: Church, roles: ["admin"] },
  ];

  const tabs = allTabs.filter((t) => !t.roles || (role !== undefined && t.roles.includes(role)));

  if (!loading && tabs.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Pengaturan</h1>
        <div className="bg-white rounded-lg shadow-sm border p-12 flex flex-col items-center text-center text-gray-400">
          <p className="text-base font-medium">Tidak ada pengaturan yang dapat diakses</p>
          <p className="text-sm mt-1">Role Anda tidak memiliki akses ke menu pengaturan.</p>
        </div>
      </div>
    );
  }

  if (loading || status === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-36" />
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b p-1 flex gap-1">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-28 rounded-lg" />
            ))}
          </div>
          <div className="p-4 space-y-4 max-w-lg">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg font-medium">Gagal memuat pengaturan</p>
        <button
          onClick={() => loadAll()}
          className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Pengaturan</h1>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b bg-gray-50/50 overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2 ${
                    activeTab === tab.key
                      ? "border-blue-500 text-blue-600 bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4">
          {/* Church Info */}
          {activeTab === "church" && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Nama Gereja</label>
                <input type="text" value={churchName} onChange={(e) => setChurchName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Nama Gembala</label>
                <input type="text" value={pastorName} onChange={(e) => setPastorName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Nama Bendahara</label>
                <input type="text" value={treasurerName} onChange={(e) => setTreasurerName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base" />
              </div>
              <button onClick={saveChurchInfo} disabled={churchSaving} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-base shadow-sm flex items-center gap-2">
                <Save className="w-4 h-4" />
                {churchSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          )}

          {/* Templates */}
          {activeTab === "templates" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Template ini muncul sebagai pilihan cepat saat mencatat pengeluaran, sehingga tidak perlu mengisi ulang kategori dan keterangan yang sering dipakai.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Kategori</th>
                      <th className="text-left px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Keterangan</th>
                      <th className="text-right px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Default (Rp)</th>
                      <th className="text-center px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((t) => (
                      <tr key={t.id} className="border-t hover:bg-gray-50">
                        {editingTplId === t.id ? (
                          <>
                            <td className="px-3 py-2">
                              <select value={editTplCategory} onChange={(e) => setEditTplCategory(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-full">
                                {expenseCats.map((c) => (
                                  <option key={c.key} value={c.key}>{c.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" value={editTplDesc} onChange={(e) => setEditTplDesc(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-full" />
                            </td>
                            <td className="px-3 py-2">
                              <NumericInput value={editTplAmount} onChange={setEditTplAmount} className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-full text-right" />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={saveEditTemplate} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50" title="Simpan">
                                  <Save className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingTplId(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Batal">
                                  <span className="text-sm">Batal</span>
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2">{expenseCats.find((c) => c.key === t.category)?.label || t.category}</td>
                            <td className="px-3 py-2">{t.description}</td>
                            <td className="px-3 py-2 text-right">{formatRupiah(t.defaultAmount)}</td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => startEditTemplate(t)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50" title="Edit">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteTemplate(t.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" title="Hapus">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-600 mb-2">Tambah Template:</p>
                <div className="flex gap-2 flex-wrap items-end">
                  <select value={newTplCategory} onChange={(e) => setNewTplCategory(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2.5 text-base w-48">
                    {expenseCats.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                  <input type="text" value={newTplDesc} onChange={(e) => setNewTplDesc(e.target.value)} placeholder="Keterangan" className="border border-gray-300 rounded-lg px-4 py-2.5 text-base flex-1 min-w-[200px]" />
                  <NumericInput value={newTplAmount} onChange={setNewTplAmount} placeholder="Jumlah" className="border border-gray-300 rounded-lg px-4 py-2.5 text-base w-32" />
                  <button onClick={addTemplate} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-base shadow-sm">Tambah</button>
                </div>
              </div>
            </div>
          )}

          {/* Komsel */}
          {activeTab === "komsel" && (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                {komselGroups.map((g) => (
                  <div key={g.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                    <span className="text-base">{g.name}</span>
                    <button onClick={() => deleteKomsel(g.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" title="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKomselName}
                  onChange={(e) => setNewKomselName(e.target.value)}
                  placeholder="Nama Komsel"
                  className="border border-gray-300 rounded-lg px-4 py-2.5 text-base flex-1"
                  onKeyDown={(e) => e.key === "Enter" && addKomsel()}
                />
                <button onClick={addKomsel} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-base shadow-sm">Tambah</button>
              </div>
            </div>
          )}

          {/* Kategori */}
          {activeTab === "kategori" && (
            <div className="space-y-8">
              {/* Expense categories */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-800">Kategori Pengeluaran</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Key</th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Label</th>
                        <th className="text-center px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseCats.map((c) => (
                        <tr key={c.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500 font-mono text-xs">{c.key}</td>
                          {editingCatId === c.id ? (
                            <>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={editCatLabel}
                                  onChange={(e) => setEditCatLabel(e.target.value)}
                                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-full"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => saveCatLabel(c.id, "expense")} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50" title="Simpan">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingCatId(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Batal">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2">{c.label}</td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => { setEditingCatId(c.id); setEditCatLabel(c.label); }} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50" title="Edit">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => deleteCategory(c.id, "expense")} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" title="Hapus">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Tambah Kategori Pengeluaran:</p>
                  <div className="flex gap-2 flex-wrap items-end">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Key (huruf_kecil)</label>
                      <input type="text" value={newExpKey} onChange={(e) => setNewExpKey(e.target.value)} placeholder="contoh: parkir" className="border border-gray-300 rounded-lg px-4 py-2.5 text-base w-40" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs text-gray-500 mb-1">Label</label>
                      <input type="text" value={newExpLabel} onChange={(e) => setNewExpLabel(e.target.value)} placeholder="Nama tampil" className="border border-gray-300 rounded-lg px-4 py-2.5 text-base w-full" />
                    </div>
                    <button onClick={() => addCategory("expense", newExpKey, newExpLabel, () => { setNewExpKey(""); setNewExpLabel(""); })} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-base shadow-sm">Tambah</button>
                  </div>
                </div>
              </div>

              <hr />

              {/* Income other categories */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-800">Kategori Pemasukan &ldquo;Lainnya&rdquo;</h3>
                <p className="text-sm text-gray-500">Kategori untuk tab Lainnya di halaman Pemasukan. Tab Ibadah/Perpuluhan/Komsel/Syukur tidak diubah di sini.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Key</th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Label</th>
                        <th className="text-center px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeCats.map((c) => (
                        <tr key={c.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500 font-mono text-xs">{c.key}</td>
                          {editingCatId === c.id ? (
                            <>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={editCatLabel}
                                  onChange={(e) => setEditCatLabel(e.target.value)}
                                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-full"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => saveCatLabel(c.id, "income_other")} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50" title="Simpan">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingCatId(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Batal">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2">{c.label}</td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => { setEditingCatId(c.id); setEditCatLabel(c.label); }} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50" title="Edit">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => deleteCategory(c.id, "income_other")} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" title="Hapus">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Tambah Kategori Lainnya:</p>
                  <div className="flex gap-2 flex-wrap items-end">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Key (huruf_kecil)</label>
                      <input type="text" value={newIncKey} onChange={(e) => setNewIncKey(e.target.value)} placeholder="contoh: zakat" className="border border-gray-300 rounded-lg px-4 py-2.5 text-base w-40" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs text-gray-500 mb-1">Label</label>
                      <input type="text" value={newIncLabel} onChange={(e) => setNewIncLabel(e.target.value)} placeholder="Nama tampil" className="border border-gray-300 rounded-lg px-4 py-2.5 text-base w-full" />
                    </div>
                    <button onClick={() => addCategory("income_other", newIncKey, newIncLabel, () => { setNewIncKey(""); setNewIncLabel(""); })} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-base shadow-sm">Tambah</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Username</th>
                      <th className="text-left px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Nama</th>
                      <th className="text-left px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Role</th>
                      <th className="text-center px-3 py-2 text-xs uppercase tracking-wider font-semibold text-gray-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">{u.username}</td>
                        <td className="px-3 py-2">{u.name}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2.5 py-1 rounded-full text-sm ${u.role === "admin" ? "bg-purple-100 text-purple-700" : u.role === "dokumentasi" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-600 mb-2">Tambah User:</p>
                <div className="flex gap-2 flex-wrap items-end">
                  <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" className="border border-gray-300 rounded-lg px-4 py-2.5 text-base w-36" />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" className="border border-gray-300 rounded-lg px-4 py-2.5 text-base w-36" />
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama Lengkap" className="border border-gray-300 rounded-lg px-4 py-2.5 text-base w-48" />
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2.5 text-base">
                    <option value="bendahara">Bendahara</option>
                    <option value="dokumentasi">Dokumentasi</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={addUser} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-base shadow-sm">Tambah</button>
                </div>
              </div>
            </div>
          )}

          {/* Saldo Pembuka */}
          {activeTab === "saldo" && (
            <div className="space-y-4 max-w-md">
              <p className="text-base text-gray-600">
                Saldo pembuka digunakan sebagai dasar perhitungan keuangan bulan pertama pencatatan.
              </p>
              {firstPeriod ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
                  Berlaku untuk periode pertama: <span className="font-semibold">{getMonthName(firstPeriod.month)} {firstPeriod.year}</span>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-700">
                  Belum ada periode. Saldo awal akan diterapkan ke bulan ini saat disimpan.
                </div>
              )}

              {/* Mode: sudah tersimpan, belum diedit */}
              {firstPeriod && !saldoEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Saldo Pembuka (Rp)</label>
                    <div className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-base bg-gray-50 text-gray-700 font-medium">
                      {formatRupiah(firstPeriod.saldoPindahan)}
                    </div>
                  </div>
                  <button onClick={confirmEditSaldo} className="border border-blue-500 text-blue-600 px-5 py-2.5 rounded-lg hover:bg-blue-50 text-base flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    Ubah Saldo Awal
                  </button>
                </div>
              ) : (
                /* Mode: belum ada periode atau sedang edit */
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Saldo Pembuka (Rp)</label>
                    <NumericInput value={saldoAmount} onChange={setSaldoAmount} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base" placeholder="0" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={setSaldoAwal} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-base shadow-sm flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Simpan Saldo Awal
                    </button>
                    {saldoEditing && (
                      <button onClick={() => { setSaldoEditing(false); setSaldoAmount(String(firstPeriod?.saldoPindahan || "")); }} className="border border-gray-300 text-gray-600 px-5 py-2.5 rounded-lg hover:bg-gray-50 text-base">
                        Batal
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
