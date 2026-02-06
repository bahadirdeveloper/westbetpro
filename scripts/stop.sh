#!/bin/bash

# WestBetPro Admin Panel Durdurma Script'i

echo "=========================================="
echo "🛑 WestBetPro Admin Panel Durduruluyor..."
echo "=========================================="
echo ""

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/Users/bahadirgemalmaz/Desktop/WestBetPro"
PID_DIR="$PROJECT_DIR/.pids"

# Backend'i durdur
if [ -f "$PID_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$PID_DIR/backend.pid")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "${YELLOW}🔧 Backend durduruluyor (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID
        echo "${GREEN}✓ Backend durduruldu${NC}"
    else
        echo "${YELLOW}⚠️  Backend zaten çalışmıyor${NC}"
    fi
    rm -f "$PID_DIR/backend.pid"
else
    echo "${YELLOW}⚠️  Backend PID dosyası bulunamadı${NC}"
fi

echo ""

# Frontend'i durdur
if [ -f "$PID_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PID_DIR/frontend.pid")
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "${YELLOW}⚛️  Frontend durduruluyor (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID
        echo "${GREEN}✓ Frontend durduruldu${NC}"
    else
        echo "${YELLOW}⚠️  Frontend zaten çalışmıyor${NC}"
    fi
    rm -f "$PID_DIR/frontend.pid"
else
    echo "${YELLOW}⚠️  Frontend PID dosyası bulunamadı${NC}"
fi

echo ""

# Port'ları temizle
echo "${YELLOW}🧹 Port'lar temizleniyor...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "${GREEN}✓ Port 8000 temizlendi${NC}" || echo "  Port 8000 zaten boş"
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "${GREEN}✓ Port 3000 temizlendi${NC}" || echo "  Port 3000 zaten boş"

echo ""
echo "=========================================="
echo "${GREEN}✅ Sistem başarıyla durduruldu!${NC}"
echo "=========================================="
