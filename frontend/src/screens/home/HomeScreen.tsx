import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Searchbar, Card, Text, Chip, ActivityIndicator, FAB, Button, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { HomeStackParamList } from '../../types/navigation';
import { useRooms } from '../../hooks/api/useRooms';
import { useSocket } from '../../contexts/SocketContext';
import { Room, RoomFilters } from '../../types/models';
import {
  USF_GREEN,
  USF_GREEN_LIGHT,
  USF_GREEN_DARK,
  USF_GREEN_LIGHTEST,
  USF_GOLD,
  USF_GOLD_LIGHT,
  USF_GOLD_LIGHTEST
} from '../../theme/colors';
import SearchFiltersModal from '../../components/common/SearchFiltersModal';

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const socket = useSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<RoomFilters>({});
  const [roomOccupancy, setRoomOccupancy] = useState<Record<string, string | undefined>>({});
  const [showFiltersModal, setShowFiltersModal] = useState(true);

  const shouldFetchRooms = !!(filters.startTime && filters.endTime);
  const { data, isLoading, refetch, isRefetching } = useRooms(shouldFetchRooms ? filters : undefined);

  useEffect(() => {
    const handleRoomUpdate = (update: any) => {
      console.log('Room update received:', update);

      if (update.bookingEndTime) {
        setRoomOccupancy(prev => ({
          ...prev,
          [update.roomId]: update.bookingEndTime
        }));
      } else if (update.status === 'AVAILABLE') {
        setRoomOccupancy(prev => {
          const newState = { ...prev };
          delete newState[update.roomId];
          return newState;
        });
      }

      refetch();
    };

    socket.on('room:update', handleRoomUpdate);

    return () => {
      socket.off('room:update', handleRoomUpdate);
    };
  }, [socket, refetch]);

  const filteredRooms = data?.rooms.filter((room) =>
    room._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.building.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.type.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const formatOccupiedUntil = (endTime: string): string => {
    const date = new Date(endTime);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const renderRoomCard = ({ item }: { item: Room }) => {
    const occupiedUntil = roomOccupancy[item._id];
    const now = new Date();

    const currentBooking = (item as any).currentBooking;
    const nextBooking = (item as any).nextBooking;

    let isCurrentlyOccupied = false;
    let occupancyEndTime = occupiedUntil;

    if (currentBooking) {
      const bookingStart = new Date(currentBooking.startTime);
      const bookingEnd = new Date(currentBooking.endTime);

      if (now >= bookingStart && now < bookingEnd) {
        isCurrentlyOccupied = true;
        occupancyEndTime = currentBooking.endTime;
      }
    }

    if (!isCurrentlyOccupied && !item.available) {
      isCurrentlyOccupied = true;
    }

    return (
      <Card
        style={[
          styles.card,
          isCurrentlyOccupied ? styles.cardOccupied : styles.cardAvailable
        ]}
        onPress={() => navigation.navigate('RoomDetails', { roomId: item._id })}
        mode="elevated"
      >
        <Card.Content>
          {/* Card Header with Status Badge */}
          <View style={styles.cardHeader}>
            <View style={styles.roomTitleContainer}>
              <MaterialCommunityIcons 
                name="door" 
                size={24} 
                color={USF_GREEN} 
                style={styles.roomIcon}
              />
              <Text variant="titleLarge" style={styles.roomId}>
                {item._id}
              </Text>
            </View>
            <Surface
              style={[
                styles.statusBadge,
                isCurrentlyOccupied ? styles.statusOccupied : styles.statusAvailable
              ]}
              elevation={0}
            >
              <MaterialCommunityIcons
                name={isCurrentlyOccupied ? "close-circle" : "check-circle"}
                size={16}
                color="#FFFFFF"
                style={styles.statusIcon}
              />
              <Text style={styles.statusText}>
                {isCurrentlyOccupied ? 'Occupied' : 'Available'}
              </Text>
            </Surface>
          </View>

          {/* Building and Floor Info */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="office-building" size={16} color="#666" />
            <Text variant="bodyMedium" style={styles.infoText}>
              {item.building}
            </Text>
            <MaterialCommunityIcons name="stairs" size={16} color="#666" style={styles.floorIcon} />
            <Text variant="bodyMedium" style={styles.infoText}>
              Floor {item.floor}
            </Text>
          </View>

          {/* Occupancy Status */}
          {isCurrentlyOccupied && occupancyEndTime && (
            <Surface style={styles.occupancyAlert} elevation={0}>
              <MaterialCommunityIcons name="clock-alert" size={16} color="#D32F2F" />
              <Text variant="bodySmall" style={styles.occupiedText}>
                Occupied until {formatOccupiedUntil(occupancyEndTime)}
              </Text>
            </Surface>
          )}

          {/* Next Booking Info */}
          {!isCurrentlyOccupied && nextBooking && (
            <Surface style={styles.nextBookingAlert} elevation={0}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color="#F57C00" />
              <Text variant="bodySmall" style={styles.nextBookingText}>
                Next booking: {format(new Date(nextBooking.startTime), 'h:mm a')}
              </Text>
            </Surface>
          )}

          {/* Room Details */}
          <View style={styles.detailsRow}>
            <Surface style={styles.detailPill} elevation={0}>
              <MaterialCommunityIcons name="shape" size={14} color={USF_GREEN} />
              <Text style={styles.detailPillText}>{item.type}</Text>
            </Surface>
            <Surface style={styles.detailPill} elevation={0}>
              <MaterialCommunityIcons name="account-group" size={14} color={USF_GREEN} />
              <Text style={styles.detailPillText}>{item.capacity}</Text>
            </Surface>
          </View>

          {/* Features */}
          {item.features.length > 0 && (
            <View style={styles.featuresContainer}>
              <View style={styles.featuresHeader}>
                <MaterialCommunityIcons name="star-outline" size={14} color="#888" />
                <Text style={styles.featuresLabel}>Features</Text>
              </View>
              <View style={styles.featuresRow}>
                {item.features.slice(0, 3).map((feature, index) => (
                  <Chip
                    key={index}
                    mode="outlined"
                    compact
                    style={styles.featureChip}
                    textStyle={styles.featureText}
                  >
                    {feature}
                  </Chip>
                ))}
                {item.features.length > 3 && (
                  <Text style={styles.moreFeatures}>
                    +{item.features.length - 3}
                  </Text>
                )}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const handleApplyFilters = (newFilters: RoomFilters) => {
    setFilters(newFilters);
    setShowFiltersModal(false);
  };

  const formatFiltersSummary = () => {
    if (!filters.startTime || !filters.endTime) return '';
    const start = new Date(filters.startTime);
    const end = new Date(filters.endTime);
    return `${format(start, 'MMM d, h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  return (
    <View style={styles.container}>
      {/* Active Filter Summary Bar */}
      {shouldFetchRooms && (
        <Surface style={styles.filterSummary} elevation={1}>
          <View style={styles.filterContent}>
            <MaterialCommunityIcons name="calendar-check" size={20} color={USF_GREEN} />
            <Text variant="bodyMedium" style={styles.filterText}>
              {formatFiltersSummary()}
            </Text>
          </View>
          <Button
            mode="text"
            onPress={() => setShowFiltersModal(true)}
            compact
            textColor={USF_GREEN}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="pencil" size={size} color={color} />
            )}
          >
            Edit
          </Button>
        </Surface>
      )}

      {/* Search Bar */}
      <Searchbar
        placeholder="Search by room, building, or type..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        icon={() => <MaterialCommunityIcons name="magnify" size={24} color="#666" />}
        clearIcon={() => <MaterialCommunityIcons name="close" size={24} color="#666" />}
      />

      {/* Main Content */}
      {!shouldFetchRooms ? (
        <View style={styles.centered}>
          <View style={styles.emptyStateIcon}>
            <MaterialCommunityIcons name="calendar-search" size={80} color={USF_GREEN} />
          </View>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            When do you need a room?
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Select a date and time to see available rooms
          </Text>
          <Button
            mode="contained"
            onPress={() => setShowFiltersModal(true)}
            style={styles.selectButton}
            contentStyle={styles.selectButtonContent}
            buttonColor={USF_GREEN}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="calendar-clock" size={size} color={color} />
            )}
          >
            Select Date & Time
          </Button>
        </View>
      ) : isLoading && !isRefetching ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={USF_GREEN} />
          <Text style={styles.loadingText}>Finding available rooms...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          renderItem={renderRoomCard}
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
              <View style={styles.emptyStateIcon}>
                <MaterialCommunityIcons name="calendar-remove" size={64} color="#999" />
              </View>
              <Text variant="headlineSmall" style={styles.emptyTitle}>
                No rooms available
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                No rooms match your search for this time slot
              </Text>
              <Button
                mode="outlined"
                onPress={() => setShowFiltersModal(true)}
                style={styles.changeDateButton}
                contentStyle={styles.changeDateButtonContent}
                textColor={USF_GREEN}
                icon={({ size, color }) => (
                  <MaterialCommunityIcons name="calendar-refresh" size={size} color={color} />
                )}
              >
                Try Different Time
              </Button>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      {shouldFetchRooms && (
        <FAB
          icon={({ size, color }) => (
            <MaterialCommunityIcons name="filter-variant" size={size} color={color} />
          )}
          style={styles.fab}
          color="#FFFFFF"
          onPress={() => setShowFiltersModal(true)}
        />
      )}

      {/* Search Filters Modal */}
      <SearchFiltersModal
        visible={showFiltersModal}
        onDismiss={() => {
          if (shouldFetchRooms) {
            setShowFiltersModal(false);
          }
        }}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: USF_GREEN_LIGHTEST,
  },
  filterSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: USF_GOLD_LIGHTEST,
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  filterText: {
    fontWeight: '600',
    color: USF_GREEN_DARK,
    flex: 1,
  },
  searchbar: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: USF_GREEN_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardAvailable: {
    borderLeftWidth: 4,
    borderLeftColor: USF_GREEN,
  },
  cardOccupied: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomIcon: {
    marginRight: 8,
  },
  roomId: {
    fontWeight: 'bold',
    color: USF_GREEN,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusAvailable: {
    backgroundColor: USF_GREEN,
  },
  statusOccupied: {
    backgroundColor: '#F44336',
  },
  statusIcon: {
    marginRight: 2,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  infoText: {
    color: '#555',
  },
  floorIcon: {
    marginLeft: 8,
  },
  occupancyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#D32F2F',
  },
  occupiedText: {
    color: '#D32F2F',
    fontWeight: '600',
    flex: 1,
  },
  nextBookingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F57C00',
  },
  nextBookingText: {
    color: '#F57C00',
    fontWeight: '600',
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: USF_GREEN_LIGHTEST,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: USF_GOLD_LIGHT,
  },
  detailPillText: {
    color: USF_GREEN_DARK,
    fontSize: 13,
    fontWeight: '600',
  },
  featuresContainer: {
    marginTop: 4,
  },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  featuresLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  featureChip: {
    height: 26,
    backgroundColor: '#F8F9FA',
    borderColor: '#E0E0E0',
  },
  featureText: {
    fontSize: 11,
    color: '#555',
  },
  moreFeatures: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    marginLeft: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#1A1A1A',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  selectButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  selectButtonContent: {
    height: 48,
    paddingHorizontal: 8,
  },
  changeDateButton: {
    marginTop: 16,
    borderRadius: 12,
    borderColor: USF_GREEN,
    borderWidth: 1.5,
  },
  changeDateButtonContent: {
    height: 44,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: USF_GREEN,
    borderRadius: 16,
  },
});