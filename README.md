# Gaming Through the Ages — The Evolution of Video Games

An interactive **data-storytelling** site that traces four decades of video games
and esports (1980–2020) through six D3.js visualizations, powered by a Python
(pandas) preprocessing pipeline that cleans and aggregates ~28,000 records.

> **Live demo:** _enable GitHub Pages to populate this link_ →
> `https://P-Aryan.github.io/Evolution-Of-Video-Games/`

![Gaming Through the Ages](imgs/icon.png)

---

## Highlights

- **Python data pipeline (pandas).** A single, well-documented script
  ([`pipeline/process_data.py`](pipeline/process_data.py)) ingests four raw CSV
  datasets (~28,000 rows), normalizes them (parsing `"5.2K"`-style play counts,
  extracting release years, bucketing 23 raw genres into 7, normalizing
  list-encoded team fields), and emits small, analysis-ready JSON the browser
  loads directly. All data cleaning happens **offline**, so the frontend never
  ships raw CSVs or grinds through aggregation on the main thread.
- **Six interactive D3.js v7 visualizations** spanning genre trends, esports
  growth, and the global console market.
- **Web Worker force simulation.** The genre bubble layout is computed in a
  background worker ([`js/worker_games.js`](js/worker_games.js)) with a live
  progress bar, keeping the UI responsive while ~1,100 nodes settle.
- **Responsive, mobile-friendly layout** — charts scale via `viewBox` /
  container-width measurement and the controls reflow on small screens.

## Visualizations

| # | Chart | Question it answers | Source dataset |
|---|-------|---------------------|----------------|
| 1 | Genre bubble timeline | How did genre popularity and ratings evolve since 1980? | Popular Games |
| 2 | Esports earnings line chart | How have prize earnings grown per game over time? | Historical Esports |
| 3 | Esports-by-genre bar chart | Which genres dominate competitive prize pools? | General Esports |
| 4 | Regional sales pie chart | How are console sales split across world regions? | Video Game Sales |
| 5 | Stacked-area sales over time | How did regional demand shift across four decades? | Video Game Sales |
| 6 | Top-publishers ranking | Which publishers sold the most units worldwide? | Video Game Sales |

## Tech stack

**Python · pandas · D3.js v7 · JavaScript (ES6) · Web Workers · HTML5 · CSS3**

## Project structure

```
.
├── index.html               # Single-page narrative + chart containers
├── styles.css               # Layout, theming, responsive rules
├── js/
│   ├── section1.js          # Genre bubble chart (Web Worker driven)
│   ├── section2.js          # Line, bar, pie, area & publisher charts
│   ├── worker_games.js      # Off-main-thread force simulation
│   └── scroll-reveal.js     # IntersectionObserver scroll animations
├── data/
│   ├── raw/                 # Source CSV datasets
│   └── processed/           # Pipeline output (JSON consumed by the frontend)
└── pipeline/
    ├── process_data.py      # pandas cleaning + aggregation pipeline
    └── requirements.txt
```

## Run locally

```bash
# 1. (Optional) regenerate the processed data
pip install -r pipeline/requirements.txt
python pipeline/process_data.py

# 2. Serve the static site (any static server works)
python -m http.server 8000
# then open http://localhost:8000
```

> A server is required (not `file://`) because the charts `fetch()` JSON from
> `data/processed/`.

## Data pipeline

Running `python pipeline/process_data.py` prints a per-source record summary and
writes six JSON artifacts to `data/processed/`:

| Output | Feeds |
|--------|-------|
| `genre_bubbles.json` | Genre bubble timeline |
| `esports_timeline.json` | Esports earnings line chart (per-game + "All") |
| `esports_by_genre.json` | Esports-by-genre bar chart |
| `sales_by_region.json` | Regional sales pie chart |
| `sales_over_time.json` | Stacked-area sales chart |
| `top_publishers.json` | Top-publishers ranking |

## Deploy (GitHub Pages)

This is a static site — no build step needed:

1. Push to GitHub.
2. **Settings → Pages → Build and deployment → Source: _Deploy from a branch_.**
3. Branch: `main`, folder: `/ (root)` → **Save**.
4. The site goes live at `https://<username>.github.io/Evolution-Of-Video-Games/`.

## Data sources

Datasets are public Kaggle gaming datasets (video game sales, popular games,
and historical/general esports earnings), included under `data/raw/`.
