"""Main pipeline: scrape official sites, build rich rows, write CSV.

Output: motorbikes_dataset.csv (UTF-8)

Rules:
- Only official-brand data.
- Missing data stays NULL (never 0).
- 1 row = 1 variant.
- Capture official_url and source_date.
"""
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import schema
from scrapers import honda, yamaha, suzuki, sym, kymco, vinfast, datbike, yadea

OUTPUT = os.path.join(os.path.dirname(__file__), "motorbikes_dataset.csv")


def main():
    all_rows = []
    for scraper in [honda, yamaha, suzuki, sym, kymco, vinfast, datbike, yadea]:
        print(f"Scraping {scraper.__name__}...")
        all_rows.extend(scraper.scrape_all())

    # Write CSV
    with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=schema.COLUMNS, restval=None)
        writer.writeheader()
        for row in all_rows:
            writer.writerow(row)

    print(f"\nWrote {len(all_rows)} rows to {OUTPUT}")

    # Quick stats
    ev = sum(1 for r in all_rows if r["powertrain"] == "EV")
    ice = len(all_rows) - ev
    print(f"  ICE: {ice}, EV: {ev}")
    return all_rows


if __name__ == "__main__":
    main()