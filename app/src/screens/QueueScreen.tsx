import React, { useEffect } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from "react-native";
import { usePlayerStore } from "../stores/playerStore";
import { Track } from "../services/protocol";
import { colors, spacing } from "../theme/theme";

export default function QueueScreen() {
  const { queue, queueIndex, sendGetQueue, sendQueueRemove, sendPlay } = usePlayerStore();

  useEffect(() => {
    sendGetQueue();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderItem = ({ item, index }: { item: Track; index: number }) => {
    const isPlaying = index === queueIndex;

    return (
      <View style={[styles.queueItem, isPlaying && styles.queueItemActive]}>
        <TouchableOpacity 
          style={styles.itemContent}
          onPress={() => sendPlay(item.videoId, item)} // In a real app we'd skip to this index, but for simplicity play from start
        >
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
          ) : (
            <View style={styles.placeholderThumbnail} />
          )}
          <View style={styles.itemInfo}>
            <Text style={[styles.title, isPlaying && styles.titleActive]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>{item.artist}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.removeBtn}
          onPress={() => sendQueueRemove(index)}
        >
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Up Next</Text>
        <Text style={styles.headerSubtitle}>{queue.length} tracks</Text>
      </View>

      {queue.length > 0 ? (
        <FlatList
          data={queue}
          keyExtractor={(item, index) => `${item.videoId}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Queue is empty</Text>
        </View>
      )}
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
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    padding: spacing.md,
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: spacing.sm,
    paddingRight: spacing.md,
  },
  queueItemActive: {
    backgroundColor: colors.surfaceHover,
    borderColor: colors.accent,
    borderWidth: 1,
  },
  itemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  placeholderThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: colors.surfaceHover,
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  titleActive: {
    color: colors.accent,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  removeBtn: {
    padding: spacing.sm,
  },
  removeText: {
    color: colors.textMuted,
    fontSize: 18,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
});
