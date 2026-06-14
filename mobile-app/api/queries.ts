import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import type {
  Account, AuthResponse, BudgetStatus, CalendarDay, Category, CategoryAnalytics,
  Summary, Transaction, User, Debt, DebtRepayment,
} from '@/types';

const now = () => ({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

export const useLogin = () =>
  useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api.post<AuthResponse>('/auth/login', body).then((response) => response.data),
  });
export const useRegister = () =>
  useMutation({
    mutationFn: (body: { fullName: string; email: string; password: string }) =>
      api.post<AuthResponse>('/auth/register', body).then((response) => response.data),
  });
export const useSummary = () =>
  useQuery({ queryKey: ['summary', now()], queryFn: () => api.get<Summary>('/dashboard/summary', { params: now() }).then((r) => r.data) });
export const useAccounts = () =>
  useQuery({ queryKey: ['accounts'], queryFn: () => api.get<Account[]>('/accounts').then((r) => r.data) });
export const useCategories = (type?: 'expense' | 'income') =>
  useQuery({ queryKey: ['categories', type], queryFn: () => api.get<Category[]>('/categories', { params: { type } }).then((r) => r.data) });
export const useTransactions = () =>
  useQuery({
    queryKey: ['transactions', now()],
    queryFn: () => api.get<{ items: Transaction[]; total: number }>('/transactions', { params: { ...now(), limit: 100 } }).then((r) => r.data),
  });
export const useBudget = () =>
  useQuery({ queryKey: ['budget', now()], queryFn: () => api.get<BudgetStatus>('/budgets/status', { params: now() }).then((r) => r.data) });
export const useCategoryAnalytics = () =>
  useQuery({ queryKey: ['category-analytics', now()], queryFn: () => api.get<CategoryAnalytics[]>('/analytics/categories', { params: now() }).then((r) => r.data) });
export const useMonthlyAnalytics = () =>
  useQuery({ queryKey: ['monthly', now().year], queryFn: () => api.get<(Summary & { month: number })[]>('/analytics/monthly', { params: { year: now().year } }).then((r) => r.data) });
export const useCalendar = () =>
  useQuery({ queryKey: ['calendar', now()], queryFn: () => api.get<CalendarDay[]>('/analytics/calendar', { params: now() }).then((r) => r.data) });
export const useProfile = () =>
  useQuery({ queryKey: ['profile'], queryFn: () => api.get<User>('/profile').then((r) => r.data) });

export const useCreateTransaction = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/transactions', body).then((r) => r.data),
    onSuccess: () => client.invalidateQueries(),
  });
};

export const useUpdateTransaction = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown> & { id: string }) =>
      api.patch(`/transactions/${id}`, body).then((r) => r.data),
    onSuccess: () => client.invalidateQueries(),
  });
};

export const useDeleteTransaction = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => client.invalidateQueries(),
  });
};

export const useCreateAccount = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; balance: number; icon: string }) => api.post('/accounts', body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['accounts'] }),
  });
};

export const useSetBudget = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => api.put('/budgets', { ...now(), amount }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['budget'] }),
  });
};

export const useUpdateProfile = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (fullName: string) => api.patch('/profile', { fullName }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['profile'] }),
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api.post('/profile/change-password', body),
  });

export const useDebts = () =>
  useQuery({
    queryKey: ['debts'],
    queryFn: () => api.get<Debt[]>('/debts').then((r) => r.data),
  });

export const useCreateDebt = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      personName: string;
      type: 'lend' | 'borrow';
      amount: number;
      note?: string;
      accountId: string;
      transactionDate: string;
      phoneNumber?: string;
      reminderInterval?: 'none' | 'daily' | 'weekly' | 'monthly';
      customMessage?: string;
    }) => api.post('/debts', body).then((r) => r.data),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['debts'] });
      void client.invalidateQueries({ queryKey: ['accounts'] });
      void client.invalidateQueries({ queryKey: ['summary'] });
    },
  });
};

export const useMarkReminderSent = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/debts/${id}/reminder-sent`).then((r) => r.data),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['debts'] });
    },
  });
};

export const useRepayDebt = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ debtId, ...body }: { debtId: string; amount: number; note?: string; accountId: string; transactionDate: string }) =>
      api.post(`/debts/${debtId}/repay`, body).then((r) => r.data),
    onSuccess: (_, variables) => {
      void client.invalidateQueries({ queryKey: ['debts'] });
      void client.invalidateQueries({ queryKey: ['accounts'] });
      void client.invalidateQueries({ queryKey: ['summary'] });
      void client.invalidateQueries({ queryKey: ['repayments', variables.debtId] });
    },
  });
};

export const useDeleteDebt = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/debts/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['debts'] });
      void client.invalidateQueries({ queryKey: ['accounts'] });
      void client.invalidateQueries({ queryKey: ['summary'] });
    },
  });
};

export const useRepayments = (debtId: string) =>
  useQuery({
    queryKey: ['repayments', debtId],
    queryFn: () => api.get<DebtRepayment[]>(`/debts/${debtId}/repayments`).then((r) => r.data),
    enabled: Boolean(debtId),
  });

export const useCreateCategory = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; icon: string; color: string; type: 'expense' | 'income' }) =>
      api.post<Category>('/categories', body).then((r) => r.data),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useDeleteCategory = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

