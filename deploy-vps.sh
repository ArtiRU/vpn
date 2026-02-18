#!/bin/bash

###############################################################################
# VPS Auto-Deployment Script for VPN Backend with 3X-UI (VLESS + Reality)
# 
# This script automates the complete deployment of the VPN backend
# including database, backend API, and 3X-UI panel on a fresh Ubuntu VPS
#
# Usage: 
#   chmod +x deploy-vps.sh
#   sudo ./deploy-vps.sh
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration variables
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-admin@example.com}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 64)}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(openssl rand -base64 64)}"
XRAY_PANEL_PASSWORD="${XRAY_PANEL_PASSWORD:-$(openssl rand -base64 16)}"
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}"
STRIPE_MONTHLY_PRICE_ID="${STRIPE_MONTHLY_PRICE_ID:-}"
STRIPE_YEARLY_PRICE_ID="${STRIPE_YEARLY_PRICE_ID:-}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}VPN Backend Auto-Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}" 
   exit 1
fi

# Step 1: Update system
echo -e "${YELLOW}[1/10] Updating system packages...${NC}"
apt-get update -qq
apt-get upgrade -y -qq

# Step 2: Install Docker and Docker Compose
echo -e "${YELLOW}[2/10] Installing Docker and Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi

# Step 3: Install Git
echo -e "${YELLOW}[3/10] Installing Git...${NC}"
apt-get install -y git

# Step 4: Clone repository (if not already present)
echo -e "${YELLOW}[4/10] Setting up project directory...${NC}"
PROJECT_DIR="/opt/vpn-backend"
if [ ! -d "$PROJECT_DIR" ]; then
    mkdir -p "$PROJECT_DIR"
    # If you have a git repository, uncomment and modify:
    # git clone https://github.com/your-repo/vpn-backend.git "$PROJECT_DIR"
    echo -e "${GREEN}Project directory created at $PROJECT_DIR${NC}"
    echo -e "${YELLOW}Please copy your project files to $PROJECT_DIR${NC}"
else
    echo -e "${GREEN}Project directory already exists${NC}"
fi

cd "$PROJECT_DIR"

# Step 5: Create .env file
echo -e "${YELLOW}[5/10] Creating .env configuration...${NC}"
cat > .env << EOF
# Node Environment
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=${DB_PASSWORD}
DB_DATABASE=vpn
DB_SYNCHRONIZE=true
DB_LOGGING=false

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRES_IN=7d

# Stripe Payment Configuration
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
STRIPE_MONTHLY_PRICE_ID=${STRIPE_MONTHLY_PRICE_ID}
STRIPE_YEARLY_PRICE_ID=${STRIPE_YEARLY_PRICE_ID}

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Xray Panel Configuration (3X-UI)
XRAY_PANEL_URL=http://3x-ui:2053
XRAY_PANEL_USERNAME=admin
XRAY_PANEL_PASSWORD=${XRAY_PANEL_PASSWORD}
EOF

echo -e "${GREEN}.env file created${NC}"
echo -e "${YELLOW}Database Password: ${DB_PASSWORD}${NC}"
echo -e "${YELLOW}Xray Panel Password: ${XRAY_PANEL_PASSWORD}${NC}"

# Step 6: Install 3X-UI Panel
echo -e "${YELLOW}[6/10] Installing 3X-UI Panel...${NC}"
if ! docker ps | grep -q "3x-ui"; then
    docker run -d \
        --name 3x-ui \
        --restart=unless-stopped \
        --network vpn_network \
        -p 2053:2053 \
        -p 443:443 \
        -v /opt/3x-ui:/etc/x-ui \
        ghcr.io/mhsanaei/3x-ui:latest
    
    echo -e "${GREEN}3X-UI Panel installed${NC}"
    echo -e "${YELLOW}Access at: http://YOUR_SERVER_IP:2053${NC}"
    echo -e "${YELLOW}Default credentials - Username: admin, Password: ${XRAY_PANEL_PASSWORD}${NC}"
else
    echo -e "${GREEN}3X-UI Panel already running${NC}"
fi

