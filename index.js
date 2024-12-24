const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
require("dotenv").config();
const cors = require("cors");

const { testConnection } = require("./src/db/config");

var corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};
const app = express();
app.use(bodyParser.json());
app.use(express.json({ extended: true }));
app.use(cors(corsOptions));
app.use("/uploads", express.static("uploads"));

const storeRoutes = require("./src/routes/store");
const customerRoutes = require("./src/routes/customer");
const authRoutes = require("./src/routes/user");
const orderRoutes = require("./src/routes/order");
const categoriesRoutes = require("./src/routes/categories");
const dealRoutes = require("./src/routes/deal");
const dashboardRoutes = require("./src/routes/dashboard");
const faqsRoutes = require("./src/routes/faqs");
const pushNotificationRoutes = require("./src/routes/pushAlert");
const supportQueriesRoute = require("./src/routes/support");

app.use("/api/store", storeRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/user", authRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/deal", dealRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/faqs", faqsRoutes);
app.use("/api/pushNotification", pushNotificationRoutes);
app.use("/api/support", supportQueriesRoute);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
