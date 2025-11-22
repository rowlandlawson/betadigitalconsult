import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
}

const normalizeDateValue = (date?: string | Date | null): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return Number.isNaN(date.getTime()) ? null : date;

  const cleaned = date.includes('T') ? date : date.replace(' ', 'T');
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

export function formatDate(date?: string | Date | null): string {
  const parsed = normalizeDateValue(date);
  if (!parsed) {
    return 'N/A';
  }
  return parsed.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date?: string | Date | null): string {
  const parsed = normalizeDateValue(date);
  if (!parsed) {
    return 'N/A';
  }
  return parsed.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Convert logo path to full URL
 * Handles paths like /uploads/logos/... and converts them to backend URLs
 */
export function getLogoUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null;

  // If it's already a full URL, return as is
  if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
    return logoPath;
  }

  let normalizedPath = logoPath;

  // Legacy paths stored as /api/uploads/... should be normalized to /uploads/...
  if (normalizedPath.startsWith('/api/uploads')) {
    normalizedPath = normalizedPath.replace('/api', '');
  }

  // If it starts with /uploads, use the backend URL (backend serves static files at /uploads)
  if (normalizedPath.startsWith('/uploads')) {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${backendUrl}${normalizedPath}`;
  }

  // Otherwise return as is (for relative paths like /logo.png)
  return normalizedPath;
}