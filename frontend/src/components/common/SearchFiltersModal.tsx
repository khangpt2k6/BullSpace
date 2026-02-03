import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Modal, Portal, Text, Button, Divider } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { RoomFilters } from '../../types/models';
import { USF_GREEN } from '../../theme/colors';

interface SearchFiltersModalProps {
  visible: boolean;
  onDismiss: () => void;
  onApply: (filters: RoomFilters) => void;
  initialFilters?: RoomFilters;
}

export default function SearchFiltersModal({
  visible,
  onDismiss,
  onApply,
  initialFilters,
}: SearchFiltersModalProps) {
  // Initialize with current date/time or from initialFilters
  const getInitialDate = () => {
    if (initialFilters?.startTime) {
      return new Date(initialFilters.startTime);
    }
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return now;
  };

  const getInitialEndDate = () => {
    if (initialFilters?.endTime) {
      return new Date(initialFilters.endTime);
    }
    const now = new Date();
    now.setHours(now.getHours() + 2);
    now.setMinutes(0, 0, 0);
    return now;
  };

  const [date, setDate] = useState<Date>(getInitialDate());
  const [startTime, setStartTime] = useState<Date>(getInitialDate());
  const [endTime, setEndTime] = useState<Date>(getInitialEndDate());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const handleApply = () => {
    // Combine date with start and end times
    const startDateTime = new Date(date);
    startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

    const endDateTime = new Date(date);
    endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

    // Validate that end time is after start time
    if (endDateTime <= startDateTime) {
      alert('End time must be after start time');
      return;
    }

    const filters: RoomFilters = {
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
    };

    onApply(filters);
    onDismiss();
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setEndTime(selectedTime);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView>
          <Text variant="headlineSmall" style={styles.title}>
            Select Date & Time
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Choose when you want to book a room
          </Text>

          <Divider style={styles.divider} />

          {/* Date Selection */}
          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.label}>
              Date
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              style={styles.pickerButton}
              icon="calendar"
            >
              {format(date, 'EEEE, MMMM d, yyyy')}
            </Button>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Start Time Selection */}
          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.label}>
              Start Time
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowStartTimePicker(true)}
              style={styles.pickerButton}
              icon="clock-outline"
            >
              {format(startTime, 'h:mm a')}
            </Button>
            {showStartTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display="default"
                onChange={onStartTimeChange}
              />
            )}
          </View>

          {/* End Time Selection */}
          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.label}>
              End Time
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowEndTimePicker(true)}
              style={styles.pickerButton}
              icon="clock-outline"
            >
              {format(endTime, 'h:mm a')}
            </Button>
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display="default"
                onChange={onEndTimeChange}
              />
            )}
          </View>

          <Divider style={styles.divider} />

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleApply}
              style={styles.applyButton}
              buttonColor={USF_GREEN}
            >
              Search Rooms
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    color: '#333',
  },
  pickerButton: {
    justifyContent: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
});
