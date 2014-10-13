/*
JITScratch
A compiler for text-based scratch
Based on MATHOPS, Scratch-based expression generator
Copyright (C) 2013-2014 bobbybee
ALL RIGHTS RESERVERD
*/

// language config
// these variables, if properly set can be used to compile into about any Turing-complete C-based languages
// examples include: C, C++, C#, Objective-C, Objective-C++, D, F, F#, JavaScript, Java, ActionScript, etc.
// in the current state, JITScratch outputs into JavaScript (node.js variant) 

var ABS_COMMAND = "Math.abs";
var FLOOR_COMMAND = "Math.floor";
var CEILING_COMMAND = "Math.ceil";
var SQRT_COMMAND = "Math.sqrt";
var SIN_COMMAND = "Math.sin";
var COS_COMMAND = "Math.cos";
var TAN_COMMAND = "Math.tan";
var ASIN_COMMAND = "Math.asin";
var ACOS_COMMAND = "Math.acos";
var ATAN_COMMAND = "Math.atan";
var LN_COMMAND = "Math.ln";
var LOG_COMMAND = "Math.log";
var E_EXP_COMMAND = "__jit_e_exp";
var TEN_EXP_COMMAND = "__jit_ten_exp";
var ROUND_FUNCTION = "Math.round";
var CAT_FUNCTION = "__jit_cat";
var LETTEROF = "__jit_letterOf";
var RAND_FUNC = "__jit_rand";
var STRINGLEN_FUNC = "__jit_len";

var RESET_TIMER_FUNC = "__jit_resetTimer";
var GET_TIMER_FUNC = "__jit_getTimer";

// for typeless languages, this is extremely easy to do.. all blank or vars
var TYPE_NUMBER = "var";
var TYPE_STRING = "var";
var TYPE_BOOLEAN = "var";
var TYPE_LIST = "var";

var PARAM_TYPE_NUMBER = "";
var PARAM_TYPE_STRING = "";
var PARAM_TYPE_BOOLEAN = "";
var PARAM_TYPE_LIST = "";

var VOID_RETURN = "function";

// append lib: this is appended at the top of the output.
// it is used to implement functions where a standard library version is not available
// it can also be used to #include files  
var append_lib =[ 
                "__jit_cat=function(a,b){ return a + b; };",
                "__jit_len=function(a){return a.length};",
                "__jit_rand=function(a,b){return Math.floor(Math.random()*(b-a))+a};",
                "__jit_letterOf=function(a,b){return b[a];};",
                "__jit_resetTimer=function(){__jit_initTimer=(new Date).getTime()};",
                "__jit_getTimer=function(){return ((new Date).getTime()-__jit_initTimer)/1000};",
                "__jit_e_exp=function(a){return Math.pow(Math.E,a)};",
                "__jit_ten_exp=function(a){return Math.pow(10,a);}",
                "broadcastObj={};",
                "__jit_resetTimer();"
                ].join("");

// procedural variables are used for keeping track of procedures
// for processing reasons, procedures are stripped into a generic name like procedureXYZ, where XYZ is a procedureCount
// when calling a procedure, you look up the name in the procDefs array, and use the index as procedureINDEX(param0, param1, ..)
var isProcedure = false;
var procedureCount = 0;
var procDefs = [];

// green flag is removed from this list because it is current implemented as nothing, and the list is used for temrinating functions
var HATLIST = ["procDef","whenIReceive", /*"whenGreenFlag"*/];

var procScriptArr = [];

var projectJSON = null;

var numRepeats = 0;

function DoBlankProc(){ // effectively how you handle a blank value

    return "NULL"; // depending on the language we're targeting, you'll need to this different ways to avoid lexical problems..maybe you throw an error
}

