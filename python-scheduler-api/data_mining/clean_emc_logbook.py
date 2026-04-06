"""
Clean EMC logbook data and build monthly reservation time series outputs.

Outputs written in the same folder as this script:
- EMC_Logbook_Cleaned.csv
- EMC_Monthly_Reservations.csv
- EMC_Monthly_By_Venue.csv
"""

from __future__ import annotations

from pathlib import Path
import pandas as pd


# Preferred input filenames (first match is used).
INPUT_CANDIDATES = [
    "EMC_Logbook_-_W_out_Act.csv",
    "EMC Logbook - W_out Act.csv",
]

CLEANED_OUTPUT = "EMC_Logbook_Cleaned.csv"
MONTHLY_OUTPUT = "EMC_Monthly_Reservations.csv"
MONTHLY_VENUE_OUTPUT = "EMC_Monthly_By_Venue.csv"

# Explicit date fixes requested.
DATE_FIX_MAP = {
    "0517/25": "05/17/25",
    "03/20/15": "03/20/25",
    "09/20/21": "09/20/24",
    "08/06/26": "08/06/24",
}


def snake_case_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Strip spaces and convert column names to snake_case."""
    df = df.copy()
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    return df


def resolve_input_file(base_dir: Path) -> Path:
    """Find the first available input file from known filename variants."""
    for name in INPUT_CANDIDATES:
        path = base_dir / name
        if path.exists():
            return path
    raise FileNotFoundError(
        "Could not find input CSV. Checked: " + ", ".join(INPUT_CANDIDATES)
    )


def clean_request_date(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and normalize request_date values, then parse as datetime."""
    df = df.copy()

    # Strip surrounding whitespace and trailing slash characters.
    s = df["request_date"].astype(str).str.strip().str.rstrip("/")

    # Apply known typo fixes.
    s = s.replace(DATE_FIX_MAP)

    # Parse using MM/DD/YY format.
    parsed = pd.to_datetime(s, format="%m/%d/%y", errors="coerce")

    bad_rows = parsed.isna().sum()
    if bad_rows > 0:
        bad_values = sorted(s[parsed.isna()].dropna().unique().tolist())
        raise ValueError(
            f"Found {bad_rows} unparseable date value(s): {bad_values}"
        )

    df["request_date"] = parsed
    return df


def clean_venue(df: pd.DataFrame) -> pd.DataFrame:
    """Standardize venue strings and merge known variants."""
    df = df.copy()

    venue = df["venue"].astype(str).str.strip().str.upper()

    # Normalize all 'others' variations.
    venue = venue.replace({
        "OTHER": "OTHERS",
        "OTHERS(EMC)": "OTHERS",
    })

    # Normalize any value that starts with OTHERS( ... )
    venue = venue.str.replace(r"^OTHERS\s*\(.*\)$", "OTHERS", regex=True)

    # Correct known misspelling variants for QUADRANGLE.
    venue = venue.replace({
        "QUANDANGLE": "QUADRANGLE",
        "QUADRANGLE": "QUADRANGLE",
    })

    df["venue"] = venue
    return df


def build_monthly_series(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate to monthly reservation counts and fill missing months with 0."""
    work = df.copy()
    work["month"] = work["request_date"].dt.to_period("M").dt.to_timestamp()

    monthly = (
        work.groupby("month", as_index=False)
        .size()
        .rename(columns={"size": "reservation_count"})
    )

    full_months = pd.date_range(
        monthly["month"].min(),
        monthly["month"].max(),
        freq="MS",
    )

    monthly = (
        monthly.set_index("month")
        .reindex(full_months, fill_value=0)
        .rename_axis("month")
        .reset_index()
    )

    return monthly


def build_monthly_by_venue(df: pd.DataFrame, monthly_index: pd.Series) -> pd.DataFrame:
    """Build monthly counts per venue, including 0-filled month/venue combinations."""
    work = df.copy()
    work["month"] = work["request_date"].dt.to_period("M").dt.to_timestamp()

    venues = sorted(work["venue"].dropna().unique().tolist())
    full_index = pd.MultiIndex.from_product(
        [monthly_index.tolist(), venues],
        names=["month", "venue"],
    )

    by_venue = (
        work.groupby(["month", "venue"]).size().reindex(full_index, fill_value=0)
        .rename("reservation_count")
        .reset_index()
    )

    return by_venue


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    input_path = resolve_input_file(base_dir)

    print(f"Reading: {input_path.name}")
    df = pd.read_csv(input_path)

    # 1) Clean columns first so all following logic is stable.
    df = snake_case_columns(df)

    # Ensure expected columns exist after renaming.
    expected = [
        "request_date",
        "requestor_name",
        "department",
        "venue",
        "contact_number",
    ]
    missing = [c for c in expected if c not in df.columns]
    if missing:
        raise KeyError(f"Missing required columns: {missing}")

    # 2) Clean request_date and venue.
    df = clean_request_date(df)
    df = clean_venue(df)

    # 3) Chronological sort after date conversion.
    df = df.sort_values("request_date").reset_index(drop=True)

    # 4) Build monthly time series outputs.
    monthly = build_monthly_series(df)
    monthly_by_venue = build_monthly_by_venue(df, monthly["month"])

    # 5) Save cleaned row-level data and monthly outputs.
    cleaned_out = base_dir / CLEANED_OUTPUT
    monthly_out = base_dir / MONTHLY_OUTPUT
    monthly_venue_out = base_dir / MONTHLY_VENUE_OUTPUT

    cleaned_to_save = df.copy()
    cleaned_to_save["request_date"] = cleaned_to_save["request_date"].dt.strftime("%m/%d/%y")
    cleaned_to_save.to_csv(cleaned_out, index=False)

    monthly_to_save = monthly.copy()
    monthly_to_save["month"] = monthly_to_save["month"].dt.strftime("%Y-%m")
    monthly_to_save.to_csv(monthly_out, index=False)

    monthly_venue_to_save = monthly_by_venue.copy()
    monthly_venue_to_save["month"] = monthly_venue_to_save["month"].dt.strftime("%Y-%m")
    monthly_venue_to_save.to_csv(monthly_venue_out, index=False)

    # 6) Print requested summary.
    zero_months = monthly.loc[monthly["reservation_count"] == 0, "month"]

    print("\n=== Cleaning Summary ===")
    print(f"Total rows: {len(df)}")
    print(
        "Date range: "
        f"{df['request_date'].min().strftime('%Y-%m-%d')} "
        f"to {df['request_date'].max().strftime('%Y-%m-%d')}"
    )
    print(f"Total months in time series: {len(monthly)}")

    if zero_months.empty:
        print("Months with 0 reservations: None")
    else:
        zero_month_labels = ", ".join(zero_months.dt.strftime("%Y-%m").tolist())
        print(f"Months with 0 reservations: {zero_month_labels}")

    print(f"Average reservations per month: {monthly['reservation_count'].mean():.2f}")
    print(f"Maximum reservations in a month: {monthly['reservation_count'].max()}")

    print("\nSaved files:")
    print(f"- {cleaned_out.name}")
    print(f"- {monthly_out.name}")
    print(f"- {monthly_venue_out.name}")


if __name__ == "__main__":
    main()
