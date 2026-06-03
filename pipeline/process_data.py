"""
Evolution of Video Games -- data processing pipeline.

Ingests four raw gaming datasets (~18,000 records), cleans and normalizes
them with pandas, derives the aggregations each D3.js visualization needs,
and writes compact JSON artifacts to ``data/processed/`` for the frontend.

Run from the project root:

    python pipeline/process_data.py

All cleaning logic that used to live inline in the JavaScript (parsing
"5.2K"-style play counts, extracting release years, bucketing genres,
aggregating regional sales and esports earnings) is centralized here so the
browser only ever loads small, analysis-ready JSON.
"""

from __future__ import annotations

import ast
import json
import re
from pathlib import Path

import pandas as pd

# --------------------------------------------------------------------------- #
# Paths & configuration
# --------------------------------------------------------------------------- #
ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"

# Genres surfaced as their own colour in the bubble chart; everything else
# collapses into "Others". Order matters: the first match wins.
TOP_GENRES = ["Puzzle", "Shooter", "Strategy", "RPG", "Adventure", "Platform"]

# Esports titles offered in the line-chart dropdown (frontend filters on these).
FEATURED_ESPORTS = [
    "Super Smash Bros.", "Age of Empires II", "League of Legends", "Dota 2",
    "Rocket League", "Counter-Strike: Global Offensive", "Fortnite",
    "Apex Legends", "VALORANT", "Call of Duty 4: Modern Warfare",
]

REGION_LABELS = {
    "NA_Sales": "North America",
    "EU_Sales": "Europe",
    "JP_Sales": "Japan",
    "Other_Sales": "Rest of World",
}


# --------------------------------------------------------------------------- #
# Cleaning helpers
# --------------------------------------------------------------------------- #
def parse_plays(value: str) -> float:
    """Convert play counts like '5.2K' or '18K' into absolute numbers."""
    if pd.isna(value):
        return 0.0
    text = str(value).strip()
    if text.endswith("K"):
        return float(text[:-1]) * 1_000
    if text.endswith("M"):
        return float(text[:-1]) * 1_000_000
    try:
        return float(text)
    except ValueError:
        return 0.0


def first_genre(raw_genres: str) -> str:
    """Map a list-like genre string to a single top-level bucket."""
    if pd.isna(raw_genres):
        return "Others"
    found = re.findall(r"'([^']+)'", str(raw_genres))
    for genre in TOP_GENRES:
        if genre in found:
            return genre
    return "Others"


def clean_team(raw_team: str) -> str:
    """Render the Python-list-as-string team field as 'A, B' for tooltips."""
    if pd.isna(raw_team):
        return "Unknown"
    try:
        parsed = ast.literal_eval(str(raw_team))
        if isinstance(parsed, (list, tuple)):
            return ", ".join(str(p) for p in parsed)
    except (ValueError, SyntaxError):
        pass
    return str(raw_team)


def write_json(name: str, payload) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, separators=(",", ":"), ensure_ascii=False)
    print(f"  - wrote {path.relative_to(ROOT)}  ({path.stat().st_size / 1024:.1f} KB)")


# --------------------------------------------------------------------------- #
# Stage 1 -- Popular games -> genre bubble chart
# --------------------------------------------------------------------------- #
def build_genre_bubbles() -> int:
    df = pd.read_csv(RAW / "Popular_Games.csv")

    df["Plays"] = df["Plays"].map(parse_plays)
    df["Genre"] = df["Genres"].map(first_genre)
    df["Team"] = df["Team"].map(clean_team)
    df["Rating"] = pd.to_numeric(df["Rating"], errors="coerce")
    df["ReleaseYear"] = (
        pd.to_datetime(df["Release Date"], format="%d-%b-%y", errors="coerce")
        .dt.year
    )

    # Drop rows we can't place on the timeline / rating axis.
    df = df.dropna(subset=["ReleaseYear", "Rating"])
    df = df[(df["ReleaseYear"] >= 1980) & (df["ReleaseYear"] <= 2025)]
    df["ReleaseYear"] = df["ReleaseYear"].astype(int)

    records = df[["Title", "Team", "Plays", "Rating", "Genre", "ReleaseYear"]]
    records = records.sort_values("Plays", ascending=False)
    write_json("genre_bubbles.json", records.to_dict(orient="records"))
    return len(records)


