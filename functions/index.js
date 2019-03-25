const functions = require('firebase-functions');

// init express application
const app = require('express')();
const FBAuth = require('./util/fbAuth');

const { getAllRifts, postOneRift } = require('./handlers/rifts');
const { 
	signup, 
	login, 
	uploadImage, 
	addUserDetails,
	getAuthenticatedUser } = require('./handlers/users');

// Rift Routes
app.get('/rifts', getAllRifts);
app.post('/rift', FBAuth, postOneRift);

// User Routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app);