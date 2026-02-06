# 🎯 Admin Approval System - Decision Support Platform

**Version**: 1.0.0
**Philosophy**: Human-in-the-Loop, Never Auto-Apply
**Language**: Turkish UI, English Technical Docs

---

## Core Identity

> **This is NOT an autonomous AI.**
> **This is a HUMAN-IN-THE-LOOP decision support system.**

The system is:
- ✅ A senior analyst assistant
- ✅ Transparent, cautious, explainable
- ❌ NOT a decision maker

---

## Absolute Prohibitions (NEVER)

### System MUST NOT:
1. ❌ Auto-modify existing rules
2. ❌ Auto-create new active rules
3. ❌ Auto-adjust thresholds
4. ❌ Auto-enable discovered patterns
5. ❌ Apply silent updates
6. ❌ Hide automation
7. ❌ Make backend-only decisions
8. ❌ Auto-learn that changes rules

### System MUST:
1. ✅ Propose changes as "Suggestions"
2. ✅ Provide clear reasoning (in Turkish)
3. ✅ Show risks and uncertainties
4. ✅ Require explicit Admin approval
5. ✅ Track every decision historically
6. ✅ Pass every suggestion through UI
7. ✅ Make everything visible and auditable

---

## State Machine (Lifecycle)

Every discovered item follows this strict lifecycle:

```
DISCOVERED
    ↓
PROPOSED (shown in UI)
    ↓
ADMIN_REVIEW (awaiting decision)
    ↓
APPROVED | REJECTED | SANDBOXED | EXPIRED
    ↓
(if APPROVED) → ACTIVE
(if SANDBOXED) → TEST_MODE → back to ADMIN_REVIEW
(if REJECTED) → ARCHIVED
(if EXPIRED) → ARCHIVED
```

### State Transitions Table

| From | To | Required | Logged Fields |
|------|----|----|---------------|
| DISCOVERED | PROPOSED | System | timestamp, discovery_reason, confidence |
| PROPOSED | ADMIN_REVIEW | System | timestamp, assigned_to_admin |
| ADMIN_REVIEW | APPROVED | Admin | timestamp, admin_email, approval_reason, risk_acknowledged |
| ADMIN_REVIEW | REJECTED | Admin | timestamp, admin_email, rejection_reason |
| ADMIN_REVIEW | SANDBOXED | Admin | timestamp, admin_email, test_duration, test_criteria |
| ADMIN_REVIEW | EXPIRED | System | timestamp, expiry_reason |
| APPROVED | ACTIVE | System | timestamp, activation_confirmation |
| SANDBOXED | ADMIN_REVIEW | System | timestamp, test_results, recommendation |

### State Logging

Each transition logs:
```json
{
  "transition_id": "TRN-20260206-001",
  "suggestion_id": "SUG-20260206-001",
  "from_state": "admin_review",
  "to_state": "approved",
  "timestamp": "2026-02-06T14:30:22Z",
  "admin_email": "admin@westbetpro.com",
  "decision_reason": "184 maçlık veri yeterli, risk düşük",
  "risk_level_acknowledged": "medium",
  "data_snapshot": {
    "sample_size": 184,
    "hit_rate": 71.0,
    "baseline_hit_rate": 68.0
  }
}
```

---

## Admin Panel UI Design

### Screen: `/admin/onay-bekleyenler` (Pending Approvals)

