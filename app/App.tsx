import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { usePlayerStore } from './src/stores/playerStore';
import { wsService } from './src/services/websocket';

import ConnectScreen from './src/screens/ConnectScreen';
import NowPlayingScreen from './src/screens/NowPlayingScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import QueueScreen from './src/screens/QueueScreen';
import LyricsScreen from './src/screens/LyricsScreen';
import { colors } from './src/theme/theme';
import { View, Text } from 'react-native';

const Tab = createBottomTabNavigator();

// Simple Icon component placeholder
const TabIcon = ({ name, color, size }: { name: string, color: string, size: number }) => (
  <Text style={{ color, fontSize: size - 4 }}>{name}</Text>
);

export default function App() {
  const { isAuthenticated, setConnected, sendAuth, handleServerMessage, pin } = usePlayerStore();

  React.useEffect(() => {
    // Global connection and message listeners
    const unsubConn = wsService.onConnectionChange((connected) => {
      setConnected(connected);
      if (connected && pin) {
        sendAuth(pin);
      }
    });

    const unsubMsg = wsService.onMessage((msg) => {
      handleServerMessage(msg);
    });

    return () => {
      unsubConn();
      unsubMsg();
    };
  }, [pin, setConnected, sendAuth, handleServerMessage]);

  if (!isAuthenticated) {
    return <ConnectScreen />;
  }

  return (
    <NavigationContainer theme={{
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.accent,
      }
    }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarIcon: ({ color, size }) => {
            let iconName = '';
            if (route.name === 'NowPlaying') iconName = '▶';
            else if (route.name === 'Search') iconName = '🔍';
            else if (route.name === 'Library') iconName = '📚';
            else if (route.name === 'Queue') iconName = '≡';
            else if (route.name === 'Lyrics') iconName = '📝';
            return <TabIcon name={iconName} color={color} size={size} />;
          },
        })}
      >
        <Tab.Screen name="NowPlaying" component={NowPlayingScreen} options={{ title: 'Playing' }} />
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="Library" component={LibraryScreen} />
        <Tab.Screen name="Queue" component={QueueScreen} />
        <Tab.Screen name="Lyrics" component={LyricsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
