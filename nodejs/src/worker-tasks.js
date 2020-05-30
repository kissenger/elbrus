"use strict"

const expose = require('threads/worker').expose;
const gpxRead = require('./gpx').gpxRead;
const getRouteInstance = require('./path-helpers').getRouteInstance;

const workerFunctions = {
  gpxRead: async (buffStr) => {
    return gpxRead(buffStr);
  },
  getRouteInstance: async (name, description, lngLat, elev) => {
    return getRouteInstance(name, description, lngLat, elev);
  }  
};

expose(workerFunctions);