#### A. TOP SUMMARY BAR (Hızlı Bağlam)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔔 Öneri #42                                      🟡 ORTA RİSK  │
├─────────────────────────────────────────────────────────────────┤
│ Maç: Real Madrid - Barcelona                                    │
│ Lig: LaLiga                                                     │
│ Tarih: 07.02.2026 • Saat: 20:00                               │
│ Öneri Türü: 🎯 Yeni Kural Önerisi                             │
│ Güven: ████████░░ 82% (Orta-Yüksek)                            │
│ Kaynak: 📊 İstatistiksel Analiz • Pattern Discovery           │
│                                                                 │
│ "Son 184 maçta benzer örüntü %71 başarı gösterdi."           │
└─────────────────────────────────────────────────────────────────┘
```

**UI Elements**:
- **Maç**: Match name (if specific) or "Genel Kural" (general rule)
- **Lig**: League or "Tüm Ligler"
- **Tarih & Saat**: When suggestion was created
- **Öneri Türü**:
  - 🎯 Yeni Kural Önerisi
  - ⚙️ Eşik Değişikliği Önerisi
  - 📈 Örüntü Aktivasyonu
- **Güven**: Colored progress bar
  - 🟢 80-100% (Yeşil)
  - 🟡 60-79% (Sarı)
  - 🔴 <60% (Kırmızı)
- **Kaynak**:
  - 📊 İstatistiksel Analiz
  - 🔍 Rule Discovery
  - 📉 Pattern Drift
  - 🧪 Sandbox Test Sonucu

#### B. AÇIKLAMA KATMANI (Explainability Layer)

##### 1. İnsan Tarafından Okunabilir Açıklama

```
┌─────────────────────────────────────────────────────────────────┐
│ 💬 NEDİR?                                                       │
├─────────────────────────────────────────────────────────────────┤
│ Deplasman takımının oranı 2.5 üzerinde olduğunda MS 2.5 ÜST    │
│ tahmini genellikle tutuyor. Son 6 ayda 184 maç üzerinde test   │
│ edildi ve %71 başarı oranı elde edildi. Mevcut sistem bu tip   │
│ maçlarda %68 başarı gösteriyor. Öneri: Bu örüntüyü aktif kural │
│ olarak eklemek.                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**UI Guidelines**:
- ✅ Basit, teknik olmayan dil
- ✅ Maksimum 1 paragraf
- ✅ Türkçe, günlük dil
- ❌ Teknik jargon yok

##### 2. Teknik Özet

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚙️ TEKNİK DETAYLAR                                              │
├─────────────────────────────────────────────────────────────────┤
│ Etkilenen Kurallar:                                             │
│   • Kural #12: MS 2.5 ÜST - Yüksek Oran (çakışma var)        │
│   • Kural #28: Genel MS Öngörüsü (uyumlu)                     │
│                                                                 │
│ Destekleyici Sinyaller:                                         │
│   ✅ Deplasman oranı 2.5+ (184 maç)                           │
│   ✅ Ev sahibi ortalama gol 1.8+ (152 maç)                    │
│   ✅ Lig güvenilirliği yüksek (LaLiga, Premier League)        │
│                                                                 │
│ Çelişen Sinyaller:                                             │
│   ⚠️  Düşük lig maçlarında performans düşük (%58, 32 maç)    │
│   ⚠️  Odds manipulation riski orta seviye                      │
└─────────────────────────────────────────────────────────────────┘
```

##### 3. Veri Referansları

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 VERİ KAYNAKLARI                                              │
├─────────────────────────────────────────────────────────────────┤
│ Örnek Maçlar (Son 5 Başarılı):                                 │
│  1. Real Madrid - Barcelona (03.02.2026) ✅ MS 2.5 ÜST TUTTU  │
│  2. Man City - Liverpool (01.02.2026) ✅ MS 2.5 ÜST TUTTU     │
│  3. Bayern - Dortmund (28.01.2026) ✅ MS 2.5 ÜST TUTTU        │
│  4. PSG - Lyon (25.01.2026) ✅ MS 2.5 ÜST TUTTU               │
│  5. Juventus - Milan (22.01.2026) ✅ MS 2.5 ÜST TUTTU         │
│                                                                 │
│ Toplam Veri:                                                    │
│  • 184 maç analiz edildi                                       │
│  • Tarih aralığı: 01.08.2025 - 06.02.2026                     │
│  • Ligler: LaLiga (45), Premier League (52), Bundesliga (38)  │
│  • Başarılı: 131 maç (%71.2)                                  │
│  • Başarısız: 53 maç (%28.8)                                  │
│                                                                 │
│ [Detaylı Veriyi Görüntüle →]                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### C. KARŞILAŞTIRMA PANEL (Önce vs Sonra)

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 PERFORMANS SİMÜLASYONU                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MEVCUT SİSTEM              │  ÖNERİ UYGULANIRSA             │
│  ─────────────────────────────────────────────────────────────  │
│  Hit Rate: 68.2%            │  Hit Rate: 71.2% (+3.0%)       │
│  ROI: +2.4%                 │  ROI: +4.1% (+1.7%)            │
│  Örnek Büyüklüğü: 184      │  Örnek Büyüklüğü: 184          │
│  Risk Seviyesi: Düşük       │  Risk Seviyesi: Orta           │
│  Güven Aralığı: 64%-72%     │  Güven Aralığı: 67%-75%        │
│                                                                 │
│  FARK (Delta):                                                  │
│  ✅ +3.0% daha yüksek başarı oranı                            │
│  ✅ +1.7% daha yüksek ROI                                      │
│  ⚠️  Risk orta seviyeye yükseliyor                            │
│                                                                 │
│  UYARI: Geçmiş ROI pozitif (+4.1%) ancak risk arttı.         │
└─────────────────────────────────────────────────────────────────┘
```

