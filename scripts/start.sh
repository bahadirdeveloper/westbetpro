#!/bin/bash

# WestBetPro Admin Panel Starter Script
# Backend ve Frontend'i aynı anda başlatır

echo "=========================================="
echo "🚀 WestBetPro Admin Panel Başlatılıyor..."
echo "=========================================="
echo ""

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Proje dizini
PROJECT_DIR="/Users/bahadirgemalmaz/Desktop/WestBetPro"

# PID dosyaları için dizin
PID_DIR="$PROJECT_DIR/.pids"
mkdir -p "$PID_DIR"

# Log dosyaları için dizin
LOG_DIR="$PROJECT_DIR/.logs"
mkdir -p "$LOG_DIR"

# Eski process'leri temizle
cleanup() {
    echo ""
    echo "${YELLOW}🧹 Eski process'ler temizleniyor...${NC}"

    # Backend PID
    if [ -f "$PID_DIR/backend.pid" ]; then
        BACKEND_PID=$(cat "$PID_DIR/backend.pid")
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo "  ├─ Backend process (PID: $BACKEND_PID) durduruluyor..."
            kill $BACKEND_PID 2>/dev/null
        fi
        rm -f "$PID_DIR/backend.pid"
    fi

    # Frontend PID
    if [ -f "$PID_DIR/frontend.pid" ]; then
        FRONTEND_PID=$(cat "$PID_DIR/frontend.pid")
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo "  ├─ Frontend process (PID: $FRONTEND_PID) durduruluyor..."
            kill $FRONTEND_PID 2>/dev/null
        fi
        rm -f "$PID_DIR/frontend.pid"
    fi

    # Port'ları temizle
    echo "  ├─ Port 8000 temizleniyor..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null

    echo "  └─ Port 3000 temizleniyor..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null

    echo "${GREEN}✓ Temizlik tamamlandı${NC}"
    echo ""
}

# Script sonlandığında cleanup yap
trap cleanup EXIT

# Önce temizlik yap
cleanup

# Environment kontrol
echo "${BLUE}📋 Environment kontrol ediliyor...${NC}"
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "${RED}❌ .env dosyası bulunamadı!${NC}"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/.env.local" ]; then
    echo "${RED}❌ .env.local dosyası bulunamadı!${NC}"
    exit 1
fi

echo "${GREEN}✓ Environment dosyaları tamam${NC}"
echo ""

# Python kontrol
echo "${BLUE}🐍 Python bağımlılıkları kontrol ediliyor...${NC}"
cd "$PROJECT_DIR"

if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "${YELLOW}⚠️  FastAPI yüklü değil, yükleniyor...${NC}"
    pip3 install --break-system-packages fastapi uvicorn python-dotenv supabase python-multipart 2>&1 | tee "$LOG_DIR/pip_install.log"
else
    # FastAPI yüklü ama python-multipart kontrolü
    if ! python3 -c "import multipart" 2>/dev/null; then
        echo "${YELLOW}⚠️  python-multipart yüklü değil, yükleniyor...${NC}"
        pip3 install --break-system-packages python-multipart 2>&1 | tee -a "$LOG_DIR/pip_install.log"
    fi
fi

echo "${GREEN}✓ Python bağımlılıkları tamam${NC}"
echo ""

# Node modules kontrol
echo "${BLUE}📦 Node.js bağımlılıkları kontrol ediliyor...${NC}"

if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    echo "${YELLOW}⚠️  node_modules bulunamadı, yükleniyor...${NC}"
    npm install 2>&1 | tee "$LOG_DIR/npm_install.log"
fi

echo "${GREEN}✓ Node.js bağımlılıkları tamam${NC}"
echo ""

# Backend'i başlat
echo "${BLUE}🔧 Backend başlatılıyor (Port 8000)...${NC}"
cd "$PROJECT_DIR/admin-panel/backend"

# Backend'i arka planda başlat
nohup python3 main.py > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PID_DIR/backend.pid"

# Backend'in başlamasını bekle
echo "  ├─ Backend başlatıldı (PID: $BACKEND_PID)"
echo "  ├─ Servisin hazır olması bekleniyor..."

for i in {1..30}; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "  └─ ${GREEN}✓ Backend hazır!${NC}"
        break
    fi

    if [ $i -eq 30 ]; then
        echo "  └─ ${RED}❌ Backend başlatılamadı!${NC}"
        echo ""
        echo "Backend log:"
        tail -20 "$LOG_DIR/backend.log"
        exit 1
    fi

    sleep 1
done

echo ""

# Frontend'i başlat
echo "${BLUE}⚛️  Frontend başlatılıyor (Port 3000)...${NC}"
cd "$PROJECT_DIR"

# Frontend'i arka planda başlat
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PID_DIR/frontend.pid"

# Frontend'in başlamasını bekle
echo "  ├─ Frontend başlatıldı (PID: $FRONTEND_PID)"
echo "  ├─ Servisin hazır olması bekleniyor..."

for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "  └─ ${GREEN}✓ Frontend hazır!${NC}"
        break
    fi

    if [ $i -eq 30 ]; then
        echo "  └─ ${RED}❌ Frontend başlatılamadı!${NC}"
        echo ""
        echo "Frontend log:"
        tail -20 "$LOG_DIR/frontend.log"
        exit 1
    fi

    sleep 1
done

echo ""
echo "=========================================="
echo "${GREEN}✅ Sistem başarıyla başlatıldı!${NC}"
echo "=========================================="
echo ""
echo "${BLUE}📍 Erişim Adresleri:${NC}"
echo "  ├─ 🌐 Frontend:  ${GREEN}http://localhost:3000${NC}"
echo "  ├─ 📊 Admin:     ${GREEN}http://localhost:3000/admin/login${NC}"
echo "  └─ 🔧 Backend:   ${GREEN}http://localhost:8000${NC}"
echo ""
echo "${BLUE}📝 Log Dosyaları:${NC}"
echo "  ├─ Backend:  tail -f $LOG_DIR/backend.log"
echo "  └─ Frontend: tail -f $LOG_DIR/frontend.log"
echo ""
echo "${BLUE}🛑 Durdurmak için:${NC}"
echo "  └─ CTRL+C veya: ./stop_admin.sh"
echo ""
echo "${YELLOW}💡 Tarayıcınız otomatik açılmadıysa:${NC}"
echo "   ${GREEN}http://localhost:3000/admin/login${NC}"
echo ""

# Tarayıcıda aç (macOS)
sleep 2
open "http://localhost:3000/admin/login" 2>/dev/null || true

# Log'ları göster
echo "${BLUE}📊 Canlı Log (CTRL+C ile çıkış):${NC}"
echo "=========================================="
echo ""

# Her iki log'u da göster
tail -f "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log"
