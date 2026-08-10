/**
 * WebSocket message type definitions.
 * Shared protocol between PC server and Android app.
 */

// --- Phone → PC Commands ---

export type SearchCommand = {
  type: "search";
  query: string;
  filter: "songs" | "artists" | "albums" | "playlists";
};

export type PlayCommand = { type: "play"; videoId: string };
export type PlayPlaylistCommand = { type: "play_playlist"; playlistId: string };
export type PauseCommand = { type: "pause" };
export type ResumeCommand = { type: "resume" };
export type NextCommand = { type: "next" };
export type PreviousCommand = { type: "previous" };
export type SeekCommand = { type: "seek"; position: number };
export type VolumeCommand = { type: "volume"; level: number };
export type QueueAddCommand = { type: "queue_add"; videoId: string };
export type QueueRemoveCommand = { type: "queue_remove"; index: number };
export type GetQueueCommand = { type: "get_queue" };
export type GetLyricsCommand = { type: "get_lyrics" };
export type GetHomeCommand = { type: "get_home" };
export type GetPlaylistsCommand = { type: "get_playlists" };
export type GetPlaylistCommand = { type: "get_playlist"; playlistId: string };
export type GetLikedCommand = { type: "get_liked" };
export type ToggleLikeCommand = { type: "toggle_like" };
export type AuthCommand = { type: "auth"; pin: string };

export type ClientCommand =
  | SearchCommand | PlayCommand | PlayPlaylistCommand
  | PauseCommand | ResumeCommand | NextCommand | PreviousCommand
  | SeekCommand | VolumeCommand | QueueAddCommand | QueueRemoveCommand
  | GetQueueCommand | GetLyricsCommand | GetHomeCommand
  | GetPlaylistsCommand | GetPlaylistCommand | GetLikedCommand
  | ToggleLikeCommand | AuthCommand;

// --- PC → Phone Responses ---

export type Track = {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail: string;
  duration: number; // seconds
};

export type NowPlayingResponse = {
  type: "now_playing";
  title: string;
  artist: string;
  album: string;
  thumbnail: string;
  duration: number;
  position: number;
  isPlaying: boolean;
  volume: number;
  videoId: string;
  isLiked: boolean;
};

export type SearchResultsResponse = {
  type: "search_results";
  results: Track[];
};

export type LyricsResponse = {
  type: "lyrics";
  text: string | null;
};

export type PlaylistsResponse = {
  type: "playlists";
  items: { playlistId: string; title: string; thumbnail: string; count: number }[];
};

export type PlaylistDetailResponse = {
  type: "playlist_detail";
  title: string;
  tracks: Track[];
};

export type QueueResponse = {
  type: "queue";
  items: Track[];
  currentIndex: number;
};

export type HomeFeedResponse = {
  type: "home_feed";
  sections: { title: string; items: Track[] }[];
};

export type AuthResultResponse = {
  type: "auth_result";
  success: boolean;
};

export type ErrorResponse = {
  type: "error";
  message: string;
};

export type ServerResponse =
  | NowPlayingResponse | SearchResultsResponse | LyricsResponse
  | PlaylistsResponse | PlaylistDetailResponse | QueueResponse
  | HomeFeedResponse | AuthResultResponse | ErrorResponse;
