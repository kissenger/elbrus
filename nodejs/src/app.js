
"use strict"

/**
 * Handles the public interface with the front-end.  Only routes are specified in this module
 * (with some others in app-auth.js) with suppporting functions abstracted to 'app-functions.js'
 */

const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const dotenv = require('dotenv').config();
if (dotenv.error) {
  console.log(`ERROR from app.js: ${dotenv.error}`);
  process.exit(0);
}

const app = express(); 
const fs = require('fs');

const auth = require('./auth');
const GeoJSON = require('./geojson').GeoJSON;
const gpxRead = require('./gpx').gpxRead;  
const gpxWriteFromDocument = require('./gpx').gpxWriteFromDocument;
const debugMsg = require('./debug').debugMsg;
const mongoModel = require('./app-helpers.js').mongoModel;
const bbox2Polygon = require('./app-helpers.js').bbox2Polygon;
const bbox2Point = require('./app-helpers.js').bbox2Point; 
const getListData = require('./app-helpers.js').getListData;
const getRouteInstance = require('./path-helpers.js').getRouteInstance;
const getMongoObject = require('./path-helpers.js').getMongoObject;
const getReverseOfRoute = require('./path-helpers.js').getReverseOfRoute;
const geoFunctions = require('geo-points-and-paths').geoFunctions;

let threadPool;
if (process.env.USE_THREADS) {
  threadPool = require('./worker-pool').threadPool;
  threadPool.create();
}


// apply middleware - note setheaders must come first
// TODO:  (2) to inject /api on routes
app.use( (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Origin, X-Request-With, Content-Type, Accept, Authorization, Content-Disposition");
  res.setHeader("Access-Control-Allow-Methods","GET, POST, PATCH, DELETE, OPTIONS");
  next();
});
app.use(bodyParser.json());
app.use(auth.authRoute);
app.use((req, res, next) => {
  debugMsg(`${req.method}: ${req.originalUrl}`);
  next();
})


