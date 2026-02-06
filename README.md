# ⚡ WestBetPro

AI-powered football betting opportunity analysis system.

## 🚀 Quick Start

```bash
# Install dependencies
npm install
pip3 install --break-system-packages fastapi uvicorn python-dotenv supabase python-multipart

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start system
./scripts/start.sh
```

**URLs:**
- Frontend: http://localhost:3000
- Admin API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📁 Project Structure

```
WestBetPro/
├── backend/              # Core prediction engine
│   ├── engine.py         # Opportunity detection engine
│   ├── golden_rules.py   # 50 betting rules
│   ├── api_football.py   # Live score integration
│   ├── track_results.py  # Outcome tracking
│   └── db.py            # Database client
│
├── api/                 # Admin REST API
│   ├── main.py          # FastAPI application
│   ├── middleware/      # Auth & security
│   ├── routes/          # API endpoints
│   └── services/        # Business logic
│
├── database/            # Database schema
│   ├── schema.sql       # Initial schema
│   └── migrations.sql   # Schema updates
│
├── src/                 # Next.js frontend
│   ├── app/             # App router pages
│   ├── ui/              # React components
│   └── services/        # API clients
│
└── scripts/             # Operational scripts
    ├── start.sh         # Start all services
    └── stop.sh          # Stop all services
```

---

## 🎯 Core Features

### Opportunity Engine
- **50 Golden Rules**: Pattern-based match analysis
- **Confidence Scoring**: Multi-factor prediction confidence
- **Live Tracking**: Real-time match monitoring
- **Outcome Analysis**: Historical performance tracking

### Admin Dashboard
- Match management
- Prediction monitoring
- Rule performance analytics
- System logs

### User Interface
- Real-time dashboard
- Live match analysis
- Historical data browser
- ROI calculator
- Bankroll management

---

## 🗄️ Database Setup

1. Create Supabase project at https://supabase.com

2. Run schema:
```bash
# In Supabase SQL Editor
cat database/schema.sql | pbcopy
# Paste and run in SQL Editor
```

3. Run migrations (if needed):
```bash
cat database/migrations.sql | pbcopy
# Paste and run in SQL Editor
```

---

## 🔧 Configuration

### Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Frontend
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🏃 Running the System

```bash
# Start all services
./scripts/start.sh

# Stop all services
./scripts/stop.sh
```

---

## 📊 Usage

### Run Opportunity Engine

```bash
cd backend
python3 main.py
```

### Import Match Data

```bash
cd backend
python3 import_matches.py --file path/to/excel.xlsx
```

### Track Results

```bash
cd backend
python3 track_results.py
```

---

## 🔐 Admin Access

1. Create admin user in Supabase:
   - Authentication > Users > Add User
   - Email: admin@westbetpro.com

2. Add to users table:
```sql
INSERT INTO users (email, role, is_active)
VALUES ('admin@westbetpro.com', 'admin', true);
```

3. Login at: http://localhost:3000/admin/login

---

## 🎲 Golden Rules

50 pre-defined betting patterns in `backend/golden_rules.py`:

- R001-R010: Odds combinations
- R011-R020: Team form analysis
- R021-R030: League statistics
- R031-R040: Head-to-head patterns
- R041-R050: Advanced metrics

---

## 📈 Performance

- **Engine Speed**: ~100 matches/second
- **API Response**: <100ms average
- **Frontend Load**: <2s initial

---

## 🔄 Data Flow

```
Import Matches → Run Engine → Store Predictions → Display Dashboard
                    ↓              ↓                    ↓
            Track Live Scores → Record Outcomes → Analyze Performance
```

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, FastAPI
- **Frontend**: Next.js 14, React, TailwindCSS
- **Database**: PostgreSQL (Supabase)
- **APIs**: API-Football

---

## ⚠️ Disclaimer

This system is for analysis purposes only. Gambling involves risk.
