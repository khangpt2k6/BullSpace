require('dotenv').config();
const connectDB = require('../shared/config/database');
const { connectRabbitMQ, consumeBookingRequests } = require('../shared/utils/rabbitmq');
const { RoomCache } = require('../shared/utils/redis');
const Booking = require('../shared/models/Booking');

console.log('🔄 Starting Booking Service...');

// Connect to databases
const init = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Start consuming booking requests
    await consumeBookingRequests(processBooking);

    console.log('✅ Booking Service is ready and listening for requests');
  } catch (error) {
    console.error('❌ Failed to start Booking Service:', error.message);
    process.exit(1);
  }
};

// CORE FUNCTION: Process booking request
async function processBooking(bookingData) {
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

      return {
        success: false,
        message: 'Room is not available'
      };
    }

    // Step 2: Try to HOLD the room (ATOMIC OPERATION - SETNX)
    const holdTTL = parseInt(process.env.BOOKING_HOLD_TTL) || 600; // 10 minutes default
    const held = await RoomCache.holdRoom(roomId, timeSlot, userId, holdTTL);

    if (!held) {
      console.log(`❌ Failed to hold room ${roomId} (race condition - another user got it)`);

      // Update booking status to EXPIRED
      await Booking.findByIdAndUpdate(bookingId, {
        status: 'EXPIRED'
      });

      return {
        success: false,
        message: 'Room was just booked by another user'
      };
    }

    console.log(`✅ Room ${roomId} HELD successfully for user ${userId}`);
    console.log(`⏰ Hold expires in ${holdTTL} seconds`);

    // Step 3: Update booking status to PENDING (held, waiting for confirmation)
    await Booking.findByIdAndUpdate(bookingId, {
      status: 'PENDING'
    });

    return {
      success: true,
      message: 'Room held successfully',
      holdExpiresIn: holdTTL
    };

  } catch (error) {
    console.error(`❌ Error processing booking ${bookingId}:`, error.message);

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
