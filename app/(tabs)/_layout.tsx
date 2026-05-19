// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSidebar } from '../../context/sidebarContext';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';

export default function TabsLayout() {
  const { isBuyer } = useAuth();
  const { t } = useLanguage();
  const { toggleSidebar } = useSidebar();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'web' && width > 1024;

  const HeaderLeft = () => (
    <TouchableOpacity
      onPress={toggleSidebar}
      style={styles.menuButton}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="menu-outline" size={24} color="#0d2137" />
    </TouchableOpacity>
  );

  const HeaderRight = () => (
    <View style={styles.headerRight}>
      {!isBuyer && <SyncStatusIndicator />}
    </View>
  );

  const tabScreenOptions = {
    tabBarActiveTintColor: isBuyer ? '#27AE60' : '#0d2137',
    headerShadowVisible: false,
    headerTintColor: '#0d2137',
    tabBarStyle: {
      backgroundColor: '#FFFFFF',
      borderTopColor: '#dce8f2',
      borderTopWidth: 1,
      height: Platform.OS === 'android'
        ? 60 + Math.max(insets.bottom, 0)
        : 60 + insets.bottom,
      paddingBottom: Platform.OS === 'android'
        ? Math.max(insets.bottom, 8)
        : insets.bottom,
      paddingTop: Platform.OS === 'android' ? 8 : 6,
      display: (isLargeScreen ? 'none' : 'flex') as 'none' | 'flex',
    },
    tabBarInactiveTintColor: '#315f57',
    tabBarLabelStyle: {
      fontSize: Platform.OS === 'android' ? 11 : 12,
      fontWeight: '600' as '600',
      marginTop: Platform.OS === 'android' ? -4 : -2,
      marginBottom: Platform.OS === 'android' ? 4 : 0,
    },
    tabBarIconStyle: {
      marginTop: Platform.OS === 'android' ? 4 : 0,
    },
    headerLeft: isLargeScreen ? undefined : () => <HeaderLeft />,
    headerRight: () => <HeaderRight />,
    headerStyle: { backgroundColor: '#dce8f2' },
    headerTitleStyle: {
      fontSize: Platform.OS === 'android' ? 18 : 20,
      fontWeight: '700' as '700',
    },
  };

  if (isBuyer) {
    return (
      <Tabs screenOptions={tabScreenOptions}>
        <Tabs.Screen
          name="indexbuyer"
          options={{
            headerTitle: "Shrimply Buyer",
            tabBarLabel: "Suppliers",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "business" : "business-outline"}
                color={color}
                size={Platform.OS === 'android' ? 26 : 30}
              />
            )
          }}
        />
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="water-quality" options={{ href: null }} />
        <Tabs.Screen name="feed" options={{ href: null }} />
        <Tabs.Screen name="harvest" options={{ href: null }} />
      </Tabs>
    );
  }

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: "Ponds",
          tabBarLabel: t.nav.ponds,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "home-sharp" : "home-outline"}
              color={color}
              size={Platform.OS === 'android' ? 26 : 30}
            />
          )
        }}
      />
      <Tabs.Screen
        name="water-quality"
        options={{
          title: t.nav.waterQuality,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "water-sharp" : "water-outline"}
              color={color}
              size={Platform.OS === 'android' ? 26 : 30}
            />
          )
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: t.nav.feed,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "fish-sharp" : "fish-outline"}
              color={color}
              size={Platform.OS === 'android' ? 26 : 30}
            />
          )
        }}
      />
      <Tabs.Screen
        name="harvest"
        options={{
          title: t.nav.harvest,
          tabBarLabel: t.nav.harvest,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "cash-sharp" : "cash-outline"}
              color={color}
              size={Platform.OS === 'android' ? 26 : 30}
            />
          )
        }}
      />
      <Tabs.Screen name="indexbuyer" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    marginLeft: 16,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
});
