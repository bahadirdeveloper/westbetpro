"""
Excel Parser Service
Parse uploaded Excel and insert to Supabase
"""

import pandas as pd
from datetime import datetime
from typing import Dict, List
import sys
import os

# backend/ is already on sys.path via api/main.py
from db import get_client


def parse_excel_file(file_path: str) -> Dict:
    """
    Parse Excel file and return match data

    Args:
        file_path: Path to uploaded Excel file

    Returns:
        Dict with parsed matches and stats
    """
    try:
        # Read Excel
        df = pd.read_excel(file_path, sheet_name='Acilis', header=7)

        # Clean
        df_clean = df.dropna(subset=['EV SAHİBİ', 'DEPLASMAN'])

        matches = []
        odds_count = 0

        # Parse each row
        for idx, row in df_clean.iterrows():
            try:
                # Basic info
                home_team = str(row['EV SAHİBİ']).strip()
                away_team = str(row['DEPLASMAN']).strip()
                league = str(row['LİG']).strip().upper() if pd.notna(row['LİG']) else ''

                # Date
                if pd.notna(row['TARİH']):
                    if isinstance(row['TARİH'], datetime):
                        match_date = row['TARİH'].strftime('%Y-%m-%d')
                    else:
                        match_date = str(row['TARİH'])[:10]
                else:
                    match_date = None

                # Time
                match_time = str(row['SAAT']) if pd.notna(row['SAAT']) else None

                # Parse odds (simplified - key columns only)
                opening_odds = {}
                odds_columns = {
                    '1': 'oran_1', '0': 'oran_0', '2': 'oran_2',
                    '2,5 A': 'oran_25_alt', '2,5 Ü': 'oran_25_ust',
                    '3,5 A': 'oran_35_alt', '3,5 Ü': 'oran_35_ust',
                    'VAR': 'oran_var', '4-5': 'oran_45'
                }

                for excel_col, json_key in odds_columns.items():
                    if excel_col in row.index:
                        val = row[excel_col]
                        if pd.notna(val) and val != '':
                            try:
                                # Convert Turkish decimal
                                if isinstance(val, str):
                                    val = val.replace(',', '.')
                                opening_odds[json_key] = float(val)
                            except:
                                pass

                if opening_odds:
                    odds_count += 1

                # Parse scores
                scores = {}
                if 'SKOR İY' in row.index and pd.notna(row['SKOR İY']):
                    scores['iy_skor'] = str(row['SKOR İY']).strip()
                if 'SKOR MS' in row.index and pd.notna(row['SKOR MS']):
                    scores['ms_skor'] = str(row['SKOR MS']).strip()

                match = {
                    'home_team': home_team,
                    'away_team': away_team,
                    'league': league,
                    'match_date': match_date,
                    'match_time': match_time,
                    'opening_odds': opening_odds if opening_odds else None,
                    'scores': scores if scores else None,
                    'source': 'admin_upload',
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat(),
                }

                matches.append(match)

            except Exception as e:
                continue

        return {
            'success': True,
            'total_rows': len(df),
            'valid_matches': len(matches),
            'matches_with_odds': odds_count,
            'matches': matches
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'matches': []
        }


def insert_matches_to_db(matches: List[Dict]) -> Dict:
    """
    Insert parsed matches to Supabase

    Args:
        matches: List of match dictionaries

    Returns:
        Insert result summary
    """
    try:
        db = get_client()
        result = db.insert_matches(matches, batch_size=1000)

        return {
            'success': result['success'],
            'inserted': result['inserted'],
            'duplicates': result['duplicates'],
            'errors': result['errors']
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'inserted': 0,
            'duplicates': 0,
            'errors': len(matches)
        }
