from __future__ import annotations

from datetime import datetime, timedelta, timezone

from echo.photo_repository import Photo, PhotoRepository


def _ts(days: int = 0, hours: int = 0) -> datetime:
    """Helper that returns a timezone-aware timestamp."""

    base = datetime(2023, 5, 1, tzinfo=timezone.utc)
    return base + timedelta(days=days, hours=hours)


def test_latest_for_place_returns_none_when_missing() -> None:
    repo = PhotoRepository()
    assert repo.latest_for_place("unknown") is None


def test_latest_for_place_resilient_to_out_of_order_inserts() -> None:
    photo_a = Photo(id="1", place_id="cathedral", captured_at=_ts(days=1))
    photo_b = Photo(id="2", place_id="cathedral", captured_at=_ts(days=3))
    photo_c = Photo(id="3", place_id="cathedral", captured_at=_ts(days=2))

    repo = PhotoRepository([photo_b, photo_c])
    repo.add(photo_a)

    # Prior to the fix, the repository returned ``photo_a`` because it was the
    # last item added even though it is not the most recent capture.  The fix
    # ensures we pick the timestamp that is truly the latest.
    assert repo.latest_for_place("cathedral") == photo_b


def test_by_place_groups_photos() -> None:
    repo = PhotoRepository(
        [
            Photo(id="1", place_id="museum", captured_at=_ts()),
            Photo(id="2", place_id="museum", captured_at=_ts(hours=5)),
            Photo(id="3", place_id="park", captured_at=_ts(days=1)),
        ]
    )

    grouped = repo.by_place()

    assert set(grouped) == {"museum", "park"}
    assert {photo.id for photo in grouped["museum"]} == {"1", "2"}
    assert grouped["park"][0].id == "3"