// mongo as a service
// console.log(process.env.MONGODB_PASSWORD)
mongoose.connect(`mongodb+srv://root:${process.env.MONGODB_PASSWORD}@cluster0-5h6di.gcp.mongodb.net/test?retryWrites=true&w=majority`,
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
app.post('/api/import-route/', auth.verifyToken, upload.single('filename'), async (req, res) => {

  try {

    const bufferString = req.file.buffer.toString();
    let routeInstance;
    if (process.env.USE_THREADS) {
      const gpxData = await threadPool.addTaskToQueue('gpxRead', bufferString);
      routeInstance = await threadPool.addTaskToQueue('getRouteInstance', gpxData.name, null, gpxData.lngLat, gpxData.elev);
    } else {
      const gpxData = gpxRead(bufferString);
      routeInstance = await getRouteInstance(gpxData.name, null, gpxData.lngLat, gpxData.elev);  
    }
    const document = await mongoModel('route').create( getMongoObject(routeInstance, req.userId, req.userName, false, false) );
    res.status(201).json( {hills: new GeoJSON().fromDocument(document).toGeoHills()} );

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(500).send(error.message);

  }

}); 


/*****************************************************************
 * Save a path to database - path has already been saved to the
 * database, all we are doing is updating some fields, and
 * changing isSaved flag to true; id of path is provided
 *****************************************************************/
app.post('/api/save-imported-path/', auth.verifyToken, async (req, res) => {

  try {

    const condition = {_id: req.body.pathId};
    const filter = {isSaved: true, "info.name": req.body.name, "info.description": req.body.description};
    await mongoModel(req.body.pathType).updateOne(condition, {$set: filter}, {upsert: true, writeConcern: {j: true}})
    res.status(201).json({pathId: req.body.pathId});

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(500).send(error.message);

  }


});



/*****************************************************************
 * Save a user-created route to database; geoJSON is supplied in POST body
 *****************************************************************/
app.post('/api/save-created-route/', auth.verifyToken, async (req, res) => {

  try {

    let routeInstance;
    if (process.env.USE_THREADS) {
      routeInstance = await threadPool.addTaskToQueue('getRouteInstance', req.body.name, req.body.description, req.body.coords, req.body.elev);
    } else {
      routeInstance = await getRouteInstance(req.body.name, req.body.description, req.body.coords, req.body.elev);  
    }

    let isPublic;

    if (req.body.pathId !== '0000') {
      // we are saving an edited path, need to know isPublic, and to delete it
      const oldPath = await mongoModel('route').findOne( {_id: req.body.pathId});
      isPublic = oldPath.isPublic;
      mongoModel('route').deleteOne( {_id: req.body.pathId} );
    } 

    // now save the new path
    const newPath = await mongoModel('route').create( getMongoObject(routeInstance, req.userId, req.userName, true, !!isPublic) );
    res.status(201).json( {pathId: newPath._id} )

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(500).send(error.message);

  }

});



// /*****************************************************************
//  * Update an existing route by creating new and deleting old geoJSON is supplied in POST body
//  *****************************************************************/
// app.post('/save-created-route/', auth.verifyToken, async (req, res) => {


//   debugMsg(`save-created-route`);

//   try {

//     let routeInstance;
//     if (process.env.USE_THREADS) {
//       routeInstance = await threadPool.addTaskToQueue('getRouteInstance', req.body.name, req.body.description, req.body.coords, req.body.elev);
//     } else {
//       routeInstance = await getRouteInstance(req.body.name, req.body.description, req.body.coords, req.body.elev);  
//     }
//     const document = await mongoModel('route').create( getMongoObject(routeInstance, req.userId, req.userName, true) );
//     res.status(201).json( {pathId: document._id} )

//   } catch (error) {

//     debugMsg('ERROR: ' + error);
//     res.status(500).send(error.message);

//   }

// });






/*****************************************************************
 *  Retrieve a single path from database
 *  id of required path is supplied
 *****************************************************************/
app.get('/api/get-path-by-id/:type/:id', auth.verifyToken, async (req, res) => {

  try {

    const document = await mongoModel(req.params.type).findOne( {_id: req.params.id});
    res.status(201).json({
      hills: new GeoJSON().fromDocument(document).toGeoHills(),
      basic: new GeoJSON().fromDocument(document).toBasic()
    }) 

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(500).send(error.message);

  }

})



/*****************************************************************
 * Retrieve a list of paths from database - if bbox is supplied it
 * will return only paths intersecting with the bbox, otherwise returns
 * all
 * bbox is delivered as a req parameter - either array or 0 if not reqd
 * pathType is the type of path (obvs)
 * offset is used by list to request chunks of x paths at a time
 *****************************************************************
 * v2 change - return all routes regardless of window, and add 
 * boolean to identify those that are within the window
 *****************************************************************/


app.get('/api/get-list/:pathType/:isPublic/:offset/:limit', auth.verifyToken, async (req, res) => {


    if ( req.role === 'guest' && req.params.isPublic === 'false' ) {
      // console.log('Unauthorised request from guest')
      // res.status(401).send('Unauthorised request from guest');
      throw new Error('Unauthorised request from guest');
    }

    const pathType = req.params.pathType;
    const point = { type: 'Point', coordinates: bbox2Point(req.query.bbox) };
    const box = { type: 'Polygon', coordinates: bbox2Polygon(req.query.bbox) };
    const query = { geometry: { $geoIntersects: { $geometry: box} } };

    if ( req.params.isPublic === 'true') {
      query.isPublic = true;
    } else {
      query.userId = req.userId;
    }

    const docs = await mongoModel(pathType).aggregate([
      {
        $geoNear: {
          near: point,
          spherical: false,
          distanceField: 'distance',
          query: query 
        }
      },
      {
        $facet: {
          count: [{ $count: "count" }],
          list: [
            {$skip: req.params.limit * req.params.offset }, 
            {$limit: req.params.limit * 1}
          ]
        }
      }
    ]);
    
    let count; 
    try {
      count = docs[0].count[0].count;
    } catch {
      count = 0;
    }   

    debugMsg(`/api/get-list: found routes`);
    res.status(201).json( {list: getListData(docs[0].list), count} );

})



/*****************************************************************
 * Delete a path from database
 * id of path is provided in both public and private dbs
 *****************************************************************/
app.delete('/api/delete-path/:type/:id', auth.verifyToken, async (req, res) => {

  try {

    await mongoModel(req.params.type).deleteOne( {_id: req.params.id} );
    res.status(201).json( {'result': 'delete ok'} );
  
  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(500).send(error.message);

  }

});



/*****************************************************************
 * Export of a path to file comes in two steps:
 * 1) write-path-to-gpx: retrieve the path from db and call writeGPX, which saves the
 *    data to file, returning the filename
 * 2) download-file: allow the browser to download the file
 *****************************************************************/
 // Step 1, write the data to gpx file
app.get('/api/write-path-to-gpx/:type/:id', auth.verifyToken, async (req, res) => {

  try {

    const document = await mongoModel(req.params.type).findOne({_id: req.params.id});
    const fileName = await gpxWriteFromDocument(document);
    res.status(201).json( {fileName} );

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(500).send(error.message);

  }

})

// Step 2, download the file to browser
app.get('/api/download-file/:fname', auth.verifyToken, async (req, res) => {

  const fname = './downloads/' + req.params.fname;

  try {

    res.download(fname, (err) => {

      if (err) {
        throw new Error(err);
      }

      fs.unlink(fname, () => {});
    
    });

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(401).send(error.message);

  }

})



/*****************************************************************
 * Recieves a set of points (lngLats array) from the front end and
 * creates a Path object in order to get elevations and statistics,
 * and returns it back to the front end
 *****************************************************************/
app.post('/api/get-path-from-points/', auth.verifyToken, async (req, res) => {



    let coords;
    if (req.body.options.simplify) {
      coords = geoFunctions.simplifyPath(req.body.coords, 5).points;
      console.log(coords);
    } else {
      coords = req.body.coords;
    }

    // TODO: is it really needed to convert from {lat:, lng:} to lngLat?
    const lngLats = coords.map(coord => [coord.lng, coord.lat]);

  try {
    let routeInstance;
    if (process.env.USE_THREADS) {
      routeInstance = await threadPool.addTaskToQueue('getRouteInstance', null, null, lngLats, null);
    } else {
      routeInstance = await getRouteInstance(null, null, lngLats, null);  
    }

    res.status(201).json({
        hills: new GeoJSON().fromPath(routeInstance).toGeoHills(),
        basic: new GeoJSON().fromPath(routeInstance).toBasic()
      });

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(400).send(error.message);

  }

})




/*****************************************************************
 * Toggles a path from public --> private or opposite
 *****************************************************************/

app.post('/api/toggle-path-public/', auth.verifyToken, async (req, res) => {

  try {

    // query database path database to determine current status of path
    const result = await mongoModel(req.body.pathType).findOne({_id: req.body.pathId}, {isPublic: 1});
    await mongoModel(req.body.pathType).updateOne( {_id: req.body.pathId}, {$set: {isPublic: !result.isPublic}} );
    res.status(201).json({isPathPublic: !result.isPublic});

  } 
  catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(500).send(error.message);

  }

})


