import { useSystemCalendar } from '../context/SystemCalendarContext';

const LAKH_DIVISOR = 100000;

export const formatCurrency = (amount: number, mode: 'full' | 'lakh' = 'full'): string => {
  if (mode === 'lakh') {
    const lakhs = amount / LAKH_DIVISOR;
    return `${lakhs.toFixed(1)} L`;
  }
  return `${amount.toLocaleString()} MMK`;
};

export const formatCurrencyCompact = (amount: number): string => {
  if (amount >= LAKH_DIVISOR) {
    const lakhs = amount / LAKH_DIVISOR;
    return `${lakhs.toFixed(1)} L`;
  }
  return amount.toLocaleString();
};

export const formatDate = (
  dateInput?: string | Date | number,
  format: 'short' | 'long' | 'iso' | 'time' = 'short'
): string => {
  if (!dateInput) {
    return new Date().toISOString().split('T')[0];
  }

  let dateObj: Date;
  if (typeof dateInput === 'string') {
    dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) {
      return dateInput;
    }
  } else if (typeof dateInput === 'number') {
    dateObj = new Date(dateInput);
  } else {
    dateObj = dateInput;
  }

  if (format === 'iso') {
    return dateObj.toISOString().split('T')[0];
  }

  if (format === 'time') {
    return dateObj.toLocaleTimeString('en-GB');
  }

  const formatOptions: Intl.DateTimeFormatOptions = format === 'long'
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' };

  return dateObj.toLocaleDateString('en-GB', formatOptions);
};

export const formatPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) {
    return `09-${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith('9')) {
    return `09-${digits.slice(1)}`;
  }
  if (digits.length === 11 && digits.startsWith('09')) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return phone;
};

export const formatName = (name: string): string => {
  return name.replace(/\b\w/g, l => l.toUpperCase());
};

export const formatHours = (hours: number): string => {
  return hours.toFixed(2);
};

export const formatPercent = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};
