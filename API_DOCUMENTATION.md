# VPN Service API Documentation

## Overview

This is a comprehensive VPN service backend built with NestJS, providing APIs for user management, subscription handling, VPN server management, and payment processing.

## Base URL

```
http://localhost:3000
```

For production, replace with your actual API URL.

## Authentication

The API uses JWT (JSON Web Token) for authentication. Most endpoints require authentication via Bearer token in the Authorization header.

### Authentication Flow

1. **Register** or **Login** to get access and refresh tokens
2. Include the access token in the `Authorization` header: `Bearer <access_token>`
3. When the access token expires (15 minutes), use the refresh token to get a new pair

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}

Response:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER",
    "status": "ACTIVE",
    "trial_used": false,
    "created_at": "2024-02-15T10:00:00.000Z"
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}

Response: Same as register
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}

Response: New access_token and refresh_token
```

#### Get Current User Profile
```http
GET /auth/me
Authorization: Bearer <access_token>

Response: User object
```

---

### Client API Endpoints (For VPN Applications)

All client endpoints require authentication.

#### Get Available Servers
```http
GET /client/servers
Authorization: Bearer <access_token>

Response:
[
  {
    "id": 1,
    "name": "Frankfurt-01",
    "country_code": "DE",
    "city": "Frankfurt",
    "hostname": "vpn.example.com",
    "port": 51820,
    "protocol": "wireguard",
    "load": 45,
    "priority": 10
  }
]
```

#### Get Servers by Country
```http
GET /client/servers/country/:countryCode
Authorization: Bearer <access_token>

Example: GET /client/servers/country/DE

Response: Array of servers in specified country
```

#### Get Subscription Status
```http
GET /client/subscription/status
Authorization: Bearer <access_token>

Response:
{
  "has_active_subscription": true,
  "plan_name": "MONTHLY",
  "start_date": "2024-02-01T00:00:00.000Z",
  "end_date": "2024-03-01T00:00:00.000Z",
  "status": "ACTIVE",
  "auto_renew": true,
  "days_remaining": 15
}
```

#### Get VPN Configuration
```http
GET /client/config?server_id=1
Authorization: Bearer <access_token>

Response:
{
  "id": "config-uuid",
  "config_body": "[Interface]\nPrivateKey = ...\nAddress = 10.0.0.2/32\n...",
  "allocated_ip": "10.0.0.2",
  "expires_at": "2025-02-12T18:30:00.000Z",
  "server_name": "Frankfurt-01",
  "server_country": "DE",
  "server_hostname": "vpn.example.com",
  "server_port": 51820
}
```

#### Get All User Configs
```http
GET /client/configs
Authorization: Bearer <access_token>

Response: Array of VPN configurations
```

---

### Payment Endpoints

#### Create Stripe Checkout Session
```http
POST /payments/checkout/create-session
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "plan": "monthly",
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel"
}

Response:
{
  "url": "https://checkout.stripe.com/pay/cs_test_...",
  "sessionId": "cs_test_a1b2c3..."
}
```

#### Stripe Webhook (Internal)
```http
POST /payments/webhook/stripe
Content-Type: application/json
Stripe-Signature: <signature>

[Stripe webhook payload]
```

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "timestamp": "2024-02-15T10:00:00.000Z",
  "path": "/api/endpoint",
  "method": "POST",
  "message": "Error description"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (no active subscription, expired config, etc.)
- `404` - Not Found
- `409` - Conflict (duplicate email, etc.)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limiting

The API implements rate limiting:
- **100 requests per minute** per IP address
- When limit is exceeded, you'll receive a `429 Too Many Requests` response

---

## Client Application Integration Guide

### 1. Initial Setup

1. User registers or logs in
2. Store `access_token` and `refresh_token` securely
3. Use access token for all API requests

### 2. Check Subscription Status

Before allowing VPN connection, check subscription status:

```javascript
const response = await fetch('http://localhost:3000/client/subscription/status', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const status = await response.json();

if (!status.has_active_subscription) {
  // Redirect to subscription purchase
}
```

### 3. Get Available Servers

Fetch list of servers to show user:

```javascript
const response = await fetch('http://localhost:3000/client/servers', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const servers = await response.json();
// Display servers to user
```

### 4. Get VPN Configuration

Once user selects a server, fetch the config:

```javascript
const response = await fetch(`http://localhost:3000/client/config?server_id=${serverId}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const config = await response.json();
// Use config.config_body to configure VPN connection
```

### 5. Handle Token Expiration

When you receive a `401` error:

```javascript
// Refresh the token
const response = await fetch('http://localhost:3000/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    refresh_token: refreshToken
  })
});

const { access_token, refresh_token } = await response.json();
// Store new tokens and retry the request
```

### 6. Purchase Subscription

```javascript
// Create checkout session
const response = await fetch('http://localhost:3000/payments/checkout/create-session', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    plan: 'monthly',
    success_url: 'myapp://payment/success',
    cancel_url: 'myapp://payment/cancel'
  })
});

const { url } = await response.json();
// Open Stripe checkout URL in browser
```

---

## Environment Variables

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
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

---

## Swagger Documentation

Interactive API documentation is available at:

```
http://localhost:3000/api
```

This provides:
- Complete endpoint list
- Request/response schemas
- Try-it-out functionality
- Authentication testing

---

## Security Best Practices

1. **Never store passwords in plain text** - Always use hashing
2. **Store tokens securely** - Use secure storage mechanisms in your app
3. **Validate SSL certificates** - Don't disable SSL verification
4. **Implement token refresh** - Handle expired tokens gracefully
5. **Use HTTPS in production** - Never send tokens over HTTP
6. **Rotate secrets regularly** - Update JWT secrets periodically

---

## Support

For issues or questions:
- Check Swagger docs at `/api`
- Review error messages for debugging
- Contact support team

---

## Version

Current API Version: **1.0**

Last Updated: February 2026
