import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10, // Reduced max connections for better stability
  min: 2, // Keep minimum connections alive
  idleTimeoutMillis: 10000, // Close idle connections after 10 seconds
  connectionTimeoutMillis: 30000, // Increased timeout for connection acquisition
  allowExitOnIdle: false, // Keep the pool alive
  keepAlive: true, // Enable TCP keep-alive
  keepAliveInitialDelayMillis: 10000, // Start keep-alive after 10 seconds of idle
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle database client:', err);
});

// Connection verification helper - use for important queries
export const getConnection = async () => {
  const client = await pool.connect();
  try {
    // Verify connection is alive
    await client.query('SELECT 1');
    return client;
  } catch (error) {
    client.release(true); // Release with error flag to destroy the connection
    throw error;
  }
};

// Query helper with automatic retry
export const query = async (text, params, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (error) {
      if (attempt === retries || !error.message.includes('Connection terminated')) {
        throw error;
      }
      console.log(`Database query retry attempt ${attempt + 1}/${retries}`);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay before retry
    }
  }
};

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

export { pool };