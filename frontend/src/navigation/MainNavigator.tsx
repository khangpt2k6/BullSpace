import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, StackNavigationOptions } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MainTabParamList, HomeStackParamList, BookingsStackParamList, ProfileStackParamList } from '../types/navigation';
import { USF_GREEN, USF_GOLD } from '../theme/colors';

// Import screens
import HomeScreen from '../screens/home/HomeScreen';
import RoomDetailsScreen from '../screens/room/RoomDetailsScreen';
import BookingConfirmScreen from '../screens/room/BookingConfirmScreen';
import MyBookingsScreen from '../screens/bookings/MyBookingsScreen';
import BookingDetailsScreen from '../screens/bookings/BookingDetailsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Import USF logo
const usfLogo = require('../theme/usf.jpg');

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const BookingsStack = createStackNavigator<BookingsStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

// Custom Header Logo Component
function HeaderLogo() {
  return (
    <View style={styles.logoContainer}>
      <View style={styles.logoWrapper}>
        <Image 
          source={usfLogo} 
          style={styles.logo}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

// Shared screen options for consistent styling
const stackScreenOptions: StackNavigationOptions = {
  headerStyle: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderBottomWidth: 2,
    borderBottomColor: USF_GOLD,
  },
  headerTintColor: USF_GREEN,
  headerTitleStyle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerLeft: () => <HeaderLogo />,
};

// Home Stack Navigator
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ 
          title: 'Browse Rooms',
          headerTitleAlign: 'center',
        }}
      />
      <HomeStack.Screen
        name="RoomDetails"
        component={RoomDetailsScreen}
        options={{ 
          title: 'Room Details',
          headerTitleAlign: 'center',
          headerLeft: undefined, // Use default back button
        }}
      />
      <HomeStack.Screen
        name="BookingConfirm"
        component={BookingConfirmScreen}
        options={{ 
          title: 'Confirm Booking',
          headerTitleAlign: 'center',
          headerLeft: undefined, // Use default back button
        }}
      />
    </HomeStack.Navigator>
  );
}

// Bookings Stack Navigator
function BookingsStackNavigator() {
  return (
    <BookingsStack.Navigator screenOptions={stackScreenOptions}>
      <BookingsStack.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ 
          title: 'My Bookings',
          headerTitleAlign: 'center',
        }}
      />
      <BookingsStack.Screen
        name="BookingDetails"
        component={BookingDetailsScreen}
        options={{ 
          title: 'Booking Details',
          headerTitleAlign: 'center',
          headerLeft: undefined, // Use default back button
        }}
      />
    </BookingsStack.Navigator>
  );
}

// Profile Stack Navigator
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          headerTitleAlign: 'center',
        }}
      />
    </ProfileStack.Navigator>
  );
}

// Main Tab Navigator
export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: USF_GREEN,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 2,
          borderTopColor: '#E8F5F0',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Browse',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <MaterialCommunityIcons name="magnify" size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsStackNavigator}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <MaterialCommunityIcons name="calendar-check" size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <MaterialCommunityIcons name="account" size={size} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    marginLeft: 16,
    marginRight: 8,
  },
  logoWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  tabIconContainer: {
    width: 48,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  tabIconContainerActive: {
    backgroundColor: '#E8F5F0',
  },
});