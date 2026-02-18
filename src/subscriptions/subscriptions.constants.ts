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

// Цены подписок (в рублях для ЮКассы)
export const SUBSCRIPTION_PRICES = {
  MONTHLY: 500, // 500 рублей
  YEARLY: 5000, // 5000 рублей
  TRIAL: 0, // Бесплатно
} as const;

// Длительность подписок (в днях)
export const SUBSCRIPTION_DURATION = {
  MONTHLY: 30,
  YEARLY: 365,
  TRIAL: 7,
} as const;

// Минимальная активная длительность handshake для VLESS (в минутах)
export const ACTIVE_CONNECTION_TIMEOUT_MINUTES = 3;

// Максимальное количество подключений на сервер
export const MAX_CONNECTIONS_PER_SERVER = 100;

// Порт по умолчанию для 3X-UI Management API
export const XRAY_DEFAULT_PORT = 2053;

// Таймауты для API запросов (в миллисекундах)
export const API_TIMEOUT = {
  SHORT: 5000, // 5 секунд
  MEDIUM: 10000, // 10 секунд
  LONG: 30000, // 30 секунд
} as const;
