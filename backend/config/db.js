const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected Successfully');
    return;
  } catch (error) {
    console.warn(`⚠️  Could not connect to MongoDB at "${uri}": ${error.message}`);
  }

  // Fallback: start an in-memory MongoDB server (dev only)
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    console.log('🔄 Starting in-memory MongoDB server (dev fallback)…');
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log('✅ Connected to in-memory MongoDB (data will be lost on restart)');
  } catch (fallbackError) {
    console.error('❌ In-memory MongoDB fallback also failed:', fallbackError.message);
    console.error('   → Install MongoDB locally, or set MONGO_URI to a MongoDB Atlas connection string in backend/.env');
    process.exit(1);
  }
};

module.exports = connectDB;
