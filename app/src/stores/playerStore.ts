/**
 * Player state store using Zustand.
 * Single source of truth for all app state.
 */

import { create } from "zustand";
import { Track, NowPlayingResponse, ServerResponse } from "../services/protocol";
import { wsService } from "../services/websocket";

export type PlaylistItem = {
  playlistId: string;
  title: string;
  thumbnail: string;
  count: number;
};

export type HomeFeedSection = {
  title: string;
  items: Track[];
};

export type PlayerState = {
  // Connection
  isConnected: boolean;
  serverIp: string;
  isAuthenticated: boolean;

  // Now Playing
  currentTrack: NowPlayingResponse | null;

  // Queue
  queue: Track[];
  queueIndex: number;

  // Search
  searchResults: Track[];
  searchLoading: boolean;

  // Library
  playlists: PlaylistItem[];
  likedSongs: Track[];
  homeFeed: HomeFeedSection[];

  // Lyrics
  lyrics: string | null;

  pin: string;
  // Actions
  setConnected: (connected: boolean) => void;
  setServerIp: (ip: string) => void;
  setPin: (pin: string) => void;
  setAuthenticated: (auth: boolean) => void;
  updateNowPlaying: (data: NowPlayingResponse) => void;
  setSearchResults: (results: Track[]) => void;
  setSearchLoading: (loading: boolean) => void;
  setQueue: (items: Track[], index: number) => void;
  setPlaylists: (items: PlaylistItem[]) => void;
  setLikedSongs: (songs: Track[]) => void;
  setHomeFeed: (sections: HomeFeedSection[]) => void;
  setLyrics: (text: string | null) => void;
  handleServerMessage: (msg: ServerResponse) => void;

  // Commands (send to server)
  sendPlay: (videoId: string, metadata?: Track) => void;
  sendPause: () => void;
  sendResume: () => void;
  sendNext: () => void;
  sendPrevious: () => void;
  sendSeek: (position: number) => void;
  sendVolume: (level: number) => void;
  sendSearch: (query: string, filter: string) => void;
  sendAuth: (pin: string) => void;
  sendQueueAdd: (videoId: string) => void;
  sendQueueRemove: (index: number) => void;
  sendGetQueue: () => void;
  sendGetLyrics: () => void;
  sendGetHome: () => void;
  sendGetPlaylists: () => void;
  sendGetPlaylist: (playlistId: string) => void;
  sendGetLiked: () => void;
  sendPlayPlaylist: (playlistId: string) => void;
  sendToggleLike: () => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // Initial state
  isConnected: false,
  serverIp: "",
  pin: "",
  isAuthenticated: false,
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  searchResults: [],
  searchLoading: false,
  playlists: [],
  likedSongs: [],
  homeFeed: [],
  lyrics: null,

  // State setters
  setConnected: (connected) => set({ isConnected: connected }),
  setServerIp: (ip) => set({ serverIp: ip }),
  setPin: (pin) => set({ pin }),
  setAuthenticated: (auth) => set({ isAuthenticated: auth }),
  updateNowPlaying: (data) => set({ currentTrack: data }),
  setSearchResults: (results) => set({ searchResults: results, searchLoading: false }),
  setSearchLoading: (loading) => set({ searchLoading: loading }),
  setQueue: (items, index) => set({ queue: items, queueIndex: index }),
  setPlaylists: (items) => set({ playlists: items }),
  setLikedSongs: (songs) => set({ likedSongs: songs }),
  setHomeFeed: (sections) => set({ homeFeed: sections }),
  setLyrics: (text) => set({ lyrics: text }),

  // Handle incoming server messages
  handleServerMessage: (msg) => {
    switch (msg.type) {
      case "now_playing":
        set({ currentTrack: msg });
        break;
      case "search_results":
        set({ searchResults: msg.results, searchLoading: false });
        break;
      case "lyrics":
        set({ lyrics: msg.text });
        break;
      case "playlists":
        set({ playlists: msg.items });
        break;
      case "queue":
        set({ queue: msg.items, queueIndex: msg.currentIndex });
        break;
      case "home_feed":
        set({ homeFeed: msg.sections });
        break;
      case "auth_result":
        set({ isAuthenticated: msg.success });
        break;
      case "error":
        console.warn("[Server Error]", msg.message);
        break;
      default:
        // Handle playlist_detail, liked_songs, etc. via specific screens
        break;
    }
  },

  // Commands — send to PC server via WebSocket
  sendPlay: (videoId, metadata) =>
    wsService.send({ type: "play", videoId, ...(metadata ? { metadata } : {}) } as any),
  sendPause: () => wsService.send({ type: "pause" }),
  sendResume: () => wsService.send({ type: "resume" }),
  sendNext: () => wsService.send({ type: "next" }),
  sendPrevious: () => wsService.send({ type: "previous" }),
  sendSeek: (position) => wsService.send({ type: "seek", position }),
  sendVolume: (level) => wsService.send({ type: "volume", level }),
  sendSearch: (query, filter) => {
    set({ searchLoading: true });
    wsService.send({ type: "search", query, filter: filter as any });
  },
  sendAuth: (pin) => wsService.send({ type: "auth", pin }),
  sendQueueAdd: (videoId) => wsService.send({ type: "queue_add", videoId }),
  sendQueueRemove: (index) => wsService.send({ type: "queue_remove", index }),
  sendGetQueue: () => wsService.send({ type: "get_queue" }),
  sendGetLyrics: () => wsService.send({ type: "get_lyrics" }),
  sendGetHome: () => wsService.send({ type: "get_home" }),
  sendGetPlaylists: () => wsService.send({ type: "get_playlists" }),
  sendGetPlaylist: (playlistId) => wsService.send({ type: "get_playlist", playlistId }),
  sendGetLiked: () => wsService.send({ type: "get_liked" }),
  sendPlayPlaylist: (playlistId) => wsService.send({ type: "play_playlist", playlistId }),
  sendToggleLike: () => wsService.send({ type: "toggle_like" }),
}));
