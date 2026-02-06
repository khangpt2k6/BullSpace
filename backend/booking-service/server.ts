import 'dotenv/config';
import connectDB from '../shared/config/database';
import { connectRabbitMQ, consumeBookingRequests } from '../shared/utils/rabbitmq';
import { RoomCache } from '../shared/utils/redis';
import Booking from '../shared/models/Booking';
import { BookingQueueMessage } from '../shared/types';

console.log('🔄 Starting Booking Service...');

// Connect to databases
const init = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Start consuming booking requests
    await consumeBookingRequests(processBooking);

    console.log('✅ Booking Service is ready and listening for requests');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to start Booking Service:', errorMessage);
    process.exit(1);
  }
};

// CORE FUNCTION: Process booking request
async function processBooking(bookingData: BookingQueueMessage): Promise<void> {
  const { bookingId, userId, roomId, timeSlot } = bookingData;

  console.log(`\n🔄 Processing booking: ${bookingId}`);
  console.log(`   Room: ${roomId}`);
  console.log(`   Time: ${timeSlot}`);
  console.log(`   User: ${userId}`);

  try {
    // Step 1: Check if room is available in Redis (ATOMIC CHECK)
    const isAvailable = await RoomCache.isAvailable(roomId, timeSlot);

    if (!isAvailable) {
      console.log(`❌ Room ${roomId} is NOT available`);

      // Update booking status to EXPIRED
      await Booking.findByIdAndUpdate(bookingId, {
        status: 'EXPIRED'
      });

      console.log(`⚠️  Booking ${bookingId} expired - room not available`);
      return;
    }

    // Step 2: Try to HOLD the room (ATOMIC OPERATION - SETNX)
    const holdTTL = parseInt(process.env.BOOKING_HOLD_TTL || '600'); // 10 minutes default
    const held = await RoomCache.holdRoom(roomId, timeSlot, userId, holdTTL);

    if (!held) {
      console.log(`❌ Failed to hold room ${roomId} (race condition - another user got it)`);

      // Update booking status to EXPIRED
      await Booking.findByIdAndUpdate(bookingId, {
        status: 'EXPIRED'
      });

      console.log(`⚠️  Booking ${bookingId} expired - race condition`);
      return;
    }

    console.log(`✅ Room ${roomId} HELD successfully for user ${userId}`);
    console.log(`⏰ Hold expires in ${holdTTL} seconds`);

    // Step 3: Update booking status to PENDING (held, waiting for confirmation)
    await Booking.findByIdAndUpdate(bookingId, {
      status: 'PENDING'
    });

    console.log(`✅ Booking ${bookingId} processed successfully`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error processing booking ${bookingId}:`, errorMessage);

    // Update booking to EXPIRED on error
    await Booking.findByIdAndUpdate(bookingId, {
      status: 'EXPIRED'
    });

    throw error;
  }
}

// Start the service
init();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down Booking Service...');
  process.exit(0);
});
