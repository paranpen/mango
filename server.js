"use strict"

let dbHostName = 'localhost'
let dbPortNumber = 27017
let dbName = 'test'
let port = 3001
// MongoDB Connection URL
var url = 'mongodb://localhost:27017/' + dbName

var express = require('express'),
  mongodb = require('mongodb'),
  mongoskin = require('mongoskin'),
  bodyParser = require('body-parser')
const cors = require('cors')

let mdb
let mongo = mongodb.MongoClient
let app   = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static('public'))
app.use(cors({credential: false}))

let db = mongoskin.db('mongodb://@localhost:27017/test', {safe:true})
mongo.connect(url, function(err, db) {
  if (err) {
    console.log('Unable to connect to the DB', err)
  }
  else {
    console.log('Db connected to %s', dbName)
    mdb = db
  }
})

// 1) DB list uqery
app.get('/api/dbs', function(req, res) {
  if (!req.admin) req.admin = mongoskin.db(`mongodb://${dbHostName}:${dbPortNumber}/${dbName}`).admin()
  req.admin.listDatabases(function(error, dbs) {
    res.json(dbs)
  })
})

// 2) Collection list query
app.get('/api/dbs/:dbName/collections', function(req, res, next) {
  mdb.listCollections().toArray(function(err, collections) {
    res.json({collections: collections})
  })
})

app.param('collectionName', function(req, res, next, collectionName){
  req.collection = db.collection(collectionName)
  return next()
})
app.param('dbName', function(req, res, next, dbName){
  db = mongoskin.db(`mongodb://${dbHostName}:${dbPortNumber}/${dbName}`)
  req.db = db
  req.admin = db.admin()
  return next()
})


app.get('/', function(req, res, next) {
  res.send('please select a collection, e.g., /api/collections/messages')
})

// 3) Document list query
app.get('/api/collections/:collectionName', function(req, res, next) {
  req.collection.find({} ,{limit: 10, sort: {'_id': -1}}).toArray(function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

// 4) Document query with id
app.get('/api/collections/:collectionName/:id', function(req, res, next) {
  req.collection.findById(req.params.id, function(e, result){
    if (e) return next(e)
    res.send(result)
  })
})

// 5) Document Create
app.post('/api/collections/:collectionName', function(req, res, next) {
  req.collection.insert(req.body, {}, function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

// 5) Document Update
app.put('/api/collections/:collectionName/:id', function(req, res, next) {
  req.collection.updateById(req.params.id, {$set: req.body}, {safe: true, multi: false}, function(e, result){
    if (e) return next(e)
    res.send((result === 1) ? {msg:'success'} : {msg: 'error'})
  })
})

app.delete('/api/collections/:collectionName/:id', function(req, res, next) {
  req.collection.removeById(req.params.id, function(e, result){
    if (e) return next(e)
    res.send((result === 1)?{msg: 'success'} : {msg: 'error'})
  })
})

app.delete('/api/dbs/:dbName/collections/:collectionName/:id', function(req, res) {
  if (req.body._id && req.body._id != req.params.id) return res.status(400).json({error: 'ID in the body is not matching ID in the URL'})
  delete req.body._id
  req.collection.remove({ _id: mongoDb.ObjectId(req.params.id)}, function(e, results) {
    res.json(results)
  })
})

app.patch('/api/dbs/:dbName/collections/:collectionName/:id', function(req, res) {
  if (req.body._id && req.body._id != req.params.id) return res.status(400).json({error: 'ID in the body is not matching ID in the URL'})
  delete req.body._id
  req.collection.updateById(req.params.id, {$set: req.body}, function(e, results) {
    // console.log('boo', e, results)
    res.json(results)
  })
})

app.get('/api/dbs/:dbName/collections/:collectionName', function(req, res, next) {
  let query = {}
  try {
    query = JSON.parse(req.query.query)
    //recognize and convert any regex queries from strings into regex objects
    for (var prop in query){
      if ((query[prop][0] == "R" && query[prop][1] == "/") //arbitrary letter 'R' used by this app
        && (query[prop].length > 3)   //avoids a few corner cases
        && ((query[prop][(query[prop].length - 1) ] == "/" ) || (query[prop][(query[prop].length - 2)] == "/") || (query[prop][query[prop].length - 3 ] == "/" )|| (query[prop][query[prop].length - 4 ] == "/"  ))
      ){
        var splitRegex = query[prop].split("/")
        var makeRegex = new RegExp( splitRegex[1], splitRegex[2])
        query[prop] = makeRegex
      }
    }
  } catch (error) {
    return next(new Error('Invalid query, cannot parse it'))
  }
  if (query._id) {
    if (query._id['$in'] && Array.isArray(query._id.$in)) {
      query._id.$in = query._id.$in.map((id)=>{
        return OId(id)
      })
    } else query._id = OId(query._id)
  }
  req.collection.find(query || {}, {limit: req.query.limit || 20}).toArray(function(e, docs) {
    console.log('boo', docs, query)
    res.json({docs: docs})
  })
})

app.listen(port, function() {
  console.log('Express server listening on port: %s', port);
})
