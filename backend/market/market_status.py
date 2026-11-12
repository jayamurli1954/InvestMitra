"""
NSE/BSE market open/closed status, computed in IST (timezone-independent) and
accounting for weekends AND exchange trading holidays.

Holidays are a maintainable hardcoded list (NSE publishes the equity-segment
trading-holiday circular ~annually; there is no reliable free API). UPDATE this
list each year from the official NSE circular. If a year is missing from the map,
the check falls back to weekend + hours only (same as before holidays were added).
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

IST = timezone(timedelta(hours=5, minutes=30))  # IST has no DST

# NSE equity-segment trading holidays (full-day market closures).
# Source: NSE 2026 holiday circular (verified across broker calendars).
NSE_HOLIDAYS: Dict[str, set] = {
    "2026": {
        "2026-01-15",  # Municipal Corporation Election (Maharashtra)
        "2026-01-26",  # Republic Day
        "2026-03-03",  # Holi
        "2026-03-26",  # Shri Ram Navami
        "2026-03-31",  # Shri Mahavir Jayanti
        "2026-04-03",  # Good Friday
        "2026-04-14",  # Dr. Baba Saheb Ambedkar Jayanti
        "2026-05-01",  # Maharashtra Day
        "2026-05-28",  # Bakri Id
        "2026-06-26",  # Muharram
        "2026-09-14",  # Ganesh Chaturthi
        "2026-10-02",  # Mahatma Gandhi Jayanti
        "2026-10-20",  # Dussehra
        "2026-11-10",  # Diwali-Balipratipada
        "2026-11-24",  # Prakash Gurpurb Sri Guru Nanak Dev
        "2026-12-25",  # Christmas
    },
    # "2027": { ... }  # TODO: add from NSE's 2027 circular when published.
}

MARKET_OPEN_MIN = 9 * 60 + 15   # 9:15 AM IST
MARKET_CLOSE_MIN = 15 * 60 + 30  # 3:30 PM IST


def get_market_status(now_utc: Optional[datetime] = None) -> Dict[str, Any]:
    """Return the NSE/BSE market status as of now (IST)."""
    now = (now_utc or datetime.now(timezone.utc)).astimezone(IST)
    date_str = now.date().isoformat()
    weekday = now.weekday()           # 0=Mon .. 6=Sun
    minutes = now.hour * 60 + now.minute
    holidays = NSE_HOLIDAYS.get(str(now.year), set())

    base = {"hours": "9:15 AM - 3:30 PM IST", "as_of_ist": now.isoformat()}

    if weekday >= 5:
        return {**base, "is_open": False, "status": "CLOSED",
                "text": "Markets Closed", "reason": "Weekend"}
    if date_str in holidays:
        return {**base, "is_open": False, "status": "HOLIDAY",
                "text": "Markets Closed", "reason": "Trading Holiday"}
    if minutes < MARKET_OPEN_MIN:
        return {**base, "is_open": False, "status": "PRE_MARKET",
                "text": "Pre-Market", "reason": "Opens 9:15 AM IST"}
    if minutes > MARKET_CLOSE_MIN:
        return {**base, "is_open": False, "status": "CLOSED",
                "text": "Markets Closed", "reason": "After hours"}
    return {**base, "is_open": True, "status": "OPEN",
            "text": "Markets Open", "reason": "Regular trading"}
