import apiClient from './client';
import {
  BookingsResponse,
  BookingResponse,
  CreateBookingResponse,
  CreateBookingRequest,
} from '../../types/api';
import { BookingFilters } from '../../types/models';

export const bookingsApi = {
  // Get all bookings for a user
  getBookings: async (userId: string, filters?: BookingFilters): Promise<BookingsResponse> => {
    const params = new URLSearchParams({ userId });

    if (filters?.status) {
      filters.status.forEach(s => params.append('status', s));
    }

    return apiClient.get<BookingsResponse>(`/api/bookings?${params.toString()}`);
  },

  // Get single booking by ID
  getBooking: async (bookingId: string): Promise<BookingResponse> => {
    return apiClient.get<BookingResponse>(`/api/bookings/${bookingId}`);
  },

  // Create a new booking
  createBooking: async (data: CreateBookingRequest): Promise<CreateBookingResponse> => {
    return apiClient.post<CreateBookingResponse>('/api/bookings', data);
  },

  // Confirm a pending booking
  confirmBooking: async (bookingId: string): Promise<BookingResponse> => {
    return apiClient.post<BookingResponse>(`/api/bookings/${bookingId}/confirm`);
  },

  // Cancel a booking
  cancelBooking: async (bookingId: string): Promise<BookingResponse> => {
    return apiClient.post<BookingResponse>(`/api/bookings/${bookingId}/cancel`);
  },
};
