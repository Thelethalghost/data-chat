from typing import Any
from schemas import ChartSpec


def pick_chart(rows, columns, query):
    if not rows or not columns:
        return ChartSpec(chart_type="none", title="", data=[])
    q = query.lower()
    n_rows = len(rows)
    n_cols = len(columns)

    # Single value → no chart
    if n_rows == 1 and n_cols == 1:
        return ChartSpec(chart_type="none", title="", data=rows)

    # Time trend → line
    if any(k in q for k in ("month", "week", "trend", "over time", "roll rate")):
        return ChartSpec(chart_type="line", title="Trend", x_key=columns[0], y_keys=columns[1:], data=rows)

    # A vs B comparison → grouped bar
    numeric = [c for c in columns if _is_numeric(rows, c)]
    if len(numeric) >= 2 and 2 <= n_rows <= 10:
        return ChartSpec(chart_type="grouped_bar", title="Comparison", x_key=columns[0], y_keys=numeric, data=rows)

    # Top N ranking → bar
    if any(k in q for k in ("top", "best", "worst", "highest", "lowest")) or n_rows <= 20:
        if n_cols >= 2:
            return ChartSpec(chart_type="bar", title="Ranking", x_key=columns[0], y_keys=[columns[1]], data=rows)

    # Small breakdown → pie
    if n_rows <= 8 and n_cols == 2:
        return ChartSpec(chart_type="pie", title="Breakdown", x_key=columns[0], y_keys=[columns[1]], data=rows)

    # Distribution → histogram
    if any(k in q for k in ("distribution", "score", "spread")):
        return ChartSpec(chart_type="histogram", title="Distribution", x_key=columns[0], data=rows)

    # Default → table
    return ChartSpec(chart_type="table", title="Results", data=rows)


def _is_numeric(rows, col):
    return all(isinstance(row.get(col), (int, float)) for row in rows[:5] if row.get(col) is not None)
