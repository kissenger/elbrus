"use strict"

const expose = require('threads/worker').expose;
const ParseGPX = require('./gpx').ParseGPX; 
const getRouteInstance = require('./path-helpers').getRouteInstance;

const workerFunctions = {
  ParseGPX: async (buffStr) => {
    return new ParseGPX(buffStr);
  },
  getRouteInstance: async (dataObject) => {
    return getRouteInstance(dataObject);
  }  
};

expose(workerFunctions);