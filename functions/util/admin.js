const admin = require('firebase-admin');
// init firebase admin
admin.initializeApp();
const db = admin.firestore();


module.exports = { admin, db };