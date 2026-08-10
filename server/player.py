"""Audio player control using mpv via python-mpv.

Manages playback, queue, volume, and seek.
Provides current state for broadcasting to the remote app.
"""

import asyncio
import logging
import os
import locale

# Force C locale before libmpv loads
os.environ["LC_NUMERIC"] = "C"
locale.setlocale(locale.LC_NUMERIC, "C")

import mpv

logger = logging.getLogger(__name__)


class Player:
    """Controls mpv for audio playback with queue management."""

    def __init__(self):
        self._mpv: mpv.MPV | None = None
        self._queue: list[dict] = []       # [{videoId, title, artist, thumbnail, duration}, ...]
        self._current_index: int = -1
        self._volume: int = 70
        self._is_playing: bool = False
        self._current_metadata: dict = {}
        self._on_track_end_callback = None  # Set by protocol to auto-play next
        self._music_api = None              # Set after init to fetch stream URLs

    def initialize(self, default_volume: int = 70) -> None:
        """Initialize mpv player instance with audio-only config."""
        import locale
        import os
        os.environ["LC_ALL"] = "C"
        locale.setlocale(locale.LC_ALL, "C")

        self._volume = default_volume
        self._mpv = mpv.MPV(
            video=False,           # Audio only
            ytdl=False,            # We handle URLs ourselves via yt-dlp
            input_default_bindings=False,
            input_vo_keyboard=False,
            http_header_fields="User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        )
        self._mpv.volume = self._volume

        # Register end-of-file handler for auto-next
        @self._mpv.event_callback("end-file")
        def on_end(event):
            try:
                # python-mpv provides an event object, not a dict
                reason = getattr(getattr(event, 'event', None), 'reason', None)
                if reason == mpv.MpvEventEndFile.EOF or reason == 0:
                    logger.info("Track ended, triggering next")
                    if self._on_track_end_callback:
                        self._on_track_end_callback()
            except Exception as e:
                logger.error(f"Error in on_end callback: {e}")

        logger.info(f"mpv initialized, volume={self._volume}")

    def set_music_api(self, music_api) -> None:
        """Set the music API reference for fetching stream URLs."""
        self._music_api = music_api

    def set_on_track_end(self, callback) -> None:
        """Set callback for when a track finishes playing."""
        self._on_track_end_callback = callback

    async def play(self, video_id: str, metadata: dict) -> None:
        """Play a song by video ID.

        Args:
            video_id: YouTube video ID.
            metadata: Song metadata dict (title, artist, thumbnail, duration).
        """
        if not self._music_api:
            logger.error("Music API not set on player")
            return

        stream_url = await self._music_api.get_stream_url(video_id)
        if not stream_url:
            logger.error(f"Could not get stream URL for {video_id}")
            return

        self._current_metadata = {
            "videoId": video_id,
            "title": metadata.get("title", "Unknown"),
            "artist": metadata.get("artist", "Unknown Artist"),
            "album": metadata.get("album", ""),
            "thumbnail": metadata.get("thumbnail", ""),
            "duration": metadata.get("duration", 0),
            "isLiked": metadata.get("isLiked", False),
        }

        # Add to queue if not already there
        if not any(t.get("videoId") == video_id for t in self._queue):
            self._queue.append(self._current_metadata.copy())
            self._current_index = len(self._queue) - 1
        else:
            self._current_index = next(
                i for i, t in enumerate(self._queue) if t.get("videoId") == video_id
            )

        self._mpv.play(stream_url)
        self._is_playing = True
        logger.info(f"Playing: {self._current_metadata['title']} - {self._current_metadata['artist']}")

    async def play_playlist(self, tracks: list[dict]) -> None:
        """Replace queue with playlist tracks and start playing.

        Args:
            tracks: List of track dicts from a playlist.
        """
        if not tracks:
            return

        self._queue = [t.copy() for t in tracks]
        self._current_index = 0
        first = self._queue[0]
        await self.play(first["videoId"], first)
        logger.info(f"Playing playlist ({len(tracks)} tracks)")

    def pause(self) -> None:
        """Pause playback."""
        if self._mpv and self._is_playing:
            self._mpv.pause = True
            self._is_playing = False
            logger.info("Paused")

    def resume(self) -> None:
        """Resume playback."""
        if self._mpv and not self._is_playing:
            self._mpv.pause = False
            self._is_playing = True
            logger.info("Resumed")

    def toggle_playback(self) -> bool:
        """Toggle play/pause.

        Returns:
            True if now playing, False if now paused.
        """
        if self._is_playing:
            self.pause()
            return False
        else:
            self.resume()
            return True

    async def next_track(self) -> dict | None:
        """Skip to next track in queue.

        Returns:
            Metadata of the new track, or None if queue ended.
        """
        if self._current_index < len(self._queue) - 1:
            self._current_index += 1
            track = self._queue[self._current_index]
            await self.play(track["videoId"], track)
            return track
        else:
            logger.info("End of queue")
            self._is_playing = False
            return None

    async def previous_track(self) -> dict | None:
        """Go to previous track in queue.

        Returns:
            Metadata of the new track, or None if at start.
        """
        # If more than 3 seconds into current track, restart it instead
        try:
            position = self._mpv.time_pos or 0
            if position > 3 and self._current_index >= 0:
                self._mpv.seek(0, "absolute")
                return self._queue[self._current_index]
        except Exception:
            pass

        if self._current_index > 0:
            self._current_index -= 1
            track = self._queue[self._current_index]
            await self.play(track["videoId"], track)
            return track
        else:
            # Restart current track
            try:
                self._mpv.seek(0, "absolute")
            except Exception:
                pass
            return self._queue[0] if self._queue else None

    def seek(self, position: float) -> None:
        """Seek to position in current track.

        Args:
            position: Position in seconds.
        """
        if self._mpv:
            try:
                self._mpv.seek(position, "absolute")
                logger.debug(f"Seeked to {position}s")
            except Exception as e:
                logger.error(f"Seek failed: {e}")

    def set_volume(self, level: int) -> None:
        """Set volume level.

        Args:
            level: Volume 0-100.
        """
        self._volume = max(0, min(100, level))
        if self._mpv:
            self._mpv.volume = self._volume
            logger.debug(f"Volume set to {self._volume}")

    def get_volume(self) -> int:
        """Get current volume level (0-100)."""
        return self._volume

    def queue_add(self, track: dict, position: int | None = None) -> None:
        """Add a track to the queue.

        Args:
            track: Track metadata dict.
            position: Insert position (None = end of queue).
        """
        if position is None:
            self._queue.append(track)
        else:
            self._queue.insert(position, track)
        logger.info(f"Added to queue: {track.get('title', 'Unknown')}")

    def queue_remove(self, index: int) -> None:
        """Remove a track from the queue by index.

        Args:
            index: Queue index to remove.
        """
        if 0 <= index < len(self._queue):
            removed = self._queue.pop(index)
            # Adjust current index if needed
            if index < self._current_index:
                self._current_index -= 1
            elif index == self._current_index:
                self._current_index = min(self._current_index, len(self._queue) - 1)
            logger.info(f"Removed from queue: {removed.get('title', 'Unknown')}")

    def queue_clear(self) -> None:
        """Clear the queue (stops playback)."""
        self._queue.clear()
        self._current_index = -1
        if self._mpv:
            self._mpv.stop()
        self._is_playing = False
        self._current_metadata = {}
        logger.info("Queue cleared")

    def get_queue(self) -> dict:
        """Get current queue state.

        Returns:
            Dict with items list and currentIndex.
        """
        return {
            "items": self._queue,
            "currentIndex": self._current_index,
        }

    def get_current_state(self) -> dict:
        """Get current playback state for broadcasting.

        Returns:
            Dict with: title, artist, album, thumbnail, duration,
            position, isPlaying, volume, videoId, isLiked.
        """
        position = 0
        duration = self._current_metadata.get("duration", 0)

        if self._mpv:
            try:
                position = self._mpv.time_pos or 0
                # Update duration from mpv if available (more accurate)
                mpv_duration = self._mpv.duration
                if mpv_duration and mpv_duration > 0:
                    duration = mpv_duration
            except Exception:
                pass

        return {
            "type": "now_playing",
            "title": self._current_metadata.get("title", ""),
            "artist": self._current_metadata.get("artist", ""),
            "album": self._current_metadata.get("album", ""),
            "thumbnail": self._current_metadata.get("thumbnail", ""),
            "duration": round(duration, 1),
            "position": round(position, 1),
            "isPlaying": self._is_playing,
            "volume": self._volume,
            "videoId": self._current_metadata.get("videoId", ""),
            "isLiked": self._current_metadata.get("isLiked", False),
        }

    def shutdown(self) -> None:
        """Clean up mpv instance."""
        if self._mpv:
            try:
                self._mpv.terminate()
            except Exception:
                pass
            self._mpv = None
        logger.info("Player shut down")