# Step 7: Configure firewall
echo -e "${YELLOW}[7/10] Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp     # SSH
    ufw allow 80/tcp     # HTTP
    ufw allow 443/tcp    # HTTPS / Xray
    ufw allow 2053/tcp   # 3X-UI Panel
    ufw allow 3000/tcp   # Backend API
    echo -e "${GREEN}Firewall configured${NC}"
else
    echo -e "${YELLOW}UFW not installed, skipping firewall configuration${NC}"
fi

# Step 8: Start services with Docker Compose
echo -e "${YELLOW}[8/10] Starting services with Docker Compose...${NC}"
if [ -f "docker-compose.yml" ]; then
    docker compose down 2>/dev/null || true
    docker compose up -d
    echo -e "${GREEN}Services started successfully${NC}"
else
    echo -e "${RED}docker-compose.yml not found!${NC}"
    echo -e "${YELLOW}Please ensure your project files are in $PROJECT_DIR${NC}"
fi

# Step 9: Wait for services to be ready
echo -e "${YELLOW}[9/10] Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
if docker ps | grep -q "vpn_backend"; then
    echo -e "${GREEN}Backend service is running${NC}"
else
    echo -e "${RED}Backend service failed to start${NC}"
fi

if docker ps | grep -q "vpn_postgres"; then
    echo -e "${GREEN}Database service is running${NC}"
else
    echo -e "${RED}Database service failed to start${NC}"
fi

if docker ps | grep -q "3x-ui"; then
    echo -e "${GREEN}3X-UI Panel is running${NC}"
else
    echo -e "${RED}3X-UI Panel failed to start${NC}"
fi

# Step 10: Display final information
echo -e "${YELLOW}[10/10] Deployment completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backend API:${NC} http://$(curl -s ifconfig.me):3000"
echo -e "${GREEN}API Documentation:${NC} http://$(curl -s ifconfig.me):3000/api"
echo -e "${GREEN}3X-UI Panel:${NC} http://$(curl -s ifconfig.me):2053"
echo -e ""
echo -e "${YELLOW}Credentials:${NC}"
echo -e "Database Password: ${DB_PASSWORD}"
echo -e "3X-UI Username: admin"
echo -e "3X-UI Password: ${XRAY_PANEL_PASSWORD}"
echo -e ""
echo -e "${YELLOW}Important: Save these credentials securely!${NC}"
echo -e ""
echo -e "${GREEN}Next Steps:${NC}"
echo -e "1. Configure 3X-UI Panel at http://$(curl -s ifconfig.me):2053"
echo -e "2. Create a VLESS Reality inbound in 3X-UI"
echo -e "3. Test the API at http://$(curl -s ifconfig.me):3000/api"
echo -e "4. Configure your mobile app to connect to this backend"
echo -e ""
echo -e "${YELLOW}To view logs:${NC}"
echo -e "  Backend: docker logs -f vpn_backend"
echo -e "  Database: docker logs -f vpn_postgres"
echo -e "  3X-UI: docker logs -f 3x-ui"
echo -e "${GREEN}========================================${NC}"

# Save credentials to file
cat > /root/vpn-credentials.txt << EOF
VPN Backend Deployment Credentials
===================================
Date: $(date)
Server IP: $(curl -s ifconfig.me)

Backend API: http://$(curl -s ifconfig.me):3000
API Docs: http://$(curl -s ifconfig.me):3000/api
3X-UI Panel: http://$(curl -s ifconfig.me):2053

Database Password: ${DB_PASSWORD}
JWT Secret: ${JWT_SECRET}
JWT Refresh Secret: ${JWT_REFRESH_SECRET}

3X-UI Panel:
  Username: admin
  Password: ${XRAY_PANEL_PASSWORD}

Stripe Configuration:
  Secret Key: ${STRIPE_SECRET_KEY}
  Webhook Secret: ${STRIPE_WEBHOOK_SECRET}
  Monthly Price ID: ${STRIPE_MONTHLY_PRICE_ID}
  Yearly Price ID: ${STRIPE_YEARLY_PRICE_ID}
EOF

chmod 600 /root/vpn-credentials.txt
echo -e "${GREEN}Credentials saved to /root/vpn-credentials.txt${NC}"
