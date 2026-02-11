# Laporan Keuangan GBI Jonggol Raya

Aplikasi web untuk mengelola laporan keuangan gereja GBI Jonggol Raya. Menggantikan workflow manual Excel + PDF dengan input data yang lebih mudah, pengeluaran mingguan otomatis dari template, dan generate laporan PDF langsung dari website.

## v1.0.0

### Fitur

**Autentikasi**
- Login dengan username & password
- Role-based access: Admin dan Bendahara
- Proteksi semua halaman (middleware)
- Default akun: `admin` / `admin123`

**Dashboard**
- Ringkasan keuangan bulan berjalan (saldo pindahan, pemasukan, pengeluaran, saldo)
- Rata-rata kehadiran ibadah per minggu
- Total persembahan bulan ini
- Grafik tren pemasukan vs pengeluaran 6 bulan terakhir

**Pemasukan**
- Form input ibadah Minggu (kantong ungu, kantong hitam, sekolah minggu + jumlah hadir)
- Form input perpuluhan (tanggal, nama, jumlah)
- Form input komsel (pilih nama komsel, jumlah hadir, jumlah)
- Form input ucapan syukur (tanggal, nama, jumlah)
- Form input lainnya (pembangunan, diakonia, donasi, dll)
- Tabel data dengan fitur edit & hapus inline
- Filter per bulan dan tahun

**Pengeluaran**
- Pengeluaran mingguan otomatis dari template (PK Tim Musik, WL, Singer, Tamborin, Op. Slide, Tim Media, GSM, Kebersihan, Penjemputan, Beras)
- Setiap item bisa diedit jumlahnya atau dihapus jika tidak ada di minggu tersebut
- Tambah PK Pelayan FT dengan nama dan jumlah custom
- Form pengeluaran manual untuk kategori lainnya (konsumsi, listrik, ATK, kendaraan, sound, dll)
- Tabel data dengan fitur edit & hapus inline

**Laporan Bulanan**
- Preview laporan lengkap di web (pemasukan & pengeluaran dikelompokkan per kategori dengan subtotal)
- Saldo pindahan, total debit, total kredit, saldo akhir
- Keterangan: kas tersedia, saldo rekening, saldo cash, dana sewa, dana pembangunan, kas komsel, kas diakonia (bisa diedit)
- Tanda tangan gembala & bendahara
- Export PDF dengan warna sesuai preview web
- Tutup Periode (kunci bulan & pindahkan saldo ke bulan berikutnya)

**Pengaturan**
- Info gereja (nama gereja, nama gembala, nama bendahara)
- CRUD template pengeluaran tetap (tambah/hapus, ubah default amount)
- CRUD daftar komsel
- Manajemen user (tambah/hapus, role admin/bendahara)
- Set saldo awal untuk bulan pertama

**Deployment**
- Dockerfile & docker-compose.yml untuk deploy ke VPS
- SQLite database (persistent via Docker volume)

### Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: SQLite via Prisma 5
- **Auth**: NextAuth.js v4 (credentials provider)
- **Styling**: Tailwind CSS v4
- **PDF**: @react-pdf/renderer
- **Build**: Webpack (Turbopack belum support @react-pdf/renderer)

## Getting Started

```bash
# Install dependencies
npm install

# Setup database & seed data
npx prisma migrate dev
npm run db:seed

# Jalankan dev server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) dan login dengan `admin` / `admin123`.

## Scripts

| Script | Keterangan |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run db:seed` | Seed data awal |
| `npm run db:migrate` | Jalankan migrasi |
| `npm run db:reset` | Reset database |

## Deploy dengan Docker

```bash
docker compose up -d --build
```

Pastikan set environment variable `NEXTAUTH_SECRET` ke value yang aman untuk production.
