"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { showConfirmDelete, showConfirmAction, showError, showSuccess } from "@/lib/swal";
import {
  Upload, Trash2, Download, X, ChevronLeft, ChevronRight, Images,
  CheckSquare, Square, Play, Pencil, Check, FolderOpen, FolderPlus, Plus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface Activity {
  id: string;
  name: string;
  isActive: boolean;
}

interface FolderItem {
  id: string;
  name: string;
  activityId: string;
  parentId: string | null;
  createdAt: string;
}

interface FolderBreadcrumb {
  id: string;
  name: string;
}

interface MediaItem {
  id: string;
  activityId: string;
  folderId: string | null;
  title: string;
  fileType: string;
  mimeType: string;
  r2Key: string;
  url: string;
  uploadedBy: string;
  uploaderName: string;
  createdAt: string;
  activity: { name: string };
}

function xhrPut(url: string, file: File, contentType: string, onProgress: (pct: number) => void): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => reject(new Error("XHR error"));
    xhr.send(file);
  });
}

const LIMIT = 24;

export default function DokumentasiPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string; id?: string } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const canUpload = role === "admin" || role === "dokumentasi";

  function canDelete(m: MediaItem) {
    if (role === "admin") return true;
    if (role === "dokumentasi" && m.uploadedBy === userId) return true;
    return false;
  }

  function canEdit(m: MediaItem) {
    return role === "admin" || (role === "dokumentasi" && m.uploadedBy === userId);
  }

  const canManageFolders = role === "admin" || role === "dokumentasi";

  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  // Folder navigation
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [folderStack, setFolderStack] = useState<FolderBreadcrumb[]>([]);

  // Folder creation
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Activity management (tambah/hapus kegiatan)
  const [newActivityName, setNewActivityName] = useState("");
  const [addingActivity, setAddingActivity] = useState(false);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Upload progress
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; bytePercent: number } | null>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Video lightbox
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Pagination
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolderId = folderStack.at(-1)?.id ?? null;

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    setFolderStack([]);
    setSelectMode(false);
    setSelected(new Set());
    setCreatingFolder(false);
    setNewFolderName("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedActivity]);

  useEffect(() => {
    loadCurrentLevel();
    resetMedia();
    setSelectMode(false);
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedActivity, folderStack, filterDate]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingMore) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, skip]);

  async function loadActivities() {
    try {
      const data = await fetch("/api/dokumentasi/activities").then((r) => r.json());
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      showError("Gagal memuat daftar kegiatan. Coba muat ulang halaman.");
    }
  }

  async function handleAddActivity() {
    const name = newActivityName.trim();
    if (!name) return;
    const res = await fetch("/api/dokumentasi/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const activity = await res.json();
      setActivities((prev) => [...prev, activity].sort((a, b) => a.name.localeCompare(b.name)));
      setNewActivityName("");
      setAddingActivity(false);
    } else {
      const d = await res.json();
      showError(d.error || "Gagal menambah kegiatan");
    }
  }

  async function handleDeleteActivity(id: string, name: string) {
    const result = await showConfirmDelete(`Semua foto/video dan folder pada kegiatan "${name}" akan ikut dihapus.`);
    if (!result.isConfirmed) return;
    const res = await fetch(`/api/dokumentasi/activities?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setActivities((prev) => prev.filter((a) => a.id !== id));
      if (selectedActivity === id) selectActivity(null);
      showSuccess("Kegiatan berhasil dihapus");
    } else {
      const d = await res.json();
      showError(d.error || "Gagal menghapus kegiatan");
    }
  }

  async function loadCurrentLevel() {
    if (!selectedActivity) { setFolders([]); return; }
    try {
      const params = new URLSearchParams({ activityId: selectedActivity });
      if (currentFolderId) params.set("parentId", currentFolderId);
      const data = await fetch(`/api/dokumentasi/folders?${params}`).then((r) => r.json());
      setFolders(Array.isArray(data) ? data : []);
    } catch {
      setFolders([]);
    }
  }

  async function resetMedia() {
    setMedia([]);
    setSkip(0);
    setHasMore(false);
    setLoading(true);
    try {
      const params = buildMediaParams("0");
      const data = await fetch(`/api/dokumentasi/media?${params}`).then((r) => r.json());
      const items = Array.isArray(data.items) ? data.items : [];
      setMedia(items);
      setHasMore(data.hasMore === true);
      setSkip(LIMIT);
    } catch {
      showError("Gagal memuat galeri.");
    } finally {
      setLoading(false);
    }
  }

  function buildMediaParams(skipVal: string) {
    const params = new URLSearchParams();
    if (selectedActivity) {
      params.set("activityId", selectedActivity);
      if (currentFolderId) params.set("folderId", currentFolderId);
    }
    if (filterDate) params.set("date", filterDate);
    params.set("skip", skipVal);
    params.set("limit", String(LIMIT));
    return params;
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const params = buildMediaParams(String(skip));
      const data = await fetch(`/api/dokumentasi/media?${params}`).then((r) => r.json());
      const items = Array.isArray(data.items) ? data.items : [];
      setMedia((prev) => [...prev, ...items]);
      setHasMore(data.hasMore === true);
      setSkip((prev) => prev + LIMIT);
    } catch {
      showError("Gagal memuat lebih banyak media.");
    } finally {
      setLoadingMore(false);
    }
  }

  function selectActivity(id: string | null) {
    setSelectedActivity(id);
    // folderStack reset handled in useEffect
  }

  function navigateIntoFolder(folder: FolderItem) {
    setFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }

  function navigateToBreadcrumb(index: number) {
    // index = -1 → activity root
    setFolderStack((prev) => index < 0 ? [] : prev.slice(0, index + 1));
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name || !selectedActivity) return;

    const res = await fetch("/api/dokumentasi/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityId: selectedActivity,
        name,
        parentId: currentFolderId ?? null,
      }),
    });

    if (res.ok) {
      const folder = await res.json();
      setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFolderName("");
      setCreatingFolder(false);
    } else {
      const d = await res.json();
      showError(d.error || "Gagal membuat folder");
    }
  }

  function cancelCreateFolder() {
    setCreatingFolder(false);
    setNewFolderName("");
  }

  async function handleDeleteFolder(folder: FolderItem) {
    const result = await showConfirmDelete(`Folder "${folder.name}" dan semua isinya akan dihapus permanen.`);
    if (!result.isConfirmed) return;

    const res = await fetch(`/api/dokumentasi/folders?id=${folder.id}`, { method: "DELETE" });
    if (res.ok) {
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      showSuccess("Folder berhasil dihapus");
      // Reload media in case some were inside this folder
      await resetMedia();
    } else {
      const d = await res.json();
      showError(d.error || "Gagal menghapus folder");
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!selectedActivity) {
      showError("Pilih kegiatan terlebih dahulu sebelum upload.");
      return;
    }

    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 50 * 1024 * 1024 : 3 * 1024 * 1024;
      if (file.size > maxSize) {
        showError(`"${file.name}" terlalu besar. Maks ${isVideo ? "50MB untuk video" : "3MB untuk foto"}.`);
      } else {
        validFiles.push(file);
      }
    }
    if (validFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: validFiles.length, bytePercent: 0 });
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress({ current: i + 1, total: validFiles.length, bytePercent: 0 });

      try {
        // 1. Get presigned URL
        const urlRes = await fetch("/api/dokumentasi/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activityId: selectedActivity,
            folderId: currentFolderId ?? undefined,
            contentType: file.type,
            fileSize: file.size,
            title: file.name.replace(/\.[^/.]+$/, ""),
          }),
        });
        if (!urlRes.ok) {
          const err = await urlRes.json();
          showError(err.error || "Gagal mendapatkan upload URL");
          failCount++;
          continue;
        }
        const { presignedUrl, r2Key, publicUrl } = await urlRes.json();

        // 2. Upload directly to R2 with progress
        const status = await xhrPut(presignedUrl, file, file.type, (pct) => {
          setUploadProgress((p) => p ? { ...p, bytePercent: pct } : p);
        });
        if (status < 200 || status >= 300) {
          failCount++;
          continue;
        }

        // 3. Save metadata
        const fileType = file.type.startsWith("video/") ? "video" : "image";
        const metaRes = await fetch("/api/dokumentasi/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activityId: selectedActivity,
            folderId: currentFolderId ?? null,
            title: file.name.replace(/\.[^/.]+$/, ""),
            fileType,
            mimeType: file.type,
            r2Key,
            url: publicUrl,
          }),
        });
        if (metaRes.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setUploadProgress(null);
    setUploading(false);
    if (successCount > 0) {
      showSuccess(`${successCount} file berhasil diupload`);
      await resetMedia();
    }
    if (failCount > 0) {
      showError(`${failCount} file gagal diupload`);
    }
  }

  async function handleDelete(m: MediaItem) {
    const result = await showConfirmDelete();
    if (!result.isConfirmed) return;
    const res = await fetch(`/api/dokumentasi/media?id=${m.id}`, { method: "DELETE" });
    if (res.ok) {
      setMedia((prev) => prev.filter((x) => x.id !== m.id));
      if (lightboxIndex !== null) setLightboxIndex(null);
      showSuccess("Media berhasil dihapus");
    } else {
      const data = await res.json();
      showError(data.error || "Gagal menghapus media");
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    const result = await showConfirmDelete(`${selected.size} file akan dihapus permanen.`);
    if (!result.isConfirmed) return;

    setDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of Array.from(selected)) {
      const res = await fetch(`/api/dokumentasi/media?id=${id}`, { method: "DELETE" });
      if (res.ok) successCount++;
      else failCount++;
    }

    setDeleting(false);
    setSelected(new Set());
    setSelectMode(false);
    await resetMedia();

    if (successCount > 0) showSuccess(`${successCount} file berhasil dihapus`);
    if (failCount > 0) showError(`${failCount} file gagal dihapus`);
  }

  async function saveEdit(m: MediaItem) {
    const trimmed = editingTitle.trim();
    if (trimmed === m.title) { setEditingId(null); return; }
    const res = await fetch("/api/dokumentasi/media", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, title: trimmed }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMedia((prev) => prev.map((x) => x.id === updated.id ? updated : x));
      setEditingId(null);
    } else {
      const d = await res.json();
      showError(d.error || "Gagal menyimpan judul");
    }
  }

  async function closeLightbox() {
    if (videoPlaying) {
      const r = await showConfirmAction("Video sedang diputar", "Tutup lightbox dan hentikan video?");
      if (!r.isConfirmed) return;
    }
    videoRef.current?.pause();
    setVideoPlaying(false);
    setLightboxIndex(null);
  }

  function navigateLightbox(idx: number) {
    videoRef.current?.pause();
    setVideoPlaying(false);
    setLightboxIndex(idx);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const deletableIds = media.filter(canDelete).map((m) => m.id);
    if (selected.size === deletableIds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(deletableIds));
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  const deletableMedia = media.filter(canDelete);
  const allSelected = deletableMedia.length > 0 && selected.size === deletableMedia.length;

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  const lightboxMedia = lightboxIndex !== null && lightboxIndex < media.length ? media[lightboxIndex] : null;
  const canSelectMode = deletableMedia.length > 0;

  // Selected activity name
  const selectedActivityName = activities.find((a) => a.id === selectedActivity)?.name ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-800">Dokumentasi</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Select mode actions */}
          {selectMode ? (
            <>
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {allSelected ? "Batal Semua" : "Pilih Semua"}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selected.size === 0 || deleting}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Menghapus..." : `Hapus (${selected.size})`}
              </button>
              <button
                onClick={exitSelectMode}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                Batal
              </button>
            </>
          ) : (
            <>
              {/* Buat folder button */}
              {canManageFolders && selectedActivity && (
                creatingFolder ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateFolder();
                        if (e.key === "Escape") cancelCreateFolder();
                      }}
                      placeholder="Nama folder"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleCreateFolder}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Buat
                    </button>
                    <button
                      onClick={cancelCreateFolder}
                      className="p-2 text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreatingFolder(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FolderPlus className="w-4 h-4" />
                    Buat Folder
                  </button>
                )
              )}
              {canSelectMode && (
                <button
                  onClick={() => setSelectMode(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <CheckSquare className="w-4 h-4" />
                  Pilih
                </button>
              )}
              {canUpload && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !selectedActivity}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium shadow-sm"
                  title={!selectedActivity ? "Pilih kegiatan dulu" : ""}
                >
                  <Upload className="w-4 h-4" />
                  {uploading
                    ? (uploadProgress ? `Mengupload ${uploadProgress.current}/${uploadProgress.total}...` : "Mengupload...")
                    : "Upload"}
                </button>
              )}
            </>
          )}
          {/* Upload progress bar */}
          {uploading && uploadProgress && (
            <div className="w-full mt-2">
              <p className="text-xs text-gray-500 mb-1">
                Mengupload {uploadProgress.current}/{uploadProgress.total}...
              </p>
              <div className="h-1.5 bg-gray-200 rounded-full w-40 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-150"
                  style={{ width: `${uploadProgress.bytePercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Activity filter panel */}
        <aside className="lg:w-52 shrink-0">
          <div className="bg-white rounded-lg shadow-sm border p-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kegiatan</p>
              {canManageFolders && (
                <button
                  onClick={() => setAddingActivity(true)}
                  className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Tambah kegiatan"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => selectActivity(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedActivity === null
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Semua
              </button>
              {activities.map((a) => (
                <div
                  key={a.id}
                  className={`group flex items-center rounded-lg transition-colors ${
                    selectedActivity === a.id ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <button
                    onClick={() => selectActivity(a.id)}
                    className={`flex-1 text-left px-3 py-2 text-sm font-medium truncate ${
                      selectedActivity === a.id ? "text-blue-700" : "text-gray-600"
                    }`}
                  >
                    {a.name}
                  </button>
                  {canManageFolders && (
                    <button
                      onClick={() => handleDeleteActivity(a.id, a.name)}
                      className="shrink-0 pr-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                      title="Hapus kegiatan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Form tambah kegiatan */}
            {canManageFolders && addingActivity && (
              <div className="mt-2 pt-2 border-t space-y-1.5">
                <input
                  autoFocus
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddActivity();
                    if (e.key === "Escape") { setAddingActivity(false); setNewActivityName(""); }
                  }}
                  placeholder="Nama kegiatan"
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleAddActivity}
                    className="flex-1 px-2 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Tambah
                  </button>
                  <button
                    onClick={() => { setAddingActivity(false); setNewActivityName(""); }}
                    className="px-2 py-1.5 text-xs text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Gallery */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb navigation */}
          {selectedActivity && (
            <div className="flex items-center gap-1 text-sm mb-3 flex-wrap">
              <button
                onClick={() => selectActivity(null)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Semua
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              <button
                onClick={() => navigateToBreadcrumb(-1)}
                className={`font-medium ${folderStack.length > 0 ? "text-blue-600 hover:text-blue-800" : "text-gray-800 cursor-default"}`}
              >
                {selectedActivityName}
              </button>
              {folderStack.map((crumb, idx) => (
                <span key={crumb.id} className="flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  <button
                    onClick={() => navigateToBreadcrumb(idx)}
                    className={`font-medium ${idx < folderStack.length - 1 ? "text-blue-600 hover:text-blue-800" : "text-gray-800 cursor-default"}`}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-600 whitespace-nowrap">Filter bulan:</label>
            <input
              type="month"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Reset
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : folders.length === 0 && media.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Images className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-base font-medium">
                {folderStack.length > 0 ? "Folder ini kosong" : "Belum ada foto/video"}
              </p>
              {canUpload && selectedActivity && (
                <p className="text-sm mt-1">Klik tombol Upload untuk menambahkan</p>
              )}
              {canUpload && !selectedActivity && (
                <p className="text-sm mt-1">Pilih kegiatan untuk mulai upload</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Folder cards */}
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="group relative bg-amber-50 border border-amber-200 rounded-lg overflow-hidden cursor-pointer hover:bg-amber-100 transition-colors flex flex-col items-center justify-center aspect-square p-3"
                  onClick={() => navigateIntoFolder(folder)}
                >
                  <FolderOpen className="w-10 h-10 text-amber-400 mb-1" />
                  <p className="text-xs font-medium text-gray-700 text-center line-clamp-2 break-all">{folder.name}</p>
                  {canManageFolders && (
                    <button
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 bg-white/90 rounded text-red-600 hover:text-red-800 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                      title="Hapus folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {/* Media cards */}
              {media.map((m, idx) => {
                const isSelected = selected.has(m.id);
                const isDeletable = canDelete(m);
                return (
                  <div
                    key={m.id}
                    className={`group relative bg-gray-100 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      selectMode && isSelected
                        ? "border-blue-500"
                        : "border-transparent"
                    }`}
                    onClick={() => {
                      if (selectMode) {
                        if (isDeletable) toggleSelect(m.id);
                      } else {
                        setLightboxIndex(idx);
                      }
                    }}
                  >
                    {m.fileType === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.url}
                        alt={m.title}
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="relative w-full aspect-square bg-gray-900">
                        <video
                          src={m.url}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-black/50 rounded-full p-2">
                            <Play className="w-6 h-6 text-white fill-white" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Select mode checkbox */}
                    {selectMode && isDeletable && (
                      <div className="absolute top-2 left-2">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? "bg-blue-500 border-blue-500" : "bg-white/90 border-gray-400"
                        }`}>
                          {isSelected && <X className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                      </div>
                    )}

                    {/* Overlay on hover (non-select mode) */}
                    {!selectMode && (
                      <>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100">
                          {editingId === m.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(m);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                className="flex-1 bg-white/20 text-white text-xs rounded px-1 outline-none border border-white/50 min-w-0"
                              />
                              <button onClick={() => saveEdit(m)}>
                                <Check className="w-3.5 h-3.5 text-green-300" />
                              </button>
                              <button onClick={() => setEditingId(null)}>
                                <X className="w-3.5 h-3.5 text-white/70" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 min-w-0">
                              <p className="text-white text-xs font-medium truncate flex-1">{m.title || m.activity.name}</p>
                              {canEdit(m) && !selectMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(m.id);
                                    setEditingTitle(m.title);
                                  }}
                                  className="shrink-0 p-0.5 text-white/60 hover:text-white"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                          <p className="text-white/70 text-xs">{formatDate(m.createdAt)}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={m.url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white shadow-sm"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          {isDeletable && (
                            <button
                              onClick={() => handleDelete(m)}
                              className="p-1.5 bg-white/90 rounded-lg text-red-600 hover:bg-white shadow-sm"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sentinel + load more */}
          {!loading && media.length > 0 && (
            <>
              <div ref={sentinelRef} className="h-4" />
              {loadingMore && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              )}
              {!hasMore && media.length >= LIMIT && (
                <p className="text-center text-xs text-gray-400 py-4">Semua media telah dimuat</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxMedia !== null && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => closeLightbox()}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            onClick={() => closeLightbox()}
          >
            <X className="w-7 h-7" />
          </button>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white/80 hover:text-white p-2"
              onClick={(e) => { e.stopPropagation(); navigateLightbox(lightboxIndex - 1); }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Media */}
          <div className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-3 px-16" onClick={(e) => e.stopPropagation()}>
            {lightboxMedia.fileType === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            ) : (
              <video
                ref={videoRef}
                src={lightboxMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-lg"
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
                onEnded={() => setVideoPlaying(false)}
              />
            )}
            <div className="flex items-center gap-4 text-white/80 text-sm flex-wrap justify-center">
              <span className="font-medium text-white">{lightboxMedia.title || lightboxMedia.activity.name}</span>
              <span>{lightboxMedia.activity.name}</span>
              <span>{formatDate(lightboxMedia.createdAt)}</span>
              <span>by {lightboxMedia.uploaderName}</span>
              <a
                href={lightboxMedia.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-300 hover:text-blue-200"
              >
                <Download className="w-4 h-4" /> Download
              </a>
              {canDelete(lightboxMedia) && (
                <button
                  onClick={() => handleDelete(lightboxMedia)}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" /> Hapus
                </button>
              )}
            </div>
          </div>

          {/* Next */}
          {lightboxIndex < media.length - 1 && (
            <button
              className="absolute right-4 text-white/80 hover:text-white p-2"
              onClick={(e) => { e.stopPropagation(); navigateLightbox(lightboxIndex + 1); }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
