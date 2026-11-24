import mongoose from 'mongoose';
import config from './index.js';

let mongodInstance = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Attempt connection to configured URI
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[MongoDB] Connected to external database: ${config.mongoUri}`);
    return mongoose.connection;
  } catch (err) {
    console.warn(`[MongoDB] External connection to ${config.mongoUri} failed (${err.message}).`);

    if (config.useMemoryDbFallback) {
      console.log('[MongoDB] Initializing in-memory MongoMemoryServer for development/testing...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        const memoryUri = mongodInstance.getUri();
        await mongoose.connect(memoryUri);
        console.log(`[MongoDB] In-memory MongoDB operational at ${memoryUri}`);
        return mongoose.connection;
      } catch (memErr) {
        console.error('[MongoDB] Failed to start in-memory Mongo server:', memErr.message);
        throw memErr;
      }
    } else {
      throw err;
    }
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongodInstance) {
    await mongodInstance.stop();
    mongodInstance = null;
  }
}

export function checkDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

export default {
  connectDB,
  disconnectDB,
  checkDatabaseConnection,
};
