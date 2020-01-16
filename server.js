"use strict";
const config = require('./config.js');
const Mixer = require('@mixer/client-node');
const ws = require('ws');

var express = require('express');
var app = new express();

app.set('view engine', 'ejs');

let userInfo;
const botname = "mixerbot";
var songRequests = [];

const client = new Mixer.Client(new Mixer.DefaultRequestRunner());

// With OAuth we don't need to log in. The OAuth Provider will attach
// the required information to all of our requests after this call.
client.use(new Mixer.OAuthProvider(client, {
    tokens: {
        access: config.a,
        expires: Date.now() + (365 * 24 * 60 * 60 * 1000)
     },
 }));

 // Gets the user that the Access Token we provided above belongs to.
 client.request('GET', 'users/current')
 .then(response => {
     userInfo = response.body;
     return new Mixer.ChatService(client).join(response.body.channel.id);
 })
 .then(response => {
     const body = response.body;
     return createChatSocket(userInfo.id, userInfo.channel.id, body.endpoints, body.authkey);
 })
 .catch(error => {
     console.error('Something went wrong.');
     console.error(error);
 });

 /**
  * Creates a Mixer chat socket and sets up listeners to various chat events.
  * @param {number} userId The user to authenticate as
  * @param {number} channelId The channel id to join
  * @param {string[]} endpoints An array of endpoints to connect to
  * @param {string} authkey An authentication key to connect with
  * @returns {Promise.<>}
  */
 function createChatSocket (userId, channelId, endpoints, authkey) {
     // Chat connection
     const socket = new Mixer.Socket(ws, endpoints).boot();

     // Greet a joined user
     socket.on('UserJoin', data => {
         socket.call('msg', [`Welcome to the stream ${data.username} ! To list commands tape !help`]);
     });

     // React to our !pong command
     socket.on('ChatMessage', data => {
         if (data.message.message[0].data.toLowerCase().startsWith('!help')) {
             socket.call('msg', [`@${data.user_name} Commands : !ping, !song dQw4w9WgXcQ`]);
             console.log(`Ponged ${data.user_name}`);
         }
         if (data.message.message[0].data.toLowerCase().startsWith('!ping')) {
             socket.call('msg', [`@${data.user_name} PONG!`]);
             console.log(`Ponged ${data.user_name}`);
         }
         if (data.message.message[0].data.substr(0, 6) === "!song ") {
             socket.call('msg', [`@${data.user_name} song request has been sent`]);
             var i = data.message.message[0].data.substr(6);
             songRequests.push(i);
             console.log(i + ` song request sent by ${data.user_name}`);
         }
     });

     // Handle errors
     socket.on('error', error => {
         console.error('Socket error');
         console.error(error);
     });

     return socket.auth(channelId, userId, authkey)
     .then(() => {
         console.log('Login successful');
         return socket.call('msg', ["Hi! I'm "+botname+"! let's have fun"]);
     });
 }

app.use(express.static('public'));

app.get('/', function(req,res){
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/song-request', function(req,res){
  if(songRequests.length > 0) {
    var id = songRequests.pop();
    res.json({youtubeid: id});
  }
  else {
      res.json({youtubeid: null});
  }
});

app.listen(3000)
console.log("Express server listening on port 3000");
