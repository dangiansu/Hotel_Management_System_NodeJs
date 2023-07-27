const mongoose = require("mongoose");
const RoomSchema = new mongoose.Schema(
  {
    room_no: {
      type: String,
      required: true,
    },
    room_type: {
      type: String,
      required: true,
    },
    room_description: {
      type: String,
      require: true,
    },
    room_size: {
      type: String,
      require: true,
    },
    room_beds: {
      type: String,
      require: true,
    },
    room_amount: {
      type: Number,
      require: true,
    },
    room_image: {
      type: String,
    },
    cloudinary_id: {
      type: String,
    },
  },
  {
    versionKey: false,
  }
);
const Room = mongoose.model("Room", RoomSchema);

module.exports = Room;
