const Room = require("../models/room.model");
const RoomBook = require("../models/roomBook.model");
const cloudinary = require("cloudinary").v2;
const {
  handleForbidden,
  handleConflict,
  handleNotFound,
  handleInternalServerError,
  handleBadRequest,
  handleUnauthorized,
  validateRequestBody,
} = require("../middleware/handle_error");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

exports.addRoom = async (req, res, next) => {
  try {
    const {
      room_no,
      room_type,
      room_description,
      room_size,
      room_beds,
      room_amount,
    } = req.body;
    if (req.user.role !== "admin") {
      return res.status(400).send({ message: "Check credentials of admin." });
    }
    const requiredKeys = [
      "room_no",
      "room_type",
      "room_description",
      "room_size",
      "room_beds",
      "room_amount",
    ];
    const validationError = validateRequestBody(req, res, requiredKeys);
    if (validationError) {
      return validationError;
    }

    if (isNaN(room_amount)) {
      return handleBadRequest(res, "Please enter number in room_amount field.");
    }

    if (!req.file) {
      return handleNotFound(res, "Please Upload Image.");
    }
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "public/images",
    });
    const room = await Room.create({
      room_no,
      room_type,
      room_description,
      room_size,
      room_beds,
      room_amount,
      room_image: result.secure_url,
      cloudinary_id: result.public_id,
    });
    return res.status(200).send({
      success: true,
      status: 201,
      message: "Room Added Successfully.",
      data: room,
    });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.updateRoom = async (req, res, next) => {
  try {
    const {
      room_no,
      room_type,
      room_description,
      room_size,
      room_beds,
      room_amount,
    } = req.body;
    const requiredKeys = [
      "room_no",
      "room_type",
      "room_description",
      "room_size",
      "room_beds",
      "room_amount",
    ];
    const validationError = validateRequestBody(req, res, requiredKeys);
    if (validationError) {
      return validationError;
    }
    if (req.user.role !== "admin") {
      return res.status(400).send({ message: "Check credentials of admin." });
    }
    if (isNaN(room_amount)) {
      return handleBadRequest(res, "Please enter number in room_amount field.");
    }
    let updatedData = {
      room_no,
      room_type,
      room_description,
      room_size,
      room_beds,
      room_amount,
    };
    if (req.file) {
      const room = await Room.findOne({ _id: req.params.rid });
      if (room.room_image && room.cloudinary_id) {
        await cloudinary.uploader.destroy(room.cloudinary_id);
      }
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "public/images",
      });
      updatedData.room_image = uploadedImage.secure_url;
      updatedData.cloudinary_id = uploadedImage.public_id;
    }
    const filter = { _id: req.params.rid };
    const updatedRoom = await Room.findOneAndUpdate(filter, updatedData, {
      new: true,
    });
    if (!updatedRoom) {
      return handleNotFound(res, "Room not found.");
    }
    res.status(200).send({
      success: true,
      status: 200,
      message: "Room Updated Successfully.",
      data: updatedRoom,
    });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.viewRoomById = async (req, res, next) => {
  try {
    let room = await Room.findById({
      _id: req.params.rid,
    });
    if (room === null) {
      return handleNotFound(res, "Room not found.");
    }
    res
      .status(200)
      .send({ success: true, status: 200, message: "Success", data: room });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.viewRoom = async (req, res, next) => {
  try {
    if (req.query.start_date && req.query.end_date && req.query.room_type) {
      const { start_date, end_date, room_type } = req.query;

      // Validate date format
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return handleBadRequest(res, "Invalid date format.");
      }

      // Validate date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        return handleBadRequest(
          res,
          "Invalid start date. The start date must be today or a future date."
        );
      }

      if (startDate > endDate) {
        return handleBadRequest(
          res,
          "Invalid date range. The start date must be before the end date."
        );
      }

      const bookedRooms = await RoomBook.find({
        $or: [
          { start_date: { $lte: endDate }, end_date: { $gte: startDate } },
          { start_date: { $gte: startDate, $lte: endDate } },
          { end_date: { $gte: startDate, $lte: endDate } },
        ],
      });

      const bookedRoomIds = bookedRooms.map((booking) => booking.roomId);
      const availableRooms = await Room.find({
        _id: { $nin: bookedRoomIds },
        room_type,
      });

      if (availableRooms.length === 0) {
        return handleNotFound(res, "No available rooms found.");
      }

      res.status(200).send({
        success: true,
        status: 200,
        message: "Success",
        data: availableRooms,
      });
    } else if (req.query.page && req.query.limit) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const startIndex = (page - 1) * limit;
      let Rooms = await Room.find({}).skip(startIndex).limit(limit);

      if (Rooms.length === 0) {
        return handleNotFound(res, "Room not found.");
      }

      const totalCount = await Room.countDocuments({});
      const totalPages = Math.ceil(totalCount / limit);

      const pagination = {
        page,
        totalPages,
        totalCount,
      };

      return res.status(200).send({
        success: true,
        status: 200,
        message: "Success",
        data: Rooms,
        pagination,
      });
    } else {
      let rooms = await Room.find({});
      if (rooms.length === 0) {
        return handleNotFound(res, "Room not found.");
      }

      return res
        .status(200)
        .send({ success: true, status: 200, message: "Success", data: rooms });
    }
  } catch (error) {
    return handleInternalServerError(res);
  }
};
