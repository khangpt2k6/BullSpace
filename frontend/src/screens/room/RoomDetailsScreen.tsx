import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform, Alert } from 'react-native';
import { Text, Card, Chip, Button, ActivityIndicator, Divider } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInLeft,
  ZoomIn,
  BounceIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { HomeStackParamList } from '../../types/navigation';
import { useRoom } from '../../hooks/api/useRooms';
import { useBookings } from '../../hooks/api/useBookings';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import { USF_GREEN } from '../../theme/colors';
import { format } from 'date-fns';

type RoomDetailsRouteProp = RouteProp<HomeStackParamList, 'RoomDetails'>;
type RoomDetailsNavigationProp = StackNavigationProp<HomeStackParamList, 'RoomDetails'>;

export default function RoomDetailsScreen() {
  const route = useRoute<RoomDetailsRouteProp>();
  const navigation = useNavigation<RoomDetailsNavigationProp>();
  const socket = useSocket();
  const toast = useToast();
  const { roomId } = route.params;

  const { data, isLoading, refetch } = useRoom(roomId);
  const { data: bookingsData } = useBookings({ status: ['CONFIRMED', 'PENDING'] });

  // Date/Time state
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour later
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  useEffect(() => {
    // Subscribe to real-time updates for this room
    socket.subscribeToRoom(roomId);

    // Listen for room status updates
    const handleRoomStatus = (update: any) => {
      console.log('Room status update:', update);
      // Refetch room data to get latest availability
      refetch();
    };

    socket.on('room:status', handleRoomStatus);
    socket.on('room:update', handleRoomStatus);

    return () => {
      socket.off('room:status', handleRoomStatus);
      socket.off('room:update', handleRoomStatus);
      socket.unsubscribeFromRoom(roomId);
    };
  }, [roomId, socket, refetch]);

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      // Automatically adjust end date if it's before start date
      if (selectedDate >= endDate) {
        setEndDate(new Date(selectedDate.getTime() + 60 * 60 * 1000)); // Add 1 hour
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      if (selectedDate <= startDate) {
        Alert.alert('Invalid Time', 'End time must be after start time');
        return;
      }
      setEndDate(selectedDate);
    }
  };

  const handleBookRoom = () => {
    // Validate times
    const now = new Date();
    if (startDate < now) {
      toast.showError("Oops! Can't book in the past time");
      return;
    }
    if (endDate <= startDate) {
      toast.showError('End time must be after start time');
      return;
    }

    // Check maximum 3 hours limit
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours > 3) {
      toast.showWarning('Maximum booking duration is 3 hours');
      return;
    }

    // Navigate to booking confirmation with selected times
    navigation.navigate('BookingConfirm', {
      roomId: room._id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    });
  };

  // Helper function to format duration
  const formatDuration = (startDate: Date, endDate: Date) => {
    const durationMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) {
      return `${minutes} mins`;
    } else if (minutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    } else {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} mins`;
    }
  };

  // Check if selected time conflicts with any existing booking
  const checkTimeConflict = () => {
    if (!bookingsData?.bookings) return null;

    const selectedStart = startDate.getTime();
    const selectedEnd = endDate.getTime();

    const conflictingBooking = bookingsData.bookings.find((booking) => {
      const bookingStart = new Date(booking.startTime).getTime();
      const bookingEnd = new Date(booking.endTime).getTime();

      // Check if time ranges overlap
      return (
        (selectedStart >= bookingStart && selectedStart < bookingEnd) ||
        (selectedEnd > bookingStart && selectedEnd <= bookingEnd) ||
        (selectedStart <= bookingStart && selectedEnd >= bookingEnd)
      );
    });

    return conflictingBooking;
  };

  const conflictingBooking = checkTimeConflict();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={USF_GREEN} />
      </View>
    );
  }

  if (!data?.room) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge">Room not found</Text>
      </View>
    );
  }

  const room = data.room;

  return (
    <ScrollView style={styles.container}>
      <Animated.View entering={FadeInDown.duration(500).springify()}>
        <Card style={styles.card}>
          <Card.Content>
          <View style={styles.header}>
            <Animated.View entering={FadeInDown.duration(600).springify()}>
              <Text variant="headlineMedium" style={styles.roomId}>
                {room._id}
              </Text>
            </Animated.View>
            <Animated.View entering={ZoomIn.delay(200).duration(400).springify()}>
              <Chip
                mode="flat"
                icon={() => (
                  <MaterialCommunityIcons
                    name={room.available ? 'check-circle' : 'clock-alert'}
                    size={18}
                    color="#FFFFFF"
                  />
                )}
                style={[
                  styles.availabilityChip,
                  { backgroundColor: room.available ? '#4CAF50' : '#F44336' }
                ]}
                textStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
              >
                {room.available ? 'Available' : 'Occupied'}
              </Chip>
            </Animated.View>
          </View>

          <Text variant="titleMedium" style={styles.building}>
            {room.building} • Floor {room.floor}
          </Text>

          <Divider style={styles.divider} />

          <Text variant="titleSmall" style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsRow}>
            <Text variant="bodyMedium" style={styles.label}>Type:</Text>
            <Text variant="bodyMedium">{room.type}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text variant="bodyMedium" style={styles.label}>Capacity:</Text>
            <Text variant="bodyMedium">{room.capacity}</Text>
          </View>

          {room.description && (
            <>
              <Divider style={styles.divider} />
              <Text variant="titleSmall" style={styles.sectionTitle}>Description</Text>
              <Text variant="bodyMedium">{room.description}</Text>
            </>
          )}

          {room.features.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <Text variant="titleSmall" style={styles.sectionTitle}>Features</Text>
              <View style={styles.featuresContainer}>
                {room.features.map((feature, index) => (
                  <Chip key={index} mode="outlined" style={styles.featureChip}>
                    {feature}
                  </Chip>
                ))}
              </View>
            </>
          )}
        </Card.Content>
      </Card>
      </Animated.View>

      {/* Booking Time Selection */}
      <Animated.View entering={FadeInUp.delay(300).duration(600)}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color={USF_GREEN} />
              <Text variant="titleSmall" style={styles.sectionTitle}> Select Booking Time</Text>
            </View>
          
          {/* Start Time */}
          <View style={styles.timeSection}>
            <Text variant="bodyMedium" style={styles.timeLabel}>Start Time:</Text>
            {Platform.OS === 'web' ? (
              <input
                type="datetime-local"
                value={format(startDate, "yyyy-MM-dd'T'HH:mm")}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate.getTime())) {
                    setStartDate(newDate);
                    if (newDate >= endDate) {
                      setEndDate(new Date(newDate.getTime() + 60 * 60 * 1000));
                    }
                  }
                }}
                style={{
                  width: '100%',
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 4,
                  border: '1px solid #ccc',
                  fontFamily: 'system-ui',
                }}
              />
            ) : (
              <View style={styles.timeButtonsRow}>
                <Button
                  mode="outlined"
                  icon={() => <MaterialCommunityIcons name="calendar" size={18} color={USF_GREEN} />}
                  onPress={() => {
                    setPickerMode('date');
                    setShowStartPicker(true);
                  }}
                  style={styles.timeButton}
                >
                  {format(startDate, 'MMM dd, yyyy')}
                </Button>
                <Button
                  mode="outlined"
                  icon={() => <MaterialCommunityIcons name="clock-outline" size={18} color={USF_GREEN} />}
                  onPress={() => {
                    setPickerMode('time');
                    setShowStartPicker(true);
                  }}
                  style={styles.timeButton}
                >
                  {format(startDate, 'hh:mm a')}
                </Button>
              </View>
            )}
          </View>

          {/* End Time */}
          <View style={styles.timeSection}>
            <Text variant="bodyMedium" style={styles.timeLabel}>End Time:</Text>
            {Platform.OS === 'web' ? (
              <input
                type="datetime-local"
                value={format(endDate, "yyyy-MM-dd'T'HH:mm")}
                min={format(new Date(startDate.getTime() + 60000), "yyyy-MM-dd'T'HH:mm")}
                max={format(new Date(startDate.getTime() + 3 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate.getTime())) {
                    if (newDate <= startDate) {
                      Alert.alert('Invalid Time', 'End time must be after start time');
                      return;
                    }
                    const duration = (newDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
                    if (duration > 3) {
                      Alert.alert('Duration Too Long', 'Maximum booking duration is 3 hours');
                      return;
                    }
                    setEndDate(newDate);
                  }
                }}
                style={{
                  width: '100%',
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 4,
                  border: '1px solid #ccc',
                  fontFamily: 'system-ui',
                }}
              />
            ) : (
              <View style={styles.timeButtonsRow}>
                <Button
                  mode="outlined"
                  icon={() => <MaterialCommunityIcons name="calendar" size={18} color={USF_GREEN} />}
                  onPress={() => {
                    setPickerMode('date');
                    setShowEndPicker(true);
                  }}
                  style={styles.timeButton}
                >
                  {format(endDate, 'MMM dd, yyyy')}
                </Button>
                <Button
                  mode="outlined"
                  icon={() => <MaterialCommunityIcons name="clock-outline" size={18} color={USF_GREEN} />}
                  onPress={() => {
                    setPickerMode('time');
                    setShowEndPicker(true);
                  }}
                  style={styles.timeButton}
                >
                  {format(endDate, 'hh:mm a')}
                </Button>
              </View>
            )}
          </View>

          {/* Duration Display */}
          <View style={[
            styles.durationContainer,
            (endDate.getTime() - startDate.getTime()) > (3 * 60 * 60 * 1000) && styles.durationError
          ]}>
            <View style={styles.durationRow}>
              <MaterialCommunityIcons
                name="timer-outline"
                size={16}
                color={USF_GREEN}
                style={styles.durationIcon}
              />
              <Text variant="bodySmall" style={styles.durationText}>
                Duration: {formatDuration(startDate, endDate)}
              </Text>
              {(endDate.getTime() - startDate.getTime()) > (3 * 60 * 60 * 1000) && (
                <View style={styles.warningBadge}>
                  <MaterialCommunityIcons name="alert" size={14} color="#D32F2F" />
                  <Text variant="bodySmall" style={styles.warningText}>
                    Max 3 hours
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
      </Animated.View>

      {/* Date/Time Pickers - Only for iOS/Android */}
      {Platform.OS !== 'web' && showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode={pickerMode}
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {Platform.OS !== 'web' && showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode={pickerMode}
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={startDate}
        />
      )}

      {/* Time Conflict Warning */}
      {conflictingBooking && (
        <Animated.View entering={SlideInLeft.duration(500).springify()}>
          <Card style={[styles.card, styles.conflictWarning]}>
            <Card.Content>
              <View style={styles.conflictHeader}>
                <MaterialCommunityIcons name="alert-circle" size={24} color="#E65100" />
                <Text variant="titleMedium" style={styles.conflictTitle}>
                  Time Conflict
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.conflictText}>
                You already have a booking for room <Text style={styles.conflictRoomId}>{conflictingBooking.roomId}</Text> during this time:
              </Text>
              <View style={styles.conflictTimeContainer}>
                <View style={styles.conflictTimeRow}>
                  <MaterialCommunityIcons name="calendar" size={16} color="#333" />
                  <Text variant="bodySmall" style={styles.conflictTime}>
                    {format(new Date(conflictingBooking.startTime), 'MMM dd, yyyy')}
                  </Text>
                </View>
                <View style={styles.conflictTimeRow}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#333" />
                  <Text variant="bodySmall" style={styles.conflictTime}>
                    {format(new Date(conflictingBooking.startTime), 'hh:mm a')} - {format(new Date(conflictingBooking.endTime), 'hh:mm a')}
                  </Text>
                </View>
              </View>
              <View style={styles.conflictNoteContainer}>
                <MaterialCommunityIcons name="information" size={16} color="#666" />
                <Text variant="bodySmall" style={styles.conflictNote}>
                  Please choose a different time or cancel your existing booking first.
                </Text>
              </View>
            </Card.Content>
          </Card>
        </Animated.View>
      )}

      <Button
        mode="contained"
        onPress={handleBookRoom}
        disabled={!room.available || !!conflictingBooking}
        style={styles.bookButton}
        contentStyle={styles.bookButtonContent}
      >
        {conflictingBooking
          ? 'Time Conflict - Cannot Book'
          : room.available
            ? 'Book This Room'
            : 'Room Not Available'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomId: {
    fontWeight: 'bold',
    color: USF_GREEN,
  },
  availabilityChip: {
    height: 32,
  },
  building: {
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
    color: USF_GREEN,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: '600',
    marginRight: 8,
    width: 80,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    marginBottom: 8,
  },
  timeSection: {
    marginBottom: 16,
  },
  timeLabel: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  timeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeButton: {
    flex: 1,
  },
  durationContainer: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  durationError: {
    backgroundColor: '#FFE0E0',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  durationIcon: {
    marginRight: 6,
  },
  durationText: {
    fontWeight: '600',
    color: USF_GREEN,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
  },
  warningText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bookButton: {
    margin: 16,
    marginTop: 8,
  },
  bookButtonContent: {
    height: 50,
  },
  conflictWarning: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    borderWidth: 2,
    marginTop: 8,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  conflictTitle: {
    color: '#E65100',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  conflictText: {
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  conflictRoomId: {
    fontWeight: 'bold',
    color: USF_GREEN,
  },
  conflictTimeContainer: {
    backgroundColor: '#FFE0B2',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  conflictTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  conflictTime: {
    color: '#333',
    fontWeight: '600',
    marginLeft: 4,
  },
  conflictNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  conflictNote: {
    color: '#666',
    fontStyle: 'italic',
    flex: 1,
  },
});
