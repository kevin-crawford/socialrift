const  { db } = require('../util/admin');

exports.getAllRifts = (req, res) => {
	db
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
					createdAt: doc.data().createdAt,
					commentCount: doc.data().commentCount,
					likeCount: doc.data().likeCount,
					userImage: doc.data().userImage
				});
			});
			return res.json(rifts);
		})
		.catch(err => console.log(err));
};

exports.postOneRift = (req, res) => {
	if(req.body.body.trim() === '') {
		return res.status(400).json({ body: 'Body must not be empty'});
	}

	const newRift = {
		body: req.body.body,
		userHandle: req.user.handle,
		userImage: req.user.imageUrl,
		createdAt: new Date().toISOString(),
		likeCount: 0,
		commentCount: 0
	};
	
	db.collection('rifts')
		.add(newRift)
		.then(doc => {
			const resRift = newRift;
			resRift.riftId = doc.id;
			res.json(resRift);
		})
		.catch(err => {
			res.status(500).json({ error: 'Something went wrong!'});
			console.log(err);
		});
};

// get rift 
exports.getRift = (req, res) => {
	let riftData = {};
	db.doc(`/rifts/${req.params.riftId}`).get()
		.then(doc => {
			if(!doc.exists) {
				return res.status(404).json({ error: 'Rift not found' });
			} 
			riftData = doc.data();
			riftData.riftId = doc.id;
			return db
				.collection('comments')
				.orderBy('createdAt', 'desc')
				.where('riftId', '==', req.params.riftId)
				.get();
		})
		.then(data => {
			riftData.comments = [];
			data.forEach(doc => {
				riftData.comments.push(doc.data());
			});
			return res.json(riftData);
		})
		.catch(err => {
			console.error(err);
			res.status(500).json({ error: err.code });
		});
};

exports.commentOnRift = (req, res) => {
	if(req.body.body.trim() === '') 
		return res.status(400).json({ comment: 'Must not be empty'});
	
	const newComment = {
		body: req.body.body,
		createdAt: new Date().toISOString(),
		riftId: req.params.riftId,
		userHandle: req.user.handle,
		userImage: req.user.imageUrl
	};
	
	db.doc(`/rifts/${req.params.riftId}`)
		.get()
		.then((doc) => {
			//confirm the rift exists
			if(!doc.exists) {
				return res.status(404).json({ error: 'Rift not found'});
			}
			// if existing, add new comment to collection 
			return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
		})
		.then(() => {
			return db.collection('comments').add(newComment);
		})
		.then(() => {
			return res.json(newComment);
		})
		.catch((err) => {
			console.log(err);
			res.status(500).json({ error: 'Something went wrong' });
		});
};

exports.likeRift = (req, res) => {
	console.log(req.user.handle);
	const likeDocument = db.collection('likes')
		.where('userHandle', '==', req.user.handle)
		.where('riftId', '==', req.params.riftId)
		.limit(1);

	const riftDocument = db.doc(`/rifts/${req.params.riftId}`);

	let riftData;

	riftDocument.get()
		.then(doc => {
			if(doc.exists){
				riftData = doc.data();
				riftData.riftId = doc.id;
				return likeDocument.get();
			} else {
				return res.status(404).json({ error: 'Rift not found'});
			};
		})
		.then(data => {
			if(data.empty) {
				return db.collection('likes').add({
					riftId: req.params.riftId,
					userHandle: req.user.handle
				})
				.then(() => {
					riftData.likeCount++
					return riftDocument.update({ likeCount: riftData.likeCount })
				})
				.then(() => {
					res.json(riftData);
				})
			} else {
				return res.status(400).json({ error: 'Rift already liked'});
			}
		})
		.catch(err => {
			console.error(err);
			res.status(500).json({ error: err.code});
		});
};

exports.unlikeRift = (req, res) => {
	const likeDocument = db
		.collection('likes')
		.where('userHandle', '==', req.user.handle)
		.where('riftId', '==', req.params.riftId)
		.limit(1);

	const riftDocument = db.doc(`/rifts/${req.params.riftId}`);

	let riftData;

	riftDocument.get()
		.then(doc => {
			if(doc.exists){
				riftData = doc.data();
				riftData.riftId = doc.id;
				return likeDocument.get();
			} else {
				return res.status(404).json({ error: 'Rift not found'});
			};
		})
		.then(data => {
			if(data.empty) {
				return res.status(400).json({ error: 'Rift not liked'});
			} else {
				return db.doc(`/likes/${data.docs[0].id}`).delete()
					.then(() => {
						riftData.likeCount--
						return riftDocument.update({likeCount: riftData.likeCount});
					})
					.then(() => {
						res.json(riftData);
					});
			};
		})
		.catch(err => {
			console.error(err);
			res.status(500).json({ error: err.code});
		});
};

// Delete rift
exports.deleteRift = (req, res) => {
	const document = db.doc(`/rifts/${req.params.riftId}`);
	document.get()
		.then(doc => {
			if(!doc.exists){
				return res.status(404).json({ error: 'Rift not found'});
			} 
			// check userId matches the user from token.user
			if(doc.data().userHandle !== req.user.handle){
				return res.status(403).json({ error: 'Unauthorized' });
			} else {
				return document.delete();
			};
		})
		.then(() => {
			res.json({ message: 'Rift deleted successfully'});
		})
		.catch(err => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};