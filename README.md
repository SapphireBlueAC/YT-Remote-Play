# YT Remote Play

Control YouTube Music playback on your computer from your phone over WebSocket.

## What this app does

- Connects a mobile remote app to a local Python server
- Searches and plays YouTube Music tracks
- Shows now playing state, queue, and lyrics
- Supports home feed, playlists, and liked songs (with OAuth)

## Project structure

- `/app` — Expo React Native mobile remote
- `/server` — Python WebSocket server + playback engine (`mpv`)

## Prerequisites

### Server machine (PC)

- Python 3.10+
- `mpv` installed and available on PATH
- `yt-dlp` available on PATH

### Mobile app development

- Node.js 18+
- npm
- Expo Go app on your phone (or Android/iOS emulator)

## Setup

### 1) Start the Python server

```bash
cd /home/runner/work/YT-Remote-Play/YT-Remote-Play/server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

The server prints:
- Local WebSocket URL (IP + port `8765`)
- PIN code (default from `server/config.py`)

> Optional: For playlists/liked songs, generate OAuth credentials and keep `oauth.json` in `/server`:
>
> ```bash
> ytmusicapi oauth
> ```

### 2) Start the Expo mobile app

```bash
cd /home/runner/work/YT-Remote-Play/YT-Remote-Play/app
npm install
npm start
```

Open the app in Expo Go (or emulator).

## Connect phone to server

1. Ensure phone and PC are on the same network.
2. In the app, enter:
   - PC IP address shown by the server
   - PIN shown by the server
3. Tap **Connect**.

## App features

- **Now Playing**: play/pause, next/previous, like/unlike
- **Search**: songs/artists/albums/playlists
- **Library**: home recommendations, playlists, liked songs
- **Queue**: view and remove queued tracks
- **Lyrics**: fetch lyrics for current track

## Scripts

### Mobile app (`/app`)

- `npm start` — start Expo
- `npm run android` — open on Android
- `npm run ios` — open on iOS

## Notes

- Default WebSocket port is `8765`.
- Default auth PIN is set in `server/config.py`.
- If OAuth is missing, search/playback still works, but account library features may be limited.
