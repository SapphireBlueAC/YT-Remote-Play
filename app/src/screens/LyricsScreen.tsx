import React, { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { usePlayerStore } from "../stores/playerStore";
import { colors, spacing } from "../theme/theme";

export default function LyricsScreen() {
  const { currentTrack, lyrics, sendGetLyrics } = usePlayerStore();

  useEffect(() => {
    if (currentTrack) {
      sendGetLyrics();
    }
  }, [currentTrack?.videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {currentTrack?.title || "No track"}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentTrack?.artist || "playing"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!currentTrack ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>Play a song to see lyrics</Text>
          </View>
        ) : lyrics === null ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : lyrics === "" ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No lyrics available for this song.</Text>
          </View>
        ) : (
          <Text style={styles.lyricsText}>{lyrics}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "bold",
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 4,
  },
  scrollContent: {
    padding: spacing.xl,
    flexGrow: 1,
  },
  lyricsText: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 36,
    fontWeight: "500",
    textAlign: "left",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "50%",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 18,
    textAlign: "center",
  },
});
