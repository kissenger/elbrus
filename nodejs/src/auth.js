
"use strict"

/**
 * Module provides the necessary functions for user authentication
 */

import express from 'express';
import jsonwebtoken from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { debugMsg } from './debugging.js';
import { Users } from './schema/user-models.js';

export const authRoute = express.Router();
const KEY = process.env.AUTH_KEY; 

/**
 * middleware to confirm user has an acceptable token. returns userId in req if all is ok
 */
export function verifyToken(req, res, next) {

  debugMsg('verifyToken');

  if (!req.headers.authorization) {
    return res.status(401).send('Unauthorised request');
  }

  const token = req.headers.authorization;
  if ( token === 'null' ) {
    return res.status(401).send('Unauthorised request');
  }

  const payload = jsonwebtoken.verify(token, KEY);
  if ( !payload ) {
    return res.status(401).send('Unauthorised request');
  }

  req.userId = payload.subject;
  next();

}


authRoute.post('/update-user-data', verifyToken, (req, res) => {

  debugMsg('updateUserData');

  delete req.body._id;
  Users
    .updateOne( {_id: req.userId}, {$set: req.body}, {upsert: false, writeConcern: {j: true}})
    .then( (doc) => {
      res.status(201).json( {success: 'success'} );
    })

})


authRoute.post('/register', async (req, res) => {
// take incoming user data in the form {email, password}, hash password,
// save to db, get json token and return to front end

  debugMsg('register user');

  const saltRounds = 10;

  try {
      
    // confirm that email address does not exist in db
    let user = await Users.findOne( {userName: req.body.userName}, {} );
    if (user) {
      throw 'This user name is already registered';
    }

    let email = await Users.findOne( {email: req.body.email}, {} );
    if ( email ) {
      throw 'This email address is already registered';
    }

    // if we got here then there are no duplicates to worry about
    bcrypt.hash(req.body.password, saltRounds)
      .then( (hash) => Users.create({...req.body, hash}))
      .then( (regUser) => {
        const token = jsonwebtoken.sign( {subject: regUser._id}, KEY);
        res.status(200).send({token, user: regUser});
      })
      .catch( (err) => {
        throw err.toString();
      });

  } catch (error) {
    debugMsg('ERROR: ' + error);
    res.status(401).send(error);    

  }

});



authRoute.post('/login', (req, res) => {

  debugMsg('login user');

  // check that user exists and return data in variable user
  Users
    .findOne( {userName: req.body.userName}, {} )
    .then( (user) => {

    if (!user) {
      throw 'User name not found.'

    } else {
      // user exists
      bcrypt.compare(req.body.password, user.hash).then( (result) => {

        if (result) {
          const token = jsonwebtoken.sign({ subject: user._id }, KEY);
          res.status(200).send({token, user});
        } else {
          throw 'Password did not match';
        }

      }).catch( (err) => {
        throw err.toString();
      })
    }

  }).catch( (err) => {
    debugMsg('ERROR: ' + err);
    res.status(401).send(err.toString());
  })

});


// export { authRoute, verifyToken };
