
"use strict"

/**
 * Module provides the necessary functions for user authentication
 */

const express = require('express');
const authRoute = express.Router();
const jsonwebtoken = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const KEY = process.env.AUTH_KEY;

const debugMsg = require('./debug').debugMsg;
const Users = require('./schema/user-models').Users;
class AuthenticationError extends Error{};


// needed for validate by email
// const cryptoRandomString = require('crypto-random-string');


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

    next();

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(401).send(error.message);

  }

}


authRoute.post('/api/update-user-data', verifyToken, async (req, res) => {

  debugMsg('updateUserData');

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

  debugMsg('register user');

  const saltRounds = 10;

  try {
      
    // confirm that user name does not exist in db
    const userExists = await Users.findOne( {userName: req.body.userName}, {} );
    if (userExists) {
      throw new AuthenticationError('This user name is already registered');
    }

    // confirm that email address does not exists - cant decide if this should be in or not
    // const emailExists = await Users.findOne( {email: req.body.email}, {} );
    // if ( emailExists ) {
    //   throw new AuthenticationError('This email address is already registered');
    // }

    // create user in the database
    const hash = await bcrypt.hash(req.body.password, saltRounds);
    // const validationString = cryptoRandomString({length: 10, type: 'url-safe'});
    // const newUser = await Users.create({...req.body, hash, validationString});
    const newUser = await Users.create({...req.body, hash});

    // const message = `Click <a href="http://trailscape.cc/validation/${user._id}/${validationString}">here</a> to validate your account`;
    // await sendAnEmail(req.body.email, message);

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

  debugMsg(`login user, userName: ${req.body.userName}`);

  // check that user exists and return data in variable user

  try {

    const user = await Users.findOne( {userName: req.body.userName}, {} );
    if (!user) {
      throw new AuthenticationError('User name not found.');
    };

    const passwordOK = await bcrypt.compare(req.body.password, user.hash);
    if (!passwordOK) {
      throw new AuthenticationError('Password did not match');
    }

    const subject = {userId: user._id, userName: user.userName};
    const token = jsonwebtoken.sign( subject, KEY );
    res.status(200).send({token, user});

  } catch (error) {

    debugMsg('ERROR: ' + error);
    res.status(401).send(error.message);

  }

});


// authRoute.get('/verify-account/:id/:code', async (req, res) => {

//   debugMsg('verify account');

//   try {

//     const user = await Users.findOne( {_id: req.params.id}, {verificationString: 1} );
//     console.log(user);

//     if (req.params.code === user.verificationString) {
//       res.status(200).json({success: true});
//     } else {
//       throw new AuthenticationError('Verification failed');
//     }

//   } catch (error) {
//     debugMsg('ERROR: ' + error);
//     res.status(401).send(error.message);
//   }

// });


// Code for sending email when we are ready...

// async function sendAnEmail(toEmail, message) {

//   // Generate test SMTP service account from ethereal.email
//   // Only needed if you don't have a real mail account for testing

//   let transporter = nodemailer.createTransport({
//     host: "in-v3.mailjet.com",
//     port: 587,
//     secure: false, // upgrade later with STARTTLS
//     auth: {
//       user: "c04f36388425ab191a23ea25b36474a0",
//       pass: "9707c419f4ea1a0907abc03b70216659"
//     }
//   });

//   // verify connection configuration
//   await transporter.verify(function(error, success) {
//     if (error) {
//       console.log(error);
//     } else {
//       console.log("Server is ready to take our messages");
//     }
//   });

//   // send mail with defined transport object
//   let info = await transporter.sendMail({
//     from: '"trailscape user validation" <ivyterrace@hotmail.co.uk>', // sender address
//     to: toEmail, // list of receivers
//     subject: "Please validate your trailscape account", // Subject line
//     // text: "Hello world?", // plain text body
//     html: message, // html body
//   });
  
// }

module.exports = {
  authRoute,
  verifyToken
}