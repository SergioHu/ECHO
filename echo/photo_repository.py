"""Utilities to organize photos captured inside the ECHO application."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Iterable, Iterator, List, Optional


@dataclass(frozen=True, slots=True)
class Photo:
    """Representation of a photo captured in the application.

    Attributes:
        id: Stable identifier of the photo in storage.
        place_id: Identifier of the place where the photo was taken.
        captured_at: Timestamp when the picture was captured.
    """

    id: str
    place_id: str
    captured_at: datetime


class PhotoRepository:
    """In-memory collection of :class:`Photo` objects.

    The repository is intentionally lightweight so that it can be used inside
    tests without depending on the real persistence layer.  The API mirrors the
    subset of behaviour used by the mobile client when it needs to know which
    photo to display for a given place.
    """

    def __init__(self, photos: Iterable[Photo] | None = None) -> None:
        self._photos: List[Photo] = list(photos) if photos is not None else []

    # ---------------------------------------------------------------------
    # Basic collection helpers
    # ---------------------------------------------------------------------
    def add(self, photo: Photo) -> None:
        """Add ``photo`` to the collection."""

        self._photos.append(photo)

    def __iter__(self) -> Iterator[Photo]:
        return iter(self._photos)

    def by_place(self) -> Dict[str, List[Photo]]:
        """Return all photos grouped by ``place_id``."""

        groups: Dict[str, List[Photo]] = {}
        for photo in self._photos:
            groups.setdefault(photo.place_id, []).append(photo)
        return groups

    # ------------------------------------------------------------------
    # Bug fix: ``latest_for_place`` previously assumed the latest photo
    # corresponded to the most recently *added* item.  When the client
    # re-synchronised data, photos arrived out of order and the method
    # incorrectly returned outdated pictures.  We now compute the maximum
    # using the ``captured_at`` timestamp instead of relying on insertion
    # order.
    # ------------------------------------------------------------------
    def latest_for_place(self, place_id: str) -> Optional[Photo]:
        """Return the most recent photo for ``place_id`` or ``None``.

        The original implementation iterated the internal list in reverse order
        and returned the first matching photo.  This works only when photos are
        appended chronologically.  When items are reloaded from storage the
        insertion order no longer reflects capture time which resulted in stale
        pictures being shown.  The method now explicitly selects the photo with
        the highest ``captured_at`` timestamp which is resilient to reordering.
        """

        # Filtering first keeps the implementation explicit and readable.
        matches = [photo for photo in self._photos if photo.place_id == place_id]
        if not matches:
            return None
        return max(matches, key=lambda photo: photo.captured_at)
