import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { usePlayerStore } from "../stores/playerStore";
import { wsService } from "../services/websocket";
import { colors, spacing } from "../theme/theme";

export default function ConnectScreen() {
  const [ip, setIp] = useState("192.168.43.1"); // Default to hotspot gateway
  const [localPin, setLocalPin] = useState("");
  const { isConnected, isAuthenticated, setPin } = usePlayerStore();

  const handleConnect = () => {
    if (!ip || !localPin) return;
    setPin(localPin);
    wsService.connect(ip);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>YT Music Remote</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>PC IP Address</Text>
        <TextInput
          style={styles.input}
          value={ip}
          onChangeText={setIp}
          placeholder="192.168.43.x"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
        />

        <Text style={styles.label}>PIN (from terminal)</Text>
        <TextInput
          style={styles.input}
          value={localPin}
          onChangeText={setLocalPin}
          placeholder="1234"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          secureTextEntry
          maxLength={4}
        />

        <TouchableOpacity 
          style={[styles.button, (!ip || !localPin) && styles.buttonDisabled]} 
          onPress={handleConnect}
          disabled={!ip || !localPin}
        >
          {isConnected && !isAuthenticated ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={styles.buttonText}>
              {isConnected ? "Connected" : "Connect"}
            </Text>
          )}
        </TouchableOpacity>

        {isConnected && isAuthenticated && (
          <Text style={styles.successText}>Authenticated successfully!</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonDisabled: {
    backgroundColor: colors.surfaceHover,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  successText: {
    color: colors.success,
    textAlign: "center",
    marginTop: spacing.md,
    fontWeight: "500",
  },
});