function GetValueOf(line){	 // get value of is the main function in JITScratch, used for resolving values (reporter blocks, normal blocks, numbers, strings, variables, etc.)
    // heart of the whole program
    // this function may operate recursively to resolve trees
    if(line == null || typeof line==="string" && line=="") return DoBlankProc();
    if((line*1) == line) return line; // this is better than number detection actually
    if(typeof line === "string") return "\""+line+"\""; // already resolved, return the value as is
    if(typeof line === "boolean") return line;
    switch(line[0]){
        case "doRepeat":
            return repeatClause(line[1], line[2]);
        case "doIf":
            return doIf(line[1], line[2]);
        case "doIfElse":
            return doIfElse(line[1], line[2], line[3]);
        case "computeFunction:of:":
            return computeFunctionOf(line[1], line[2]);
        case "+":
            return add(line[1], line[2]);
        case "-":
            return subtract(line[1], line[2]);
        case "*":
            return multiply(line[1], line[2]);
        case "\/":
            return divide(line[1], line[2]);
        case "%":
            return mod(line[1], line[2]);
        case "readVariable":
            return readVariable(line[1]);
        case "rounded":
            return rounded(line[1]);
        case "concatenate:with:":
            return cat(line[1], line[2]);
        case "letter:of:":
            return letterOf(line[1], line[2]);
        case "randomFrom:to:":
            return randomFromTo(line[1], line[2]);
        case "stringLength:":
            return stringLen(line[1]);
        case "setVar:to:":
            return setVarTo(line[1], line[2]);
        case "changeVar:by:":
            return changeVarBy(line[1], line[2]);
        case "=":
            return isEqual(line[1], line[2]);
        case "not":
            return not(line[1]);
        case "procDef":
            return defineProcedure(line[1], line[2], line[3]);
        case ">":
            return greaterThan(line[1], line[2]);
        case "<":
            return lessThan(line[1], line[2]);
        case "getParam":
            return getParam(line[1]);
        case "call":
            return callProc(line[1], line);
        case "return":
            return returnValue(line[1]);
        case "doUntil":
            return doUntil(line[1], line[2]);
		case "whenGreenFlag":
			return greenFlag();

            
        // lists: a complex(ish) part of scratch
        case "getLine:ofList:":
            return lineOfList(line[1], line[2]);
        case "deleteLine:ofList:":
            return deleteLine(line[1], line[2]);
        case "append:toList:":
            return appendList(line[1], line[2]);
        case "insert:at:ofList:":
            return insertAt(line[1], line[2], line[3]);
        case "lineCountOfList:":
            return lineCount(line[1]);
	    case "setLine:ofList:to:":
           return replaceElement(line[1], line[2], line[3]);
        case "list:contains:":
 			  return listContains(line[1], line[2]);
            
        // broadcasts
        case "broadcast:":
            return broadcast(line[1]);
        case "whenIReceive":
            return broadcastDef(line[1]);
    }
    return "Error 1000: Unresolved reference";
}

// green flag is a debatable concept
// on one hand, it's a UI element
// on the other hand, projects use it as a general "project opened" block
// for compatibility sake, I've decided to leave the definition as blank, so as to execute immediately

function greenFlag(){
	return ""; // effectively do nothing.
}

// computeFunctionOf is the ( ) of ( ) operators block
function computeFunctionOf(_func, _op){
    var func = _func;
    switch(func){
        case "abs":
            func = ABS_COMMAND;
            break;
        case "floor":
            func = FLOOR_COMMAND;
            break;
        case "ceiling":
            func = CEILING_COMMAND;
            break;        
        case "sqrt":
            func = SQRT_COMMAND;
            break;
        case "sin":
            func = SIN_COMMAND;
            break;
        case "cos":
            func = COS_COMMAND;
            break;
        case "tan":
            func = TAN_COMMAND;
            break;
        case "asin":
            func = ASIN_COMMAND;
            break;
        case "acos":
            func = ACOS_COMMAND;
            break;
        case "atan":
            func = ATAN_COMMAND;
            break;
        case "ln":
            func = LN_COMMAND;
            break;
        case "log":
            func = LOG_COMMAND;
            break;
        case "e ^":
            func = E_EXP_COMMAND;
            break;
        case "10 ^":
            func = TEN_EXP_COMMAND;
            break;
            
    }
    
    var op = GetValueOf(_op);
    
    var ret = func+"("+op+")";
    return ret;
}

