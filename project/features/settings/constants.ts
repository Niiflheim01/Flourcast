/**
 * Settings Types and Constants
 * Configuration options for the app
 */

export interface CurrencyOption {
  code: string;
  name: string;
}

export interface TimezoneOption {
  value: string;
  label: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'PHP', name: 'Philippine Peso (₱)' },
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'CAD', name: 'Canadian Dollar (C$)' },
  { code: 'SGD', name: 'Singapore Dollar (S$)' },
];

export const TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Manila', label: 'Philippines (GMT+8)' },
  { value: 'America/New_York', label: 'Eastern Time (GMT-5)' },
  { value: 'America/Chicago', label: 'Central Time (GMT-6)' },
  { value: 'America/Denver', label: 'Mountain Time (GMT-7)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (GMT-8)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+10)' },
];

export const DEFAULT_CURRENCY = 'PHP';
export const DEFAULT_TIMEZONE = 'Asia/Manila';
