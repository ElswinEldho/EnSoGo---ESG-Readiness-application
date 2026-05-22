const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.MONGO_URI, {
      // mongoose 8 defaults are sensible; explicit options for clarity:
      serverSelectionTimeoutMS: 10000,
    });
    // eslint-disable-next-line no-console
    console.log(`[db] connected → ${env.MONGO_URI.replace(/\/\/([^@]+)@/, '//***@')}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] connection failed:', err.message);
    throw err;
  }
}

module.exports = connectDB;
