const express = require("express");
var cors = require("cors");
const app = express();
require("dotenv").config();
const Router = require("./src/routes/routes");
app.use(express.json());
// require("./src/db/config");
const connection = require("./src/db/config");
// app.use(cors());
app.use(
  cors({
    origin: "http://localhost:4200",
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);

app.get("/", (req, res) => {
  res.send("<h2>Server Is Started</h2>");
});

app.use("/", Router);
const PORT = process.env.PORT;

connection().then(() =>
  app.listen(PORT, (req, res) => {
    console.log(`🚀 Server is running at http://localhost:${PORT}/ 🚀`);
  })
);
