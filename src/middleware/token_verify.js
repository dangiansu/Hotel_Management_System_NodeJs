const jwt = require("jsonwebtoken");

exports.auth = async (req, res, next) => {
  try {
    let token = req.headers["authorization"].split(" ")[1];
    let decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Couldnt Authenticate" });
  }
};
