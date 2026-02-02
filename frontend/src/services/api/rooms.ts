import apiClient from './client';
import {
  RoomsResponse,
  RoomResponse,
  RoomAvailabilityResponse,
  BuildingsResponse,
  RoomAvailabilityQuery,
} from '../../types/api';
import { RoomFilters } from '../../types/models';

export const roomsApi = {
  // Get all rooms with optional filters
  getRooms: async (filters?: RoomFilters): Promise<RoomsResponse> => {
    const params = new URLSearchParams();

    if (filters?.building) params.append('building', filters.building);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.floor !== undefined) params.append('floor', filters.floor.toString());
    if (filters?.capacity) params.append('capacity', filters.capacity);

    const queryString = params.toString();
    const url = `/api/rooms${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<RoomsResponse>(url);
  },

  // Get single room by ID
  getRoom: async (roomId: string): Promise<RoomResponse> => {
    return apiClient.get<RoomResponse>(`/api/rooms/${roomId}`);
  },

  // Check room availability for a time slot
  getRoomAvailability: async (
    roomId: string,
    query: RoomAvailabilityQuery
  ): Promise<RoomAvailabilityResponse> => {
    const params = new URLSearchParams({
      startTime: query.startTime,
      endTime: query.endTime,
    });

    return apiClient.get<RoomAvailabilityResponse>(
      `/api/rooms/${roomId}/availability?${params.toString()}`
    );
  },

  // Get list of all buildings
  getBuildings: async (): Promise<BuildingsResponse> => {
    return apiClient.get<BuildingsResponse>('/api/rooms/buildings');
  },
};
