export type User = { id: string; fullName: string; email: string };
export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};
export type Account = {
  id: string;
  name: string;
  balance: string;
  icon: string;
};
export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
};
export type Transaction = {
  id: string;
  accountId?: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  type: 'expense' | 'income' | 'transfer';
  amount: string;
  title: string;
  note?: string;
  transactionDate: string;
  category?: {
    icon: string;
    color: string;
    name: string;
  };
  isDebt?: boolean;
  isRepayment?: boolean;
  remainingAmount?: string;
  status?: 'open' | 'repaid';
  personName?: string;
};
export type Summary = { income: number; expense: number; balance: number };
export type BudgetStatus = { budget: number; spent: number; remaining: number };
export type CategoryAnalytics = {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  total: string;
};
export type CalendarDay = { date: string; income: string; expense: string };

export type Debt = {
  id: string;
  userId: string;
  accountId: string;
  personName: string;
  type: 'lend' | 'borrow';
  amount: string;
  remainingAmount: string;
  note?: string;
  status: 'open' | 'repaid';
  phoneNumber?: string;
  reminderInterval?: 'none' | 'daily' | 'weekly' | 'monthly';
  customMessage?: string;
  lastReminderSentAt?: string;
  transactionDate: string;
  accountName?: string;
};

export type DebtRepayment = {
  id: string;
  userId: string;
  debtId: string;
  accountId: string;
  amount: string;
  note?: string;
  transactionDate: string;
  accountName?: string;
};


