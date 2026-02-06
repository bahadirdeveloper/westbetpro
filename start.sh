#!/bin/bash

# ==========================================
# WestBetPro - Sistem Başlatma Script'i
# ==========================================

echo "=========================================="
echo "🚀 WestBetPro Başlatılıyor..."
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Eski process'leri temizle
echo -e "${YELLOW}🧹 Eski process'ler temizleniyor...${NC}"
pkill -9 -f "uvicorn.*api.main" 2>/dev/null || true
pkill -9 -f "next.*dev" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ Temizlik tamamlandı${NC}"
echo ""

# Logs klasörünü oluştur
mkdir -p .logs

# Environment kontrol
echo -e "${BLUE}📋 Environment kontrol ediliyor...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env dosyası bulunamadı!${NC}"
    exit 1
fi

if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local dosyası bulunamadı!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Environment dosyaları tamam${NC}"
echo ""

# Backend başlat
echo -e "${BLUE}🔧 Backend başlatılıyor (Port 8000)...${NC}"
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload > .logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "  ├─ Backend başlatıldı (PID: $BACKEND_PID)"

# Backend'in hazır olmasını bekle
echo "  ├─ Servisin hazır olması bekleniyor..."
sleep 6

# Health check
if curl -s --max-time 3 http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e "  └─ ${GREEN}✓ Backend hazır!${NC}"
else
    echo -e "  └─ ${YELLOW}⚠️  Backend yavaş başlıyor, devam ediyoruz...${NC}"
fi
echo ""

# Frontend başlat
echo -e "${BLUE}⚛️  Frontend başlatılıyor (Port 3000)...${NC}"
npm run dev > .logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  ├─ Frontend başlatıldı (PID: $FRONTEND_PID)"
echo "  ├─ Servisin hazır olması bekleniyor..."
sleep 8
echo -e "  └─ ${GREEN}✓ Frontend hazır!${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}✅ Sistem başarıyla başlatıldı!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}📍 Erişim Adresleri:${NC}"
echo -e "  ├─ 🌐 Ana Sayfa:    ${GREEN}http://localhost:3000${NC}"
echo -e "  ├─ 🔐 Admin Giriş:  ${GREEN}http://localhost:3000/admin/login${NC}"
echo -e "  ├─ 📊 Admin Panel:  ${GREEN}http://localhost:3000/admin/dashboard${NC}"
echo -e "  └─ 🔧 Backend API:  ${GREEN}http://localhost:8000${NC}"
echo ""
echo -e "${BLUE}📝 Log Dosyaları:${NC}"
echo "  ├─ Backend:  tail -f .logs/backend.log"
echo "  └─ Frontend: tail -f .logs/frontend.log"
echo ""
echo -e "${BLUE}🛑 Durdurmak için:${NC}"
echo "  └─ CTRL+C veya: ./stop.sh"
echo ""
echo -e "${YELLOW}💡 Tarayıcınız otomatik açılmadıysa:${NC}"
echo -e "   ${GREEN}http://localhost:3000/admin/login${NC}"
echo ""
echo -e "${BLUE}📊 Process'ler aktif, loglar izleniyor...${NC}"
echo "=========================================="
echo ""

# Canlı log takibi
tail -f .logs/backend.log .logs/frontend.log