**Metric Definitions**:
- **Hit Rate**: Doğru tahmin yüzdesi
- **ROI**: Yatırım getirisi (pozitif = kar, negatif = zarar)
- **Örnek Büyüklüğü**: Test edilen maç sayısı
- **Risk Seviyesi**: Düşük / Orta / Yüksek
- **Güven Aralığı**: %95 istatistiksel güven aralığı

**ROI Display Rules**:
- ✅ If ROI > 0: Show in green with "Pozitif ROI - Karlı"
- ⚠️  If ROI = 0 to -5%: Show in yellow with "Sınırda - Dikkatli Ol"
- 🔴 If ROI < -5%: Show in red with "NEGATİF ROI - ZARARDA" (large, bold)

#### D. RİSK & UYARI PANEL (Risk & Warning)

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️  RİSK DEĞERLENDİRMESİ                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🟡 ORTA SEVİYE RİSK                                           │
│                                                                 │
│  Tespit Edilen Riskler:                                         │
│                                                                 │
│  🟡 Örnek Büyüklüğü Orta (184 maç)                            │
│     → 200+ maç ideal olurdu                                    │
│     → Beklenirse daha güvenilir sonuç alınır                  │
│                                                                 │
│  🟡 Lig Volatilitesi Orta                                      │
│     → Düşük seviye liglerde (%58 başarı)                      │
│     → Sadece üst seviye liglerde kullanılmalı                 │
│                                                                 │
│  🟢 Odds Manipülasyonu Riski Düşük                            │
│     → Büyük bahis şirketleri verisi kullanıldı                │
│                                                                 │
│  🟢 Veri Eksikliği/Gecikmesi Yok                              │
│     → Tüm maçlar için tam veri mevcut                         │
│                                                                 │
│  🟡 Overfitting Olasılığı Orta                                │
│     → P-value: 0.0234 (anlamlı ama sınırda)                   │
│     → Daha uzun dönem testi önerilir                          │
│                                                                 │
│  ⚠️  GENEL DEĞERLENDİRME:                                      │
│  Öneri uygulanabilir ancak dikkatli izleme gerekir.           │
│  İlk 2 hafta günlük kontrol önerilir.                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Risk Levels**:
- 🟢 **Düşük Risk**: Sample >200, No conflicts, High confidence
- 🟡 **Orta Risk**: Sample 100-200, Minor conflicts, Medium confidence
- 🔴 **Yüksek Risk**: Sample <100, Major conflicts, Low confidence

