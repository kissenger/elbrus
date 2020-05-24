
"use strict"

/**
 * Module provides the necessary functions for user authentication
 */

import express from 'express';
import jsonwebtoken from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import cryptoRandomString from 'crypto-random-string';

import { debugMsg } from './debugging.js';
import { Users } from './schema/user-models.js';

export const authRoute = express.Router();
const KEY = process.env.AUTH_KEY; 

class AuthenticationError extends Error{};

/**
 * middleware to confirm user has an acceptable token. returns userId in req if all is ok
 */
export function verifyToken(req, res, next) {

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

    req.userId = payload.subject;
    next();

  } catch (error) {
    debugMsg('ERROR: ' + error);
    res.status(401).send(error.message);
  }

}


authRoute.post('/update-user-data', verifyToken, async (req, res) => {

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


authRoute.post('/register', async (req, res) => {
// take incoming user data in the form {email, password}, hash password,
// save to db, get json token and return to front end

  debugMsg('register user');

  const saltRounds = 10;

  try {
      
    // confirm that email address does not exist in db
    const userExists = await Users.findOne( {userName: req.body.userName}, {} );
    if (userExists) {
      throw new AuthenticationError('This user name is already registered');
    }

    // const emailExists = await Users.findOne( {email: req.body.email}, {} );
    // if ( emailExists ) {
    //   throw new AuthenticationError('This email address is already registered');
    // }

    // create user in the database
    const hash = await bcrypt.hash(req.body.password, saltRounds);
    const validationString = cryptoRandomString({length: 10, type: 'url-safe'});
    const user = await Users.create({...req.body, hash, validationString});

    console.log(req.body.email)
    const message = `Click <a href="http://trailscape.cc/validation/${user._id}/${validationString}">here</a> to validate your account`;
    await sendAnEmail(req.body.email, message);
    
    // const token = jsonwebtoken.sign( {subject: registeredUser._id}, KEY);
    // delete registeredUser.validationString;
    res.status(201).json( {success: 'success'} );

  } catch (error) {
    debugMsg('ERROR: ' + error);
    res.status(401).send(error.message);
  }

});



authRoute.post('/login', async (req, res) => {

  debugMsg('login user');

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

    const token = jsonwebtoken.sign({ subject: user._id }, KEY);
    res.status(200).send({token, user});

  } catch (error) {
    debugMsg('ERROR: ' + error);
    res.status(401).send(error.message);
  }

});


authRoute.get('/verify-account/:id/:code', async (req, res) => {

  debugMsg('verify account');

  try {

    const user = await Users.findOne( {_id: req.params.id}, {verificationString: 1} );
    console.log(user);

    if (req.params.code === user.verificationString) {
      res.status(200).json({success: true});
    } else {
      throw new AuthenticationError('Verification failed');
    }

  } catch (error) {
    debugMsg('ERROR: ' + error);
    res.status(401).send(error.message);
  }

});


async function sendAnEmail(toEmail, message) {

  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  let testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"trailscape user validation" <validation@trailscape.cc>', // sender address
    to: toEmail, // list of receivers
    subject: "Please validate your trailscape account", // Subject line
    // text: "Hello world?", // plain text body
    html: message, // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

