const dataBaseUri = process.env.MONGODB_CONNECTION_STRING;
const mongoose = require("mongoose");

const connection = async () => {
  try {
    await mongoose.connect(dataBaseUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("🟢 Connected to MongoDB 🟢");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

module.exports = connection;