# --------------------------------------------------------------------------- #
# Stage 2 -- Regional sales -> pie chart, stacked-area, publisher ranking
# --------------------------------------------------------------------------- #
def build_sales_views() -> int:
    df = pd.read_csv(RAW / "Video_Games_Sales.csv")
    regions = list(REGION_LABELS)

    df["Year"] = pd.to_numeric(df["Year"], errors="coerce")
    for col in regions + ["Global_Sales"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    # --- 2a. Pie: total sales per region + that region's top 5 games -------- #
    pie = []
    for region in regions:
        top = (
            df[df[region] > 0][["Name", region]]
            .sort_values(region, ascending=False)
            .head(5)
        )
        pie.append({
            "region": region,
            "label": REGION_LABELS[region],
            "sales": round(float(df[region].sum()), 2),
            "topGames": [
                {"name": n, "sales": round(float(s), 2)}
                for n, s in top.itertuples(index=False)
            ],
        })
    write_json("sales_by_region.json", pie)

    # --- 2b. Stacked area: regional sales by release year ------------------- #
    timeline = df.dropna(subset=["Year"])
    timeline = timeline[(timeline["Year"] >= 1980) & (timeline["Year"] <= 2020)]
    by_year = (
        timeline.groupby(timeline["Year"].astype(int))[regions].sum().reset_index()
    )
    area = [
        {
            "year": int(row["Year"]),
            **{r: round(float(row[r]), 2) for r in regions},
        }
        for _, row in by_year.iterrows()
    ]
    write_json("sales_over_time.json", area)

    # --- 2c. Top publishers by global sales --------------------------------- #
    publishers = (
        df.dropna(subset=["Publisher"])
        .groupby("Publisher")
        .agg(globalSales=("Global_Sales", "sum"), titles=("Name", "count"))
        .sort_values("globalSales", ascending=False)
        .head(12)
        .reset_index()
    )
    pub_payload = [
        {
            "publisher": row["Publisher"],
            "globalSales": round(float(row["globalSales"]), 2),
            "titles": int(row["titles"]),
        }
        for _, row in publishers.iterrows()
    ]
    write_json("top_publishers.json", pub_payload)
    return len(df)


# --------------------------------------------------------------------------- #
# Stage 3 -- Esports history -> line chart timeline
# --------------------------------------------------------------------------- #
def build_esports_timeline() -> int:
    df = pd.read_csv(RAW / "Historical_Esport_Data.csv")
    df["Earnings"] = pd.to_numeric(df["Earnings"], errors="coerce").fillna(0.0)
    df["Year"] = pd.to_datetime(df["Date"], errors="coerce").dt.year
    df = df.dropna(subset=["Year"])
    df["Year"] = df["Year"].astype(int)

    def yearly(frame: pd.DataFrame) -> list[dict]:
        rolled = (
            frame.groupby("Year")["Earnings"].sum().reset_index().sort_values("Year")
        )
        return [
            {"Year": int(y), "Earnings": round(float(e), 2)}
            for y, e in rolled.itertuples(index=False)
        ]

    timeline = {"All": yearly(df)}
    for game in FEATURED_ESPORTS:
        subset = df[df["Game"] == game]
        if not subset.empty:
            timeline[game] = yearly(subset)
    write_json("esports_timeline.json", timeline)
    return len(df)


# --------------------------------------------------------------------------- #
# Stage 4 -- Esports by genre -> bar chart
# --------------------------------------------------------------------------- #
def build_esports_by_genre() -> int:
    df = pd.read_csv(RAW / "General_Esport_Data.csv")
    for col in ["TotalEarnings", "TotalTournaments", "TotalPlayers"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    grouped = (
        df.groupby("Genre")
        .agg(
            totalEarnings=("TotalEarnings", "sum"),
            totalTournaments=("TotalTournaments", "sum"),
            totalPlayers=("TotalPlayers", "sum"),
        )
        .sort_values("totalEarnings", ascending=False)
        .reset_index()
    )
    payload = [
        {
            "genre": row["Genre"],
            "totalEarnings": round(float(row["totalEarnings"]), 2),
            "totalTournaments": int(row["totalTournaments"]),
            "totalPlayers": int(row["totalPlayers"]),
        }
        for _, row in grouped.iterrows()
    ]
    write_json("esports_by_genre.json", payload)
    return len(df)


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #
def main() -> None:
    print("Evolution of Video Games -- data pipeline")
    print(f"  raw input : {RAW.relative_to(ROOT)}")
    print(f"  output    : {OUT.relative_to(ROOT)}\n")

    games = build_genre_bubbles()
    sales = build_sales_views()
    esports_hist = build_esports_timeline()
    esports_gen = build_esports_by_genre()

    total = games + sales + esports_hist + esports_gen
    print("\nDone. Cleaned records by source:")
    print(f"  popular games (bubble) : {games:>6,}")
    print(f"  video game sales       : {sales:>6,}")
    print(f"  esports history        : {esports_hist:>6,}")
    print(f"  esports by genre       : {esports_gen:>6,}")
    print(f"  {'-' * 30}")
    print(f"  TOTAL records processed: {total:>6,}")


if __name__ == "__main__":
    main()
