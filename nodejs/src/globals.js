"use strict"

/**
 * Module provides all the global paramaters used throughout the backend
 */

export const SIMPLIFY_TOLERANCE = 6;         // metres offset from a line below which a point will be deleted; higher tol -> greater simplification
export const LONG_PATH_THRESHOLD = 4000;     // number of points (before simplification) above which the path will be treated as long
export const MATCH_DISTANCE = 100;           // metres; if distance between two points is less than this they will be treated as matching
export const MATCH_BUFFER = 10;              // number of points ahead to skip when finding match (to avoid matching point in the same direction)
export const MOVING_AVERAGE_PERIOD = 7;      // smoothing factor for moving average (must be odd)
export const ASCENT_THRESH = 5;              // changes in altitude < this will not be included in ascent/descent calculation
export const HILL_THRESH = 30;               // changes in altitude > this will be considered as a hill
export const START_AT_END_THRESH = 250;      // distance in metres, if start and end points are this close then consider as matching
export const PC_THRESH_UPP = 90;             // if % shared points > PC_THRESH_UPP then consider as 'out and back' route
export const PC_THRESH_LOW = 10;             // if % shared points < PC_THRESH_LOW the consider as 'one way' or 'circular' depending on whether start is returned toKs
export const PATH_TO_GEOTIFFS = '../../../_ASTGTM/';
export const PRE_FLIGHT_SIMPLIFICATION_FACTOR = 2


// GeoJSON colours
export const UP_COLOUR = '#FF0000';
export const DOWN_COLOUR = '#00FF00';
export const FLAT_COLOUR = '#0000FF';
export const ROUTE_COLOUR = '#0000FF';

