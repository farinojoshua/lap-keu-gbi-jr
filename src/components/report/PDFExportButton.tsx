"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import ReportPDF from "./ReportPDF";
import { getMonthName } from "@/lib/utils";

interface Props {
  data: Parameters<typeof ReportPDF>[0]["data"];
  month: number;
  year: number;
}

export default function PDFExportButton({ data, month, year }: Props) {
  return (
    <PDFDownloadLink
      document={<ReportPDF data={data} />}
      fileName={`Laporan-Keuangan-${getMonthName(month)}-${year}.pdf`}
    >
      {({ loading }) => (
        <button
          disabled={loading}
          className="bg-red-600 text-white px-4 py-1.5 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
        >
          {loading ? "Menyiapkan..." : "Export PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
}
