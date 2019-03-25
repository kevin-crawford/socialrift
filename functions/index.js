const functions = require('firebase-functions');
const admin = require('firebase-admin');
// init express application
const app = require('express')();


// init firebase admin
admin.initializeApp();

// firebase app configuration
const config = {
	apiKey: "AIzaSyAmBphQ0WqZwAMH5m6-BfQgjYUoOrglJsA",
	authDomain: "socialrift-2f5d3.firebaseapp.com",
	databaseURL: "https://socialrift-2f5d3.firebaseio.com",
	projectId: "socialrift-2f5d3",
	storageBucket: "socialrift-2f5d3.appspot.com",
	messagingSenderId: "1057080828808"
};

const firebase = require('firebase');
firebase.initializeApp(config);

const db = admin.firestore();

// GET ALL RIFTS
app.get('/rifts', (req, res) => {
	db
	.firestore()
	.collection('rifts')
	.orderBy('createdAt', 'desc')
	.get()
		.then(data => {
			let rifts = [];
			data.forEach( doc => {
				rifts.push({
					riftId: doc.id,
					body: doc.data().body,
					userHandle: doc.data().userHandle,
					createdAt: doc.data().createdAt
				});
			});
			return res.json(rifts);
		})
		.catch(err => console.log(err));
});

// CREATE NEW RIFT
app.post('/rift', (req, res) => {
	const newRift = {
		body: req.body.body,
		userHandle: req.body.userHandle,
		createdAt: new Date().toISOString()
	};
	
	db
		.firestore()
		.collection('rifts')
		.add(newRift)
		.then(doc => {
			res.json({ message: `document ${doc.id} created successfully`});
		})
		.catch(err => {
			res.status(500).json({ error: 'Something went wrong!'});
			console.log(err);
		});
});

// Signup route

app.post('/signup', (req, res) => {
	const newUser = {
		email: req.body.email,
		password: req.body.password,
		confirmPassword: req.body.confirmPassword,
		handle: req.body.handle,
	};

	// TODO: validate data
	let token, userId;
	db.doc(`/users/${newUser.handle}`).get()
		.then(doc => {
			if(doc.exists) {
				return res.status(400).json({ handle: 'This handle is already taken.'})
			} else {
				return firebase
							.auth()
							.createUserWithEmailAndPassword(newUser.email, newUser.password)
			}
		})
		.then( data => {
			userId = data.user.uid;
			return data.user.getIdToken();
		})
		.then( (idToken) => {
			token = idToken;
			const userCredentials = {
				handle: newUser.handle,
				email: newUser.email,
				createdAt: new Date().toISOString(),
				userId
			};
			return db.doc(`/users/${newUser.handle}`).set(userCredentials);
		})
		.then(() => {
			return res.status(201).json({ token });
		})
		.catch( err => {
			console.error(err);
			if(err.code === "auth/email-already-in-use") {
				return res.status(400).json({ email: 'Email is already in use.'})
			} else {
				return res.status(500).json({ error: err.code});
			}
		});
});

// https://baseurl.com/rifts -WRONG
// https://baseurl.com/api/rifts - CORRECT

exports.api = functions.https.onRequest(app);