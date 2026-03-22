"use client";

import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { formatNumber, getMonthName, INCOME_CATEGORIES, EXPENSE_CATEGORIES, FUND_TYPES } from "@/lib/utils";

/** Convert yyyy-mm-dd → "8 Feb 2026" */
function formatDateID(dateStr: string) {
  const MONTH_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(d, 10)} ${MONTH_SHORT[parseInt(m, 10) - 1]} ${y}`;
}

Font.register({
  family: "Roboto",
  fonts: [
    { src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf", fontWeight: 400 },
    { src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf", fontWeight: 700 },
  ],
});

// Tailwind-equivalent colors
const colors = {
  blue50: "#eff6ff",
  blue100: "#dbeafe",
  blue700: "#1d4ed8",
  green50: "#f0fdf4",
  green100: "#dcfce7",
  green700: "#15803d",
  red50: "#fef2f2",
  red100: "#fee2e2",
  red700: "#b91c1c",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
};

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: "Roboto", color: colors.gray800 },
  header: { textAlign: "center", marginBottom: 15, alignItems: "center" },
  logo: { width: 40, height: 40, marginBottom: 6, borderRadius: 20 },
  title: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, marginBottom: 4, color: colors.gray600 },
  churchName: { fontSize: 10, fontWeight: 700, marginBottom: 8 },

  // Saldo Bulan Lalu
  saldoPindahan: { flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.blue50, padding: 8, borderRadius: 3, marginBottom: 10 },

  // Section titles
  sectionIncome: { fontSize: 10, fontWeight: 700, backgroundColor: colors.green50, padding: 6, borderRadius: 3, marginTop: 10, marginBottom: 5, color: colors.gray800 },
  sectionExpense: { fontSize: 10, fontWeight: 700, backgroundColor: colors.red50, padding: 6, borderRadius: 3, marginTop: 10, marginBottom: 5, color: colors.gray800 },

  // Table
  tableHeader: { flexDirection: "row", backgroundColor: colors.gray100, paddingVertical: 4, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: "#d1d5db" },
  categoryRow: { flexDirection: "row", backgroundColor: colors.gray50, paddingVertical: 3, paddingHorizontal: 2, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb", paddingVertical: 2, paddingHorizontal: 2 },
  subtotalRow: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#d1d5db", paddingVertical: 3, paddingHorizontal: 2 },

  // Totals
  totalIncome: { flexDirection: "row", backgroundColor: colors.green100, paddingVertical: 5, paddingHorizontal: 6, marginTop: 4, borderRadius: 2 },
  totalIncomeText: { fontWeight: 700, color: colors.gray800 },
  totalIncomeAmount: { fontWeight: 700, color: colors.green700, textAlign: "right" },

  totalExpense: { flexDirection: "row", backgroundColor: colors.red100, paddingVertical: 5, paddingHorizontal: 6, marginTop: 4, borderRadius: 2 },
  totalExpenseText: { fontWeight: 700, color: colors.gray800 },
  totalExpenseAmount: { fontWeight: 700, color: colors.red700, textAlign: "right" },

  // Saldo akhir
  saldoAkhir: { flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.blue100, padding: 10, borderRadius: 3, marginTop: 10 },
  saldoAkhirLabel: { fontWeight: 700, fontSize: 10, color: colors.gray800 },
  saldoAkhirAmount: { fontWeight: 700, fontSize: 12, color: colors.blue700 },

  // Columns
  colDate: { width: "18%", paddingHorizontal: 2 },
  colDesc: { width: "57%", paddingHorizontal: 2 },
  colAmount: { width: "25%", paddingHorizontal: 2, textAlign: "right" },

  // Info
  infoSection: { marginTop: 10, padding: 8, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 3 },
  infoTitle: { fontWeight: 700, marginBottom: 5, fontSize: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },

  // Footer
  footer: { marginTop: 30, flexDirection: "row", justifyContent: "space-between" },
  signatureBlock: { width: "30%", textAlign: "center" },
  signatureName: { marginTop: 50, fontWeight: 700, borderTopWidth: 1, borderTopColor: "#9ca3af", paddingTop: 3 },

  bold: { fontWeight: 700 },
});

interface ReportData {
  period: { month: number; year: number; saldoPindahan: number; saldoRekening: number; saldoCash: number };
  incomeByCategory: Record<string, { entries: { date: string; description: string; amount: number; attendance?: number | null }[]; subtotal: number }>;
  expenseByCategory: Record<string, { entries: { date: string; description: string; amount: number }[]; subtotal: number }>;
  totalIncome: number;
  totalExpense: number;
  saldo: number;
  churchInfo: Record<string, string>;
  fundBalances: Record<string, number>;
}

export default function ReportPDF({ data, logoUrl }: { data: ReportData; logoUrl?: string }) {
  const { period, incomeByCategory, expenseByCategory, totalIncome, totalExpense, saldo, churchInfo, fundBalances } = data;
  const monthName = getMonthName(period.month);
  const daysInMonth = new Date(period.year, period.month, 0).getDate();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {/* jsx-a11y false-positive for @react-pdf/renderer Image */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          <Text style={styles.title}>LAPORAN KEUANGAN</Text>
          <Text style={styles.subtitle}>
            PERIODE 1 - {daysInMonth} {monthName.toUpperCase()} {period.year}
          </Text>
          <Text style={styles.churchName}>{churchInfo.church_name || "GBI JONGGOL RAYA"}</Text>
        </View>

        {/* Saldo Bulan Lalu */}
        <View style={styles.saldoPindahan}>
          <Text style={{ fontWeight: 700, color: colors.gray700 }}>SALDO BULAN LALU</Text>
          <Text style={{ fontWeight: 700, fontSize: 11 }}>Rp {formatNumber(period.saldoPindahan)}</Text>
        </View>

        {/* PEMASUKAN */}
        <View style={styles.sectionIncome}>
          <Text>PEMASUKAN (DEBIT)</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.colDate, { fontWeight: 700 }]}>Tanggal</Text>
          <Text style={[styles.colDesc, { fontWeight: 700 }]}>Keterangan</Text>
          <Text style={[styles.colAmount, { fontWeight: 700 }]}>Jumlah</Text>
        </View>

        {Object.entries(incomeByCategory).map(([category, { entries, subtotal }]) => (
          <View key={category}>
            <View style={styles.categoryRow}>
              <Text style={[styles.colDesc, { width: "100%", fontWeight: 700, color: colors.gray700 }]}>
                {INCOME_CATEGORIES[category] || category}
              </Text>
            </View>
            {entries.map((entry, idx) => (
              <View key={idx} style={styles.row}>
                <Text style={[styles.colDate, { color: colors.gray600 }]}>{formatDateID(entry.date)}</Text>
                <Text style={[styles.colDesc, { color: colors.gray600 }]}>{entry.description}</Text>
                <Text style={styles.colAmount}>Rp {formatNumber(entry.amount)}</Text>
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={[styles.colDesc, { width: "75%", textAlign: "right", color: colors.gray600, fontWeight: 700, fontSize: 8 }]}>Subtotal:</Text>
              <Text style={[styles.colAmount, { width: "25%", fontWeight: 700 }]}>Rp {formatNumber(subtotal)}</Text>
            </View>
          </View>
        ))}

        <View style={styles.totalIncome}>
          <Text style={[styles.totalIncomeText, { width: "75%" }]}>TOTAL PEMASUKAN</Text>
          <Text style={[styles.totalIncomeAmount, { width: "25%" }]}>Rp {formatNumber(totalIncome)}</Text>
        </View>

        {/* PENGELUARAN */}
        <View style={styles.sectionExpense}>
          <Text>PENGELUARAN (KREDIT)</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.colDate, { fontWeight: 700 }]}>Tanggal</Text>
          <Text style={[styles.colDesc, { fontWeight: 700 }]}>Keterangan</Text>
          <Text style={[styles.colAmount, { fontWeight: 700 }]}>Jumlah</Text>
        </View>

        {Object.entries(expenseByCategory).map(([category, { entries, subtotal }]) => (
          <View key={category}>
            <View style={styles.categoryRow}>
              <Text style={[styles.colDesc, { width: "100%", fontWeight: 700, color: colors.gray700 }]}>
                {EXPENSE_CATEGORIES[category] || category}
              </Text>
            </View>
            {entries.map((entry, idx) => (
              <View key={idx} style={styles.row}>
                <Text style={[styles.colDate, { color: colors.gray600 }]}>{formatDateID(entry.date)}</Text>
                <Text style={[styles.colDesc, { color: colors.gray600 }]}>{entry.description}</Text>
                <Text style={styles.colAmount}>Rp {formatNumber(entry.amount)}</Text>
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={[styles.colDesc, { width: "75%", textAlign: "right", color: colors.gray600, fontWeight: 700, fontSize: 8 }]}>Subtotal:</Text>
              <Text style={[styles.colAmount, { width: "25%", fontWeight: 700 }]}>Rp {formatNumber(subtotal)}</Text>
            </View>
          </View>
        ))}

        <View style={styles.totalExpense}>
          <Text style={[styles.totalExpenseText, { width: "75%" }]}>TOTAL PENGELUARAN</Text>
          <Text style={[styles.totalExpenseAmount, { width: "25%" }]}>Rp {formatNumber(totalExpense)}</Text>
        </View>

        {/* SALDO AKHIR */}
        <View style={styles.saldoAkhir}>
          <Text style={styles.saldoAkhirLabel}>SALDO (Bulan Lalu + Debit - Kredit)</Text>
          <Text style={styles.saldoAkhirAmount}>Rp {formatNumber(saldo)}</Text>
        </View>

        {/* KETERANGAN */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>KETERANGAN:</Text>
          <View style={styles.infoRow}>
            <Text style={styles.bold}>Kas Tersedia</Text>
            <Text style={styles.bold}>Rp {formatNumber(saldo)}</Text>
          </View>
          <View style={[styles.infoRow, { paddingLeft: 12 }]}>
            <Text style={{ color: colors.gray600 }}>- Saldo Rekening</Text>
            <Text style={{ color: colors.gray600 }}>Rp {formatNumber(period.saldoRekening)}</Text>
          </View>
          <View style={[styles.infoRow, { paddingLeft: 12 }]}>
            <Text style={{ color: colors.gray600 }}>- Saldo Cash</Text>
            <Text style={{ color: colors.gray600 }}>Rp {formatNumber(period.saldoCash)}</Text>
          </View>
          {Object.entries(fundBalances).filter(([, val]) => val > 0).length > 0 && (
            <>
              <View style={[styles.infoRow, { marginTop: 4 }]}>
                <Text style={styles.bold}>Dana Tersimpan</Text>
              </View>
              {Object.entries(fundBalances).filter(([, val]) => val > 0).map(([key, val]) => (
                <View key={key} style={[styles.infoRow, { paddingLeft: 12 }]}>
                  <Text style={{ color: colors.gray600 }}>- {FUND_TYPES[key] || key}</Text>
                  <Text style={{ color: colors.gray600 }}>Rp {formatNumber(val)}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* TANDA TANGAN */}
        <View style={styles.footer}>
          <View style={styles.signatureBlock}>
            <Text style={{ color: colors.gray600 }}>Gembala Sidang,</Text>
            <Text style={styles.signatureName}>{churchInfo.pastor_name || "________________"}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={{ color: colors.gray600 }}>Bendahara,</Text>
            <Text style={styles.signatureName}>{churchInfo.treasurer_name || "________________"}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
