"""
ALTIN KURALLAR - Excel verilerinden çıkarılan expert senaryoları
Stage1'deki SCENARIOS'u daha optimize formatta tutar
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class GoldenRule:
    """Tek bir altın kural tanımı"""
    id: int
    name: str
    primary_odds: Dict[str, float]  # Ana oran eşleşmesi
    secondary_odds: Optional[Dict[str, float]] = None  # Yardımcı oran filtresi
    exclude_odds: Optional[Dict[str, float]] = None  # Hariç tutulacak oranlar
    predictions: List[str] = field(default_factory=list)  # Tahminler
    confidence_base: int = 85  # Temel güven skoru
    importance: str = "normal"  # normal, önemli, çok_önemli
    notes: str = ""  # Ek notlar


# ═══════════════════════════════════════════════════════════════════
# ALTIN KURALLAR LİSTESİ (49 KURAL)
# ═══════════════════════════════════════════════════════════════════

GOLDEN_RULES = [
    GoldenRule(
        id=30,
        name="4-5 gol 2.33",
        primary_odds={"4-5": 2.33},
        predictions=["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST"],
        confidence_base=90,
        importance="önemli"
    ),
    GoldenRule(
        id=16,
        name="4-5 gol 2.38",
        primary_odds={"4-5": 2.38},
        predictions=["İY 0.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "KG VAR"],
        confidence_base=91,
        importance="önemli"
    ),
    GoldenRule(
        id=2,
        name="4-5 gol 2.40",
        primary_odds={"4-5": 2.40},
        predictions=["MS 1.5 ÜST", "MS 2.5 ÜST", "EV MS 0.5 ÜST"],
        confidence_base=89
    ),
    GoldenRule(
        id=50,
        name="4-5 gol 2.43",
        primary_odds={"4-5": 2.43},
        predictions=["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST"],
        confidence_base=88,
        importance="önemli"
    ),
    GoldenRule(
        id=40,
        name="4-5 gol 2.48",
        primary_odds={"4-5": 2.48},
        predictions=["İY 0.5 ÜST", "MS 1.5 ÜST", "MS DEP 0.5 ÜST", "MS EV 0.5 ÜST", "KG VAR"],
        confidence_base=88
    ),
    GoldenRule(
        id=48,
        name="4-5 gol 2.51 + 2.5 üst 1.23",
        primary_odds={"4-5": 2.51},
        secondary_odds={"2,5 Ü": 1.23},
        predictions=["İY 0.5 ÜST", "İY EV 0.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "MS DEP 1.5 ÜST", "KG VAR"],
        confidence_base=90
    ),
    GoldenRule(
        id=44,
        name="4-5 gol 2.52",
        primary_odds={"4-5": 2.52},
        predictions=["İY 0.5 ÜST", "İY EV 0.5 ÜST", "İY 1.5 ÜST", "MS 1.5 ÜST"],
        confidence_base=87
    ),
    GoldenRule(
        id=47,
        name="4-5 gol 2.54",
        primary_odds={"4-5": 2.54},
        predictions=["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS EV 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "KG VAR"],
        confidence_base=89
    ),
    GoldenRule(
        id=10,
        name="4-5 gol 2.57",
        primary_odds={"4-5": 2.57},
        predictions=["MS 2.5 ÜST", "MS 3.5 ÜST", "MS DEP 1.5 ÜST", "İY 0.5 ÜST", "İY DEP 0.5 ÜST"],
        confidence_base=90,
        importance="önemli"
    ),
    GoldenRule(
        id=23,
        name="4-5 gol 2.59",
        primary_odds={"4-5": 2.59},
        predictions=["MS 2.5 ÜST", "MS 3.5 ÜST", "MS EV 1.5 ÜST", "İY 0.5 ÜST", "İY 1.5 ÜST"],
        confidence_base=89,
        importance="özel"
    ),
    GoldenRule(
        id=6,
        name="4-5 gol 2.60",
        primary_odds={"4-5": 2.60},
        predictions=["İY 0.5 ÜST", "MS EV 0.5 ÜST", "MS 1.5 ÜST"],
        confidence_base=88
    ),
    GoldenRule(
        id=61,
        name="4-5 gol 2.60 + 2.5 alt 2.83",
        primary_odds={"4-5": 2.60},
        secondary_odds={"2,5 A": 2.83},
        predictions=["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST"],
        confidence_base=90
    ),
    GoldenRule(
        id=22,
        name="4-5 gol 2.61",
        primary_odds={"4-5": 2.61},
        predictions=["MS 2.5 ÜST", "MS 1.5 ÜST", "MS EV 1.5 ÜST", "MS EV 0.5 ÜST"],
        confidence_base=88,
        importance="özel"
    ),
    GoldenRule(
        id=36,
        name="4-5 gol 2.62",
        primary_odds={"4-5": 2.62},
        predictions=["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS EV 1.5 ÜST", "MS 2.5 ÜST"],
        confidence_base=89,
        importance="önemli"
    ),
    GoldenRule(
        id=32,
        name="4-5 gol 2.63",
        primary_odds={"4-5": 2.63},
        predictions=["MS 1.5 ÜST", "MS 2.5 ÜST", "MS EV 1.5 ÜST", "KG VAR"],
        confidence_base=89,
        importance="önemli"
    ),
    GoldenRule(
        id=25,
        name="4-5 gol 2.64",
        primary_odds={"4-5": 2.64},
        predictions=["MS 1.5 ÜST", "İY 0.5 ÜST"],
        confidence_base=87,
        importance="önemli"
    ),
    GoldenRule(
        id=251,
        name="4-5 gol 2.64 + 3.5 alt 1.57",
        primary_odds={"4-5": 2.64},
        secondary_odds={"3,5 A": 1.57},
        predictions=["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "MS EV 1.5 ÜST"],
        confidence_base=90
    ),
    GoldenRule(
        id=252,
        name="4-5 gol 2.64 + 3.5 üst 1.89",
        primary_odds={"4-5": 2.64},
        secondary_odds={"3,5 Ü": 1.89},
        predictions=["MS 2.5 ÜST", "MS 1.5 ÜST", "İY 0.5 ÜST", "İY 1.5 ÜST"],
        confidence_base=89
    ),
    GoldenRule(
        id=28,
        name="4-5 gol 2.66",
        primary_odds={"4-5": 2.66},
        predictions=["İY 0.5 ÜST", "İY EV 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS EV 1.5 ÜST", "KG VAR", "MS DEP 0.5 ÜST"],
        confidence_base=90,
        importance="önemli"
    ),
    GoldenRule(
        id=27,
        name="4-5 gol 2.67",
        primary_odds={"4-5": 2.67},
        predictions=["İY 0.5 ÜST", "İY EV 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS EV 1.5 ÜST", "MS DEP 0.5 ÜST", "KG VAR"],
        confidence_base=90,
        importance="önemli"
    ),
    GoldenRule(
        id=42,
        name="4-5 gol 2.68",
        primary_odds={"4-5": 2.68},
        predictions=["İY 0.5 ÜST", "İY 1.5 ÜST", "İY KG VAR", "MS KG VAR", "MS 1.5 ÜST"],
        confidence_base=88
    ),
    GoldenRule(
        id=24,
        name="4-5 gol 2.70 + 2.5 üst 1.34",
        primary_odds={"4-5": 2.70},
        secondary_odds={"2,5 Ü": 1.34},
        predictions=["MS 1.5 ÜST", "MS 2.5 ÜST", "KG VAR", "MS DEP 0.5 ÜST"],
        confidence_base=89
    ),
    GoldenRule(
        id=241,
        name="4-5 gol 2.70 + 2.5 üst 1.35",
        primary_odds={"4-5": 2.70},
        secondary_odds={"2,5 Ü": 1.35},
        predictions=["İY 0.5 ÜST", "İY DEP 0.5 ÜST", "MS 1.5 ÜST", "KG VAR"],
        confidence_base=89
    ),
    GoldenRule(
        id=29,
        name="4-5 gol 2.71",
        primary_odds={"4-5": 2.71},
        predictions=["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS DEP 0.5 ÜST", "KG VAR", "MS 3.5 ÜST"],
        confidence_base=91,
        importance="önemli"
    ),
    GoldenRule(
        id=11,
        name="4-5 gol 2.74",
        primary_odds={"4-5": 2.74},
        predictions=["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS DEP 0.5 ÜST", "MS 2.5 ÜST", "KG VAR"],
        confidence_base=89
    ),
    GoldenRule(
        id=3,
        name="4-5 gol 2.79",
        primary_odds={"4-5": 2.79},
        predictions=["İY 0.5 ÜST"],
        confidence_base=86
    ),
    GoldenRule(
        id=4,
        name="4-5 gol 2.80 + 3.5 alt 1.53",
        primary_odds={"4-5": 2.80},
        secondary_odds={"3,5 A": 1.53},
        predictions=["İY 0.5 ÜST", "İY EV 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST"],
        confidence_base=90,
        importance="önemli"
    ),
    GoldenRule(
        id=401,
        name="4-5 gol 2.80 + 3.5 alt 1.45",
        primary_odds={"4-5": 2.80},
        secondary_odds={"3,5 A": 1.45},
        predictions=["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS DEP 1.5 ÜST"],
        confidence_base=89
    ),
    GoldenRule(
        id=402,
        name="4-5 gol 2.80 + 2.5 üst 1.38",
        primary_odds={"4-5": 2.80},
        secondary_odds={"2,5 Ü": 1.38},
        predictions=["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "MS EV 1.5 ÜST", "KG VAR"],
        confidence_base=90
    ),
    GoldenRule(
        id=1,
        name="4-5 gol 2.85 + 3.5 alt 1.43",
        primary_odds={"4-5": 2.85},
        secondary_odds={"3,5 A": 1.43},
        predictions=["MS 1.5 ÜST", "MS 2.5 ÜST", "KG VAR"],
        confidence_base=88
    ),
    GoldenRule(
        id=8,
        name="4-5 gol 2.86",
        primary_odds={"4-5": 2.86},
        predictions=["İY 0.5 ÜST"],
        confidence_base=86
    ),
    GoldenRule(
        id=81,
        name="4-5 gol 2.86 + 3.5 alt 1.43",
        primary_odds={"4-5": 2.86},
        secondary_odds={"3,5 A": 1.43},
        predictions=["MS 2.5 ÜST", "MS 3.5 ÜST", "MS EV 1.5 ÜST", "İY 0.5 ÜST"],
        confidence_base=89
    ),
    GoldenRule(
        id=19,
        name="4-5 gol 2.91",
        primary_odds={"4-5": 2.91},
        predictions=["MS 1.5 ÜST"],
        confidence_base=87,
        importance="önemli"
    ),
    GoldenRule(
        id=191,
        name="4-5 gol 2.91 + 2.5 üst 1.43",
        primary_odds={"4-5": 2.91},
        secondary_odds={"2,5 Ü": 1.43},
        predictions=["MS 2.5 ÜST", "MS DEP 1.5 ÜST", "İY 0.5 ÜST", "İY DEP 0.5 ÜST"],
        confidence_base=89
    ),
    GoldenRule(
        id=192,
        name="4-5 gol 2.91 + 2.5 üst 1.44",
        primary_odds={"4-5": 2.91},
        secondary_odds={"2,5 Ü": 1.44},
        predictions=["MS 1.5 ÜST"],
        confidence_base=87
    ),
    GoldenRule(
        id=193,
        name="4-5 gol 2.91 + 2.5 üst 1.45",
        primary_odds={"4-5": 2.91},
        secondary_odds={"2,5 Ü": 1.45},
        predictions=["MS 2.5 ÜST", "MS 3.5 ÜST", "KG VAR", "MS DEP 1.5 ÜST", "İY DEP 0.5 ÜST", "İY 1.5 ÜST"],
        confidence_base=90
    ),
    GoldenRule(
        id=18,
        name="4-5 gol 2.92",
        primary_odds={"4-5": 2.92},
        predictions=["MS 1.5 ÜST"],
        confidence_base=87
    ),
    GoldenRule(
        id=26,
        name="4-5 gol 2.96",
        primary_odds={"4-5": 2.96},
        predictions=["MS 0.5 ÜST"],
        confidence_base=85,
        importance="önemli"
    ),
    GoldenRule(
        id=261,
        name="4-5 gol 2.96 + 2-3 gol 1.93",
        primary_odds={"4-5": 2.96},
        secondary_odds={"2-3": 1.93},
        predictions=["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "MS DEP 0.5 ÜST", "MS DEP 1.5 ÜST", "İY DEP 0.5 ÜST"],
        confidence_base=90
    ),
    GoldenRule(
        id=262,
        name="4-5 gol 2.96 + 3.5 alt 1.39",
        primary_odds={"4-5": 2.96},
        secondary_odds={"3,5 A": 1.39},
        predictions=["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST"],
        confidence_base=89
    ),
    GoldenRule(
        id=13,
        name="4-5 gol 2.97 + 3.5 üst 2.28",
        primary_odds={"4-5": 2.97},
        secondary_odds={"3,5 Ü": 2.28},
        predictions=["MS 1.5 ÜST", "MS DEP 0.5 ÜST"],
        confidence_base=87
    ),
    GoldenRule(
        id=131,
        name="4-5 gol 2.97 + 3.5 üst 2.28 + 2.5 alt 2.21",
        primary_odds={"4-5": 2.97},
        secondary_odds={"3,5 Ü": 2.28, "2,5 A": 2.21},
        predictions=["MS 2.5 ÜST", "MS 3.5 ÜST", "MS DEP 0.5 ÜST", "MS DEP 1.5 ÜST"],
        confidence_base=89
    ),
    GoldenRule(
        id=1301,
        name="4-5 gol 2.97 + 3.5 üst 2.27",
        primary_odds={"4-5": 2.97},
        secondary_odds={"3,5 Ü": 2.27},
        predictions=["MS 1.5 ÜST", "MS DEP 0.5 ÜST"],
        confidence_base=87
    ),
    GoldenRule(
        id=1302,
        name="4-5 gol 2.97 + 2.5 üst 1.46",
        primary_odds={"4-5": 2.97},
        secondary_odds={"2,5 Ü": 1.46},
        predictions=["MS 1.5 ÜST", "MS DEP 0.5 ÜST"],
        confidence_base=87
    ),
    GoldenRule(
        id=45,
        name="4-5 gol 2.98 + 3.5 alt 1.43",
        primary_odds={"4-5": 2.98},
        secondary_odds={"3,5 A": 1.43},
        predictions=["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "KG VAR"],
        confidence_base=90
    ),
    GoldenRule(
        id=14,
        name="4-5 gol 3.01 + 2.5 üst 1.48",
        primary_odds={"4-5": 3.01},
        secondary_odds={"2,5 Ü": 1.48},
        predictions=["MS 2.5 ÜST", "MS 3.5 ÜST", "İY 0.5 ÜST", "İY 1.5 ÜST", "KG VAR", "MS DEP 0.5 ÜST", "MS DEP 1.5 ÜST"],
        confidence_base=91,
        importance="önemli"
    ),
    GoldenRule(
        id=38,
        name="4-5 gol 3.04",
        primary_odds={"4-5": 3.04},
        predictions=["İY 0.5 ÜST", "İY DEP 0.5 ÜST", "MS 1.5 ÜST", "MS EV 0.5 ÜST", "MS DEP 0.5 ÜST", "KG VAR"],
        confidence_base=89,
        importance="önemli"
    ),
    GoldenRule(
        id=43,
        name="4-5 gol 3.07",
        primary_odds={"4-5": 3.07},
        predictions=["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "MS DEP 1.5 ÜST", "KG VAR"],
        confidence_base=89
    ),
    GoldenRule(
        id=9,
        name="4-5 gol 3.15 (KG VAR 1.50 HARİÇ)",
        primary_odds={"4-5": 3.15},
        exclude_odds={"VAR": 1.50},
        predictions=["İY 0.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST"],
        confidence_base=88,
        importance="önemli"
    ),
    GoldenRule(
        id=7,
        name="4-5 gol 3.19 + 2.5 alt 2.01",
        primary_odds={"4-5": 3.19},
        secondary_odds={"2,5 A": 2.01},
        predictions=["MS 0.5 ÜST", "MS EV 0.5 ÜST"],
        confidence_base=86
    ),
    GoldenRule(
        id=41,
        name="4-5 gol 3.55",
        primary_odds={"4-5": 3.55},
        predictions=["İY 0.5 ÜST"],
        confidence_base=85
    ),
    GoldenRule(
        id=12,
        name="4-5 gol 3.65 + 3.5 alt 1.21",
        primary_odds={"4-5": 3.65},
        secondary_odds={"3,5 A": 1.21},
        predictions=["MS 1.5 ÜST", "MS 2.5 ÜST", "MS DEP 1.5 ÜST"],
        confidence_base=87
    ),
    GoldenRule(
        id=49,
        name="4-5 gol 3.70 + 2-3 gol 1.82",
        primary_odds={"4-5": 3.70},
        secondary_odds={"2-3": 1.82},
        predictions=["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "KG VAR", "MS DEP 0.5 ÜST"],
        confidence_base=88
    ),
    GoldenRule(
        id=20,
        name="4-5 gol 3.97 + 2.5 alt 1.66",
        primary_odds={"4-5": 3.97},
        secondary_odds={"2,5 A": 1.66},
        predictions=["MS 1.5 ÜST", "MS 2.5 ÜST", "KG VAR", "MS DEP 0.5 ÜST", "İY 0.5 ÜST", "İY 1.5 ÜST", "İY KG VAR", "İY SKOR 1-1"],
        confidence_base=90,
        importance="önemli"
    ),
    GoldenRule(
        id=5,
        name="4-5 gol 4.01",
        primary_odds={"4-5": 4.01},
        predictions=["İY 0.5 ÜST"],
        confidence_base=85
    ),
    GoldenRule(
        id=51,
        name="4-5 gol 4.01 + 2-3 gol 1.83",
        primary_odds={"4-5": 4.01},
        secondary_odds={"2-3": 1.83},
        predictions=["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "KG VAR", "MS DEP 1.5 ÜST", "İY DEP 0.5 ÜST"],
        confidence_base=88
    ),
    GoldenRule(
        id=35,
        name="4-5 gol 4.15 + 2.5 üst 1.91",
        primary_odds={"4-5": 4.15},
        secondary_odds={"2,5 Ü": 1.91},
        predictions=["MS DEP 0.5 ÜST", "MS 1.5 ÜST"],
        confidence_base=86
    ),
    GoldenRule(
        id=34,
        name="4-5 gol 4.19",
        primary_odds={"4-5": 4.19},
        predictions=["İY 0.5 ÜST", "MS 1.5 ÜST"],
        confidence_base=85
    ),
    GoldenRule(
        id=46,
        name="4-5 gol 4.22",
        primary_odds={"4-5": 4.22},
        predictions=["KG VAR"],
        confidence_base=84
    ),
    GoldenRule(
        id=21,
        name="4-5 gol 4.47",
        primary_odds={"4-5": 4.47},
        predictions=["MS 1.5 ÜST", "MS DEP 0.5 ÜST"],
        confidence_base=85
    ),
    GoldenRule(
        id=31,
        name="4-5 gol 4.48",
        primary_odds={"4-5": 4.48},
        predictions=["İY 0.5 ÜST", "İY DEP 0.5 ÜST", "MS 1.5 ÜST", "KG VAR"],
        confidence_base=86,
        importance="önemli"
    ),
    GoldenRule(
        id=33,
        name="4-5 gol 4.76 + 3.5 alt 1.10",
        primary_odds={"4-5": 4.76},
        secondary_odds={"3,5 A": 1.10},
        predictions=["İY 0.5 ÜST", "İY EV 0.5 ÜST"],
        confidence_base=85
    ),


]

# Helper functions
def get_rules_by_importance(importance: str) -> List[GoldenRule]:
    """Önem seviyesine göre kuralları getir"""
    return [r for r in GOLDEN_RULES if r.importance == importance]


def get_high_confidence_rules(min_confidence: int = 90) -> List[GoldenRule]:
    """Yüksek güvenilirlik kurallarını getir"""
    return [r for r in GOLDEN_RULES if r.confidence_base >= min_confidence]


def print_rules_summary():
    """Kural özetini yazdır"""
    print(f"📊 ALTIN KURALLAR ÖZETİ")
    print(f"{'='*60}")
    print(f"Toplam Kural Sayısı: {len(GOLDEN_RULES)}")
    print(f"\nÖnem Dağılımı:")
    print(f"  Çok Önemli: {len(get_rules_by_importance('çok_önemli'))}")
    print(f"  Önemli: {len(get_rules_by_importance('önemli'))}")
    print(f"  Normal: {len(get_rules_by_importance('normal'))}")
    print(f"\nGüven Skoru Dağılımı:")
    print(f"  90+: {len([r for r in GOLDEN_RULES if r.confidence_base >= 90])}")
    print(f"  85-89: {len([r for r in GOLDEN_RULES if 85 <= r.confidence_base < 90])}")
    print(f"  85 altı: {len([r for r in GOLDEN_RULES if r.confidence_base < 85])}")
    print(f"{'='*60}")


if __name__ == "__main__":
    print_rules_summary()
    print(f"\nİlk 5 Kural:")
    for rule in GOLDEN_RULES[:5]:
        print(f"\n  {rule.id}. {rule.name}")
        print(f"     Tahminler: {', '.join(rule.predictions[:3])}...")
        print(f"     Güven: {rule.confidence_base}%")
