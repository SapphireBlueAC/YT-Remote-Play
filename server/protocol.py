"""WebSocket message protocol handler.

Routes incoming commands from the phone to the appropriate
music_api/player methods, and formats outgoing responses.
"""

import json
import logging
import asyncio
from music_api import MusicAPI
from player import Player
from config import AUTH_PIN

logger = logging.getLogger(__name__)


class Protocol:
    """Handles WebSocket message routing and response formatting."""

    def __init__(self, music_api: MusicAPI, player: Player):
        self._api = music_api
        self._player = player
        self._authenticated_clients: set = set()

        # Command dispatch table
        self._handlers = {
            "auth": self._handle_auth,
            "search": self._handle_search,
            "play": self._handle_play,
            "play_playlist": self._handle_play_playlist,
            "pause": self._handle_pause,
            "resume": self._handle_resume,
            "next": self._handle_next,
            "previous": self._handle_previous,
            "seek": self._handle_seek,
            "volume": self._handle_volume,
            "queue_add": self._handle_queue_add,
            "queue_remove": self._handle_queue_remove,
            "get_queue": self._handle_get_queue,
            "get_lyrics": self._handle_get_lyrics,
            "get_home": self._handle_get_home,
            "get_playlists": self._handle_get_playlists,
            "get_playlist": self._handle_get_playlist,
            "get_liked": self._handle_get_liked,
            "toggle_like": self._handle_toggle_like,
        }

    async def handle_message(self, websocket, raw_message: str) -> None:
        """Parse and route an incoming WebSocket message."""
        try:
            data = json.loads(raw_message)
        except json.JSONDecodeError:
            await self._send(websocket, self._format_error("Invalid JSON"))
            return

        msg_type = data.get("type")
        if not msg_type:
            await self._send(websocket, self._format_error("Missing 'type' field"))
            return

        # Auth check (allow auth command without authentication)
        if msg_type != "auth" and websocket not in self._authenticated_clients:
            await self._send(websocket, self._format_error("Not authenticated. Send auth first."))
            return

        handler = self._handlers.get(msg_type)
        if handler:
            try:
                await handler(websocket, data)
            except Exception as e:
                logger.error(f"Handler error for '{msg_type}': {e}")
                await self._send(websocket, self._format_error(f"Server error: {str(e)}"))
        else:
            await self._send(websocket, self._format_error(f"Unknown command: {msg_type}"))

    def remove_client(self, websocket) -> None:
        """Remove a client from authenticated set on disconnect."""
        self._authenticated_clients.discard(websocket)

    # --- Command handlers ---

    async def _handle_auth(self, ws, data: dict) -> None:
        """Verify PIN and authenticate the client."""
        pin = data.get("pin", "")
        if pin == AUTH_PIN:
            self._authenticated_clients.add(ws)
            await self._send(ws, json.dumps({"type": "auth_result", "success": True}))
            # Send current state immediately after auth
            state = self._player.get_current_state()
            await self._send(ws, json.dumps(state))
            logger.info("Client authenticated")
        else:
            await self._send(ws, json.dumps({"type": "auth_result", "success": False}))
            logger.warning(f"Auth failed — wrong PIN")

    async def _handle_search(self, ws, data: dict) -> None:
        """Search YouTube Music and send results."""
        query = data.get("query", "")
        filter_type = data.get("filter", "songs")
        results = await self._api.search(query, filter_type)
        await self._send(ws, json.dumps({"type": "search_results", "results": results}))

    async def _handle_play(self, ws, data: dict) -> None:
        """Play a song by videoId."""
        video_id = data.get("videoId", "")
        if not video_id:
            await self._send(ws, self._format_error("Missing videoId"))
            return

        # Get metadata if not provided
        metadata = data.get("metadata")
        if not metadata:
            metadata = await self._api.get_song_details(video_id)

        await self._player.play(video_id, metadata)
        # Broadcast new state to all clients
        await self.broadcast_state(self._authenticated_clients)

    async def _handle_play_playlist(self, ws, data: dict) -> None:
        """Fetch and play an entire playlist."""
        playlist_id = data.get("playlistId", "")
        if not playlist_id:
            await self._send(ws, self._format_error("Missing playlistId"))
            return

        playlist = await self._api.get_playlist(playlist_id)
        tracks = playlist.get("tracks", [])
        if tracks:
            await self._player.play_playlist(tracks)
            await self.broadcast_state(self._authenticated_clients)
        else:
            await self._send(ws, self._format_error("Playlist is empty"))

    async def _handle_pause(self, ws, data: dict) -> None:
        """Pause playback."""
        self._player.pause()
        await self.broadcast_state(self._authenticated_clients)

    async def _handle_resume(self, ws, data: dict) -> None:
        """Resume playback."""
        self._player.resume()
        await self.broadcast_state(self._authenticated_clients)

    async def _handle_next(self, ws, data: dict) -> None:
        """Skip to next track."""
        await self._player.next_track()
        await self.broadcast_state(self._authenticated_clients)

    async def _handle_previous(self, ws, data: dict) -> None:
        """Go to previous track."""
        await self._player.previous_track()
        await self.broadcast_state(self._authenticated_clients)

    async def _handle_seek(self, ws, data: dict) -> None:
        """Seek to position."""
        position = data.get("position", 0)
        self._player.seek(float(position))
        await self.broadcast_state(self._authenticated_clients)

    async def _handle_volume(self, ws, data: dict) -> None:
        """Set volume level."""
        level = data.get("level", 70)
        self._player.set_volume(int(level))
        await self.broadcast_state(self._authenticated_clients)

    async def _handle_queue_add(self, ws, data: dict) -> None:
        """Add track to queue."""
        video_id = data.get("videoId", "")
        if not video_id:
            await self._send(ws, self._format_error("Missing videoId"))
            return

        metadata = await self._api.get_song_details(video_id)
        self._player.queue_add(metadata)
        # Send updated queue
        await self._send(ws, json.dumps({"type": "queue", **self._player.get_queue()}))

    async def _handle_queue_remove(self, ws, data: dict) -> None:
        """Remove track from queue."""
        index = data.get("index")
        if index is None:
            await self._send(ws, self._format_error("Missing index"))
            return

        self._player.queue_remove(int(index))
        await self._send(ws, json.dumps({"type": "queue", **self._player.get_queue()}))

    async def _handle_get_queue(self, ws, data: dict) -> None:
        """Send current queue to phone."""
        queue = self._player.get_queue()
        await self._send(ws, json.dumps({"type": "queue", **queue}))

    async def _handle_get_lyrics(self, ws, data: dict) -> None:
        """Fetch and send lyrics for current track."""
        state = self._player.get_current_state()
        video_id = state.get("videoId", "")
        if not video_id:
            await self._send(ws, json.dumps({"type": "lyrics", "text": None}))
            return

        lyrics = await self._api.get_lyrics(video_id)
        await self._send(ws, json.dumps({"type": "lyrics", "text": lyrics}))

    async def _handle_get_home(self, ws, data: dict) -> None:
        """Send home feed / recommendations."""
        sections = await self._api.get_home()
        await self._send(ws, json.dumps({"type": "home_feed", "sections": sections}))

    async def _handle_get_playlists(self, ws, data: dict) -> None:
        """Send user's playlist library."""
        playlists = await self._api.get_library_playlists()
        await self._send(ws, json.dumps({"type": "playlists", "items": playlists}))

    async def _handle_get_playlist(self, ws, data: dict) -> None:
        """Send playlist details and tracks."""
        playlist_id = data.get("playlistId", "")
        if not playlist_id:
            await self._send(ws, self._format_error("Missing playlistId"))
            return

        playlist = await self._api.get_playlist(playlist_id)
        await self._send(ws, json.dumps({"type": "playlist_detail", **playlist}))

    async def _handle_get_liked(self, ws, data: dict) -> None:
        """Send liked songs."""
        songs = await self._api.get_liked_songs()
        await self._send(ws, json.dumps({"type": "liked_songs", "tracks": songs}))

    async def _handle_toggle_like(self, ws, data: dict) -> None:
        """Toggle like on current song."""
        state = self._player.get_current_state()
        video_id = state.get("videoId", "")
        if not video_id:
            await self._send(ws, self._format_error("No track playing"))
            return

        is_liked = await self._api.toggle_like(video_id)
        await self.broadcast_state(self._authenticated_clients)

    # --- Helpers ---

    @staticmethod
    async def _send(websocket, message: str) -> None:
        """Send a message to a WebSocket client, handling errors."""
        try:
            await websocket.send(message)
        except Exception as e:
            logger.error(f"Send failed: {e}")

    @staticmethod
    def _format_error(message: str) -> str:
        """Format error response as JSON string."""
        return json.dumps({"type": "error", "message": message})

    async def broadcast_state(self, connected_clients: set) -> None:
        """Send now_playing state to all authenticated clients."""
        state = self._player.get_current_state()
        message = json.dumps(state)

        # Only send to authenticated clients
        targets = self._authenticated_clients & connected_clients
        if targets:
            await asyncio.gather(
                *[self._send(ws, message) for ws in targets],
                return_exceptions=True,
            )
