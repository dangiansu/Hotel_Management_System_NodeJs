const handleInternalServerError = (res, customMessage = "Internal Server Error!") => {
  return res
    .status(500)
    .send({ success: false, status: 500, message: customMessage });
};

const handleNotFound = (res, customMessage = "Record not found") => {
  return res
    .status(404)
    .send({ success: false, status: 404, message: customMessage });
};

const handleForbidden = (res, customMessage = "Already inserted") => {
  return res
    .status(403)
    .send({ success: false, status: 403, message: customMessage });
};

const handleConflict = (res, customMessage = "Already exists") => {
  return res
    .status(409)
    .send({ success: false, status: 409, message: customMessage });
};

const handleBadRequest = (res, customMessage = "Empty body") => {
  return res
    .status(400)
    .send({ success: false, status: 400, message: customMessage });
};

const handleUnauthorized = (res, customMessage = "Incorrect Data") => {
  return res
    .status(401)
    .send({ success: false, status: 401, message: customMessage });
};

const validateRequestBody = (req, res, requiredKeys) => {
  const keys = Object.keys(req.body);
  for (const key of requiredKeys) {
    if (keys.includes(key)) {
      const value = req.body[key];
      if (!value) {
        return handleBadRequest(res);
      }
    }
  }
}

module.exports = {
  handleForbidden,
  handleConflict,
  handleNotFound,
  handleInternalServerError,
  handleBadRequest,
  handleUnauthorized,
  validateRequestBody,
};
