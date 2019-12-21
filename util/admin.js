var admin = require("firebase-admin");
var serviceAccount = require("../sdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://amitact-social.firebaseio.com"
});
const db = admin.firestore()

module.exports = {admin,db}
