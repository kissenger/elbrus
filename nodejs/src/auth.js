
"use strict"

/**
 * Module provides the necessary functions for user authentication
 */

const express = require('express');
const authRoute = express.Router();
const jsonwebtoken = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const KEY = process.env.AUTH_KEY;    // authkey is the know part of the jwt
const TOKEN = process.env.TS_TOKEN;  // js_token is used to ensure that 

const debugMsg = require('./debug').debugMsg;
const Users = require('./schema/user-models').Users;
class AuthenticationError extends Error{};

/**
 * middleware to confirm user has an acceptable token. returns userId in req if all is ok
 */
function verifyToken(req, res, next) {

  debugMsg('verifyToken');

  try {

    if (!req.headers.authorization) {
      throw new AuthenticationError('Unauthorised request: authorisation headers');
    }

    const token = req.headers.authorization;
    if ( token === 'null' ) {
      throw new AuthenticationError('Unauthorised request: null token');
    }

    const payload = jsonwebtoken.verify(token, KEY);
    if ( !payload ) {
      throw new AuthenticationError('Unauthorised request: invalid token');
    }
    
    req.userId = payload.userId;
    req.userName = payload.userName;
    req.role = payload.role;

    next();

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(401).send(error.message);

  }

}


authRoute.post('/api/update-user-data', verifyToken, async (req, res) => {

  try {

    delete req.body._id;
    await Users.updateOne( {_id: req.userId}, {$set: req.body}, {upsert: false, writeConcern: {j: true}})
    res.status(201).json( {success: 'success'} );

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(401).send(error.message);

  }

})


authRoute.post('/api/register', async (req, res) => {
// take incoming user data in the form {email, password}, hash password,
// save to db, get json token and return to front end

  const saltRounds = 10;

  try {
      
    // confirm that user name does not exist in db
    const userExists = await Users.findOne( {userName: req.body.userName}, {} );
    if (userExists) {
      throw new AuthenticationError('This user name is already registered');
    }

    // create user in the database
    const hash = await bcrypt.hash(req.body.password, saltRounds);
    const newUser = await Users.create({...req.body, hash});
    const subject = {userId: newUser._id, userName: newUser.userName};
    const token = jsonwebtoken.sign(subject, KEY);
    delete newUser.validationString;
    res.status(200).send({token, user: newUser});    

  } catch (error) {
    debugMsg('ERROR: ' + error);
    res.status(401).send(error.message);
  }

});



authRoute.post('/api/login', async (req, res) => {

  try {

    const userName = req.body.userName;
    let subject;
    let user;

    if ( userName === 'guest' ) {

      subject = {userId: '0000', userName: 'guest', role: 'guest'};
      user = { userName };


    } else {

      user = await Users.findOne( {userName: userName}, {} );
      if (!user) {
        throw new AuthenticationError('User name not found.');
      };

      const passwordOK = await bcrypt.compare(req.body.password, user.hash);
      if (!passwordOK) {
        throw new AuthenticationError('Password did not match');
      }

      subject = {userId: user._id, userName: user.userName, role: 'user'};

    }

    const token = jsonwebtoken.sign( subject, KEY );
    res.status(200).send({token, user});

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(401).send(error.message);

  }

});


module.exports = {
  authRoute,
  verifyToken
}