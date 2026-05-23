const mongoose = require('mongoose');

async function connectDB() {
  mongoose.set('strictQuery', true);
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('[db] MONGO_URI is not set. Check your root .env file.');

  try {
    await mongoose.connect(uri, {
      // mongoose 8 defaults are sensible; explicit option for clarity:
      serverSelectionTimeoutMS: 10000,
    });
    // eslint-disable-next-line no-console
    console.log(`[db] connected → ${uri.replace(/\/\/([^@]+)@/, '//***@')}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] connection failed:', err.message);
    throw err;
  }
}

module.exports = connectDB;
