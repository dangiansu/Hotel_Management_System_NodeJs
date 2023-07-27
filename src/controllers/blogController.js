const Blog = require("../models/blog.model");
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

exports.addBlog = async (req, res, next) => {
  try {
    const { blog_title, blog_description, blog_date } = req.body;
    if (req.user.role !== "admin") {
      return res.status(400).send({ message: "Check credentials of admin." });
    }

    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFormatRegex.test(blog_date)) {
      return handleBadRequest(res, "Invalid date format.");
    }

    const requiredKeys = ["blog_title", "blog_description", "blog_date"];
    const validationError = validateRequestBody(req, res, requiredKeys);
    if (validationError) {
      return validationError;
    }

    if (!req.file) {
      return handleNotFound(res, "Please Upload Image.");
    }
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "public/blog",
    });
    const room = await Blog.create({
      blog_title,
      blog_description,
      blog_date,
      blog_image: result.secure_url,
      cloudinary_id: result.public_id,
    });
    return res.status(200).send({
      success: true,
      status: 201,
      message: "Blog Added Successfully.",
      data: room,
    });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

exports.updateblog = async (req, res, next) => {
  try {
    const { blog_title, blog_description, blog_date } = req.body;
    if (req.user.role !== "admin") {
      return res.status(400).send({ message: "Check credentials of admin." });
    }

    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFormatRegex.test(blog_date)) {
      return handleBadRequest(res, "Invalid date format.");
    }

    const requiredKeys = ["blog_title", "blog_description", "blog_date"];
    const validationError = validateRequestBody(req, res, requiredKeys);
    if (validationError) {
      return validationError;
    }
    
    let updatedData = {
      blog_title,
      blog_description,
      blog_date,
    };
    if (req.file) {
      const blog = await Blog.findOne({ _id: req.params.bid });
      if (blog.blog_image && blog.cloudinary_id) {
        await cloudinary.uploader.destroy(blog.cloudinary_id);
      }
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "public/blog",
      });
      updatedData.blog_image = uploadedImage.secure_url;
      updatedData.cloudinary_id = uploadedImage.public_id;
    }
    const filter = { _id: req.params.bid };
    const updatedBlog = await Blog.findOneAndUpdate(filter, updatedData, {
      new: true,
    });
    if (!updatedBlog) {
      return handleNotFound(res, "Blog not found.");
    }
    res.status(200).send({
      success: true,
      status: 200,
      message: "Blog Updated Successfully.",
      data: updatedBlog,
    });
  } catch (error) {
    console.log(error);
    return handleInternalServerError(res);
  }
};

exports.viewBlog = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 10;

    const startIndex = (page - 1) * limit;

    let blogs = await Blog.find({}).skip(startIndex).limit(limit);

    if (blogs.length === 0) {
      return handleNotFound(res, "Blog not found.");
    }

    const totalCount = await Blog.countDocuments({});
    const totalPages = Math.ceil(totalCount / limit);

    const pagination = {
      page,
      totalPages,
      totalCount,
    };

    return res
      .status(200)
      .send({
        success: true,
        status: 200,
        message: "Success",
        data: blogs,
        pagination,
      });
  } catch (error) {
    return handleInternalServerError(res);
  }
};

