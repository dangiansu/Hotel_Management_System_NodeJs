const Room = require("../models/room.model");
const RoomBook = require("../models/roomBook.model");
const razorpay = require("razorpay");

const {
  handleForbidden,
  handleConflict,
  handleNotFound,
  handleInternalServerError,
  handleBadRequest,
  handleUnauthorized,
} = require("../middleware/handle_error");

const rzp = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.roomBooking = async (req, res, next) => {
  try {
    const { firstname, lastname, phone_no, email, start_date, end_date } =
      req.body;
    const checkRoomId = await Room.findById({ _id: req.params.rid }).select({
      room_size: 0,
      room_beds: 0,
      cloudinary_id: 0,
      room_no: 0,
    });

    if (
      !firstname ||
      !lastname ||
      !phone_no ||
      !email ||
      !start_date ||
      !end_date
    ) {
      if (
        !firstname &&
        !lastname &&
        !phone_no &&
        !email &&
        !start_date &&
        !end_date
      ) {
        return handleBadRequest(res);
      } else {
        return handleNotFound(res);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set the time to 00:00:00 for accurate comparison
    if (new Date(start_date) < today) {
      return handleBadRequest(
        res,
        "Invalid start date. The start date must be today or a future date."
      );
    }

    if (start_date > end_date) {
      return handleBadRequest(
        res,
        "Invalid date range. The start date must be before the end date."
      );
    }

    if (!checkRoomId) {
      return handleBadRequest(res, "Room id doesn't match.");
    }

    // Check if the room is already booked within the specified date range
    const existingRoomBook = await RoomBook.findOne({
      userId: req.user._id,
      roomId: req.params.rid,
      isBooked: true,
      paymentStatus: "Paid",
      $or: [
        { start_date: { $gte: start_date, $lte: end_date } }, // Check if start_date falls within existing booking
        { end_date: { $gte: start_date, $lte: end_date } }, // Check if end_date falls within existing booking
        { start_date: { $lte: start_date }, end_date: { $gte: end_date } }, // Check if the existing booking spans the entire date range
      ],
    });

    if (existingRoomBook) {
      return res
        .status(200)
        .send({ success: true, status: 200, message: "Room Already Booked." });
    }

    let startdate = new Date(start_date);
    let enddate = new Date(end_date);
    let Difference_In_Time = enddate.getTime() - startdate.getTime();
    let Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
    if (Difference_In_Days === 0) {
      Difference_In_Days = 1;
    }
    const amt_days = Difference_In_Days * checkRoomId.room_amount;

    const amount = amt_days * 100; // Amount in paise (e.g., for ₹10, the value will be 1000)
    const options = {
      amount: amount,
      currency: "INR",
      receipt: "room_booking_receipt",
    };
    // Generate a payment order with Razorpay
    const paymentOrder = await rzp.orders.create(options);

    // Check if the user has a booking for the same room
    const userExistingRoomBook = await RoomBook.findOne({
      userId: req.user._id,
      roomId: req.params.rid,
      paymentStatus: "pending",
    });

    if (userExistingRoomBook) {
      // Update the existing booking for the same user and room
      const updatedRoomBook = await RoomBook.findByIdAndUpdate(
        userExistingRoomBook._id,
        {
          firstname,
          lastname,
          phone_no,
          email,
          start_date,
          end_date,
          tot_amt: amt_days,
          isBooked: true,
          paymentOrderId: paymentOrder.id,
        },
        { new: true }
      );

      return res.status(201).send({
        success: true,
        status: 201,
        message: "Room Booking Updated Successfully.",
        data: {
          RoomData: checkRoomId,
          RoomBookingData: updatedRoomBook,
        },
        paymentOrderId: paymentOrder.id,
        paymentOrderAmount: paymentOrder.amount / 100,
      });
    }

    // Create a new room booking for the user
    const roomBookingData = {
      userId: req.user._id,
      roomId: req.params.rid,
      firstname,
      lastname,
      phone_no,
      email,
      start_date,
      end_date,
      tot_amt: amt_days,
      isBooked: true,
      paymentOrderId: paymentOrder.id,
    };

    const createdRoomBook = await RoomBook.create(roomBookingData);
    return res.status(201).send({
      success: true,
      status: 201,
      message: "Room Booked Successfully.",
      data: { RoomData: checkRoomId, RoomBookingData: createdRoomBook },
      paymentOrderId: paymentOrder.id,
      paymentOrderAmount: paymentOrder.amount / 100,
    });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.paymentStatusUpdate = async (req, res, next) => {
  try {
    const { paymentStatus, paymentId } = req.body;
    const filter = { paymentOrderId: req.params.oid };
    const data = {
      paymentStatus,
      paymentId,
    };
    const updatedRoom = await RoomBook.findOneAndUpdate(filter, data, {
      new: true,
    });
    return res.status(200).send({
      success: true,
      status: 200,
      message: "Success",
      data: updatedRoom,
    });
  } catch (error) {
    console.log(error);
    return handleInternalServerError(res);
  }
};

exports.getRoomBookingData = async (req, res) => {
  try {
    const { start_date, end_date, room_type } = req.body;

    if (!start_date || !end_date) {
      if (!start_date && !end_date) {
        return handleBadRequest(res);
      } else {
        return handleNotFound(res);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set the time to 00:00:00 for accurate comparison
    if (new Date(start_date) < today) {
      return handleBadRequest(
        res,
        "Invalid start date. The start date must be today or a future date."
      );
    }

    if (start_date > end_date) {
      return handleBadRequest(
        res,
        "Invalid date range. The start date must be before the end date."
      );
    }

    let populateOptions = {
      path: "roomId",
      select: "-_id room_type room_no",
    };

    if (room_type) {
      populateOptions.match = { room_type: room_type };
    }

    const RoomBookingData = await RoomBook.find({
      $or: [
        { start_date: { $lte: end_date }, end_date: { $gte: start_date } }, // Booking overlaps with the specified range
        { start_date: { $gte: start_date, $lte: end_date } }, // Booking starts within the specified range
        { end_date: { $gte: start_date, $lte: end_date } }, // Booking ends within the specified range
      ],
      isBooked: true,
      paymentStatus: "Paid",
    })
      .populate(populateOptions)
      .select({
        firstname: 1,
        phone_no: 1,
        start_date: 1,
        end_date: 1,
      });
    const filteredRoomBookingData = RoomBookingData.filter(
      (booking) => booking.roomId !== null
    );
    if (filteredRoomBookingData.length === 0) {
      return handleNotFound(res, "No Room Booking Data Found.");
    }
    res.status(200).send({
      success: true,
      status: 200,
      message: "Success",
      data: filteredRoomBookingData,
    });
  } catch (error) {
    console.log(error);
    return handleInternalServerError(res);
  }
};

exports.availableRooms = async (req, res, next) => {
  try {
    const { start_date, end_date, room_type } = req.body;

    if (!start_date || !end_date) {
      if (!start_date && !end_date) {
        return handleBadRequest(res);
      } else {
        return handleNotFound(res);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set the time to 00:00:00 for accurate comparison
    if (new Date(start_date) < today) {
      return handleBadRequest(
        res,
        "Invalid start date. The start date must be today or a future date."
      );
    }

    if (start_date > end_date) {
      return handleBadRequest(
        res,
        "Invalid date range. The start date must be before the end date."
      );
    }

    const bookedRooms = await RoomBook.find({
      $or: [
        { start_date: { $lte: end_date }, end_date: { $gte: start_date } }, // Booking overlaps with the specified range
        { start_date: { $gte: start_date, $lte: end_date } }, // Booking starts within the specified range
        { end_date: { $gte: start_date, $lte: end_date } }, // Booking ends within the specified range
      ],
      isBooked: true,
      paymentStatus: "Paid",
    });
    const bookedRoomIds = bookedRooms.map((booking) => booking.roomId);

    let availableRoomsQuery = { _id: { $nin: bookedRoomIds } };

    if (room_type) {
      availableRoomsQuery.room_type = room_type;
    }

    const availableRooms = await Room.find(availableRoomsQuery);

    if (availableRooms.length === 0) {
      return handleNotFound(res, "No available rooms found.");
    }

    res.status(200).send({
      success: true,
      status: 200,
      message: "Success",
      data: availableRooms,
    });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.cancleBooking = async (req, res, next) => {
  const bookingId = req.params.rbid;
  const userId = req.user._id;
  try {
    const booking = await RoomBook.findOne({ _id: bookingId, userId });
    if (!booking) {
      return handleNotFound(res, "Room booking data was not found.");
    }
    const filter = { _id: bookingId, userId };
    const updatedData = {
      isBooked: false,
      paymentStatus: "pending",
    };
    await RoomBook.findOneAndUpdate(filter, updatedData, {
      new: true,
    });

    const refund = await rzp.payments.refund(booking?.paymentId);
    if (!refund) {
      return handleInternalServerError(res, "Refund process failed.");
    }
    return res.status(200).send({
      success: true,
      status: 200,
      message: "Room booking canceled successfully",
      refundId: refund.id,
      refundAmount: refund.amount / 100,
    });
  } catch (error) {
    console.log(error);
    return handleInternalServerError(res);
  }
};

exports.getUserRoomBookingData = async (req, res, next) => {
  try {
    const uid = req.user._id;

    const RoomBookingData = await RoomBook.find({
      userId: uid,
      isBooked: true,
      paymentStatus: "Paid",
    })
      .populate({
        path: "roomId",
        select: "-_id room_type room_image room_amount",
      })
      .select({
        firstname: 1,
        lastname: 1,
        phone_no: 1,
        start_date: 1,
        end_date: 1,
        tot_amt: 1,
      });
    if (RoomBookingData.length === 0) {
      return handleBadRequest(res, "No Room Booking Data Found.");
    }
    return res.status(200).send({
      success: true,
      status: 200,
      message: "Success",
      data: RoomBookingData,
    });
  } catch (error) {
    return handleInternalServerError(res);
  }
};
