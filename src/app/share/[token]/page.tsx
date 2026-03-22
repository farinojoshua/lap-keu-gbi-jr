"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Download, Play, X, ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  title: string;
  fileType: string;
  mimeType: string;
  createdAt: string;
  uploaderName: string;
}

interface FolderItem {
  id: string;
  name: string;
}

interface ShareData {
  type: "activity" | "folder" | "media";
  activity?: { id: string; name: string };
  folder?: { id: string; name: string; activity: { name: string } };
  subfolders?: FolderItem[];
  folders?: FolderItem[];
  media: MediaItem[];
}

type ViewState =
  | { type: "root"; data: ShareData }
  | { type: "subfolder"; folderId: string; folderName: string; media: MediaItem[]; subfolders: FolderItem[] };

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [viewStack, setViewStack] = useState<ViewState[]>([]);
  const [lightbox, setLightbox] = useState<{ media: MediaItem[]; index: number } | null>(null);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data: ShareData | null) => {
        if (data) setShareData(data);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  const openSubfolder = useCallback(async (folder: FolderItem) => {
    const r = await fetch(`/api/share/${token}?folderId=${folder.id}`);
    if (!r.ok) return;
    const data = await r.json();
    setViewStack((prev) => [
      ...prev,
      { type: "subfolder", folderId: folder.id, folderName: folder.name, media: data.media, subfolders: data.subfolders ?? [] },
    ]);
  }, [token]);

  const goBack = useCallback(() => {
    setViewStack((prev) => prev.slice(0, -1));
  }, []);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setLightbox((l) => l && l.index < l.media.length - 1 ? { ...l, index: l.index + 1 } : l);
      if (e.key === "ArrowLeft") setLightbox((l) => l && l.index > 0 ? { ...l, index: l.index - 1 } : l);
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox]);

  const currentView = viewStack.length > 0 ? viewStack[viewStack.length - 1] : null;
  const currentMedia = currentView?.type === "subfolder" ? currentView.media : shareData?.media ?? [];
  const currentSubfolders = currentView?.type === "subfolder" ? currentView.subfolders : (shareData?.folders ?? shareData?.subfolders ?? []);

  // Header title
  let headerTitle = "";
  let subTitle = "";
  if (shareData?.type === "activity") {
    headerTitle = shareData.activity?.name ?? "";
    subTitle = "Dokumentasi Kegiatan";
  } else if (shareData?.type === "folder") {
    headerTitle = shareData.folder?.name ?? "";
    subTitle = shareData.folder?.activity.name ?? "";
  } else if (shareData?.type === "media") {
    headerTitle = shareData.media[0]?.title || "Foto/Video";
    subTitle = shareData.activity?.name ?? "";
  }

  if (currentView?.type === "subfolder") {
    headerTitle = currentView.folderName;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  if (notFound || !shareData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="text-gray-900 text-xl font-semibold mb-2">Link tidak ditemukan</h1>
          <p className="text-gray-500 text-sm">Link ini mungkin sudah tidak aktif atau tidak valid.</p>
        </div>
      </div>
    );
  }

  // Single media view
  if (shareData.type === "media") {
    const m = shareData.media[0];
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            {m.fileType === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt={m.title || "foto"} className="w-full rounded-xl object-contain max-h-[75vh] shadow" />
            ) : (
              <video src={m.url} controls className="w-full rounded-xl max-h-[75vh] shadow" />
            )}
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                {m.title && <p className="text-gray-900 font-medium">{m.title}</p>}
                <p className="text-gray-500 text-sm mt-1">{subTitle}</p>
              </div>
              <a
                href={m.url}
                download
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 shrink-0"
              >
                <Download size={15} /> Unduh
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Title bar */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
        {viewStack.length > 0 && (
          <button onClick={goBack} className="text-gray-500 hover:text-gray-800 p-1 rounded">
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-gray-900 font-semibold">{headerTitle}</h1>
          {subTitle && viewStack.length === 0 && (
            <p className="text-gray-500 text-xs mt-0.5">{subTitle}</p>
          )}
        </div>
        <span className="ml-auto text-gray-400 text-sm">{currentMedia.length} item</span>
      </div>

      <div className="flex-1 p-4 max-w-6xl mx-auto w-full">
        {/* Subfolders */}
        {currentSubfolders.length > 0 && (
          <div className="mb-6">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Folder</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {currentSubfolders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => openSubfolder(f)}
                  className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2.5 text-left transition-colors"
                >
                  <FolderOpen size={16} className="text-amber-400 shrink-0" />
                  <span className="text-gray-700 text-sm truncate">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Media grid */}
        {currentMedia.length === 0 && currentSubfolders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>Tidak ada konten di sini.</p>
          </div>
        ) : currentMedia.length > 0 && (
          <>
            {currentSubfolders.length > 0 && (
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Media</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {currentMedia.map((m: MediaItem, i: number) => (
                <button
                  key={m.id}
                  onClick={() => setLightbox({ media: currentMedia, index: i })}
                  className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group"
                >
                  {m.fileType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.title || "foto"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300">
                      <Play size={28} className="text-gray-600" />
                    </div>
                  )}
                  {m.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs truncate">{m.title}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setLightbox(null)}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-gray-300 text-sm">
              {lightbox.index + 1} / {lightbox.media.length}
            </span>
            <div className="flex items-center gap-3">
              <a
                href={lightbox.media[lightbox.index].url}
                download
                className="text-gray-300 hover:text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={18} />
              </a>
              <button onClick={() => setLightbox(null)} className="text-gray-300 hover:text-white">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Media */}
          <div className="flex-1 flex items-center justify-center px-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {lightbox.media[lightbox.index].fileType === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.media[lightbox.index].url}
                alt={lightbox.media[lightbox.index].title || "foto"}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <video
                src={lightbox.media[lightbox.index].url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg"
              />
            )}
          </div>

          {/* Nav arrows */}
          {lightbox.index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox((l) => l ? { ...l, index: l.index - 1 } : l); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          {lightbox.index < lightbox.media.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox((l) => l ? { ...l, index: l.index + 1 } : l); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Title */}
          {lightbox.media[lightbox.index].title && (
            <div className="shrink-0 px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
              <p className="text-white text-sm">{lightbox.media[lightbox.index].title}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
        GBI
      </div>
      <div>
        <p className="text-gray-900 text-sm font-semibold leading-tight">GBI Jonggol Raya</p>
        <p className="text-gray-400 text-xs">Dokumentasi Gereja</p>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="border-t border-gray-200 px-4 py-3 text-center bg-white">
      <p className="text-gray-400 text-xs">© GBI Jonggol Raya</p>
    </div>
  );
}
