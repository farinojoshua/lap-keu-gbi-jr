"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatRupiah, generateYears } from "@/lib/utils";
import { showSuccess, showError, showConfirmDelete, showConfirmAction } from "@/lib/swal";
import NumericInput from "@/components/ui/NumericInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { Church, FileSpreadsheet, Users2, UserCog, Banknote, Save, Pencil, Trash2, Download, Upload, Database, RotateCcw } from "lucide-react";
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

type Tab = "church" | "templates" | "komsel" | "users" | "saldo" | "backup";

export default function PengaturanPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [activeTab, setActiveTab] = useState<Tab>("church");

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

  // Saldo awal
  const [saldoMonth, setSaldoMonth] = useState(1);
  const [saldoYear, setSaldoYear] = useState(2025);
  const [saldoAmount, setSaldoAmount] = useState("");

  const isAdmin = role === "admin";

  useEffect(() => {
    if (status === "loading") return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Set default tab based on role (templates for bendahara since they can't see church)
  useEffect(() => {
    if (!isAdmin && activeTab === "church") {
      setActiveTab("templates");
    }
  }, [isAdmin, activeTab]);

  async function loadAll() {
    setLoading(true);
    setLoadError(false);
    try {
      const fetches: Promise<unknown>[] = [
        fetch("/api/expense/templates").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("/api/settings/komsel").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
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

      if (isAdmin && results.length > 2) {
        const settings = results[2] as Record<string, string>;
        setChurchName(settings.church_name || "");
        setPastorName(settings.pastor_name || "");
        setTreasurerName(settings.treasurer_name || "");
        setUsers(Array.isArray(results[3]) ? results[3] as User[] : []);
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

  async function setSaldoAwal() {
    if (!saldoAmount) return;
    const periodRes = await fetch(`/api/periods?month=${saldoMonth}&year=${saldoYear}`);
    const period = await periodRes.json();

    await fetch("/api/periods", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: period.id,
        saldoPindahan: Number(saldoAmount),
      }),
    });
    showSuccess(`Saldo bulan lalu berhasil di-set: ${formatRupiah(Number(saldoAmount))}`);
  }

  const allTabs: { key: Tab; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
    { key: "church", label: "Info Gereja", icon: Church, adminOnly: true },
    { key: "templates", label: "Template Pengeluaran", icon: FileSpreadsheet },
    { key: "komsel", label: "Daftar Komsel", icon: Users2 },
    { key: "users", label: "Pengguna", icon: UserCog, adminOnly: true },
    { key: "saldo", label: "Saldo Awal", icon: Banknote },
    { key: "backup", label: "Backup", icon: Database, adminOnly: true },
  ];

  const tabs = allTabs.filter((t) => !t.adminOnly || isAdmin);

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
                              <input type="text" value={editTplCategory} onChange={(e) => setEditTplCategory(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-full" />
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
                            <td className="px-3 py-2">{t.category}</td>
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
                  <input type="text" value={newTplCategory} onChange={(e) => setNewTplCategory(e.target.value)} placeholder="Kategori" className="border border-gray-300 rounded-lg px-4 py-2.5 text-base w-40" />
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
                          <span className={`px-2.5 py-1 rounded-full text-sm ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
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
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={addUser} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-base shadow-sm">Tambah</button>
                </div>
              </div>
            </div>
          )}

          {/* Saldo Awal */}
          {activeTab === "saldo" && (
            <div className="space-y-4 max-w-md">
              <p className="text-base text-gray-600">
                Set saldo bulan lalu (awal) untuk memulai pencatatan. Ini biasanya digunakan untuk bulan pertama saat setup aplikasi.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Bulan</label>
                  <select value={saldoMonth} onChange={(e) => setSaldoMonth(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Tahun</label>
                  <select value={saldoYear} onChange={(e) => setSaldoYear(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base">
                    {generateYears().map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Saldo Bulan Lalu (Rp)</label>
                <NumericInput value={saldoAmount} onChange={setSaldoAmount} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base" placeholder="0" />
              </div>
              <button onClick={setSaldoAwal} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-base shadow-sm flex items-center gap-2">
                <Save className="w-4 h-4" />
                Set Saldo Awal
              </button>
            </div>
          )}

          {/* Backup / Restore */}
          {activeTab === "backup" && (
            <div className="p-4 space-y-6">
              {/* Download Backup */}
              <div className="max-w-lg space-y-3">
                <h3 className="text-lg font-semibold text-gray-800">Download Backup</h3>
                <p className="text-sm text-gray-500">
                  Download salinan database saat ini. Simpan file ini di tempat aman (flashdisk, Google Drive, dll).
                </p>
                <button
                  onClick={() => {
                    window.location.href = "/api/backup";
                    showSuccess("File backup sedang diunduh");
                  }}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-base shadow-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Backup
                </button>
              </div>

              <hr />

              {/* Restore */}
              <div className="max-w-lg space-y-3">
                <h3 className="text-lg font-semibold text-gray-800">Restore dari Backup</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  <strong>Peringatan:</strong> Restore akan mengganti <em>seluruh</em> data saat ini dengan data dari file backup. Database saat ini akan di-backup otomatis sebelum di-replace.
                </div>
                <div>
                  <input
                    type="file"
                    accept=".db"
                    id="restore-file"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const confirm = await showConfirmAction(
                        "Restore Database?",
                        `File: ${file.name} (${(file.size / 1024).toFixed(0)} KB). Semua data saat ini akan diganti.`
                      );
                      if (!confirm.isConfirmed) {
                        e.target.value = "";
                        return;
                      }

                      const formData = new FormData();
                      formData.append("file", file);

                      try {
                        const res = await fetch("/api/restore", {
                          method: "POST",
                          body: formData,
                        });
                        const data = await res.json();
                        if (data.error) {
                          showError(data.error);
                        } else {
                          showSuccess("Database berhasil dipulihkan! Halaman akan dimuat ulang.");
                          setTimeout(() => window.location.reload(), 1500);
                        }
                      } catch {
                        showError("Gagal memulihkan database.");
                      }
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => document.getElementById("restore-file")?.click()}
                    className="bg-orange-600 text-white px-5 py-2.5 rounded-lg hover:bg-orange-700 text-base shadow-sm flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Pilih File Backup (.db)
                  </button>
                </div>
              </div>

              <hr />

              {/* Reset Database */}
              <div className="max-w-lg space-y-3">
                <h3 className="text-lg font-semibold text-red-700">Reset Database</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <strong>Peringatan:</strong> Reset akan <em>menghapus semua data</em> (pemasukan, pengeluaran, periode, pengguna) dan mengembalikan ke data awal. Login kembali dengan <strong>admin / admin123</strong>.
                </div>
                <button
                  onClick={async () => {
                    const confirm = await showConfirmAction(
                      "Reset Database?",
                      "SEMUA data akan dihapus dan dikembalikan ke data awal. Aksi ini tidak bisa dibatalkan!"
                    );
                    if (!confirm.isConfirmed) return;

                    const confirm2 = await showConfirmAction(
                      "Yakin 100%?",
                      "Ketik ulang: semua data akan hilang. Lanjutkan reset?"
                    );
                    if (!confirm2.isConfirmed) return;

                    try {
                      const res = await fetch("/api/reset", { method: "POST" });
                      const result = await res.json();
                      if (result.error) {
                        showError(result.error);
                      } else {
                        showSuccess("Database berhasil di-reset! Halaman akan dimuat ulang.");
                        setTimeout(() => window.location.href = "/login", 1500);
                      }
                    } catch {
                      showError("Gagal mereset database.");
                    }
                  }}
                  className="bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 text-base shadow-sm flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset ke Data Awal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
