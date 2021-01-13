"use strict"

/**
 * Module provides all the global paramaters used throughout the backend
 */

module.exports = {

  SHORT_PATH_THRESHOLD: 250,     // number of points (before simplification) below which there is no simplification
  LONG_PATH_THRESHOLD: 1000,     // number of points (after simplification) above which the path will be treated as long

  // Hills
  MATCH_BUFFER: 10,              // number of points ahead to skip when finding match (to avoid matching point in the same direction)
  MOVING_AVERAGE_PERIOD: 7,      // smoothing factor for moving average (must be odd)
  ASCENT_THRESH: 5,              // changes in altitude < this will not be included in ascent/descent calculation
  HILL_THRESH: 30,               // changes in altitude > this will be considered as a hill
  START_AT_END_THRESH: 250,      // distance in metres, if start and end points are this close then consider as matching

  // Route analysis
  ROTATION_RANGE_TOL: 135,       // a one-way route with a bearing range > this will be considered as rotational and return CW or ACW direction
  CW_CIRC_THRESHOLD: 0.15,       // threshold below which a route is 'weakly rotational', used to help identify circular routes
  PC_THRESH_UPP: 40,             // if % shared points > PC_THRESH_UPP then consider as 'out and back' route
  PC_THRESH_LOW: 10,             // if % shared points < PC_THRESH_LOW the consider as 'one way' or 'circular' depending on whether start is returned toKs
  MATCH_DISTANCE: 100,           // metres, if distance between two points is less than this they will be treated as matching
  CW_TOLERANCE: 1,               // tolernace below which change in bearing is neglected (eliminate noise)
  BEARING_SECTIONS: 100,         // number of sections to divide path into for bearing analysis
  SIMPLIFICATION_FACTOR_PASS_1: 2,
  SIMPLIFICATION_FACTOR_PASS_2: 10,

  OUT_AND_BACK: 'Out and back',
  CIRCULAR: 'Circular',
  ONE_WAY: "One way",
  NO_DIRECTION: "N/A",
  ANTI_CLOCKWISE: "Anti-clockwise",
  CLOCKWISE: "Clockwise",
  NO_CATEGORY: "None",
  FIGURE_OF_EIGHT: "Figure of eight",

  // Jael setup
  PATH_TO_GEOTIFFS: '../../../_ASTGTM/',
  
  // GeoJSON colours
  UP_COLOUR: '#FF0000',
  DOWN_COLOUR: '#00FF00',
  FLAT_COLOUR: '#0000FF',
  // ROUTE_COLOUR: '#0000FF',
}