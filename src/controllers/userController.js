const User = require("../models/user.model");
const Room = require("../models/room.model");
const RoomBook = require("../models/roomBook.model");
var bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const {
  handleForbidden,
  handleConflict,
  handleNotFound,
  handleInternalServerError,
  handleBadRequest,
  handleUnauthorized,
} = require("../middleware/handle_error");

exports.register = async (req, res, next) => {
  const { firstname, lastname, email, password, repassword, phone } = req.body;
  if (!firstname || !lastname || !email || !password || !repassword || !phone) {
    if (
      !firstname &&
      !lastname &&
      !email &&
      !password &&
      !repassword &&
      !phone
    ) {
      return handleBadRequest(res);
    } else {
      return handleNotFound(res);
    }
  }
  if (password !== repassword) {
    return res.status(400).send({
      success: false,
      status: 400,
      message:"Password and repassword do not match.",
    });
  }
  try {
    const hashedPassword = bcrypt.hashSync(req.body.password, 8);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return handleConflict(res, "User already exists.");
    }
    let a = req.body;
    if (a.isadmin == true) {
      a.role = "admin";
    }
    const user = await User.create({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      phone,
      role: a.role,
    });
    return res.status(201).send({
      success: true,
      status: 201,
      message: "User Registered Successfully.",
      data: user,
    });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.signin = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    if (!email && !password) {
      return handleBadRequest(res);
    } else {
      return handleNotFound(res);
    }
  }
  try {
    const user = await User.findOne({ email });
    if (user) {
      const passwordValid = await bcrypt.compare(password, user.password);
      if (passwordValid) {
        const token = jwt.sign(
          {
            _id: user.id,
            role: user.role,
          },
          process.env.JWT_SECRET_KEY
        );
        res.status(200).send({
          success: true,
          status: 200,
          message: "Login Successful.",
          token,
          firstname: user.firstname,
        });
      } else {
        return handleUnauthorized(res, "Incorrect password.");
      }
    } else {
      return handleNotFound(res, "User does not exist.");
    }
  } catch (error) {
    return handleInternalServerError(res);
  }
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

function generateOTP() {
  // Generate a random number between 1000 and 9999
  const otp = Math.floor(Math.random() * 9000) + 1000;
  return otp.toString();
}

function sendPasswordResetEmail(email, otp) {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Password Reset",
    text: `Click the following link to reset your password: http://192.168.1.72:3000/api/reset-password/${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return handleBadRequest(res, "Email is required.");
    }
    const user = await User.findOne({ email });
    if (!user) {
      handleNotFound(res, "User not found.");
    }
    const otp = generateOTP();
    // Store the otp in the user document
    user.resetOtp = otp;
    user.resetOtpExpiration = Date.now() + 3600000; // otp expires in 1 hour
    await user.save();
    // Send the password reset link to the user's email address
    sendPasswordResetEmail(email, otp);
    res.status(200).send({
      success: true,
      status: 200,
      message: "Password reset email sent.",
    });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.checkForgotPassword = async (req, res, next) => {
  try {
    const { otp } = req.params;
    // Find the user based on the reset otp and check if it's valid
    const user = await User.findOne({
      resetOtp: otp,
      resetOtpExpiration: { $gt: Date.now() },
    });

    if (!user) {
      return handleUnauthorized(res, "Invalid or expired otp.");
    }
    res.status(200).send({
      success: true,
      status: 200,
      message: "Please reset your password.",
      otp,
    });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { otp, password } = req.body;
    if (!otp || !password) {
      if (!otp && !password) {
        return handleBadRequest(res);
      } else {
        return handleNotFound(res);
      }
    }
    // Find the user based on the reset otp and check if it's valid
    const user = await User.findOne({
      resetOtp: otp,
      resetOtpExpiration: { $gt: Date.now() },
    });
    if (!user) {
      return handleUnauthorized(res, "Invalid or expired otp.");
    }
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Update the user's password
    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiration = undefined;
    await user.save();
    res.status(200).send({
      success: true,
      status: 200,
      message: "Password reset successful.",
    });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.profile = async (req, res, next) => {
  try {
    let user = await User.findById({
      _id: req.user._id,
    }).select({ password: 0 });
    if (user === null) {
      return handleNotFound(res, "User not found.");
    }
    res
      .status(200)
      .send({ success: true, status: 200, message: "Success", data: user });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { firstname, lastname, phone } = req.body;
    if (!firstname || !lastname || !phone) {
      if (!firstname && !lastname && !phone) {
        return handleBadRequest(res);
      } else {
        return handleNotFound(res);
      }
    }
    const filter = { _id: req.user._id };
    const updatedData = {
      firstname,
      lastname,
      phone,
    };
    const updatedUser = await User.findOneAndUpdate(filter, updatedData, {
      new: true,
    }).select(["-email", "-password"]);
    if (!updatedUser) {
      return handleNotFound(res, "User not found.");
    }
    res.status(200).json({
      success: true,
      status: 200,
      message: "Profile Updated Successfully.",
      data: updatedUser,
    });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(400).send({ message: "Check credentials of admin." });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    let Users = await User.find({ role: "user" }).skip(startIndex).limit(limit);

    if (Users.length === 0) {
      return handleNotFound(res, "Room not found.");
    }

    const totalCount = await User.countDocuments({});
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
      data: Users,
      pagination,
    });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.allCount = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(400).send({ message: "Check credentials of admin." });
    }
    let user = await User.countDocuments({ role: "user" });
    if (user === 0) {
      return handleNotFound(res, "Users not found.");
    }
    let room = await Room.countDocuments({});
    if (room === 0) {
      return handleNotFound(res, "Room not found.");
    }
    const bookedRooms = await RoomBook.find({});
    const bookedRoomIds = bookedRooms.map((booking) => booking.roomId);
    const availableRooms = await Room.find({
      _id: { $nin: bookedRoomIds }, // Exclude the booked room IDs
    }).count();
    res.status(200).send({
      success: true,
      status: 200,
      message: "Success",
      data: {
        userCount: user,
        roomCount: room,
        availableRoomCount: availableRooms,
      },
    });
  } catch (error) {
    console.log(error);
    return handleInternalServerError(res);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldpassword, newpassword } = req.body;
    if (!oldpassword || !newpassword) {
      if (!oldpassword && !newpassword) {
        return handleBadRequest(res);
      } else {
        return handleNotFound(res);
      }
    }
    if (oldpassword.trim() === "" || newpassword.trim() === "") {
      return handleBadRequest(res, "space is not allowed.");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return handleNotFound(res, "User not found.");
    }

    const passwordValid = await bcrypt.compare(oldpassword, user.password);
    if (!passwordValid) {
      return handleBadRequest(res, "Invalid old password.");
    }

    const hashedNewPassword = await bcrypt.hash(newpassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).send({
      success: true,
      status: 200,
      message: "Password Changed Successfully.",
    });
  } catch (error) {
    return handleBadRequest(res);
  }
};
