export default () => ({
  port: process.env.PORT || 3000,
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'vpn',
    synchronize: process.env.DB_SYNCHRONIZE === 'true' || true,
    logging: process.env.DB_LOGGING === 'true' || true,
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'your-super-secret-refresh-key-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  yookassa: {
    shopId: process.env.YOOKASSA_SHOP_ID || '',
    secretKey: process.env.YOOKASSA_SECRET_KEY || '',
    monthlyPrice: process.env.YOOKASSA_MONTHLY_PRICE || '500',
    yearlyPrice: process.env.YOOKASSA_YEARLY_PRICE || '5000',
    currency: process.env.YOOKASSA_CURRENCY || 'RUB',
  },
  xray: {
    panelUrl: process.env.XRAY_PANEL_URL || '',
    username: process.env.XRAY_PANEL_USERNAME || '',
    password: process.env.XRAY_PANEL_PASSWORD || '',
  },
});
