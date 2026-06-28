const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kaza';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB متصل بنجاح');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ خطأ في الاتصال بـ MongoDB:', error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ تم قطع الاتصال بـ MongoDB');
  } catch (error) {
    console.error('❌ خطأ في قطع الاتصال:', error.message);
    process.exit(1);
  }
};

module.exports = { connectDB, disconnectDB };