**Warning Banner** (if no green-level confidence):
```
╔═════════════════════════════════════════════════════════════════╗
║ ⚠️  DİKKAT: Bu öneri için yeşil seviye güven mevcut değil!    ║
║                                                                 ║
║ Sandbox testinde daha fazla veri biriktirmeniz önerilir.      ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## Admin Actions (Explicit Only)

### Action Buttons

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [✅ ONAYLA]  [⏸ ERTELE]  [❌ REDDET]  [🧪 SANDBOX'TA TEST ET]│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Each action opens a modal:

#### ✅ ONAYLA (Approve)

```
┌─────────────────────────────────────────────────────────────────┐
│ Öneriyi Onayla                                            [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Bu öneriyi onaylıyorsunuz. Sistem bu kuralı CANLI olarak      │
│ kullanmaya başlayacak.                                          │
│                                                                 │
│ Onay Nedeni (zorunlu, min 10 karakter):                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Örnek büyüklüğü yeterli, risk kabul edilebilir seviyede    │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ☑ Riskleri okudum ve anladım                                  │
│ ☑ Bu kararın sorumluluğunu kabul ediyorum                     │
│                                                                 │
│ [İptal]                                   [ONAYLA VE AKTİF ET]│
└─────────────────────────────────────────────────────────────────┘
```

**Backend Action**:
1. Update status: `admin_review` → `approved`
2. Log decision with reason
3. Wait for system confirmation
4. Activate rule with `is_active = true`
5. Show success message: "Kural aktif edildi ve canlı tahminlerde kullanılmaya başlandı."

#### ⏸ ERTELE (Defer)

```
┌─────────────────────────────────────────────────────────────────┐
│ Öneriyi Ertele                                            [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Öneriyi erteliyorsunuz. Daha fazla veri birikene kadar        │
│ bekletilecek.                                                   │
│                                                                 │
│ Erteleme Süresi:                                               │
│ ○ 2 hafta (daha fazla veri biriksin)                          │
│ ● 1 ay (güvenilirlik artana kadar)                            │
│ ○ 3 ay (uzun dönem test)                                       │
│ ○ Belirsiz (manuel tekrar gözden geçirene kadar)              │
│                                                                 │
│ Erteleme Nedeni:                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Örnek büyüklüğü 200'e ulaşınca tekrar bakılacak           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [İptal]                                           [ERTELE]     │
└─────────────────────────────────────────────────────────────────┘
```

**Backend Action**:
1. Keep status as `admin_review`
2. Set `deferred_until` date
3. Log deferral with reason
4. Auto-resurface when criteria met

#### ❌ REDDET (Reject)

```
┌─────────────────────────────────────────────────────────────────┐
│ Öneriyi Reddet                                            [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Bu öneriyi reddediyorsunuz. Kural asla aktif edilmeyecek.     │
│                                                                 │
│ Red Nedeni (zorunlu):                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Risk çok yüksek, örnek büyüklüğü yetersiz                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Bu red kararı kalıcıdır ve öğrenme için kullanılacaktır.      │
│                                                                 │
│ [İptal]                                         [REDDET]       │
└─────────────────────────────────────────────────────────────────┘
```

**Backend Action**:
1. Update status: `admin_review` → `rejected`
2. Log rejection with reason
3. Archive permanently
4. Use for learning (what NOT to suggest)

#### 🧪 SANDBOX'TA TEST ET (Sandbox Test)

```
┌─────────────────────────────────────────────────────────────────┐
│ Sandbox Testine Gönder                                    [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Öneriyi sandbox ortamında test etmek istiyorsunuz.            │
│ Canlı tahminleri etkilemeden geçmiş veri üzerinde test        │
│ edilecek.                                                       │
│                                                                 │
│ Test Süresi:                                                   │
│ ○ 30 gün geçmiş veri                                          │
│ ● 60 gün geçmiş veri (önerilen)                               │
│ ○ 90 gün geçmiş veri                                          │
│                                                                 │
│ Test Kriterleri:                                               │
│ ☑ Hit rate >70% olmalı                                        │
│ ☑ ROI pozitif olmalı                                          │
│ ☑ Sample size min 100 olmalı                                  │
│                                                                 │
│ Test bitince otomatik bildirim gelecek.                       │
│                                                                 │
│ [İptal]                                 [TESTİ BAŞLAT]        │
└─────────────────────────────────────────────────────────────────┘
```

**Backend Action**:
1. Update status: `admin_review` → `sandboxed`
2. Create sandbox test entry
3. Run test on historical data
4. Generate report when complete
5. Return to `admin_review` with test results

---

## Left Menu Navigation

```
┌─────────────────────────────┐
│ ADMIN PANEL                 │
├─────────────────────────────┤
│                             │
│ 📊 Dashboard                │
│                             │
│ ──── ÖNERİLER ────          │
│ 🔍 Rule Discovery           │
│    • Yeni Öneriler (5)      │
│                             │
│ ⏳ Onay Bekleyenler (12)    │
│    • Yeni Kurallar (4)      │
│    • Eşik Değişikleri (5)   │
│    • Örüntü Aktivasyonları (3)│
│                             │
│ 🧪 Sandbox                  │
│    • Test Modunda (3)       │
│                             │
│ ──── GEÇMİŞ ────            │
│ 📜 Kural Geçmişi            │
│    • Onaylananlar (142)     │
│    • Reddedilenler (38)     │
│    • Ertelenenler (15)      │
│                             │
│ 📈 Performans               │
│    • Onay Sonrası Etki      │
│                             │
│ ──── SİSTEM ────            │
│ ⚙️  Ayarlar                 │
│ 🔐 Kullanıcılar             │
│ 📊 Loglar                   │
│                             │
└─────────────────────────────┘
```

**Context Persistence**:
- Selected filter persists across pages
- Sort order preserved
- Scroll position remembered
- Active suggestion ID stored in URL

---

## Backend Guarantees

### Database Constraints

```sql
-- Rule cannot be active without approval
ALTER TABLE golden_rules
ADD CONSTRAINT active_requires_approval
CHECK (
  (is_active = false) OR
  (is_active = true AND approval_status = 'approved')
);

-- Every suggestion must appear in UI
CREATE TABLE admin_suggestions (
  id UUID PRIMARY KEY,
  suggestion_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'discovered',
    'proposed',
    'admin_review',
    'approved',
    'rejected',
    'sandboxed',
    'expired'
  )),
  created_at TIMESTAMPTZ NOT NULL,
  shown_in_ui BOOLEAN DEFAULT false,
  ui_first_shown_at TIMESTAMPTZ,

  CONSTRAINT must_show_in_ui CHECK (
    (status = 'proposed' AND shown_in_ui = true) OR
    (status = 'discovered')
  )
);

-- All actions auditable
CREATE TABLE admin_action_audit (
  id UUID PRIMARY KEY,
  action_id TEXT UNIQUE NOT NULL,
  suggestion_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action_reason TEXT NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL,
  data_snapshot JSONB NOT NULL
);

-- Data versioning
CREATE TABLE rule_versions (
  id UUID PRIMARY KEY,
  rule_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  rule_definition JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL,
  change_reason TEXT NOT NULL
);
```

---

## Turkish UI Copy Guidelines

### Tone:
- ✅ Profesyonel ama samimi
- ✅ Açık ve net
- ✅ Risk ve belirsizlik konusunda dürüst
- ❌ Aşırı teknik değil
- ❌ Otoriter değil (öneri niteliğinde)

### Example Phrases:

**Good**:
- "Bu öneri, 184 maç üzerinde test edildi ve %71 başarı gösterdi."
- "Mevcut sisteme göre %3 daha iyi performans gösteriyor."
- "Risk orta seviyede - dikkatli izleme önerilir."
- "Daha fazla veri birikirse güvenilirlik artacaktır."

**Bad**:
- "Bu kural kesinlikle işe yarayacaktır." (Too confident)
- "AI tarafından optimize edildi." (Too technical)
- "Sisteminiz yanlış, bu daha iyi." (Too assertive)
- "Bunu uygula." (Too commanding)

---

## System Behavior Examples

### Scenario 1: High Confidence Suggestion

```
🟢 DÜŞÜK RİSK
Sample: 245 matches
Hit rate: 78% (baseline: 72%)
ROI: +5.2%
P-value: 0.001

UI Shows:
"Bu öneri güçlü istatistiksel destek ile geliyor. 245 maç üzerinde
test edildi ve mevcut sistemden anlamlı şekilde daha iyi performans
gösterdi. Risk seviyesi düşük."

Admin Action: Likely to APPROVE
```

### Scenario 2: Medium Confidence, Small Sample

```
🟡 ORTA RİSK
Sample: 87 matches
Hit rate: 73% (baseline: 70%)
ROI: +2.1%
P-value: 0.042

UI Shows:
"Bu öneri umut verici ancak örnek büyüklüğü ideal değil (87 maç).
1-2 ay daha veri biriktirirse daha güvenilir karar verilebilir.
Sandbox testine göndermeniz veya ertelemeniz önerilir."

Admin Action: Likely to DEFER or SANDBOX
```

### Scenario 3: Negative ROI

```
🔴 YÜKSEK RİSK
Sample: 156 matches
Hit rate: 72% (baseline: 70%)
ROI: -3.4% (❌ NEGATİF)

UI Shows Large Banner:
╔═════════════════════════════════════════════════════════════╗
║ ⚠️  DİKKAT: GEÇMİŞ ROI NEGATİF (-3.4%)                   ║
║                                                            ║
║ Hit rate iyi görünse de, geçmiş performans zararda.      ║
║ Bu öneriyi onaylamak tavsiye edilmez.                     ║
╚═════════════════════════════════════════════════════════════╝

Admin Action: Likely to REJECT
```

---

## Sandbox Rule

### Sandbox-Tested Rules:

✅ **Characteristics**:
- Never affect live predictions
- Never affect confidence scoring
- Marked clearly as "🧪 TEST MODE"
- Can be promoted to admin_review later
- Have separate test metrics

❌ **Prohibitions**:
- Cannot be activated directly
- Cannot influence golden rules
- Cannot modify thresholds

### Sandbox UI Label

```
┌─────────────────────────────────────┐
│ 🧪 TEST MODUNDA                     │
│ Bu kural sandbox ortamında test    │
│ ediliyor. Canlı tahminleri         │
│ etkilemez.                          │
└─────────────────────────────────────┘
```

---

## Final Design Intent

The system should feel like:

> **"Bir kıdemli analist asistanı - karar verici değil"**
>
> - Şeffaf
> - Temkinli
> - Açıklanabilir
> - İnsan otoritesini her zaman saygı gösteren

Every output, UI copy, and system behavior designed accordingly.

---

**Status**: ✅ DESIGN COMPLETE
**Next**: Implementation
**Last Updated**: February 6, 2026
