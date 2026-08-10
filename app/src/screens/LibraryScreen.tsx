import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { usePlayerStore, PlaylistItem, HomeFeedSection } from "../stores/playerStore";
import { Track } from "../services/protocol";
import { colors, spacing } from "../theme/theme";

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<"home" | "playlists" | "liked">("home");
  const { 
    isAuthenticated,
    homeFeed, 
    playlists, 
    likedSongs, 
    sendGetHome, 
    sendGetPlaylists, 
    sendGetLiked,
    sendPlay,
    sendPlayPlaylist 
  } = usePlayerStore();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadData(activeTab);
    }
  }, [activeTab, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = (tab: string) => {
    setLoading(true);
    if (tab === "home") sendGetHome();
    else if (tab === "playlists") sendGetPlaylists();
    else if (tab === "liked") sendGetLiked();
    
    // Simulate loading completion since we don't have separate loading states per tab in store yet
    setTimeout(() => setLoading(false), 1500); 
  };

  const renderHomeSection = ({ item: section }: { item: HomeFeedSection }) => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <FlatList
        horizontal
        data={section.items}
        keyExtractor={(t, idx) => `home-${t.videoId}-${idx}`}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: track }) => (
          <TouchableOpacity 
            style={styles.horizontalCard}
            onPress={() => sendPlay(track.videoId, track)}
          >
            {track.thumbnail ? (
              <Image source={{ uri: track.thumbnail }} style={styles.cardThumbnail} />
            ) : (
              <View style={styles.placeholderThumbnail} />
            )}
            <Text style={styles.cardTitle} numberOfLines={2}>{track.title}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>{track.artist}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderPlaylistItem = ({ item }: { item: PlaylistItem }) => (
    <TouchableOpacity 
      style={styles.listItem}
      onPress={() => sendPlayPlaylist(item.playlistId)}
    >
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.listThumbnail} />
      ) : (
        <View style={styles.placeholderThumbnail} />
      )}
      <View style={styles.listInfo}>
        <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.listSubtitle}>{item.count} tracks</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity 
      style={styles.listItem}
      onPress={() => sendPlay(item.videoId, item)}
    >
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.listThumbnail} />
      ) : (
        <View style={styles.placeholderThumbnail} />
      )}
      <View style={styles.listInfo}>
        <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.listSubtitle} numberOfLines={1}>{item.artist}</Text>
      </View>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Not authenticated.</Text>
        <Text style={styles.subText}>Connect to PC first.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "home" && styles.tabActive]}
          onPress={() => setActiveTab("home")}
        >
          <Text style={[styles.tabText, activeTab === "home" && styles.tabTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "playlists" && styles.tabActive]}
          onPress={() => setActiveTab("playlists")}
        >
          <Text style={[styles.tabText, activeTab === "playlists" && styles.tabTextActive]}>Playlists</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "liked" && styles.tabActive]}
          onPress={() => setActiveTab("liked")}
        >
          <Text style={[styles.tabText, activeTab === "liked" && styles.tabTextActive]}>Liked</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : activeTab === "home" ? (
        <FlatList
          data={homeFeed}
          keyExtractor={(item, index) => `section-${index}`}
          renderItem={renderHomeSection}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No recommendations found.</Text>}
        />
      ) : activeTab === "playlists" ? (
        <FlatList
          data={playlists}
          keyExtractor={(item, index) => `playlist-${item.playlistId}-${index}`}
          renderItem={renderPlaylistItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No playlists found.</Text>}
        />
      ) : (
        <FlatList
          data={likedSongs}
          keyExtractor={(item, index) => `liked-${item.videoId}-${index}`}
          renderItem={renderTrackItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No liked songs found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  listContent: {
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  subText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  
  // Home Feed
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: spacing.md,
  },
  horizontalCard: {
    width: 140,
    marginRight: spacing.md,
  },
  cardThumbnail: {
    width: 140,
    height: 140,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  // List Items
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 8,
  },
  listThumbnail: {
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
  listInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  listTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  listSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
