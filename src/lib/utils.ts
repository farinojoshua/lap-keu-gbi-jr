export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}

export function parseRupiahInput(value: string): number {
  return Number(value.replace(/[^0-9]/g, "")) || 0;
}

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || "";
}

export const INCOME_CATEGORIES: Record<string, string> = {
  persembahan: "Persembahan",
  perpuluhan: "Perpuluhan",
  komsel: "Komsel",
  ucapan_syukur: "Ucapan Syukur",
  pembangunan: "Pembangunan",
  diakonia: "Diakonia",
  donasi: "Donasi",
  dll: "Lain-lain",
};

export const EXPENSE_CATEGORIES: Record<string, string> = {
  pk_tim: "PK Tim Pelayanan",
  pk_kebersihan: "PK Kebersihan",
  pk_penjemputan: "PK Penjemputan",
  pk_pelayan_ft: "PK Pelayan FT",
  konsumsi: "Konsumsi",
  listrik: "Listrik",
  atk_perlengkapan: "ATK & Perlengkapan",
  kendaraan: "Kendaraan",
  sound_musik: "Sound & Musik",
  perbaikan_gedung: "Perbaikan Gedung",
  sewa: "Alokasi Dana Sewa",
  pembangunan: "Alokasi Dana Pembangunan",
  komsel: "Alokasi Dana Komsel",
  diakonia: "Dana Diakonia",
  perjamuan: "Perjamuan",
  baptis: "Baptis",
  dll: "Lain-lain",
};

export const FUND_TYPES: Record<string, string> = {
  sewa: "Dana Sewa",
  pembangunan: "Dana Pembangunan",
  komsel: "Kas Komsel",
  diakonia: "Kas Diakonia",
};

export function formatDateID(dateStr: string): string {
  if (!dateStr) return "-";
  const MONTH_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${day} ${MONTH_SHORT[monthIdx]} ${parts[0]}`;
}

export function generateYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    years.push(y);
  }
  return years;
}
