
"use strict"

/**
 * Handles the public interface with the front-end.  Only routes are specified in this module
 * (with some others in app-auth.js) with suppporting functions abstracted to 'app-functions.js'
 */

import express from 'express';
import multer from 'multer';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import 'dotenv/config.js';
const app = express();

import { authRoute, verifyToken } from './auth.js';
import { GeoJSON } from './class-geojson.js';
import { gpxRead, gpxWriteFromDocument } from './gpx-read-write.js';
import { debugMsg } from './debugging.js';
import { mongoModel, getPathDocFromId, createMongoModel, bbox2Polygon } from './app-functions.js';
import { getListData, getRouteInstance } from './app-functions.js';


// apply middleware - note setheaders must come first
app.use( (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Origin, X-Request-With, Content-Type, Accept, Authorization, Content-Disposition");
  res.setHeader("Access-Control-Allow-Methods","GET, POST, PATCH, DELETE, OPTIONS");
  next();
});
app.use(bodyParser.json());
app.use(authRoute);


// mongo as a service
console.log(process.env.MONGODB_PASSWORD)
mongoose.connect(`mongodb+srv://root:${process.env.MONGODB_PASSWORD}@cluster0-5h6di.gcp.mongodb.net/test?retryWrites=true&w=majority`,
// mongoose.connect(`mongodb+srv://root:${process.env.MONGODB_PASSWORD}@cluster0-gplhv.mongodb.net/trailscape?retryWrites=true`,
  {useUnifiedTopology: true, useNewUrlParser: true }); 

mongoose.connection
  .on('error', console.error.bind(console, 'connection error:'))
  .on('close', () => console.log('MongoDB disconnected'))
  .once('open', () => console.log('MongoDB connected') );

// multer is used for file uploads, set-up options here
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});



/*****************************************************************
 * import a route from a gpx file
 ******************************************************************/
app.post('/import-route/', verifyToken, upload.single('filename'), (req, res) => {

  debugMsg('import-route');

  const pathFromGPX = gpxRead(req.file.buffer.toString());
  getRouteInstance(pathFromGPX.name, null, pathFromGPX.lngLat, pathFromGPX.elev)
    .then( route => createMongoModel('route', route.asMongoObject(req.userId, false)) )
    .then( doc => res.status(201).json( {hills: new GeoJSON().fromDocument(doc).toGeoHills()} ))
    .catch( (error) => res.status(500).json(error.toString()) );

}); 



/*****************************************************************
 * Save a path to database - path has already been saved to the
 * database, all we are doing is updating some fields, and
 * changing isSaved flag to true; id of path is provided
 * TODO: use findByIdAndUpdate()? condition does not need to include userId as _id is unique
 *****************************************************************/
app.post('/save-imported-path/', verifyToken, (req, res) => {

  debugMsg('save-imported-path');

  // set up query
  const condition = {_id: req.body.pathId, userId: req.userId};
  const filter = {isSaved: true, "info.name": req.body.name, "info.description": req.body.description};

  // query database, updating changed data and setting isSaved to true
  mongoModel(req.body.pathType)
    .updateOne(condition, {$set: filter}, {upsert: true, writeConcern: {j: true}})
    .then( () => res.status(201).json({pathId: req.body.pathId}) )
    .catch( (error) => res.status(500).json(error.toString()) );

});



/*****************************************************************
 * Save a user-created route to database; geoJSON is supplied in POST body
 *****************************************************************/
app.post('/save-created-route/', verifyToken, (req, res) => {

  debugMsg('save-created-route' );

  getRouteInstance(req.body.name, req.body.description, req.body.coords, req.body.elev)
    .then( route => mongoModel('route').create( route.asMongoObject(req.userId, true) ))
    .then( doc => res.status(201).json( {pathId: doc._id} ))
    .catch( (error) => res.status(500).json(error));

});



/*****************************************************************
 *  Retrieve a single path from database
 *  id of required path is supplied
 *****************************************************************/
app.get('/get-path-by-id/:type/:id', verifyToken, (req, res) => {

  debugMsg(`get-path-by-id, type=${req.params.type}, id=${req.params.id}` );

  getPathDocFromId(req.params.id, req.params.type, req.userId)
    .then( doc => {
      res.status(201).json({
      hills: new GeoJSON().fromDocument(doc).toGeoHills(),
      basic: new GeoJSON().fromDocument(doc).toBasic()
    }) })
    // .catch( (error) => res.status(500).json( error.toString()) );
})



