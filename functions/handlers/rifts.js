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
					createdAt: doc.data().createdAt
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
		createdAt: new Date().toISOString()
	};
	
	db.collection('rifts')
		.add(newRift)
		.then(doc => {
			res.json({ message: `document ${doc.id} created successfully`});
		})
		.catch(err => {
			res.status(500).json({ error: 'Something went wrong!'});
			console.log(err);
		});
};