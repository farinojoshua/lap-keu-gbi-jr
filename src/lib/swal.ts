import Swal from "sweetalert2";

/** Toast notification (auto-close, no button) */
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

/** Show success toast */
export function showSuccess(message: string) {
  return Toast.fire({ icon: "success", title: message });
}

/** Show error toast */
export function showError(message: string) {
  return Toast.fire({ icon: "error", title: message });
}

/** Show confirm dialog for destructive actions (hapus) */
export function showConfirmDelete(message: string = "Data yang dihapus tidak bisa dikembalikan.") {
  return Swal.fire({
    title: "Yakin hapus?",
    text: message,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    reverseButtons: true,
  });
}

/** Show confirm dialog for important actions (tutup periode, etc.) */
export function showConfirmAction(title: string, text: string) {
  return Swal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#2563eb",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Ya, Lanjutkan",
    cancelButtonText: "Batal",
    reverseButtons: true,
  });
}
