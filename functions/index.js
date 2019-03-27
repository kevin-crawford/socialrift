const functions = require('firebase-functions');
const app = require('express')();
const FBAuth = require('./util/fbAuth');
const { db } = require('./util/admin');

const { 
	getAllRifts, 
	postOneRift,
	getRift,
	commentOnRift,
	likeRift,
	unlikeRift,
	deleteRift } = require('./handlers/rifts');

const { 
	signup, 
	login, 
	uploadImage, 
	addUserDetails,
	getAuthenticatedUser,
	getUserDetails,
	markNotificationsRead } = require('./handlers/users');

// Rift Routes
app.get('/rifts', getAllRifts);
app.post('/rift', FBAuth, postOneRift);
app.get('/rift/:riftId', getRift);
app.delete('/rift/:riftId', FBAuth, deleteRift);
app.get('/rift/:riftId/unlike', FBAuth, unlikeRift);
app.get('/rift/:riftId/like', FBAuth, likeRift);
app.post('/rift/:riftId/comment', FBAuth, commentOnRift);

// User Routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);


exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions
	.firestore.document('likes/{id}')
	.onCreate((snapshot) => {
		return db.doc(`/rifts/${snapshot.data().riftId}`)
			.get()
			.then(doc => {
				if(doc.exists && doc.data().riftId !== snapshot.data().userHandle){
					return db.doc(`/notifications/${snapshot.id}`).set({
						createdAt: new Date().toISOString(),
						recipient: doc.data().userHandle,
						sender: snapshot.data().userHandle,
						type: 'like',
						read: false,
						riftId: doc.id
					});
				};
			})
			.catch(err => {
				console.error(err);
			});
	});

	exports.deleteNotificationOnUnlike = functions
		.firestore.document('likes/{id}')
		.onDelete((snapshot) => {
			return db.doc(`/notifications/${snapshot.id}`)
				.delete()
				.catch(err => {
					console.error(err);
				});
		});

	exports.createNotificationOnComment = functions
		.firestore.document('comments/{id}')
		.onCreate((snapshot) => {
			return db.doc(`/rifts/${snapshot.data().riftId}`)
			.get()
			.then(doc => {
				if(doc.exists && doc.data().riftId !== snapshot.data().userHandle){
					return db.doc(`/notifications/${snapshot.id}`).set({
						createdAt: new Date().toISOString(),
						recipient: doc.data().userHandle,
						sender: snapshot.data().userHandle,
						type: 'comment',
						read: false,
						riftId: doc.id
					});
				};
			})
			.catch(err => {
				console.error(err);
			});
	});

	exports.onUserImageChange = functions
		.firestore.document('/users/{userId}')
		.onUpdate((change) => {
			console.log(change.before.data());
			console.log(change.after.data());
			if(change.before.data().imageUrl !== change.after.data().imageUrl) {
				console.log('image has changed');
				const batch = db.batch();
				return db.collection('rifts')
					.where('userHandle', '==', change.before.data().handle)
					.get()
					.then(data => {
						data.forEach(doc => {
							const rift = db.doc(`/rifts/${doc.id}`);
							batch.update(rift, { userImage: change.after.data().imageUrl});
						});
						return batch.commit();
					});
			} else return true;
		});

	exports.onRiftDelete = functions
		.firestore.document('/rifts/{riftId}')
		.onDelete((snapshot, context) => {
			const riftId = context.params.riftId;
			const batch = db.batch();
			return db.collection('comments')
				.where('riftId', '==', riftId)
				.get()
				.then(data => {
					data.forEach(doc => {
						batch.delete(db.doc(`/comments/${doc.id}`));
					})
					return db.collection('likes')
						.where('riftId', '==', riftId)
						.get();
				})
				.then(data => {
					data.forEach(doc => {
						batch.delete(db.doc(`/likes/${doc.id}`));
					})
					return db.collection('notifications')
						.where('riftId', '==', riftId)
						.get();
				})
				.then(data => {
					data.forEach(doc => {
						batch.delete(db.doc(`/notifications/${doc.id}`));
					})
					return batch.commit();
				})
				.catch(err => {
					console.error(err);
				});
		});
