import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { usePlayerStore } from "../stores/playerStore";
import { colors, spacing } from "../theme/theme";

const { width } = Dimensions.get("window");
const ARTWORK_SIZE = width - spacing.xl * 2;

export default function NowPlayingScreen() {
  const { currentTrack, sendPlay, sendPause, sendResume, sendNext, sendPrevious, sendToggleLike } = usePlayerStore();

  if (!currentTrack) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No track playing</Text>
      </View>
    );
  }

  const handlePlayPause = () => {
    if (currentTrack.isPlaying) {
      sendPause();
    } else {
      sendResume();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      {/* Album Art */}
      <View style={styles.artworkContainer}>
        {currentTrack.thumbnail ? (
          <Image source={{ uri: currentTrack.thumbnail }} style={styles.artwork} />
        ) : (
          <View style={styles.placeholderArtwork} />
        )}
      </View>

      {/* Track Info */}
      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          <TouchableOpacity onPress={() => sendToggleLike()} style={styles.likeBtn}>
            <Text style={styles.likeText}>{currentTrack.isLiked ? "♥" : "♡"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar (Visual only for now, real seek needs slider component) */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${currentTrack.duration > 0 ? (currentTrack.position / currentTrack.duration) * 100 : 0}%` }
            ]} 
          />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(currentTrack.position)}</Text>
          <Text style={styles.timeText}>{formatTime(currentTrack.duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={sendPrevious} style={styles.controlBtn}>
          <Text style={styles.controlText}>{"|<"}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handlePlayPause} style={styles.playBtn}>
          <Text style={styles.playText}>{currentTrack.isPlaying ? "||" : "▶"}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={sendNext} style={styles.controlBtn}>
          <Text style={styles.controlText}>{">|"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: "space-between",
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 18,
    textAlign: "center",
    marginTop: "50%",
  },
  artworkContainer: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 16,
  },
  placeholderArtwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  infoContainer: {
    marginTop: spacing.xl,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 18,
  },
  likeBtn: {
    padding: spacing.sm,
  },
  likeText: {
    color: colors.accent,
    fontSize: 28,
  },
  progressContainer: {
    marginTop: spacing.lg,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: colors.seekbarBg,
    borderRadius: 2,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.seekbar,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl * 2,
  },
  controlBtn: {
    padding: spacing.lg,
  },
  controlText: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "bold",
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: spacing.xl,
  },
  playText: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "bold",
  },
});
