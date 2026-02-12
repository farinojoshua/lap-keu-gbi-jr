import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      username: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    username: string;
  }
}

// Shared types

export interface WeeklyEntry {
  date: string;
  attendance: number;
  persembahan: number;
}

export interface DashboardData {
  currentMonth: number;
  currentYear: number;
  isLocked: boolean;
  saldoPindahan: number;
  totalIncome: number;
  totalExpense: number;
  saldo: number;
  avgAttendance: number;
  totalPersembahan: number;
  weeklyData: WeeklyEntry[];
  trend: { month: number; year: number; income: number; expense: number }[];
  prevMonth: {
    month: number;
    year: number;
    income: number;
    expense: number;
  };
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  topExpenses: {
    description: string;
    category: string;
    amount: number;
    date: string;
  }[];
}

export interface ApiError {
  error: string;
}

export interface ApiSuccess {
  success: true;
  message?: string;
}

export interface IncomeEntryData {
  id: string;
  periodId: string;
  date: string;
  category: string;
  subcategory: string;
  description: string;
  amount: number;
  attendance: number | null;
  createdAt: string;
}

export interface ExpenseEntryData {
  id: string;
  periodId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  isFixed: boolean;
  createdAt: string;
}

export interface PeriodData {
  id: string;
  month: number;
  year: number;
  saldoPindahan: number;
  saldoRekening: number;
  saldoCash: number;
  isLocked: boolean;
  createdAt: string;
}

export interface ReportData {
  period: {
    id: string;
    month: number;
    year: number;
    saldoPindahan: number;
    saldoRekening: number;
    saldoCash: number;
    isLocked: boolean;
  };
  incomeByCategory: Record<string, { entries: IncomeEntryData[]; subtotal: number }>;
  expenseByCategory: Record<string, { entries: ExpenseEntryData[]; subtotal: number }>;
  totalIncome: number;
  totalExpense: number;
  saldo: number;
  churchInfo: Record<string, string>;
  fundBalances: Record<string, number>;
}
