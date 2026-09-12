module.exports = async () => {
  await require('mongoose').connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('MongoDB connected');
};
