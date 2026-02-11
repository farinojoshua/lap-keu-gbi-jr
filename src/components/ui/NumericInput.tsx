"use client";

interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: string;
  onChange: (value: string) => void;
}

function formatDots(v: string): string {
  if (!v) return "";
  return Number(v).toLocaleString("id-ID");
}

export default function NumericInput({ value, onChange, ...props }: NumericInputProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value ? formatDots(value) : ""}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      {...props}
    />
  );
}
