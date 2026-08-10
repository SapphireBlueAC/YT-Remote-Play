"""YouTube Music API wrapper using ytmusicapi.

Handles search, browse, playlists, lyrics, and library access
with Google account OAuth authentication.
"""

import asyncio
import subprocess
import json
import logging
from functools import partial
from ytmusicapi import YTMusic

logger = logging.getLogger(__name__)


class MusicAPI:
    """Wrapper around ytmusicapi for all YouTube Music data operations."""

    def __init__(self):
        self._ytmusic: YTMusic | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

    async def initialize(self, auth_file: str) -> None:
        """Initialize ytmusicapi with OAuth credentials.

        Args:
            auth_file: Path to oauth.json from `ytmusicapi oauth`.
        """
        self._loop = asyncio.get_event_loop()
        try:
            self._ytmusic = await self._run_sync(YTMusic, auth_file)
            logger.info("ytmusicapi initialized with OAuth")
        except Exception:
            # Fallback to unauthenticated (no playlists/liked songs, but search works)
            self._ytmusic = await self._run_sync(YTMusic)
            logger.warning("ytmusicapi initialized WITHOUT auth — playlists/liked songs unavailable")

    async def _run_sync(self, func, *args, **kwargs):
        """Run a blocking function in a thread pool to avoid blocking the event loop."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(func, *args, **kwargs))

    async def search(self, query: str, filter_type: str = "songs") -> list[dict]:
        """Search YouTube Music.

        Args:
            query: Search query string.
            filter_type: One of 'songs', 'artists', 'albums', 'playlists'.

        Returns:
            List of result dicts with normalized fields.
        """
        filter_map = {
            "songs": "songs",
            "artists": "artists",
            "albums": "albums",
            "playlists": "community_playlists",
        }
        yt_filter = filter_map.get(filter_type, "songs")

        try:
            raw_results = await self._run_sync(
                self._ytmusic.search, query, filter=yt_filter, limit=20
            )
            return [self._normalize_result(r, filter_type) for r in raw_results]
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []

    def _normalize_result(self, item: dict, filter_type: str) -> dict:
        """Normalize a ytmusicapi result into a consistent format."""
        if filter_type == "songs":
            return {
                "videoId": item.get("videoId", ""),
                "title": item.get("title", "Unknown"),
                "artist": self._get_artist_name(item),
                "album": self._get_album_name(item),
                "thumbnail": self._get_thumbnail(item),
                "duration": self._parse_duration(item.get("duration", "0:00")),
                "type": "song",
            }
        elif filter_type == "artists":
            return {
                "browseId": item.get("browseId", ""),
                "title": item.get("artist", item.get("title", "Unknown")),
                "artist": "",
                "thumbnail": self._get_thumbnail(item),
                "type": "artist",
            }
        elif filter_type == "albums":
            return {
                "browseId": item.get("browseId", ""),
                "title": item.get("title", "Unknown"),
                "artist": self._get_artist_name(item),
                "thumbnail": self._get_thumbnail(item),
                "year": item.get("year", ""),
                "type": "album",
            }
        elif filter_type == "playlists":
            return {
                "playlistId": item.get("browseId", ""),
                "title": item.get("title", "Unknown"),
                "artist": item.get("author", ""),
                "thumbnail": self._get_thumbnail(item),
                "count": item.get("itemCount", 0),
                "type": "playlist",
            }
        return item

    @staticmethod
    def _get_artist_name(item: dict) -> str:
        """Extract artist name from various ytmusicapi formats."""
        artists = item.get("artists")
        if artists and isinstance(artists, list):
            return ", ".join(a.get("name", "") for a in artists if a.get("name"))
        return item.get("artist", "Unknown Artist")

    @staticmethod
    def _get_album_name(item: dict) -> str:
        """Extract album name."""
        album = item.get("album")
        if isinstance(album, dict):
            return album.get("name", "")
        return album or ""

    @staticmethod
    def _get_thumbnail(item: dict) -> str:
        """Get the best quality thumbnail URL."""
        thumbnails = item.get("thumbnails")
        if thumbnails and isinstance(thumbnails, list):
            return thumbnails[-1].get("url", "")
        return ""

    @staticmethod
    def _parse_duration(duration_str: str) -> int:
        """Parse duration string like '3:45' or '1:02:30' into seconds."""
        if not duration_str:
            return 0
        parts = duration_str.split(":")
        try:
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        except ValueError:
            return 0
        return 0

    async def get_song_details(self, video_id: str) -> dict:
        """Get full metadata for a song.

        Args:
            video_id: YouTube video ID.

        Returns:
            Dict with title, artist, album, thumbnail, duration, isLiked.
        """
        try:
            song = await self._run_sync(self._ytmusic.get_song, video_id)
            video_details = song.get("videoDetails", {})
            like_status = song.get("likeStatus", "INDIFFERENT")

            return {
                "videoId": video_id,
                "title": video_details.get("title", "Unknown"),
                "artist": video_details.get("author", "Unknown Artist"),
                "album": "",
                "thumbnail": self._get_thumbnail(video_details),
                "duration": int(video_details.get("lengthSeconds", 0)),
                "isLiked": like_status == "LIKE",
            }
        except Exception as e:
            logger.error(f"get_song_details failed for {video_id}: {e}")
            return {
                "videoId": video_id, "title": "Unknown", "artist": "Unknown",
                "album": "", "thumbnail": "", "duration": 0, "isLiked": False,
            }

    async def get_stream_url(self, video_id: str) -> str:
        """Extract direct audio stream URL using yt-dlp.

        Args:
            video_id: YouTube video ID.

        Returns:
            Direct audio URL string (no ads).
        """
        url = f"https://music.youtube.com/watch?v={video_id}"
        try:
            result = await self._run_sync(
                subprocess.run,
                [
                    "yt-dlp",
                    "-f", "bestaudio",
                    "--get-url",
                    "--no-warnings",
                    "--no-playlist",
                    url,
                ],
                capture_output=True,
                text=True,
                timeout=15,
            )
            stream_url = result.stdout.strip()
            if stream_url:
                logger.info(f"Got stream URL for {video_id}")
                return stream_url
            else:
                logger.error(f"yt-dlp returned empty URL: {result.stderr}")
                return ""
        except Exception as e:
            logger.error(f"yt-dlp failed for {video_id}: {e}")
            return ""

    async def get_home(self) -> list[dict]:
        """Get home feed / recommendations.

        Returns:
            List of sections, each with title and list of items.
        """
        try:
            raw = await self._run_sync(self._ytmusic.get_home, limit=6)
            sections = []
            for section in raw:
                items = []
                for item in section.get("contents", []):
                    video_id = item.get("videoId")
                    if video_id:
                        items.append({
                            "videoId": video_id,
                            "title": item.get("title", "Unknown"),
                            "artist": self._get_artist_name(item),
                            "thumbnail": self._get_thumbnail(item),
                            "duration": self._parse_duration(item.get("duration", "0:00")),
                            "type": "song",
                        })
                if items:
                    sections.append({
                        "title": section.get("title", "Recommendations"),
                        "items": items,
                    })
            return sections
        except Exception as e:
            logger.error(f"get_home failed: {e}")
            return []

    async def get_library_playlists(self) -> list[dict]:
        """Get user's saved playlists.

        Returns:
            List of playlist dicts with: playlistId, title, thumbnail, count.
        """
        try:
            raw = await self._run_sync(self._ytmusic.get_library_playlists, limit=50)
            return [
                {
                    "playlistId": p.get("playlistId", ""),
                    "title": p.get("title", "Unknown"),
                    "thumbnail": self._get_thumbnail(p),
                    "count": p.get("count", 0),
                }
                for p in raw
            ]
        except Exception as e:
            logger.error(f"get_library_playlists failed: {e}")
            return []

    async def get_playlist(self, playlist_id: str) -> dict:
        """Get playlist details and tracks.

        Args:
            playlist_id: YouTube Music playlist ID.

        Returns:
            Dict with title, description, thumbnail, and list of tracks.
        """
        try:
            raw = await self._run_sync(self._ytmusic.get_playlist, playlist_id, limit=100)
            tracks = []
            for item in raw.get("tracks", []):
                video_id = item.get("videoId")
                if video_id:
                    tracks.append({
                        "videoId": video_id,
                        "title": item.get("title", "Unknown"),
                        "artist": self._get_artist_name(item),
                        "album": self._get_album_name(item),
                        "thumbnail": self._get_thumbnail(item),
                        "duration": self._parse_duration(item.get("duration", "0:00")),
                        "type": "song",
                    })
            return {
                "title": raw.get("title", "Unknown Playlist"),
                "description": raw.get("description", ""),
                "thumbnail": self._get_thumbnail(raw),
                "tracks": tracks,
            }
        except Exception as e:
            logger.error(f"get_playlist failed for {playlist_id}: {e}")
            return {"title": "Error", "description": "", "thumbnail": "", "tracks": []}

    async def get_liked_songs(self, limit: int = 50) -> list[dict]:
        """Get user's liked songs.

        Args:
            limit: Max number of songs to return.

        Returns:
            List of song dicts.
        """
        try:
            raw = await self._run_sync(self._ytmusic.get_liked_songs, limit=limit)
            tracks = []
            for item in raw.get("tracks", []):
                video_id = item.get("videoId")
                if video_id:
                    tracks.append({
                        "videoId": video_id,
                        "title": item.get("title", "Unknown"),
                        "artist": self._get_artist_name(item),
                        "album": self._get_album_name(item),
                        "thumbnail": self._get_thumbnail(item),
                        "duration": self._parse_duration(item.get("duration", "0:00")),
                        "type": "song",
                    })
            return tracks
        except Exception as e:
            logger.error(f"get_liked_songs failed: {e}")
            return []

    async def get_lyrics(self, video_id: str) -> str | None:
        """Get lyrics for a song.

        Args:
            video_id: YouTube video ID.

        Returns:
            Lyrics text string, or None if unavailable.
        """
        try:
            # First get the watch playlist to find the lyrics browse ID
            watch = await self._run_sync(self._ytmusic.get_watch_playlist, video_id)
            lyrics_id = watch.get("lyrics")
            if not lyrics_id:
                return None
            lyrics_data = await self._run_sync(self._ytmusic.get_lyrics, lyrics_id)
            return lyrics_data.get("lyrics", None) if lyrics_data else None
        except Exception as e:
            logger.error(f"get_lyrics failed for {video_id}: {e}")
            return None

    async def get_artist(self, artist_id: str) -> dict:
        """Get artist page details.

        Args:
            artist_id: YouTube Music artist browse ID.

        Returns:
            Dict with name, thumbnail, top songs, albums.
        """
        try:
            raw = await self._run_sync(self._ytmusic.get_artist, artist_id)
            top_songs = []
            for item in (raw.get("songs", {}).get("results", []))[:10]:
                video_id = item.get("videoId")
                if video_id:
                    top_songs.append({
                        "videoId": video_id,
                        "title": item.get("title", "Unknown"),
                        "artist": self._get_artist_name(item),
                        "thumbnail": self._get_thumbnail(item),
                        "duration": self._parse_duration(item.get("duration", "0:00")),
                        "type": "song",
                    })
            return {
                "name": raw.get("name", "Unknown Artist"),
                "thumbnail": self._get_thumbnail(raw),
                "topSongs": top_songs,
            }
        except Exception as e:
            logger.error(f"get_artist failed for {artist_id}: {e}")
            return {"name": "Error", "thumbnail": "", "topSongs": []}

    async def get_album(self, album_id: str) -> dict:
        """Get album details and tracks.

        Args:
            album_id: YouTube Music album browse ID.

        Returns:
            Dict with title, artist, thumbnail, year, and track list.
        """
        try:
            raw = await self._run_sync(self._ytmusic.get_album, album_id)
            tracks = []
            for item in raw.get("tracks", []):
                video_id = item.get("videoId")
                if video_id:
                    tracks.append({
                        "videoId": video_id,
                        "title": item.get("title", "Unknown"),
                        "artist": self._get_artist_name(item),
                        "thumbnail": self._get_thumbnail(item),
                        "duration": self._parse_duration(item.get("duration", "0:00")),
                        "type": "song",
                    })
            return {
                "title": raw.get("title", "Unknown Album"),
                "artist": raw.get("artists", [{}])[0].get("name", "Unknown") if raw.get("artists") else "Unknown",
                "thumbnail": self._get_thumbnail(raw),
                "year": raw.get("year", ""),
                "tracks": tracks,
            }
        except Exception as e:
            logger.error(f"get_album failed for {album_id}: {e}")
            return {"title": "Error", "artist": "", "thumbnail": "", "year": "", "tracks": []}

    async def toggle_like(self, video_id: str) -> bool:
        """Toggle like status for a song.

        Args:
            video_id: YouTube video ID.

        Returns:
            New like state (True = liked, False = not liked).
        """
        try:
            song = await self._run_sync(self._ytmusic.get_song, video_id)
            current_status = song.get("likeStatus", "INDIFFERENT")

            if current_status == "LIKE":
                await self._run_sync(self._ytmusic.rate_song, video_id, "INDIFFERENT")
                return False
            else:
                await self._run_sync(self._ytmusic.rate_song, video_id, "LIKE")
                return True
        except Exception as e:
            logger.error(f"toggle_like failed for {video_id}: {e}")
            return False
