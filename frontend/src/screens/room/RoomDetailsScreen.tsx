import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform, Alert } from 'react-native';
import { Text, Card, Chip, Button, ActivityIndicator, Divider } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../types/navigation';
import { useRoom } from '../../hooks/api/useRooms';
import { useSocket } from '../../contexts/SocketContext';
import { USF_GREEN } from '../../theme/colors';
import { format } from 'date-fns';

type RoomDetailsRouteProp = RouteProp<HomeStackParamList, 'RoomDetails'>;
type RoomDetailsNavigationProp = StackNavigationProp<HomeStackParamList, 'RoomDetails'>;

export default function RoomDetailsScreen() {
  const route = useRoute<RoomDetailsRouteProp>();
  const navigation = useNavigation<RoomDetailsNavigationProp>();
  const socket = useSocket();
  const { roomId } = route.params;

  const { data, isLoading, refetch } = useRoom(roomId);

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
      Alert.alert('Invalid Time', 'Start time cannot be in the past');
      return;
    }
    if (endDate <= startDate) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }

    // Navigate to booking confirmation with selected times
    navigation.navigate('BookingConfirm', {
      roomId: room._id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    });
  };

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
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.roomId}>
              {room._id}
            </Text>
            <Chip
              mode="flat"
              style={[
                styles.availabilityChip,
                { backgroundColor: room.available ? '#4CAF50' : '#F44336' }
              ]}
              textStyle={{ color: '#FFFFFF' }}
            >
              {room.available ? 'Available' : 'Occupied'}
            </Chip>
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

      {/* Booking Time Selection */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>📅 Select Booking Time</Text>
          
          {/* Start Time */}
          <View style={styles.timeSection}>
            <Text variant="bodyMedium" style={styles.timeLabel}>Start Time:</Text>
            <View style={styles.timeButtonsRow}>
              <Button
                mode="outlined"
                onPress={() => {
                  setPickerMode('date');
                  setShowStartPicker(true);
                }}
                style={styles.timeButton}
              >
                📅 {format(startDate, 'MMM dd, yyyy')}
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  setPickerMode('time');
                  setShowStartPicker(true);
                }}
                style={styles.timeButton}
              >
                🕐 {format(startDate, 'hh:mm a')}
              </Button>
            </View>
          </View>

          {/* End Time */}
          <View style={styles.timeSection}>
            <Text variant="bodyMedium" style={styles.timeLabel}>End Time:</Text>
            <View style={styles.timeButtonsRow}>
              <Button
                mode="outlined"
                onPress={() => {
                  setPickerMode('date');
                  setShowEndPicker(true);
                }}
                style={styles.timeButton}
              >
                📅 {format(endDate, 'MMM dd, yyyy')}
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  setPickerMode('time');
                  setShowEndPicker(true);
                }}
                style={styles.timeButton}
              >
                🕐 {format(endDate, 'hh:mm a')}
              </Button>
            </View>
          </View>

          {/* Duration Display */}
          <View style={styles.durationContainer}>
            <Text variant="bodySmall" style={styles.durationText}>
              Duration: {Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))} minutes
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Date/Time Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode={pickerMode}
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode={pickerMode}
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={startDate}
        />
      )}

      <Button
        mode="contained"
        onPress={handleBookRoom}
        disabled={!room.available}
        style={styles.bookButton}
        contentStyle={styles.bookButtonContent}
      >
        {room.available ? 'Book This Room' : 'Room Not Available'}
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
    marginBottom: 8,
    color: USF_GREEN,
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
  durationText: {
    textAlign: 'center',
    fontWeight: '600',
    color: USF_GREEN,
  },
  bookButton: {
    margin: 16,
    marginTop: 8,
  },
  bookButtonContent: {
    height: 50,
  },
});
