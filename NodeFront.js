/*
NodeFront.js
Module & Procedure Manager
Designed for usage with gencode.js
Copyright (C) bobbybee 2013
ALL RIGHTS RESERVED
*/

var net = require('net');

var PORT = 8088;

var serverModules = [];
var projectIDList = [];

var isSingleBind = true;
var singleBound = false;

// cloud API: used for comunicating BACK to scratch!
var cloud = require('./cloudmodule');

var username = "";
var password = "";

function cloudSetVar(n, v){
	console.log(n+"*="+v);
	cloud.SetVar("☁ "+n, v);	
}

var socketObj = [];

var troot = this;

var cloudObj = {};

var localCloudObj = {}; // this is used w/ a getter to avoid conflicts

var cloudEnabled = false; // disable cloud for now

function encodeVarName(t_var){
	    _var = t_var;
	 	_var = _var.replace(/ /g,"SPACE");
	    _var = _var.replace(/@/g,"AT");
	    _var = _var.replace(/\"/g, ""); // quotes are added on by GetValueOf, so this is essential as not to distort the data
	    _var = _var.replace(/\?/g, "QMARK");
		return _var;
}

net.createServer(function(conn){
	conn.on('end', function(){
		// disconnection
	});
	
	conn.on('data', function(data){
		try{
			data = data.toString().split('/');
			switch(data[0]){
				case 'P':
					var tmod = serverModules[parseInt(data[1], 10)];
					var proc = tmod[data[2]];
					data.splice(0,3);
					var status = proc.apply(null, data);
					if(typeof status !== "undefined"){
						conn.write("P/"+status.toString()+"/");
					}
					break;
				case 'L':
					if(!isSingleBind || !singleBound){
						console.log("loadin module "+data[1]);
						serverModules.push(require("./"+data[1]));
						socketObj[serverModules.length-1] = [];
						conn.write("L/"+(serverModules.length-1).toString());
						// connect to cloud
						if(isSingleBind && !singleBound && cloudEnabled){
							console.log("Cloud connection");
							cloud.generateUserToken(username, password, data[1], function(){
								cloud.connect(username);
								serverModules[serverModules.length-1].InitCloud(cloudObj);
								console.log("Init cloud");
							});
							cloud.varChangeEvent = function(obj){
								console.log("d:"+JSON.stringify(obj));
                                console.log(localCloudObj["SPACE"+obj.name.slice("☁ ".length)]);
								if(localCloudObj["SPACE"+obj.name.slice("☁ ".length)] === undefined){
									localCloudObj["SPACE"+obj.name.slice("☁ ".length)] = obj.value;
									console.log(obj.name+"=+"+obj.value);
									cloudObj.__defineGetter__("SPACE"+obj.name.slice("☁ ".length), function(){
										return localCloudObj["SPACE"+obj.name.slice("☁ ".length)];
									});
									cloudObj.__defineSetter__("SPACE"+obj.name.substr(1, "☁ ".length), function(v){
                                        console.log(obj.name+v+localCloudObj["SPACE"+obj.name.slice("☁ ".length)]);
                                        cloudSetVar(obj.name, v);
									});
                                    console.log(JSON.stringify(cloudObj));
								} else
									localCloudObj["SPACE"+obj.name.slice("☁ ".length)] = obj.value;
							};
							
                        
						}
						singleBound = true;
						break;
					}
				case 'J':
					data[1] *= 1; // force integer coercion
					socketObj[data[1]].push(conn);
					break;
				case 'V': // the variables controller
					console.log("Fetching "+data[2]+" from "+data[1]);
					data[2] = encodeVarName(data[2]);
					var module = serverModules[parseInt(data[1], 10)];
					var v = module[data[2]];
					if(data[2].substr(0,7) == 'private'){
						conn.write("V/"+data[2]+"/Error 1001: Private Variable Access Forbidden/")
					} else {
						conn.write("V/"+data[2]+"/"+v+"/");
					}
					break;
				default:
					break;
			}
		} catch(e){
			console.log("Error: "+e);
		}
	});
}).listen(PORT);