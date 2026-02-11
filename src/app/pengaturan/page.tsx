"use client";

import { useEffect, useState } from "react";
import { formatRupiah } from "@/lib/utils";
import { showSuccess, showError, showConfirmDelete } from "@/lib/swal";
import NumericInput from "@/components/ui/NumericInput";

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

type Tab = "church" | "templates" | "komsel" | "users" | "saldo";

export default function PengaturanPage() {
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

  // Komsel
  const [komselGroups, setKomselGroups] = useState<KomselGroup[]>([]);
  const [newKomselName, setNewKomselName] = useState("");

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("bendahara");

  // Saldo awal
  const [saldoMonth, setSaldoMonth] = useState(1);
  const [saldoYear, setSaldoYear] = useState(2025);
  const [saldoAmount, setSaldoAmount] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [settings, tpl, komsel, userList] = await Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/expense/templates").then((r) => r.json()),
      fetch("/api/settings/komsel").then((r) => r.json()),
      fetch("/api/settings/users").then((r) => r.json()),
    ]);

    setChurchName(settings.church_name || "");
    setPastorName(settings.pastor_name || "");
    setTreasurerName(settings.treasurer_name || "");
    setTemplates(tpl);
    setKomselGroups(komsel);
    setUsers(userList);
  }

  async function saveChurchInfo() {
    setChurchSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        church_name: churchName,
        pastor_name: pastorName,
        treasurer_name: treasurerName,
      }),
    });
    setChurchSaving(false);
    showSuccess("Info gereja berhasil disimpan");
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
    // Get or create period
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
    showSuccess(`Saldo pindahan berhasil di-set: ${formatRupiah(Number(saldoAmount))}`);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "church", label: "Info Gereja" },
    { key: "templates", label: "Template Pengeluaran" },
    { key: "komsel", label: "Daftar Komsel" },
    { key: "users", label: "Pengguna" },
    { key: "saldo", label: "Saldo Awal" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Pengaturan</h1>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3.5 text-base font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {/* Church Info */}
          {activeTab === "church" && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">Nama Gereja</label>
                <input type="text" value={churchName} onChange={(e) => setChurchName(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">Nama Gembala</label>
                <input type="text" value={pastorName} onChange={(e) => setPastorName(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">Nama Bendahara</label>
                <input type="text" value={treasurerName} onChange={(e) => setTreasurerName(e.target.value)} className="w-full border rounded-md px-4 py-2.5 text-base" />
              </div>
              <button onClick={saveChurchInfo} disabled={churchSaving} className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 text-base">
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
                      <th className="text-left px-3 py-2 font-medium">Kategori</th>
                      <th className="text-left px-3 py-2 font-medium">Keterangan</th>
                      <th className="text-right px-3 py-2 font-medium">Default (Rp)</th>
                      <th className="text-center px-3 py-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="px-3 py-2">{t.category}</td>
                        <td className="px-3 py-2">{t.description}</td>
                        <td className="px-3 py-2 text-right">{formatRupiah(t.defaultAmount)}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => deleteTemplate(t.id)} className="text-red-600 hover:underline text-sm">Hapus</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t pt-4">
                <p className="text-base font-medium text-gray-700 mb-2">Tambah Template:</p>
                <div className="flex gap-2 flex-wrap items-end">
                  <input type="text" value={newTplCategory} onChange={(e) => setNewTplCategory(e.target.value)} placeholder="Kategori" className="border rounded-md px-4 py-2.5 text-base w-40" />
                  <input type="text" value={newTplDesc} onChange={(e) => setNewTplDesc(e.target.value)} placeholder="Keterangan" className="border rounded-md px-4 py-2.5 text-base flex-1 min-w-[200px]" />
                  <NumericInput value={newTplAmount} onChange={setNewTplAmount} placeholder="Jumlah" className="border rounded-md px-4 py-2.5 text-base w-32" />
                  <button onClick={addTemplate} className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 text-base">Tambah</button>
                </div>
              </div>
            </div>
          )}

          {/* Komsel */}
          {activeTab === "komsel" && (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                {komselGroups.map((g) => (
                  <div key={g.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-md">
                    <span className="text-base">{g.name}</span>
                    <button onClick={() => deleteKomsel(g.id)} className="text-red-600 hover:underline text-sm">Hapus</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKomselName}
                  onChange={(e) => setNewKomselName(e.target.value)}
                  placeholder="Nama Komsel"
                  className="border rounded-md px-4 py-2.5 text-base flex-1"
                  onKeyDown={(e) => e.key === "Enter" && addKomsel()}
                />
                <button onClick={addKomsel} className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 text-base">Tambah</button>
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
                      <th className="text-left px-3 py-2 font-medium">Username</th>
                      <th className="text-left px-3 py-2 font-medium">Nama</th>
                      <th className="text-left px-3 py-2 font-medium">Role</th>
                      <th className="text-center px-3 py-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="px-3 py-2">{u.username}</td>
                        <td className="px-3 py-2">{u.name}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2.5 py-1 rounded text-sm ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => deleteUser(u.id)} className="text-red-600 hover:underline text-sm">Hapus</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t pt-4">
                <p className="text-base font-medium text-gray-700 mb-2">Tambah User:</p>
                <div className="flex gap-2 flex-wrap items-end">
                  <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" className="border rounded-md px-4 py-2.5 text-base w-36" />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" className="border rounded-md px-4 py-2.5 text-base w-36" />
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama Lengkap" className="border rounded-md px-4 py-2.5 text-base w-48" />
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="border rounded-md px-4 py-2.5 text-base">
                    <option value="bendahara">Bendahara</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={addUser} className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 text-base">Tambah</button>
                </div>
              </div>
            </div>
          )}

          {/* Saldo Awal */}
          {activeTab === "saldo" && (
            <div className="space-y-4 max-w-md">
              <p className="text-base text-gray-600">
                Set saldo pindahan awal untuk memulai pencatatan. Ini biasanya digunakan untuk bulan pertama saat setup aplikasi.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">Bulan</label>
                  <select value={saldoMonth} onChange={(e) => setSaldoMonth(Number(e.target.value))} className="w-full border rounded-md px-4 py-2.5 text-base">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">Tahun</label>
                  <select value={saldoYear} onChange={(e) => setSaldoYear(Number(e.target.value))} className="w-full border rounded-md px-4 py-2.5 text-base">
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">Saldo Pindahan (Rp)</label>
                <NumericInput value={saldoAmount} onChange={setSaldoAmount} className="w-full border rounded-md px-4 py-2.5 text-base" placeholder="0" />
              </div>
              <button onClick={setSaldoAwal} className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 text-base">
                Set Saldo Awal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
