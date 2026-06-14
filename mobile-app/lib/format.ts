export const currency = (value: number | string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));

export const monthLabel = (date = new Date()) =>
  date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

export const dayKey = (date: string) => new Date(date).toISOString().slice(0, 10);

