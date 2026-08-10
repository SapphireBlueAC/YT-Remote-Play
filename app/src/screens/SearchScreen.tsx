import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { usePlayerStore } from "../stores/playerStore";
import { Track } from "../services/protocol";
import { colors, spacing } from "../theme/theme";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("songs");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { searchResults, searchLoading, sendSearch, sendPlay, sendQueueAdd } = usePlayerStore();

  const filters = [
    { id: "songs", label: "Songs" },
    { id: "artists", label: "Artists" },
    { id: "albums", label: "Albums" },
    { id: "playlists", label: "Playlists" },
  ];

  useEffect(() => {
    if (query.trim().length > 2) {
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => {
        sendSearch(query, filter);
      }, 500);
      setDebounceTimer(timer);
    }
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [query, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderItem = ({ item }: { item: Track }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => sendPlay(item.videoId, item)}
      onLongPress={() => sendQueueAdd(item.videoId)}
    >
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      ) : (
        <View style={styles.placeholderThumbnail} />
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.resultArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchHeader}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search songs, artists, albums..."
          placeholderTextColor={colors.textMuted}
        />
        
        <View style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
              onPress={() => setFilter(f.id)}
            >
              <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {searchLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => `${item.videoId}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      ) : query.length > 2 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Type to start searching...</Text>
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
  searchHeader: {
    padding: spacing.md,
    paddingTop: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    padding: spacing.md,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterRow: {
    flexDirection: "row",
    marginTop: spacing.md,
    justifyContent: "space-between",
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surfaceHover,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  filterTextActive: {
    color: colors.textPrimary,
    fontWeight: "bold",
  },
  listContent: {
    padding: spacing.md,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 8,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 4,
  },
  placeholderThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: colors.surfaceHover,
  },
  resultInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  resultTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  resultArtist: {
    color: colors.textSecondary,
    fontSize: 14,
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
