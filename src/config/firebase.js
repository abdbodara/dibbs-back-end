const admin = require("firebase-admin");

const serviceAccount = require("../../dibbs-314610-firebase-adminsdk-lwkha-9e5b90cac1.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
