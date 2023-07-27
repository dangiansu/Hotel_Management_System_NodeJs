const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const varify = require("../middleware/token_verify");
const roomController = require("../controllers/roomController");
const roomBookingController = require("../controllers/roomBookingController");
const blogController = require("../controllers/blogController");
const test = require("../controllers/InvoiceGenerateController");
const { upload } = require("../middleware/upload_file");

router.post("/api/register", userController.register);

router.post("/api/login", userController.signin);

router.post("/api/forgot-password", userController.forgotPassword);

router.get("/api/reset-password/:otp", userController.checkForgotPassword);

router.post("/api/reset-password/", userController.resetPassword);

router.put("/api/changepassword", varify.auth, userController.changePassword);

router.get("/api/profile", varify.auth, userController.profile);

router.patch("/api/updateProfile", varify.auth, userController.updateProfile);

router.get("/api/getAllUsers", varify.auth, userController.getAllUsers);

router.get("/api/allCount", varify.auth, userController.allCount);

router.post(
  "/api/addRoom",
  varify.auth,
  upload("room_image"),
  roomController.addRoom
);

router.put(
  "/api/updateRoom/:rid",
  varify.auth,
  upload("room_image"),
  roomController.updateRoom
);

router.get("/api/viewRoom/:rid", roomController.viewRoomById);

router.get("/api/viewRooms", roomController.viewRoom);

router.post(
  "/api/roomBooking/:rid",
  varify.auth,
  roomBookingController.roomBooking
);

router.post(
  "/api/getRoomBookingData",
  roomBookingController.getRoomBookingData
);

router.post("/api/availableRooms", roomBookingController.availableRooms);

router.patch(
  "/api/cancleBooking/:rbid",
  varify.auth,
  roomBookingController.cancleBooking
);

router.post(
  "/api/addBlog",
  varify.auth,
  upload("blog_image"),
  blogController.addBlog
);

router.put(
  "/api/updateBlog/:bid",
  varify.auth,
  upload("blog_image"),
  blogController.updateblog
);

router.get("/api/viewBlogs", blogController.viewBlog);

router.get(
  "/api/getUserRoomBookingData",
  varify.auth,
  roomBookingController.getUserRoomBookingData
);

router.post(
  "/api/paymentStatusUpdate/:oid",
  varify.auth,
  roomBookingController.paymentStatusUpdate
);

router.post("/api/pdfGenerate", varify.auth, test.pdfGenerate);

router.post("/api/sendInvoiceMail", varify.auth, test.sendInvoiceByEmail);

module.exports = router;
