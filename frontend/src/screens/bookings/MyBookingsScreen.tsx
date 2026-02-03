import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Text, Chip, ActivityIndicator, SegmentedButtons, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BookingsStackParamList } from '../../types/navigation';
import { useBookings, useDeleteBooking } from '../../hooks/api/useBookings';
import { Booking } from '../../types/models';
import { USF_GREEN, STATUS_PENDING, STATUS_CONFIRMED, STATUS_CANCELLED, STATUS_EXPIRED } from '../../theme/colors';
import { format } from 'date-fns';

type MyBookingsScreenNavigationProp = StackNavigationProp<BookingsStackParamList, 'MyBookings'>;

export default function MyBookingsScreen() {
  const navigation = useNavigation<MyBookingsScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  // Fetch all bookings for authenticated user (not filtered by status)
  const { data, isLoading, refetch, isRefetching } = useBookings();
  const deleteBooking = useDeleteBooking();

  // Filter bookings based on whether they're actually past or not
  const now = new Date();
  const filteredBookings = (data?.bookings || []).filter((booking) => {
    const endTime = new Date(booking.endTime);
    const hasEnded = endTime < now;

    if (activeTab === 'active') {
      // Active tab: bookings that haven't ended yet and are not CANCELLED
      return !hasEnded && booking.status !== 'CANCELLED';
    } else {
      // Past tab: bookings that have ended OR are CANCELLED
      return hasEnded || booking.status === 'CANCELLED';
    }
  });

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

  const handleDeleteBooking = async (bookingId: string, roomId: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the booking for ${roomId}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteBooking.mutateAsync(bookingId);
      Alert.alert('✅ Deleted', 'Booking deleted successfully');
    } catch (error: any) {
      Alert.alert('❌ Error', error.message || 'Failed to delete booking');
    }
  };

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const startDate = new Date(item.startTime);
    const endDate = new Date(item.endTime);
    const now = new Date();

    // Determine the actual display status
    // If booking has ended and status is still CONFIRMED or PENDING, show as EXPIRED
    const hasEnded = endDate < now;
    const displayStatus = (hasEnded && (item.status === 'CONFIRMED' || item.status === 'PENDING'))
      ? 'EXPIRED'
      : item.status;

    // Handle both populated and non-populated roomId
    const roomId = typeof item.roomId === 'string'
      ? item.roomId
      : (item.roomId as any)?._id || 'Unknown Room';

    // Check if this booking is in the past tab
    const isPastBooking = hasEnded || item.status === 'CANCELLED';

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('BookingDetails', { bookingId: item._id })}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text variant="titleLarge" style={styles.roomId}>
                {roomId}
              </Text>
            </View>
            <View style={styles.cardHeaderRight}>
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
              {isPastBooking && activeTab === 'past' && (
                <IconButton
                  icon="delete"
                  iconColor="#F44336"
                  size={20}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteBooking(item._id, roomId);
                  }}
                  style={styles.deleteButton}
                />
              )}
            </View>
          </View>

          <View style={styles.dateTimeSection}>
            <Text variant="bodyLarge" style={styles.date}>
              {format(startDate, 'EEEE, MMM d, yyyy')}
            </Text>
            <Text variant="bodyMedium" style={styles.time}>
              {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
            </Text>
          </View>

          {item.status === 'PENDING' && !hasEnded && (
            <View style={styles.warningBox}>
              <Text variant="bodySmall" style={styles.warningText}>
                ⏱️ Confirm within 10 minutes or booking will expire
              </Text>
            </View>
          )}

          {displayStatus === 'EXPIRED' && (
            <View style={[styles.warningBox, { backgroundColor: '#FFEBEE' }]}>
              <Text variant="bodySmall" style={[styles.warningText, { color: '#C62828' }]}>
                ⏰ This booking has ended
              </Text>
            </View>
          )}

          <Text variant="bodySmall" style={styles.createdAt}>
            Booked on {format(new Date(item.createdAt), 'MMM d, h:mm a')}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'active' | 'past')}
        buttons={[
          { value: 'active', label: 'Active' },
          { value: 'past', label: 'Past' },
        ]}
        style={styles.segmentedButtons}
      />

      {isLoading && !isRefetching ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={USF_GREEN} />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[USF_GREEN]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                {activeTab === 'active'
                  ? 'No active bookings'
                  : 'No past bookings'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  segmentedButtons: {
    margin: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roomId: {
    fontWeight: 'bold',
    color: USF_GREEN,
  },
  statusChip: {
    height: 28,
  },
  deleteButton: {
    margin: 0,
  },
  dateTimeSection: {
    marginBottom: 12,
  },
  date: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  time: {
    color: '#666',
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  warningText: {
    color: '#E65100',
  },
  createdAt: {
    color: '#999',
    marginTop: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#999',
  },
});
