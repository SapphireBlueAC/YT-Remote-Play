"""YT Music Remote — PC Server entry point.

Starts the WebSocket server, initializes the music API and player,
and runs the state broadcast loop.

Usage:
    python main.py
"""

import asyncio
import signal
import socket
import logging
import sys
import websockets
import locale

# Fix for libmpv segfault on Arch Linux
locale.setlocale(locale.LC_NUMERIC, "C")

from config import WS_HOST, WS_PORT, AUTH_PIN, STATE_BROADCAST_INTERVAL, YTMUSIC_AUTH_FILE, MPV_DEFAULT_VOLUME
from music_api import MusicAPI
from player import Player
from protocol import Protocol

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("server")


class YTMusicServer:
    """Main server that ties everything together."""

    def __init__(self):
        self._music_api = MusicAPI()
        self._player = Player()
        self._protocol = Protocol(self._music_api, self._player)
        self._connected_clients: set = set()
        self._running = False
        self._server = None

    async def start(self) -> None:
        """Initialize components and start the WebSocket server."""
        # Initialize music API
        logger.info("Initializing YouTube Music API...")
        await self._music_api.initialize(YTMUSIC_AUTH_FILE)

        # Initialize player
        logger.info("Initializing audio player...")
        self._player.initialize(default_volume=MPV_DEFAULT_VOLUME)
        self._player.set_music_api(self._music_api)

        # Set up auto-next on track end
        self._player.set_on_track_end(lambda: asyncio.ensure_future(self._auto_next()))

        # Start WebSocket server
        self._running = True
        self._server = await websockets.serve(
            self._handle_connection,
            WS_HOST,
            WS_PORT,
        )

        local_ip = self._get_local_ip()

        # Print connection info
        print()
        print("=" * 50)
        print("  YT Music Remote — Server Running")
        print("=" * 50)
        print()
        print(f"  📡 WebSocket:  ws://{local_ip}:{WS_PORT}")
        print(f"  🔑 PIN:        {AUTH_PIN}")
        print()
        print(f"  Enter this IP and PIN in the phone app")
        print(f"  to connect your remote.")
        print()
        print("=" * 50)
        print()
        print("Waiting for connections... (Ctrl+C to stop)")
        print()

        # Start state broadcast loop
        broadcast_task = asyncio.create_task(self._state_broadcast_loop())

        # Keep running until stopped
        try:
            await asyncio.Future()  # Run forever
        except asyncio.CancelledError:
            pass
        finally:
            broadcast_task.cancel()

    async def stop(self) -> None:
        """Gracefully shut down server, player, and connections."""
        logger.info("Shutting down...")
        self._running = False

        # Close all WebSocket connections
        if self._connected_clients:
            await asyncio.gather(
                *[ws.close() for ws in self._connected_clients],
                return_exceptions=True,
            )

        # Stop the WebSocket server
        if self._server:
            self._server.close()
            await self._server.wait_closed()

        # Shut down player
        self._player.shutdown()
        logger.info("Server stopped.")

        # Force exit
        asyncio.get_event_loop().stop()

    async def _handle_connection(self, websocket) -> None:
        """Handle a single WebSocket client connection lifecycle."""
        remote = websocket.remote_address
        logger.info(f"Client connected: {remote}")
        self._connected_clients.add(websocket)

        try:
            async for message in websocket:
                await self._protocol.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client disconnected: {remote}")
        except Exception as e:
            logger.error(f"Connection error: {e}")
        finally:
            self._connected_clients.discard(websocket)
            self._protocol.remove_client(websocket)
            logger.info(f"Client removed: {remote}")

    async def _state_broadcast_loop(self) -> None:
        """Periodically broadcast now_playing state to all clients."""
        while self._running:
            try:
                if self._connected_clients:
                    await self._protocol.broadcast_state(self._connected_clients)
                await asyncio.sleep(STATE_BROADCAST_INTERVAL)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Broadcast error: {e}")
                await asyncio.sleep(1)

    async def _auto_next(self) -> None:
        """Called when a track ends — automatically play the next one."""
        await self._player.next_track()
        if self._connected_clients:
            await self._protocol.broadcast_state(self._connected_clients)

    @staticmethod
    def _get_local_ip() -> str:
        """Detect this machine's IP on the local network.

        Returns:
            Local IP address string (e.g., '192.168.43.100').
        """
        try:
            # Connect to an external address to determine local IP
            # (doesn't actually send data)
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"


def main():
    """Entry point — create and run the server."""
    server = YTMusicServer()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    # Handle Ctrl+C gracefully
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.ensure_future(server.stop()))

    try:
        loop.run_until_complete(server.start())
    except KeyboardInterrupt:
        loop.run_until_complete(server.stop())
    finally:
        loop.close()


if __name__ == "__main__":
    main()
