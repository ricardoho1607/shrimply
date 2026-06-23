// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSidebar } from '../../context/sidebarContext';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';

const NAVY = '#0d2137';
const TEAL = '#14948F';
const TAB_BAR_HEIGHT = 104;
const TEAL_ROUTE_NAMES = new Set(['water-quality', 'feed']);

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

  const farmTabScreenOptions = {
    ...tabScreenOptions,
    tabBar: (props: BottomTabBarProps) => (
      <FarmBottomTabBar {...props} bottomInset={insets.bottom} isLargeScreen={isLargeScreen} />
    ),
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
    <Tabs screenOptions={farmTabScreenOptions}>
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

function FarmBottomTabBar({
  state,
  descriptors,
  navigation,
  bottomInset,
  isLargeScreen,
}: BottomTabBarProps & { bottomInset: number; isLargeScreen: boolean }) {
  if (isLargeScreen) return null;

  const visibleRoutes = state.routes.filter((route) => {
    const options = descriptors[route.key]?.options as { href?: unknown } | undefined;
    return options?.href !== null;
  });
  const leftRoutes = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2);
  const minHeight = TAB_BAR_HEIGHT + Math.max(bottomInset, 0);

  const renderTab = (route: typeof state.routes[number]) => {
    const descriptor = descriptors[route.key];
    const options = descriptor.options;
    const focused = state.index === state.routes.findIndex((tabRoute) => tabRoute.key === route.key);
    const label =
      typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : typeof options.title === 'string'
          ? options.title
          : route.name;
    const color = TEAL_ROUTE_NAMES.has(route.name) ? TEAL : NAVY;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarButtonTestID}
        onPress={onPress}
        style={styles.customTabItem}
        activeOpacity={0.82}
      >
        <View style={styles.customTabIcon}>
          {options.tabBarIcon?.({
            focused,
            color,
            size: Platform.OS === 'android' ? 31 : 34,
          })}
        </View>
        <Text style={[styles.customTabLabel, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.customTabBarWrap, { minHeight }]}>
      <View style={[styles.customTabBarShadow, { bottom: Math.max(bottomInset, 0) }]} />
      <View style={[styles.customTabBar, { paddingBottom: Math.max(bottomInset, 0) }]}>
        <View style={styles.customTabGroup}>{leftRoutes.map(renderTab)}</View>
        <View style={styles.customCenterGap} />
        <View style={styles.customTabGroup}>{rightRoutes.map(renderTab)}</View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Open ponds"
        activeOpacity={0.9}
        onPress={() => navigation.navigate('index')}
        style={[
          styles.centerActionOuter,
          { bottom: Math.max(bottomInset, 0) + TAB_BAR_HEIGHT - 54 },
        ]}
      >
        <View style={styles.centerActionInner}>
          <Ionicons name="add" size={48} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
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
  customTabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  customTabBarShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 20,
  },
  customTabBar: {
    width: '100%',
    minHeight: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 19,
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
  },
  customTabGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  customCenterGap: {
    width: Platform.OS === 'android' ? 96 : 112,
  },
  customTabItem: {
    width: Platform.OS === 'android' ? 88 : 96,
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTabIcon: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  customTabLabel: {
    maxWidth: '100%',
    fontSize: Platform.OS === 'android' ? 15 : 17,
    lineHeight: Platform.OS === 'android' ? 19 : 22,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  centerActionOuter: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 24,
  },
  centerActionInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
