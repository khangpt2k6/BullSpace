import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Divider, Surface } from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HomeStackParamList } from '../../types/navigation';
import { useRoom } from '../../hooks/api/useRooms';
import { useCreateBooking } from '../../hooks/api/useBookings';
import { useAuth } from '../../contexts/AuthContext';
import { USF_GREEN } from '../../theme/colors';
import { format } from 'date-fns';

type BookingConfirmRouteProp = RouteProp<HomeStackParamList, 'BookingConfirm'>;
type BookingConfirmNavigationProp = StackNavigationProp<HomeStackParamList, 'BookingConfirm'>;

export default function BookingConfirmScreen() {
  const route = useRoute<BookingConfirmRouteProp>();
  const navigation = useNavigation<BookingConfirmNavigationProp>();
  const { user } = useAuth();
  const { roomId, startTime, endTime } = route.params;

  const { data: roomData, isLoading: roomLoading } = useRoom(roomId);
  const createBooking = useCreateBooking();

  const handleConfirm = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to book a room');
      return;
    }

    try {
      await createBooking.mutateAsync({
        roomId,
        startTime,
        endTime,
      });

      Alert.alert(
        'Booking Created!',
        'Your booking has been created successfully! Please confirm it within 10 minutes to secure your room.',
        [
          {
            text: 'View My Bookings',
            onPress: () => {
              navigation.getParent()?.navigate('BookingsTab');
            },
          },
          {
            text: 'Browse More Rooms',
            style: 'cancel',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error: any) {
      const isConflict = error.status === 409 ||
                        error.response?.status === 409 ||
                        error.message?.includes('conflicts with an existing booking');

      if (isConflict) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const bookingTime = `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
        Alert.alert(
          'Time Slot Occupied',
          `This room is already booked for ${bookingTime}. Someone else has reserved this time slot.\n\nPlease choose a different time or browse other available rooms.`,
          [
            {
              text: 'Choose Different Time',
              onPress: () => navigation.goBack(),
            },
            {
              text: 'Browse Other Rooms',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Booking Failed',
          error.message || 'Failed to create booking. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  if (roomLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={USF_GREEN} />
        <Text style={styles.loadingText}>Loading room details...</Text>
      </View>
    );
  }

  const room = roomData?.room;

  if (!room) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#999" />
        <Text variant="bodyLarge" style={styles.errorText}>Room not found</Text>
      </View>
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = Math.round((end.getTime() - start.getTime()) / (60 * 1000));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Surface style={styles.headerSurface} elevation={1}>
        <MaterialCommunityIcons name="check-circle" size={48} color={USF_GREEN} />
        <Text variant="headlineMedium" style={styles.headerTitle}>
          Confirm Your Booking
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Review your booking details below
        </Text>
      </Surface>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          {/* Room Information */}
          <View style={styles.infoSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="door" size={24} color={USF_GREEN} />
              <Text variant="titleLarge" style={styles.sectionTitle}>Room Details</Text>
            </View>
            
            <Surface style={styles.detailBox} elevation={0}>
              <Text variant="headlineSmall" style={styles.roomId}>{room._id}</Text>
              
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="office-building" size={20} color="#666" />
                <Text variant="bodyLarge" style={styles.detailText}>
                  {room.building} • Floor {room.floor}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="shape" size={20} color="#666" />
                <Text variant="bodyLarge" style={styles.detailText}>
                  {room.type}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="account-group" size={20} color="#666" />
                <Text variant="bodyLarge" style={styles.detailText}>
                  Capacity: {room.capacity}
                </Text>
              </View>
            </Surface>
          </View>

          <Divider style={styles.divider} />

          {/* Time Information */}
          <View style={styles.infoSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color={USF_GREEN} />
              <Text variant="titleLarge" style={styles.sectionTitle}>Schedule</Text>
            </View>
            
            <Surface style={styles.detailBox} elevation={0}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="calendar" size={20} color="#666" />
                <Text variant="bodyLarge" style={styles.detailText}>
                  {format(start, 'EEEE, MMMM d, yyyy')}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#666" />
                <Text variant="bodyLarge" style={styles.detailText}>
                  {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="timer-outline" size={20} color="#666" />
                <Text variant="bodyLarge" style={styles.detailText}>
                  {duration} minutes
                </Text>
              </View>
            </Surface>
          </View>

          <Divider style={styles.divider} />

          {/* Warning Box */}
          <Surface style={styles.warningBox} elevation={0}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons name="alert" size={24} color="#E65100" />
              <Text variant="titleMedium" style={styles.warningTitle}>
                Important Notice
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.warningText}>
              You must confirm this booking within 10 minutes, or it will be automatically cancelled.
            </Text>
          </Surface>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={createBooking.isPending}
          disabled={createBooking.isPending}
          style={styles.confirmButton}
          contentStyle={styles.confirmButtonContent}
          icon={({ size, color }) => (
            <MaterialCommunityIcons name="check-bold" size={size} color={color} />
          )}
        >
          Confirm Booking
        </Button>

        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={createBooking.isPending}
          style={styles.cancelButton}
          contentStyle={styles.cancelButtonContent}
          icon={({ size }) => (
            <MaterialCommunityIcons name="close" size={size} color="#666" />
          )}
        >
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    color: '#999',
  },
  headerSurface: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: USF_GREEN,
    marginTop: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  infoSection: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  detailBox: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  roomId: {
    fontWeight: 'bold',
    color: USF_GREEN,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  detailText: {
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E65100',
    marginTop: 8,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    color: '#E65100',
    fontWeight: '600',
    marginLeft: 8,
  },
  warningText: {
    color: '#E65100',
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
  },
  confirmButton: {
    borderRadius: 12,
  },
  confirmButtonContent: {
    height: 50,
  },
  cancelButton: {
    borderRadius: 12,
    borderColor: '#CCC',
  },
  cancelButtonContent: {
    height: 50,
  },
});