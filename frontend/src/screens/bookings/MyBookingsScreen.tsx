import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Text, Chip, ActivityIndicator, SegmentedButtons, IconButton, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BookingsStackParamList } from '../../types/navigation';
import { useBookings, useDeleteBooking } from '../../hooks/api/useBookings';
import { Booking } from '../../types/models';
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
      Alert.alert('Deleted', 'Booking deleted successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete booking');
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
              <View style={styles.roomIdContainer}>
                <MaterialCommunityIcons name="door" size={22} color={USF_GREEN} />
                <Text variant="titleLarge" style={styles.roomId}>
                  {roomId}
                </Text>
              </View>
            </View>
            <View style={styles.cardHeaderRight}>
              <Chip
                mode="flat"
                style={[
                  styles.statusChip,
                  { backgroundColor: getStatusColor(displayStatus) }
                ]}
                textStyle={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}
              >
                {displayStatus}
              </Chip>
              {isPastBooking && activeTab === 'past' && (
                <IconButton
                  icon={() => <MaterialCommunityIcons name="delete" size={20} color="#F44336" />}
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

          <Surface style={styles.dateTimeSection} elevation={0}>
            <View style={styles.dateRow}>
              <MaterialCommunityIcons name="calendar" size={16} color={USF_GREEN_LIGHT} />
              <Text variant="bodyLarge" style={styles.date}>
                {format(startDate, 'EEEE, MMM d, yyyy')}
              </Text>
            </View>
            <View style={styles.timeRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={USF_GREEN_LIGHT} />
              <Text variant="bodyMedium" style={styles.time}>
                {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
              </Text>
            </View>
          </Surface>

          {item.status === 'PENDING' && !hasEnded && (
            <Surface style={styles.warningBox} elevation={0}>
              <MaterialCommunityIcons name="clock-alert" size={18} color="#E65100" />
              <Text variant="bodySmall" style={styles.warningText}>
                Confirm within 10 minutes or booking will expire
              </Text>
            </Surface>
          )}

          {displayStatus === 'EXPIRED' && (
            <Surface style={[styles.warningBox, styles.errorBox]} elevation={0}>
              <MaterialCommunityIcons name="calendar-remove" size={18} color="#C62828" />
              <Text variant="bodySmall" style={[styles.warningText, { color: '#C62828' }]}>
                This booking has ended
              </Text>
            </Surface>
          )}

          <View style={styles.createdAtRow}>
            <MaterialCommunityIcons name="clock-plus-outline" size={14} color="#999" />
            <Text variant="bodySmall" style={styles.createdAt}>
              Booked on {format(new Date(item.createdAt), 'MMM d, h:mm a')}
            </Text>
          </View>
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
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons
                  name={activeTab === 'active' ? 'calendar-blank' : 'calendar-check'}
                  size={64}
                  color={USF_GREEN_LIGHT}
                />
              </View>
              <Text variant="headlineSmall" style={styles.emptyTitle}>
                {activeTab === 'active' ? 'No Active Bookings' : 'No Past Bookings'}
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                {activeTab === 'active'
                  ? 'Book a room to get started'
                  : 'Your booking history will appear here'}
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
    backgroundColor: USF_GREEN_LIGHTEST,
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
    elevation: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: USF_GREEN_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
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
    gap: 8,
  },
  roomIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomId: {
    fontWeight: 'bold',
    color: USF_GREEN_DARK,
    fontSize: 18,
  },
  statusChip: {
    height: 28,
    paddingHorizontal: 4,
  },
  deleteButton: {
    margin: 0,
  },
  dateTimeSection: {
    marginBottom: 12,
    backgroundColor: USF_GREEN_LIGHTEST,
    padding: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: USF_GOLD_LIGHT,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    fontWeight: '600',
    color: USF_GREEN_DARK,
    flex: 1,
  },
  time: {
    color: USF_GREEN,
    flex: 1,
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 3,
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
  createdAtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  createdAt: {
    color: '#999',
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: USF_GREEN_LIGHTEST,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: USF_GOLD_LIGHT,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: USF_GREEN_DARK,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: USF_GREEN,
    textAlign: 'center',
    lineHeight: 22,
  },
});