/*****************************************************************
 * Retrieve a list of paths from database - if bbox is supplied it
 * will return only paths intersecting with the bbox, otherwise returns
 * all
 * bbox is delivered as a req parameter - either array or 0 if not reqd
 * pathType is the type of path (obvs)
 * offset is used by list to request chunks of x paths at a time
 *****************************************************************/
app.get('/get-paths-list/:pathType/:offset/:limit', verifyToken, (req, res) => {

  debugMsg('get-paths-list');

  let condition = {isSaved: true, userId: req.userId};
  if (req.query.bbox !== '0') {
    const geometry = { type: 'Polygon', coordinates: bbox2Polygon(req.query.bbox) };
    condition = {...condition, geometry: { $geoIntersects: { $geometry: geometry} } }
  }
  const filter = {stats: 1, info: 1, startTime: 1, creationDate: 1};
  const sort = req.params.pathType === 'track' ? {startTime: -1} : {creationDate: -1};
  const limit = req.params.limit;
  const offset = req.params.offset
  const pathType = req.params.pathType;

  mongoModel(pathType).countDocuments(condition)
    .then( count => {
      mongoModel(pathType).find(condition, filter).sort(sort).limit(parseInt(limit)).skip(limit*(offset))
        .then( documents => res.status(201).json( getListData(documents, count) ))
      })                          // this 'then' is nested rather than chained so it has access to 'count'
    .catch( (error) => res.status(500).json(error.toString()) );

})



/*****************************************************************
 * Delete a path from database
 * id of path is provided - doesnt actually delete, just sets isSaved to false
 * and delete will occur at the next flush
 *****************************************************************/
app.delete('/delete-path/:type/:id', verifyToken, (req, res) => {

  debugMsg('delete-path');

  // construct query
  let condition = {_id: req.params.id, userId: req.userId};
  let filter = {isSaved: false};

  // query database, updating change data and setting isSaved to true
  mongoModel(req.params.type).updateOne(condition, {$set: filter})
    .then( () => res.status(201).json( {'result': 'delete ok'} ))
    .catch( (error) => res.status(500).json(error.toString()) );

});



/*****************************************************************
 * Export of a path to file comes in two steps:
 * 1) write-path-to-gpx: retrieve the path from db and call writeGPX, which saves the
 *    data to file, returning the filename
 * 2) download-file: allow the browser to download the file
 *****************************************************************/
 // Step 1, write the data to gpx file
app.get('/write-path-to-gpx/:type/:id', verifyToken, (req, res) => {

  debugMsg('Write path to gpx');

  mongoModel(req.params.type)
    .find({_id: req.params.id, userId: req.userId})
    .then( documents => gpxWriteFromDocument(documents[0]))
    .then( fileName => res.status(201).json( {fileName} ))
    .catch( (error) => res.status(500).json(error.toString()) );
})

// Step 2, download the file to browser
app.get('/download-file/:fname', verifyToken, (req, res) => {

  debugMsg('Download file from server');

  res.download('../' + req.params.fname + '.gpx', (err) => {
    if (err) {
      console.log('error: ' + err);
    } else {
      console.log('success');
    }
  });

})



/*****************************************************************
 * Recieves a set of points (lngLats array) from the front end and
 * creates a Path object in order to get elevations and statistics,
 * and returns it back to the front end
 *****************************************************************/
app.post('/get-path-from-points/', verifyToken, (req, res) => {

  debugMsg('get-path-from-points')

  const lngLats = req.body.coords.map(coord => [coord.lng, coord.lat]);

  getRouteInstance(null, null, lngLats, null)
    .then( route => res.status(201).json({
      hills: new GeoJSON().fromPath(route).toGeoHills(),
      basic: new GeoJSON().fromPath(route).toBasic()
    }))
    .catch( (error) => res.status(500).json( error.toString() ));

})



/*****************************************************************
 * Flush database of all unsaved entries
 * note we are only flushing routes at the moment
 *****************************************************************/
app.post('/flush/', verifyToken, (req, res) => {

  debugMsg('flush db');

  mongoModel('route').deleteMany( {'userId': userId, 'isSaved': false} )
    .then( () => res.status(201).json( {result: 'db flushed'} ))
    .catch( (error) => res.status(500).json(error.toString()) );

})



export default app;


