"use strict"

const expose = require('threads/worker').expose;
const gpxRead = require('./gpx').gpxRead;
const getRouteInstance = require('./path-helpers').getRouteInstance;


// const analysePath = require('./path-analyse').analysePath;
// const analyseElevations = require('./path-elevations').analyseElevations;

const workerFunctions = {
  gpxRead: async (buffStr) => {
    return gpxRead(buffStr);
  },
  // analysePath: async (path) => {
  //   return analysePath(path);
  // },
  // analyseElevations: async (path) => {
  //   return analyseElevations(path);
  // },
  getRouteInstance: async (data) => {
    // console.log(name, description, lngLat, elev)
    return getRouteInstance(data.name, data.description, data.lngLat, data.elev);
  }  
};

expose(workerFunctions);