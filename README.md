# VPN Service Backend

A comprehensive NestJS-based backend for VPN service management with user authentication, subscription handling, payment processing, and VPN server management.

## Features

- 🔐 **JWT Authentication** - Secure user authentication with access and refresh tokens
- 👥 **User Management** - User registration, login, profile management
- 💳 **Payment Integration** - Stripe integration for subscription payments
- 📱 **Client API** - Dedicated endpoints for VPN client applications
- 🌐 **Server Management** - VPN server management with load balancing
- 📊 **Subscription System** - Monthly/yearly subscription plans
- 🔒 **Security** - Rate limiting, input validation, error handling
- 📝 **API Documentation** - Swagger/OpenAPI documentation
- 🗄️ **Database** - PostgreSQL with TypeORM

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL + TypeORM
- **Authentication**: Passport JWT
- **Payments**: Stripe
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Security**: Throttler (rate limiting)

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vpn
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
# Server
PORT=3000
CORS_ORIGIN=*

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=vpn
DB_SYNCHRONIZE=true
DB_LOGGING=false

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
STRIPE_MONTHLY_PRICE_ID=price_monthly
STRIPE_YEARLY_PRICE_ID=price_yearly

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

5. Set up PostgreSQL database:
```bash
createdb vpn
```

## Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

### Testing
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## API Documentation

Once the application is running, access:

- **Swagger UI**: http://localhost:3000/api
- **Full API Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## Project Structure

```
src/
├── auth/                 # Authentication module (JWT, strategies, guards)
├── users/                # User management
├── subscriptions/        # Subscription management
├── servers/              # VPN server management
├── configs/              # VPN configuration management
├── sessions/             # Active VPN sessions tracking
├── payments/             # Payment processing (Stripe)
├── client/               # Client API endpoints
├── server-metrics/       # Server metrics and monitoring
├── common/               # Shared utilities
│   ├── decorators/       # Custom decorators
│   ├── dto/              # Common DTOs
│   ├── filters/          # Exception filters
│   ├── guards/           # Custom guards
│   ├── interceptors/     # Interceptors (logging, transform)
│   ├── pipes/            # Custom pipes
│   └── validators/       # Custom validators
└── config/               # Application configuration
```

## Key Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user profile

### Client API (For VPN Apps)
- `GET /client/servers` - Get available VPN servers
- `GET /client/servers/country/:code` - Get servers by country
- `GET /client/subscription/status` - Check subscription status
- `GET /client/config?server_id=1` - Get VPN configuration
- `GET /client/configs` - Get all user configurations

### Payments
- `POST /payments/checkout/create-session` - Create Stripe checkout
- `POST /payments/webhook/stripe` - Stripe webhook handler

## Database Schema

The application uses the following main entities:

- **Users** - User accounts
- **Subscriptions** - User subscription records
- **Servers** - VPN servers
- **Configs** - VPN configurations per user/server
- **Sessions** - Active VPN sessions
- **Payments** - Payment transactions
- **ServerMetrics** - Server performance metrics

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt for password security
- **Rate Limiting** - 100 requests/minute per IP
- **Input Validation** - Comprehensive validation on all inputs
- **CORS** - Configurable CORS policy
- **Error Handling** - Global exception filter
- **Logging** - Request/response logging

## Development

### Code Style
```bash
npm run format
npm run lint
```

### Building
```bash
npm run build
```

## Deployment

### Using Docker (Recommended)

1. Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

2. Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=vpn
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=your_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

3. Run:
```bash
docker-compose up -d
```

### Environment-Specific Configurations

- Development: Use `.env` file
- Production: Set environment variables securely
- Never commit `.env` file to version control

## Monitoring

The application includes:
- HTTP request logging
- Error logging with stack traces
- Performance metrics (response times)

## Roadmap

- [ ] WebSocket support for real-time connection status
- [ ] Two-factor authentication (2FA)
- [ ] Admin dashboard
- [ ] Usage analytics
- [ ] Multi-protocol support (OpenVPN, IKEv2)
- [ ] Automated server provisioning
- [ ] Traffic monitoring and limits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

UNLICENSED

## Support

For support and questions, please contact the development team.

---

**Built with ❤️ using NestJS**
