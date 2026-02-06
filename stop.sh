#!/bin/bash

# ==========================================
# WestBetPro - Sistem Durdurma Script'i
# ==========================================

echo "=========================================="
echo "🛑 WestBetPro Durduruluyor..."
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Backend'i durdur
echo -e "${YELLOW}🔧 Backend durduruluyor...${NC}"
pkill -9 -f "uvicorn.*api.main" && echo -e "${GREEN}✓ Backend durduruldu${NC}" || echo -e "${YELLOW}⚠️  Backend zaten durmuş${NC}"

# Frontend'i durdur
echo -e "${YELLOW}⚛️  Frontend durduruluyor...${NC}"
pkill -9 -f "next.*dev" && echo -e "${GREEN}✓ Frontend durduruldu${NC}" || echo -e "${YELLOW}⚠️  Frontend zaten durmuş${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Sistem durduruldu!${NC}"
echo "=========================================="
