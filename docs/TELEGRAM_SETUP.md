# Telegram Bot Kurulum Rehberi (A-Z)

West Analyze canli alarm sisteminin Telegram bildirim entegrasyonu.

## 1. Bot Olusturma

1. Telegram'da **@BotFather** ile konusma baslat
2. `/newbot` komutunu gonder
3. Bot icin bir isim gir: `West Analyze Alert Bot`
4. Bot icin kullanici adi gir: `west_analyze_bot` (benzersiz olmali)
5. BotFather sana bir **API Token** verecek, ornek:
   ```
   7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
   ```
6. Bu token'i kaydet - TELEGRAM_BOT_TOKEN olarak kullanacaksin

## 2. Kanal/Grup Olusturma

### Secenek A: Kanal (Tek yonlu bildirimler)
1. Telegram'da yeni kanal olustur: "West Analyze Alarmlar"
2. Kanali Public yap ve bir kullanici adi ver: `@west_analyze_alerts`
3. Botu kanala admin olarak ekle (mesaj gonderme izni ver)
4. Chat ID: `@west_analyze_alerts` veya numerik ID kullan

### Secenek B: Grup (Interaktif)
1. Yeni grup olustur: "West Analyze Alarmlar"
2. Botu gruba ekle
3. Gruba bir mesaj gonder
4. Chat ID'yi al (adim 3'e bak)

## 3. Chat ID Alma

### Kanal icin:
Kanal kullanici adini dogrudan kullan: `@west_analyze_alerts`

### Grup icin:
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getUpdates"
```
Donen JSON'da `chat.id` alanini bul. Grup ID'leri negatif sayi olur, ornek: `-1001234567890`

### Kisisel mesaj icin:
1. Bota `/start` gonder
2. getUpdates API'yi cagir
3. Donen JSON'da kendi chat.id'ni bul

## 4. Environment Variables

### Lokal (.env dosyasina ekle):
```bash
TELEGRAM_BOT_TOKEN=7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
TELEGRAM_CHAT_ID=@west_analyze_alerts
```

### Vercel (Production):
1. Vercel Dashboard > Settings > Environment Variables
2. Ekle:
   - `TELEGRAM_BOT_TOKEN` = bot token'in
   - `TELEGRAM_CHAT_ID` = kanal/grup ID'si
3. "Production" ve "Preview" icin aktif et
4. Redeploy yap

## 5. Test Etme

### curl ile test:
```bash
# Dogrudan Telegram API ile test
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "<CHAT_ID>",
    "text": "<b>Test Mesaji</b>\n\nWest Analyze alarm sistemi aktif!",
    "parse_mode": "HTML"
  }'
```

### Uygulama uzerinden test:
```bash
# Lokal API endpoint ile test
curl -X POST "http://localhost:3000/api/telegram/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -d '{
    "type": "hot_alert",
    "homeTeam": "Galatasaray",
    "awayTeam": "Fenerbahce",
    "prediction": "2.5 UST",
    "goalsNeeded": 1,
    "score": "1-1",
    "elapsed": 75,
    "confidence": 92,
    "league": "Super Lig"
  }'
```

## 6. Bildirim Turleri

### Sicak Alarm (hot_alert)
Bir tahminimiz 1 gol kala durumuna geldiginde otomatik gonderilir.
```
🔥 SICAK ALARM!

⚽ Galatasaray vs Fenerbahce
🏆 Super Lig
📊 Skor: 1-1 (75')

🎯 Tahmin: 2.5 UST (%92)
⚡ 1 GOL KALA!
```

### Tahmin Tuttu (prediction_hit)
Bir tahminimiz gerceklestiginde gonderilir.
```
✅ TAHMIN TUTTU!

⚽ Galatasaray vs Fenerbahce
📊 Skor: 2-1
🎯 2.5 UST (%92)
```

### Gunluk Ozet (daily_summary)
Gun sonunda gonderilir.
```
📊 GUNLUK OZET

✅ Tuttu: 8/10
📈 Basari: %80
```

## 7. Sorun Giderme

### Bot mesaj gondermiyor:
- Token'in dogru oldugunu kontrol et
- Botun kanala/gruba admin olarak eklendigini kontrol et
- Chat ID'nin dogru oldugunu kontrol et
- Vercel'da env var'larin tanimli oldugunu kontrol et

### Rate Limiting:
- Telegram saniyede ~30 mesaj siniri koyar
- Ayni mesaji tekrar tekrar gonderme (deduplication aktif)
- `telegram_notified_at` kolonu ile takip ediliyor

### Guvenlik:
- Bot token'ini asla public yapma
- CRON_SECRET ile API endpoint'ini koru
- Telegram API'yi sadece server-side cagir (client-side'da token gozukur)

## 8. Ileri Duzey

### Webhook Kurulumu (Opsiyonel):
Telegram'dan gelen komutlari dinlemek istersen:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://westbetpro.vercel.app/api/telegram/webhook"
```

### Bot Komutlari (Gelecek):
- `/durum` - Gunluk durum raporu
- `/canli` - Canli maclarin listesi
- `/alarm` - Aktif alarmlarin listesi
