import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import { HomeScreen } from '@/screens/home/HomeScreen';
import { CourtsScreen } from '@/screens/courts/CourtsScreen';
import { CourtDetailScreen } from '@/screens/courts/CourtDetailScreen';
import { SubmitConditionScreen } from '@/screens/courts/SubmitConditionScreen';
import { GameDetailScreen } from '@/screens/games/GameDetailScreen';
import { CreateGameScreen } from '@/screens/games/CreateGameScreen';
import { PostGameRatingScreen } from '@/screens/games/PostGameRatingScreen';
import { StatLoggerScreen } from '@/screens/games/StatLoggerScreen';
import { CrewsScreen } from '@/screens/crews/CrewsScreen';
import { CrewDetailScreen } from '@/screens/crews/CrewDetailScreen';
import { CrewChatScreen } from '@/screens/crews/CrewChatScreen';
import { CreateCrewScreen } from '@/screens/crews/CreateCrewScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { PlayerProfileScreen } from '@/screens/profile/PlayerProfileScreen';
import { EditProfileScreen } from '@/screens/profile/EditProfileScreen';
import { SettingsScreen } from '@/screens/profile/SettingsScreen';
import { BlacktopProScreen } from '@/screens/profile/BlacktopProScreen';

// ─── Home Stack ──────────────────────────────────────────────

export type HomeStackParamList = {
  Home: undefined;
  GameDetail: { gameId: string };
  CourtDetail: { courtId: string };
  PlayerProfile: { userId: string };
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ title: 'BLACKTOP JC' }} />
      <HomeStack.Screen name="GameDetail" component={GameDetailScreen} options={{ title: 'GAME' }} />
      <HomeStack.Screen name="CourtDetail" component={CourtDetailScreen} options={{ title: 'COURT' }} />
      <HomeStack.Screen name="PlayerProfile" component={PlayerProfileScreen} options={{ title: 'PLAYER' }} />
    </HomeStack.Navigator>
  );
}

// ─── Courts Stack ─────────────────────────────────────────────

export type CourtsStackParamList = {
  Courts: undefined;
  CourtDetail: { courtId: string };
  SubmitCondition: { courtId: string; courtName: string };
};

const CourtsStack = createNativeStackNavigator<CourtsStackParamList>();

function CourtsStackNavigator() {
  return (
    <CourtsStack.Navigator screenOptions={stackScreenOptions}>
      <CourtsStack.Screen name="Courts" component={CourtsScreen} options={{ title: 'COURTS' }} />
      <CourtsStack.Screen name="CourtDetail" component={CourtDetailScreen} options={{ title: 'COURT' }} />
      <CourtsStack.Screen name="SubmitCondition" component={SubmitConditionScreen} options={{ title: 'REPORT' }} />
    </CourtsStack.Navigator>
  );
}

// ─── Crews Stack ─────────────────────────────────────────────

export type CrewsStackParamList = {
  Crews: undefined;
  CrewDetail: { crewId: string };
  CrewChat: { crewId: string; crewName: string; crewColor: string };
  CreateCrew: undefined;
};

const CrewsStack = createNativeStackNavigator<CrewsStackParamList>();

function CrewsStackNavigator() {
  return (
    <CrewsStack.Navigator screenOptions={stackScreenOptions}>
      <CrewsStack.Screen name="Crews" component={CrewsScreen} options={{ title: 'CREWS' }} />
      <CrewsStack.Screen name="CrewDetail" component={CrewDetailScreen} options={{ title: 'CREW' }} />
      <CrewsStack.Screen name="CrewChat" component={CrewChatScreen} options={{ title: 'CREW CHAT' }} />
      <CrewsStack.Screen name="CreateCrew" component={CreateCrewScreen} options={{ title: 'CREATE CREW' }} />
    </CrewsStack.Navigator>
  );
}

// ─── Profile Stack ────────────────────────────────────────────

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  BlacktopPro: undefined;
  PlayerProfile: { userId: string };
};

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'MY PROFILE' }} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'EDIT PROFILE' }} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'SETTINGS' }} />
      <ProfileStack.Screen name="BlacktopPro" component={BlacktopProScreen} options={{ title: 'BLACKTOP PRO' }} />
      <ProfileStack.Screen name="PlayerProfile" component={PlayerProfileScreen} options={{ title: 'PLAYER' }} />
    </ProfileStack.Navigator>
  );
}

// ─── Bottom Tab ───────────────────────────────────────────────

export type MainTabParamList = {
  HomeTab: undefined;
  CourtsTab: undefined;
  CreateTab: undefined;
  CrewsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || Spacing.sm }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isCreate = route.name === 'CreateTab';

        const iconName = (() => {
          switch (route.name) {
            case 'HomeTab': return isFocused ? 'home' : 'home-outline';
            case 'CourtsTab': return isFocused ? 'location' : 'location-outline';
            case 'CreateTab': return 'add';
            case 'CrewsTab': return isFocused ? 'people' : 'people-outline';
            case 'ProfileTab': return isFocused ? 'person' : 'person-outline';
            default: return 'ellipse-outline';
          }
        })();

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isCreate) {
          return (
            <TouchableOpacity key={route.key} style={styles.createButton} onPress={onPress}>
              <View style={styles.createButtonInner}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={route.key} style={styles.tabItem} onPress={onPress}>
            <Ionicons
              name={iconName as any}
              size={24}
              color={isFocused ? Colors.primary : Colors.textMuted}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function MainNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
      <Tab.Screen name="CourtsTab" component={CourtsStackNavigator} />
      <Tab.Screen name="CreateTab" component={CreateGameScreen} />
      <Tab.Screen name="CrewsTab" component={CrewsStackNavigator} />
      <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}

const stackScreenOptions = {
  headerStyle: { backgroundColor: Colors.background },
  headerTintColor: Colors.textPrimary,
  headerTitleStyle: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, letterSpacing: 1 },
  contentStyle: { backgroundColor: Colors.background },
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  createButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  createButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