// this is actually difficult to implement (sorta) because it's a substandard feature
// we immitate the repeat C-block with a for loop and a temporary counter
// though we need to use a counter for the counter vars to avoid variable-name collision
function repeatClause(op1, op2){
    // op1=times
    // op2=action
    var repeatCount = "repeatCount"+(numRepeats++);
    return "for("+repeatCount+"=0;"+repeatCount+"<"+GetValueOf(op1)+";++"+repeatCount+"){\n"+GenScriptCode(op2)+"\n}";
}

function doUntil(op1, op2){
    return "while(!"+GetValueOf(op1)+"){\n"+GenScriptCode(op2)+"}";
}

function doIf(op1, op2){
    //op1=clause
    //op2=action
    return "if("+GetValueOf(op1)+"){\n"+GenScriptCode(op2)+"}";
}

function doIfElse(op1, op2, op3){
    return "if("+GetValueOf(op1)+"){\n"+GenScriptCode(op2)+"} else{\n"+GenScriptCode(op3)+"}";
}

// although this function isn't technically necessary, it's still nice to be able to distinguish variables from values
// and the switch loop would look funny without it
function readVariable(t_var){
    _var = t_var;
    _var = _var.replace(/ /g,"SPACE");
    _var = _var.replace(/@/g,"AT");
    _var = _var.replace(/\"/g, ""); // quotes are added on by GetValueOf, so this is essential as not to distort the data
    _var = _var.replace(/\?/g, "QMARK");
    return "module.exports."+_var;
}

function readList(t_list){
    _list = t_list;
    _list = _list.replace(/ /g,"SPACE");
    _list = _list.replace(/@/g,"AT");
    _list = _list.replace(/\"/g, ""); // quotes are added on by GetValueOf, so this is essential
    _list = _list.replace(/\?/g, "QMARK");
    return "module.exports."+_list;
}

// oddly enough, the surrounding parantheses, as ugly as they are, are ABSOLUTELY necessary
// Scratch uses really funky order of operations :P
function not(op1){
    return "(!"+GetValueOf(op1)+")";
}

function add(op1, op2){
    return "("+GetValueOf(op1)+"+"+GetValueOf(op2)+")";
}

function subtract(op1, op2){
    return "("+GetValueOf(op1)+"-"+GetValueOf(op2)+")";
}

function multiply(op1, op2){
    return "("+GetValueOf(op1)+"*"+GetValueOf(op2)+")";
}

function divide(op1, op2){
    return "("+GetValueOf(op1)+"/"+GetValueOf(op2)+")";
}

function rounded(op1){
    return ROUND_FUNCTION+"("+GetValueOf(op1)+")";
}

function cat(op1, op2){
    return CAT_FUNCTION+"("+GetValueOf(op1)+","+GetValueOf(op2)+")";
}

function letterOf(op1, op2){
    return LETTEROF+"("+GetValueOf(op1)+","+GetValueOf(op2)+")";
}

function randomFromTo(op1, op2){
    return RAND_FUNC+"("+GetValueOf(op1)+","+GetValueOf(op2)+")";
}

function stringLen(op1){
    return STRINGLEN_FUNC+"("+GetValueOf(op1)+")";
}

function mod(op1, op2){
    return GetValueOf(op1)+"%"+GetValueOf(op2);
}

function GenBlockLine(line){ 	// this is a more peculiar function
				// GetValueOf, despite its suggesting name, is used for ALL blocks, not just values
				// so to resolve a block line (one stack or one C-block), we must call GetValueOf on the block
    return GetValueOf(line); // later, generate actual code for it
}

function setVarTo(op1, op2){
    return readVariable(op1)+"="+GetValueOf(op2);
}

 function changeVarBy(op1, op2){
    return readVariable(op1)+"+="+GetValueOf(op2);
 }


function isEqual(op1, op2){
    return GetValueOf(op1)+"=="+GetValueOf(op2);
}

function greaterThan(op1, op2){
    return "("+GetValueOf(op1)+">"+GetValueOf(op2)+")";
}

function lessThan(op1, op2){
    return "("+GetValueOf(op1)+"<"+GetValueOf(op2)+")";
}

function timer(){
    return GET_TIMER_FUNC+"()";
}

function resetTimer() {
    return RESET_TIMER_FUNC+"()";
}

function defineProcedure(definitionClause, paramNames, defaultVal){	// define procedure is the definition hat block
   									
    // header creation is a complicated job :/
    var header = VOID_RETURN+" procedure"+(procedureCount++)+"(";
    var i = 0;
    var paramNum = 0;
    isProcedure = true;
    procDefs.push(definitionClause);
	
	var strictNums = [];
	
    while(i < definitionClause.length){
        if(definitionClause[i] == '%'){
            var type = definitionClause[++i];
            switch(type){
                case 'n':
                    header += PARAM_TYPE_NUMBER+" ";
					strictNums.push(paramNum);
                    break;
                case 's':
                    header += PARAM_TYPE_STRING+" ";
                    break;
               case 'b':
                    header += PARAM_TYPE_BOOLEAN+" ";
                    break;
                default:
                    //header += "unknown type: "+type;
                    break;
            }
            header += "__param_"+paramNames[paramNum++];
            if(paramNum < paramNames.length){
                header += ",";
            }
        }
        ++i;
    }
    header += "){";
	i = 0;
	while(i < strictNums.length){
		header += "__param_"+paramNames[strictNums[i]]+"*=1;"; // this is actually a little known hack for integer coercion 
		++i;
	}
    return header;
        
}

function callProc(definition, tparamList){  // this is used for calling procedures, it's the "more blocks" category
	var i = 0;

	var paramList = tparamList;
	paramList.splice(0, 2);
		
	if(definition.substr(0, 17) == "ExternalInterface"){
		return paramList[0]+".apply(null,"+readList(paramList[1])+");";
	} else if(definition.substr(0, 6) == "return"){
		return "return "+GetValueOf(paramList[0]);
	} else {
		var procNum = procDefs.indexOf(definition);
   	 	var ret = "procedure"+procNum+"(";
	    while(i < paramList.length){
	        ret += GetValueOf(paramList[i]);
	        if(++i < paramList.length){
	            ret += ",";
	        }

	    }
    }
	
   

    return ret+")";
    
} 

function returnValue(val){
	return "return "+val+";";
}

function getParam(val){
    return "__param_"+val;
}

// lists
function lineOfList(line, list){
    return readList(GetValueOf(list))+"["+GetValueOf(line)+"-1]";
}

function deleteLine(item, list){
    if(item == "all"){
        return readList(GetValueOf(list))+"=[];";
    } else if(item == "last"){
        return readList(GetValueOf(list))+".splice("+readList(GetValueOf(list))+".length-1,1)";
    }
    return readList(GetValueOf(list))+".splice("+GetValueOf(item)+"-1,1)"; // we must subtract one because Scratch indexes at 1 and most languages index at 0
}

function appendList(content, list){
    return readList(GetValueOf(list))+".push("+GetValueOf(content)+");";
}

function insertAt(content, loc, list){
    if(loc == "last"){
        return appendList(content, list);
    } else if(loc == "random"){
        return readList(GetValueOf(list))+".splice("+RAND_FUNC+"(0,"+readList(GetValueOf(list))+".length),1-1,0,"+GetValueOf(content)+");";
    }
    return readList(GetValueOf(list))+".splice("+GetValueOf(loc)+"-1,0,"+GetValueOf(content)+");";
}

function replaceElement(line, list, content){
    if(line == "last"){
        return readList(GetValueOf(list))+"["+readList(GetValueOf(list))+".length-1]="+GetValueOf(content);  
    } else if(line == "random"){
        return readList(GetValueOf(list))+"["+RAND_FUNC+"(0,"+readList(GetValueOf(list))+".length-1)]="+GetValueOf(content);
    }
    return readList(GetValueOf(list))+"["+GetValueOf(line)+"-1]="+GetValueOf(content);
}

function lineCount(list){
    return readList(GetValueOf(list))+".length";
}

function listContains(list, content){
    return "("+readList(GetValueOf(list))+".indexOf("+GetValueOf(content)+") > -1)";
}

// broadcasts

function broadcast(bcast){
    var bcastPtr = "broadcastObj["+GetValueOf(bcast)+"]";
    return "if("+bcastPtr+"!==undefined){"+bcastPtr+".forEach(function(e){e()})}";
}

function broadcastDef(bcast){
    var bcastPtr = "broadcastObj["+GetValueOf(bcast)+"]";
    return "if("+bcastPtr+"===undefined){"+bcastPtr+"=[];}"+bcastPtr+".push(function(){"; // yes, this is an incomplete statement, but it's actually used as an annoynmous function, which is used to avoid some name-conflict issues
}

function GenScriptCode(scriptCodeObj){
    var currisHat = false;
    if(HATLIST.indexOf(scriptCodeObj[0][0]) > -1) currisHat = true;
	
	if(scriptCodeObj[0][0] == "procDef") // if the procedure definition is native code, we ignore it all together
		if(scriptCodeObj[0][1].substr(0, 17) == "ExternalInterface" ||
			scriptCodeObj[0][1].substr(0, 6) == "return") 
			 return "";

    var ret = "";
    var i = 0;
    while(i < scriptCodeObj.length){
        ret += GenBlockLine(scriptCodeObj[i])+";\n";
        ++i;
        
    }
    if(currisHat){
       
        isProcedure = false;
        ret += "}";
    }
	if(scriptCodeObj[0][0] == "procDef"){ // procedure definitions, when exported to a module, require the usage of exports to be called
		ret += "module.exports.procedure"+--procedureCount+" = procedure"+procedureCount+++";";
	}
	if(scriptCodeObj[0][0] == "whenIReceive"){ // technically speaking, this script was wrapper in an annoymous function, so we need to end it quickly 
		ret += ");";
	}
    return ret;
 }
 
function GenerateScriptsWithHat(scriptList, hats){
    if(!hats instanceof Array) hats = [hats];
    
    var ret = "";

    var i = 0;
    while(i < scriptList.length){
        if(hats.indexOf(scriptList[i][2][0][0]) > -1) // long way to check if it's in the list of hat blocks
            ret += GenScriptCode(scriptList[i][2]);
        ++i;
    }
    return ret;
}

function GenerateDataDeclarations(vars, lists){
    var i;
    var ret = "";
    if(vars != null){
        i = 0;
        while(i < vars.length){
			if(vars[i].isPersistent){
				++i;
			} else {
				ret += readVariable(vars[i].name)+"="+GetValueOf(vars[i++].value)+";";        	
			}
		}
    }
    
    if(lists != null){
        i = 0;
        while(i < lists.length){
            ret +=readList(lists[i].listName)+"="+JSON.stringify(lists[i++].contents)+";";
        }
    }
    
    return ret;
}

function JITScratch() {
    this.projectLoaded = false;
}

JITScratch.prototype.fetchScratchProject = function(id, callback) {
    var _this = this;
    
    require('http').request({host: 'projects.scratch.mit.edu', path:"/internalapi/project/"+id+"/get/"}, function(res){
    	var txt = "";
    	res.on('data', function(c){
    		txt += c.toString();
    	});
    	res.on('end', function(){
            _this.rawProject(JSON.parse(txt));
            callback();
    	});
    }).end();
}

JITScratch.prototype.rawProject = function(json) {
    projJSON = json;
    this.projectLoaded = true;
}

JITScratch.prototype.generateSourceCode = function() {
    var src = [  
                append_lib, 
                GenerateDataDeclarations(projJSON.variables, projJSON.lists)
				];
	
	if(projJSON.scripts) {
		src.push(GenerateScriptsWithHat(projJSON.scripts, ["whenIReceive", "procDef", "whenGreenFlag"]));
	}
	
	for(var i = 0; i < projJSON.children.length; ++i) {
		if(projJSON.children[i].scripts) {
			src.push(GenerateScriptsWithHat(projJSON.children[i].scripts, ["whenIReceive", "procDef", "whenGreenFlag"]));
		}
	}
        
    return src;
}

JITScratch.prototype.getProcDefs = function() {
    return procDefs;
}

module.exports = JITScratch;