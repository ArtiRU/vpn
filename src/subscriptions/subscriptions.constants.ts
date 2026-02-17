/**
 * Константы для модуля подписок
 */

// Типы статусов подписки
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

// Типы планов подписки
export const SUBSCRIPTION_PLAN = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
  TRIAL: 'TRIAL',
} as const;

// Цены подписок (в центах/копейках для Stripe)
export const SUBSCRIPTION_PRICES = {
  MONTHLY: 999, // $9.99
  YEARLY: 9999, // $99.99
  TRIAL: 0, // Бесплатно
} as const;

// Длительность подписок (в днях)
export const SUBSCRIPTION_DURATION = {
  MONTHLY: 30,
  YEARLY: 365,
  TRIAL: 7,
} as const;

// Минимальная активная длительность handshake для WireGuard/VLESS (в минутах)
export const ACTIVE_CONNECTION_TIMEOUT_MINUTES = 3;

// Максимальное количество подключений на сервер
export const MAX_CONNECTIONS_PER_SERVER = 100;

// Порт по умолчанию для WireGuard Management API
export const WIREGUARD_DEFAULT_PORT = 8080;

// Таймауты для API запросов (в миллисекундах)
export const API_TIMEOUT = {
  SHORT: 5000, // 5 секунд
  MEDIUM: 10000, // 10 секунд
  LONG: 30000, // 30 секунд
} as const;