/*****************************************************************
 * Copies a path into private database
 *****************************************************************/

app.post('/api/copy-path/', auth.verifyToken, async (req, res) => {

  try {

    const document = await mongoModel(req.body.pathType).findOne({_id: req.body.pathId}, {_id:0});
    const newDate = new Date(Date.now());
    document.userId = req.userId;
    document.info.name = "Copy of " + document.info.name;
    document.creationDate = newDate,
    document.lastEditDate = newDate,
    document.isPublic = false;
    document.info.createdBy = req.userName;
    document._id = mongoose.Types.ObjectId();
    document.isNew = true;
    
    const newDoc = await mongoModel(req.body.pathType).create(document);
    res.status(201).json({pathId: newDoc._id});

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(500).send(error.message);

  }

})



/*****************************************************************
 * Return the reverse of a route
 *****************************************************************/

app.get('/api/reverse-route/:pathType/:pathId', auth.verifyToken, async (req, res) => {

  try {

    const sourceDoc = await mongoModel(req.params.pathType).findOne({_id: req.params.pathId});
    const {lngLats, elevs} = getReverseOfRoute(sourceDoc.geometry.coordinates, sourceDoc.params.elev);
    const routeInstance = await getRouteInstance(null, null, lngLats, elevs);
    const newDoc = await mongoModel('route').create( getMongoObject(routeInstance, req.userId, req.userName, false) );
    res.status(201).json( {hills: new GeoJSON().fromDocument(newDoc).toGeoHills()} );

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(500).send(error.message);

  }

})





/*****************************************************************
 * Flush database of all unsaved entries
 * note we are only flushing routes at the moment
 *****************************************************************/
app.post('/api/flush/', auth.verifyToken, async (req, res) => {

  try {

    await mongoModel('route').deleteMany( {userId: userId, isSaved: false} )
    res.status(201).json( {result: 'db flushed'} );

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(500).send(error.message);

  }

})


/*****************************************************************
 * Useful for server debugging
 *****************************************************************/
app.get('/api/ping/', (req, res) => {
  res.status(201).json({hello: 'world'});
})

module.exports = app;

