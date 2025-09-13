const { Pool } = require('pg');
const knex = require('knex');
const logger = require('../utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'momentum_db',
  user: process.env.DB_USER || 'momentum_user',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create PostgreSQL connection pool
const pool = new Pool(dbConfig);

// Knex configuration for migrations and query builder
const knexConfig = {
  client: 'postgresql',
  connection: process.env.DATABASE_URL || {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    ssl: dbConfig.ssl,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: '../database/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: '../database/seeds',
  },
};

// Initialize Knex
const db = knex(knexConfig);

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ Database connection established successfully');
    logger.info(`📅 Database time: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Initialize database connection
const initializeDatabase = async () => {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to establish database connection');
    }

    // Run migrations in production
    if (process.env.NODE_ENV === 'production') {
      logger.info('🔄 Running database migrations...');
      await db.migrate.latest();
      logger.info('✅ Database migrations completed');
    }

    return true;
  } catch (error) {
    logger.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

// Graceful shutdown
const closeDatabase = async () => {
  try {
    await pool.end();
    await db.destroy();
    logger.info('🔒 Database connections closed');
  } catch (error) {
    logger.error('❌ Error closing database connections:', error.message);
  }
};

// Note: Process termination is handled in server.js to avoid conflicts

// Database query helpers
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Executed query in ${duration}ms: ${text}`);
    return result;
  } catch (error) {
    logger.error('Database query error:', {
      query: text,
      params,
      error: error.message,
    });
    throw error;
  }
};

const getClient = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    logger.error('Error getting database client:', error.message);
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  db,
  query,
  getClient,
  transaction,
  testConnection,
  initializeDatabase,
  closeDatabase,
};