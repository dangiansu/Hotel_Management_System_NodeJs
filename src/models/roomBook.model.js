const mongoose = require("mongoose");
const { Schema } = require("mongoose");
const RoomBookSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    phone_no: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      require: true,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    tot_amt: {
      type: Number,
      require: true,
    },
    isBooked: {
      type: Boolean,
      require: true,
      default: false,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    paymentOrderId: {
      type: String,
    },
    paymentId:{
      type: String,
    },
    paymentStatus: {
      type: String,
      default: 'pending',
    },
  },
  {
    versionKey: false,
  }
);
const RoomBook = mongoose.model("RoomBook", RoomBookSchema);

module.exports = RoomBook;
