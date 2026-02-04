import React from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip, Divider, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BookingsStackParamList } from '../../types/navigation';
import { useBooking, useConfirmBooking, useCancelBooking, useDeleteBooking } from '../../hooks/api/useBookings';
import { useRoom } from '../../hooks/api/useRooms';
import {
  USF_GREEN,
  USF_GREEN_LIGHT,
  USF_GREEN_DARK,
  USF_GREEN_LIGHTEST,
  USF_GOLD,
  USF_GOLD_LIGHT,
  USF_GOLD_LIGHTEST,
  STATUS_PENDING,
  STATUS_CONFIRMED,
  STATUS_CANCELLED,
  STATUS_EXPIRED
} from '../../theme/colors';
import { format } from 'date-fns';

type BookingDetailsRouteProp = RouteProp<BookingsStackParamList, 'BookingDetails'>;
type BookingDetailsNavigationProp = StackNavigationProp<BookingsStackParamList, 'BookingDetails'>;

export default function BookingDetailsScreen() {
  const route = useRoute<BookingDetailsRouteProp>();
  const navigation = useNavigation<BookingDetailsNavigationProp>();
  const { bookingId } = route.params;

  const { data: bookingData, isLoading: bookingLoading } = useBooking(bookingId);
  const confirmBooking = useConfirmBooking();
  const cancelBooking = useCancelBooking();
  const deleteBooking = useDeleteBooking();

  const booking = bookingData?.booking;

  // Handle both populated and non-populated roomId
  const roomId = booking?.roomId
    ? typeof booking.roomId === 'string'
      ? booking.roomId
      : (booking.roomId as any)?._id || ''
    : '';

  const { data: roomData } = useRoom(roomId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return STATUS_PENDING;
      case 'CONFIRMED':
        return STATUS_CONFIRMED;
      case 'CANCELLED':
        return STATUS_CANCELLED;
      case 'EXPIRED':
        return STATUS_EXPIRED;
      default:
        return '#999';
    }
  };

  const handleConfirm = async () => {
    try {
      await confirmBooking.mutateAsync(bookingId);
      Alert.alert(
        'Booking Confirmed!',
        'Your room has been successfully reserved.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MyBookings'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to confirm booking');
    }
  };

  const handleCancel = async () => {
    console.log('Cancel button clicked!');

    // Use native confirm for web compatibility
    const confirmed = window.confirm('Are you sure you want to cancel this booking?');

    if (!confirmed) {
      console.log('User cancelled the action');
      return;
    }

    console.log('User confirmed, calling API...');
    try {
      await cancelBooking.mutateAsync(bookingId);
      console.log('Booking cancelled successfully!');
      Alert.alert('Cancelled', 'Booking cancelled successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      Alert.alert('Error', error.message || 'Failed to cancel booking');
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this booking? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      await deleteBooking.mutateAsync(bookingId);
      Alert.alert('Deleted', 'Booking deleted successfully', [
        { text: 'OK', onPress: () => navigation.navigate('MyBookings') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete booking');
    }
  };

  if (bookingLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={USF_GREEN} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge">Booking not found</Text>
      </View>
    );
  }

  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);
  const now = new Date();
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / (60 * 1000));

  // Check if booking has ended
  const hasEnded = endDate < now;

  // Determine the actual display status
  const displayStatus = (hasEnded && (booking.status === 'CONFIRMED' || booking.status === 'PENDING'))
    ? 'EXPIRED'
    : booking.status;

  const canConfirm = booking.status === 'PENDING' && !hasEnded;
  const canCancel = (booking.status === 'PENDING' || booking.status === 'CONFIRMED') && !hasEnded;
  const canDelete = hasEnded || booking.status === 'CANCELLED' || booking.status === 'EXPIRED';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.bookingId}>
              Booking #{booking._id.slice(-6).toUpperCase()}
            </Text>
            <Chip
              mode="flat"
              style={[
                styles.statusChip,
                { backgroundColor: getStatusColor(displayStatus) }
              ]}
              textStyle={{ color: '#FFFFFF' }}
            >
              {displayStatus}
            </Chip>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="door" size={20} color={USF_GREEN} />
              <Text variant="titleMedium" style={styles.sectionTitle}>Room</Text>
            </View>
            <Surface style={styles.infoCard} elevation={0}>
              <Text variant="bodyLarge" style={styles.roomId}>{roomId}</Text>
              {roomData?.room && (
                <>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="office-building" size={16} color={USF_GREEN_LIGHT} />
                    <Text variant="bodyMedium" style={styles.detail}>
                      {roomData.room.building} • Floor {roomData.room.floor}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="shape" size={16} color={USF_GREEN_LIGHT} />
                    <Text variant="bodyMedium" style={styles.detail}>
                      {roomData.room.type}
                    </Text>
                    <MaterialCommunityIcons name="account-group" size={16} color={USF_GREEN_LIGHT} style={{ marginLeft: 12 }} />
                    <Text variant="bodyMedium" style={styles.detail}>
                      Capacity: {roomData.room.capacity}
                    </Text>
                  </View>
                </>
              )}
            </Surface>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color={USF_GREEN} />
              <Text variant="titleMedium" style={styles.sectionTitle}>Time</Text>
            </View>
            <Surface style={styles.infoCard} elevation={0}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar" size={16} color={USF_GREEN_LIGHT} />
                <Text variant="bodyLarge">{format(startDate, 'EEEE, MMM d, yyyy')}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={USF_GREEN_LIGHT} />
                <Text variant="bodyMedium" style={styles.detail}>
                  {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="timer-outline" size={16} color={USF_GREEN_LIGHT} />
                <Text variant="bodySmall" style={styles.duration}>
                  Duration: {duration} minutes
                </Text>
              </View>
            </Surface>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="information" size={20} color={USF_GREEN} />
              <Text variant="titleMedium" style={styles.sectionTitle}>Details</Text>
            </View>
            <Surface style={styles.infoCard} elevation={0}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-plus-outline" size={16} color={USF_GREEN_LIGHT} />
                <Text variant="bodyMedium" style={styles.detail}>
                  Created: {format(new Date(booking.createdAt), 'MMM d, yyyy h:mm a')}
                </Text>
              </View>
              {booking.confirmedAt && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color={STATUS_CONFIRMED} />
                  <Text variant="bodyMedium" style={styles.detail}>
                    Confirmed: {format(new Date(booking.confirmedAt), 'MMM d, yyyy h:mm a')}
                  </Text>
                </View>
              )}
              {booking.cancelledAt && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="close-circle-outline" size={16} color={STATUS_CANCELLED} />
                  <Text variant="bodyMedium" style={styles.detail}>
                    Cancelled: {format(new Date(booking.cancelledAt), 'MMM d, yyyy h:mm a')}
                  </Text>
                </View>
              )}
            </Surface>
          </View>

          {booking.status === 'PENDING' && !hasEnded && (
            <Surface style={styles.warningBox} elevation={0}>
              <MaterialCommunityIcons name="clock-alert" size={20} color="#E65100" />
              <Text variant="bodyMedium" style={styles.warningText}>
                This booking will expire in 10 minutes unless confirmed
              </Text>
            </Surface>
          )}

          {displayStatus === 'EXPIRED' && (
            <Surface style={[styles.warningBox, styles.errorBox]} elevation={0}>
              <MaterialCommunityIcons name="calendar-remove" size={20} color="#C62828" />
              <Text variant="bodyMedium" style={[styles.warningText, { color: '#C62828' }]}>
                This booking has ended
              </Text>
            </Surface>
          )}
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        {canConfirm && (
          <Button
            mode="contained"
            onPress={handleConfirm}
            loading={confirmBooking.isPending}
            disabled={confirmBooking.isPending}
            style={styles.confirmButton}
            contentStyle={styles.buttonContent}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="check-circle" size={size} color={color} />
            )}
          >
            Confirm Booking
          </Button>
        )}

        {canCancel && (
          <Button
            mode="outlined"
            onPress={handleCancel}
            loading={cancelBooking.isPending}
            disabled={cancelBooking.isPending}
            style={styles.cancelButton}
            textColor="#F44336"
            icon={({ size }) => (
              <MaterialCommunityIcons name="close-circle" size={size} color="#F44336" />
            )}
          >
            Cancel Booking
          </Button>
        )}

        {canDelete && (
          <Button
            mode="outlined"
            onPress={handleDelete}
            loading={deleteBooking.isPending}
            disabled={deleteBooking.isPending}
            style={styles.deleteButton}
            textColor="#D32F2F"
            icon={({ size }) => (
              <MaterialCommunityIcons name="delete" size={size} color="#D32F2F" />
            )}
          >
            Delete Booking
          </Button>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: USF_GREEN_LIGHTEST,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 16,
    elevation: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: USF_GREEN_DARK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingId: {
    fontWeight: 'bold',
    color: USF_GREEN_DARK,
    fontSize: 18,
  },
  statusChip: {
    height: 32,
    paddingHorizontal: 4,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: USF_GOLD_LIGHT,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: USF_GREEN_DARK,
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: USF_GREEN_LIGHTEST,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: USF_GOLD_LIGHT,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomId: {
    fontWeight: 'bold',
    color: USF_GREEN_DARK,
    marginBottom: 8,
    fontSize: 16,
  },
  detail: {
    color: USF_GREEN,
    flex: 1,
  },
  duration: {
    color: USF_GREEN,
    flex: 1,
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E65100',
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#C62828',
  },
  warningText: {
    color: '#E65100',
    flex: 1,
  },
  buttonContainer: {
    paddingBottom: 120,
  },
  confirmButton: {
    margin: 16,
    marginTop: 0,
    backgroundColor: USF_GREEN,
    borderRadius: 12,
  },
  buttonContent: {
    height: 50,
  },
  cancelButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderColor: '#F44336',
    borderWidth: 2,
    borderRadius: 12,
  },
  deleteButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderColor: '#D32F2F',
    borderWidth: 2,
    borderRadius: 12,
  },
});
