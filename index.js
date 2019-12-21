const functions = require('firebase-functions');
const { getAllScreams , deleteScream ,likeScream,unlikeScream , postOneScream ,commentOnScream , getScream} = require ('./handlers/screams')
const { signup ,getUserDetails , markNotificationsRead , login , uploadImage , addUserDetails , getAuthenticatedUser} = require ('./handlers/users')
const express = require ('express')
const app = express()
const FBauth = require ('./util/FBauth')
const {db} = require('./util/admin')
const cors = require ('cors') ; 
app.use(cors()) ;

// users route
app.post('/signup', signup )
app.post('/login', login )
app.post('/user/image', FBauth, uploadImage )
app.post('/user', FBauth , addUserDetails )
app.get('/user', FBauth , getAuthenticatedUser )
app.get('/user/:handle' , getUserDetails)
app.post('/notifications' ,FBauth ,  markNotificationsRead)

// screams route
app.post('/scream',  FBauth , postOneScream  ) 
app.get('/screams', getAllScreams ) ;
app.get('/scream/:screamId' , getScream )
app.delete('/scream/:screamId' , FBauth ,  deleteScream)
app.get('/scream/:screamId/like' , FBauth , likeScream)
app.get('/scream/:screamId/unlike' , FBauth , unlikeScream)
app.post('/scream/:screamId/comment' , FBauth , commentOnScream)


exports.api = functions.https.onRequest(app) ;

exports.createNotificationOnLike= functions.firestore.document('likes/{id}')
.onCreate((snapshot) => {
   return db.doc(`/screams/${snapshot.data().screamId}`).get()
    .then(doc => {
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
            return db.doc(`/notofication/${snapshot.id}`).set({
                createdAt : new Date().toISOString() ,
                recipient : doc.data().userHandle ,
                sender : snapshot.data().userHandle ,
                type : 'like' , 
                read : false , 
                screamId : doc.id
            })
        }
    })
    
    .catch((err) => 
        console.error(err)) ;
        
    })
exports.deleteNotificationOnUnlike= functions.firestore.document('likes/{id}')
.onDelete((snapshot) => {
   return  db.doc(`/notifications/${snapshot.id}`)
    .delete()
    .catch(err => {
        console.error(err)
        return ; 
    })
})

exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
.onCreate((snapshot) => {
   return db.doc(`/screams/${snapshot.data().screamId}`).get()
    .then(doc => {
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
            return db.doc(`/notofication/${snapshot.id}`).set({
                createdAt : new Date().toISOString() ,
                recipient : doc.data().userHandle ,
                sender : snapshot.data().userHandle ,
                type : 'comment' , 
                read : false , 
                screamId : doc.id
            })
        }
    })
    
    .catch((err) => {
        console.error(err) ;
    })
})

exports.onUserImageChange = functions.firestore.document('/users/{userId}')
.onUpdate((change) => {
    if(change.before.data().imageUrl !== change.after.data().imageUrl) { 
    let batch = db.batch()
    return db.collection('screams')
    .where('userHandle' , '==' ,change.before.data().handle)
    .get()
    .then((data) => {
    data.forEach(doc => {
        const scream = db.doc(`/screams/${doc.id}`)
        batch.update(scream , {userImage : change.after.data().imageUrl}) ; 
    }) ;
    return batch.commit()
    })
} else return true ; 
}) ; 

exports.onScreamDelete = functions.firestore.document('screams/{screamId}')
.onDelete((snapshot, context) => {
    const screamId = context.params.screamId ; 
    const batch = db.batch() 
    return db
    .collection('comments')
    .where('screamId' , '==' , screamId)
    .get()
    .then(data => {
        data.forEach(doc => {
            batch.delete(db.doc(`/comments/${doc.id}`))
        })
        return db.collection('likes').where('screamId' , '==' , screamId).get()
    })
        .then(data => {
            data.forEach(doc => {
                batch.delete(db.doc(`/likes/${doc.id}`))
            })
            return db.collection('notifications').where('screamId' , '==' , screamId).get()
    })
    .then(data => {
        data.forEach(doc => {
            batch.delete(db.doc(`/notifications/${doc.id}`))
        })
        return batch.commit() ; 

})
.catch((err)=> console.error(err))

}) 