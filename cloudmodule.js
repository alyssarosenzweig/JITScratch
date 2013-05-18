/*
cloudmodule.js - a module for writing node apps to communicate via the elaborate cloud protocol
Copyright (C) 2012-2013 bobbybee
ALL RIGHTS RESERVED

BOBBYBEE IS NOT RESPONSIBLE FOR ANY USAGE OF THIS APPLICATION. USE AT YOUR OWN DISCRETION
*/ 

var net = require('net');
var http = require('http');

var socket;

var varChangeEvent = function(){};

var username = "";
var token = "";
var projectID = "";

// handshakes with the server
function handshake(username, token, projectID){
    socket.write(x="{\"method\":\"handshake\", \"user\":\""+username+"\", \"token\":\""+token+"\", \"project_id\":\""+projectID+"\"}\n");
    console.log(x);
    
}

// sets a variable
function SetVar(va, val){
    socket.write(p="{\"method\":\"set\", \"user\" : \""+username+"\", \"token\":\""+token+"\", \"project_id\" : \""+projectID+"\", \"name\": \""+va+"\", \"value\":\""+val+"\"}\n");
}

// detects a users token via project authentication
function generateUserToken(username, password, _projectID, callback){
    projectID = _projectID;
    loginbody="{\"username\":\""+username+"\", \"password\":\""+password+"\", \"timezone\":\"America/New_York\"}\n";
    var loginoptions = {
        host: 'scratch.mit.edu',
        port: 80,
        path: '/login/',
        method: 'POST',
        headers: {
            'Content-Length': loginbody.length,
            'Connection': 'keep-alive'
        }
    };
    var cookie = '';
    var loginreq = http.request(loginoptions, function(res){
        cookie = res.headers["set-cookie"];
        res.on('data', function(chunk){
            // login response.. find it!
            var parsedChunk = JSON.parse(chunk.toString());
            parsedChunk = parsedChunk[0];
            if(!parsedChunk.success)
                return 0;
            http.get({host: 'scratch.mit.edu', port: 80, path: '/projects/'+projectID+'/', method: 'GET', headers: {
                cookie: cookie
            }}, function(res){
                
                res.on('data', function(chunk){
                    var toklocation = chunk.toString().indexOf("        return \"");
                    if(toklocation != -1){
                        token = chunk.toString().substr(toklocation+16, 36);                   console.log("Token: "+token+" "+this.token);
                        if(typeof callback !== "undefined"){callback()};
                    }
                });
            });
        });
    });
    loginreq.write(loginbody);
    loginreq.end();
    return 1;
}


function connect(_username, _token, _projectID, host, port){
    if(typeof host === "undefined") host = "cloud.scratch.mit.edu";
    if(typeof port === "undefined") port = 531;
    
    if(typeof _token !== "undefined") token = _token;
    if(typeof _projectID !== "undefined") projectID = _projectID;
    
    username = _username;
        
    socket = net.createConnection(port, host);
    socket.on('data', function(data){
        console.log("Data: "+data.toString());
        var jsonStrings = data.toString().split('\n');
        for(var i = 0; i < jsonStrings.length-1; ++i){
            var dataObj = JSON.parse(jsonStrings[i]);
            module.exports.varChangeEvent(dataObj);
        }
    }).on('connect', function(connect){
        console.log("Connection");
        handshake(username, token, projectID);
    });
}

module.exports.socket = socket;
module.exports.connect = connect;
module.exports.handshake = handshake;
module.exports.SetVar = SetVar;
module.exports.generateUserToken = generateUserToken;
module.exports.token = token;

module.exports.varChangeEvent = varChangeEvent;