import * as esprima from 'esprima';
import { FunctionDeclaration, Loop, If, AssignmentExpression, VariableDeclarator, ReturnStatement } from './model';
import { isNumber } from 'util';

var table;
var stopLine = false;
var func = [];
var variables = {};
var values = {};
var alternate = false;
var tempVars = {};
var globals = [];
var isGlobals = true;
const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse);    
};

const objectTable = (parsedCode) => {
    table = { 'Rows': [] };
    createObjectTable(parsedCode);
    func = [];
    globals = [];
    isGlobals = true;
    variables = {};
    values = {};
    createFunction();
    return {'func':func, 'values': values};
};

function handleFD(row, index){
    isGlobals = false;
    var s = 'function ' + row.name + '(';
    for (var i = 0; i < row.params.length;i++)
    {
        globals.push(row.params[i].name);
        if (!row.params[i].hasOwnProperty('value'))
            s += row.params[i].name + ', ';
        else {
            s += row.params[i].name + ' = ' + row.params[i].value + ', ';
            values[row.params[i].name] = row.params[i].value;
        }
    }
    s = s.substring(0,s.length-2) + ') {';
    func.push(s);
    return index;
}

function handleAE(row, index){
    if (!isNumber(row.value)){
        var features = row.value.match(/(\w+)/g);
        for (var i in features)
            if (features[i] in variables)  { 
                if (row.value.indexOf(features[i]) < row.value.length-1 && (row.value[row.value.indexOf(features[i])+1] == '*'||row.value[row.value.indexOf(features[i])+1] == '/'))
                    row.value = replaceVars(features[i], '('+ variables[features[i]]+')', row.value);
                else
                    row.value = replaceVars(features[i], variables[features[i]], row.value);
                variables[row.name] = row.value;
            }
            else
                variables[row.name] = row.value;
    }
    else
        values[row.name] = row.value;
    if (globals.indexOf(row.name) > -1)
        func.push(row.name + ' = ' + row.value + ';');
    return index;
}

function replaceVars(a, b, text)
{
    text = text.replaceAll(a, b);
    return text;
}

String.prototype.replaceAll = function(search, replacement){
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function handleVD(row, index){
    if (row.hasOwnProperty('value')){
        if (!isNumber(row.value)){
            var features = row.value.match(/(\w+)/g);
            for (var i in features)
                if (features[i] in variables)   {
                    row.value = replaceVars(features[i], variables[features[i]], row.value);
                    variables[row.name] = row.value;
                }
                else
                    variables[row.name] = row.value;
        }
        else
            values[row.name] = row.value;
        //func.push('let ' + row.name + ' = ' + row.value + ';');
    }
    if (isGlobals)
        globals.push(row.name);
    // else
    //     func.push('let ' + row.name);
    return index;
}

function handleRS(row, index){
    if (!isNumber(row.value) && globals.indexOf(row.value) < 0){
        var features = row.value.match(/(\w+)/g);
        for (var i in features)
            if (features[i] in variables)   
                row.value = replaceVars(features[i], variables[features[i]], row.value);
    }
    func.push('return ' + row.value);
    return index;
}

function handleES(row, index){
    var first = true;
    func.push('else {');
    variables = tempVars;
    while (index+1<table.Rows.length && (table.Rows[index + 1].hasOwnProperty('belong') || first))
    {
        first = false;
        index++;
        switch (table.Rows[index].obj.type){
        case 'Function Declaration':
            index = handleFD(table.Rows[index].obj, index);
            break;
        case 'Assignment Expression':
            index = handleAE(table.Rows[index].obj, index);
            break;
        case 'If Statement':
            index = handleIS(table.Rows[index].obj, index);
            break;
        case 'Variable Declaration':
            index = handleVD(table.Rows[index].obj, index);
            break;
        case 'Return Statement':
            index = handleRS(table.Rows[index].obj, index);
            break;
        case 'else':
            index = handleES(table.Rows[index].obj, index);
            break;
        case 'Else If Statement':
            index = handleEIS(table.Rows[index].obj, index);
            break;
        case 'While Statement':
            index = handleWS(table.Rows[index].obj, index);
            break;
        }
    }
    func.push('}');
    return index;
}

function handleEIS(row, index){
    variables = tempVars;
    var first = true;
    var features = row.condition.match(/(\w+)/g);
        for (var i in features)
            if (features[i] in variables)   
                row.condition = replaceVars(features[i], variables[features[i]], row.condition);
    func.push('}');
    func.push('else if (' + row.condition + ') {');
    tempVars = JSON.parse(JSON.stringify(variables));;
    while (table.Rows[index + 1].hasOwnProperty('belong') || first)
    {
        index++;
        first = false;
        switch (table.Rows[index].obj.type){
        case 'Function Declaration':
            index = handleFD(table.Rows[index].obj, index);
            break;
        case 'Assignment Expression':
            index = handleAE(table.Rows[index].obj, index);
            break;
        case 'If Statement':
            index = handleIS(table.Rows[index].obj, index);
            break;
        case 'Variable Declaration':
            index = handleVD(table.Rows[index].obj, index);
            break;
        case 'Return Statement':
            index = handleRS(table.Rows[index].obj, index);
        break;
        case 'else':
            index = handleES(table.Rows[index].obj, index);
        break;
        case 'Else If Statement':
            index = handleEIS(table.Rows[index].obj, index);
            break;
        case 'WhileStatement':
            index = handleWS(table.Rows[index].obj, index);
            break;
        }
    }
    return index;
}

function handleWS(row, index){
    var first = true;
    var features = row.condition.match(/(\w+)/g);
        for (var i in features)
            if (features[i] in variables)   
                row.condition = replaceVars(features[i], variables[features[i]], row.condition);
    func.push('while (' + row.condition + ') {');
    while (table.Rows[index + 1].hasOwnProperty('belong') || first)
    {
        index++;
        first = false;
        switch (table.Rows[index].obj.type){
        case 'Function Declaration':
            index = handleFD(table.Rows[index].obj, index);
            break;
        case 'Assignment Expression':
            index = handleAE(table.Rows[index].obj, index);
            break;
        case 'If Statement':
            index = handleIS(table.Rows[index].obj, index);
            break;
        case 'Variable Declaration':
            index = handleVD(table.Rows[index].obj, index);
            break;
        case 'Return Statement':
            index = handleRS(table.Rows[index].obj, index);
        break;
        case 'else':
            index = handleES(table.Rows[index].obj, index);
        break;
        case 'Else If Statement':
            index = handleEIS(table.Rows[index].obj, index);
            break;
        case 'WhileStatement':
            index = handleWS(table.Rows[index].obj, index);
            break;
        }
    }
    func.push('}');
    return index;
}

function handleIS(row, index){
    var first = true;
    var features = row.condition.match(/(\w+)/g);
        for (var i in features)
            if (features[i] in variables)   
                row.condition = replaceVars(features[i], variables[features[i]], row.condition);
    func.push('if (' + row.condition + ') {');
    tempVars = JSON.parse(JSON.stringify(variables));;
    while (table.Rows[index + 1].hasOwnProperty('belong') || first)
    {
        index++;
        first = false;
        switch (table.Rows[index].obj.type){
        case 'Function Declaration':
            index = handleFD(table.Rows[index].obj, index);
            break;
        case 'Assignment Expression':
            index = handleAE(table.Rows[index].obj, index);
            break;
        case 'If Statement':
            index = handleIS(table.Rows[index].obj, index);
            break;
        case 'Variable Declaration':
            index = handleVD(table.Rows[index].obj, index);
            break;
        case 'Return Statement':
            index = handleRS(table.Rows[index].obj, index);
        break;
        case 'else':
            index = handleES(table.Rows[index].obj, index);
        break;
        case 'Else If Statement':
            index = handleEIS(table.Rows[index].obj, index);
            break;
        case 'WhileStatement':
            index = handleWS(table.Rows[index].obj, index);
            break;
        }
    }
    func.push('}');
    return index;
}

function createFunction(){
    for (let index = 0; index<table.Rows.length; index++)
    {
        switch (table.Rows[index].obj.type){
        case 'Function Declaration':
            index = handleFD(table.Rows[index].obj, index);
            break;
        case 'Assignment Expression':
            index = handleAE(table.Rows[index].obj, index);
            break;
        case 'If Statement':
            index = handleIS(table.Rows[index].obj, index);
            break;
        case 'Variable Declaration':
            index = handleVD(table.Rows[index].obj, index);
            break;
        case 'Return Statement':
            index = handleRS(table.Rows[index].obj, index);
            break;
        case 'else':
            index = handleES(table.Rows[index].obj, index);
            break;
        case 'Else If Statement':
            index = handleEIS(table.Rows[index].obj, index);
            break;
        case 'WhileStatement':
            index = handleWS(table.Rows[index].obj, index);
            break;
        }
    }
    func.push('}');
}

function isElseIf(obj) {
    if (obj !== null && obj.type === 'IfStatement'){
        obj.type = 'Else If Statement';
        return 'ifElse';
    }
    else if (obj!==null){
        return 'else';
    }
    else
        return 'if';

}
function bodyType(obj) {
    if (obj.hasOwnProperty('body'))
        return 'body';
    else if (obj.hasOwnProperty('alternate')) {
        return isElseIf(obj.alternate); 
    }
    return '';
}

function IfBody(obj)
{
    if (obj.type ==='BlockStatement')
        return obj;
    else
        return [obj];
}

function handleBody(obj) {
    switch (bodyType(obj)) {
    case 'body':
        createObjectTable(obj.body);
        break;
    case 'ifElse':
        createObjectTable(IfBody(obj.consequent));
        stopLine = false;
        createObjectTable(IfBody(obj.alternate));
        break;
    case 'else':
        createObjectTable(IfBody(obj.consequent));
        //stopLine = false;
        alternate = true;
        table.Rows.push({ 'obj' : {'type':'else'}});
        createObjectTable(IfBody(obj.alternate));
        break;
    case 'if':
        createObjectTable(IfBody(obj.consequent));
        break;
    default:
        break;
    }
}

function Contains(obj){
    var list = ['WhileStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'If Statement', 'Else If Statement', 'IfStatement', 'else'];
    if (list.indexOf(obj.type)>=0 || alternate){
        alternate = false;
        return true;
    }
    return false;
}

function isBelong(index)
{
    if (table.Rows.length > 0 && table.Rows[table.Rows.length-1].hasOwnProperty('belong') && index == 0)
        stopLine = true;
}

function addToTable(newObj, obj){
    if (stopLine)
        table.Rows.push({ 'obj': newObj, 'belong': true });
    else
        table.Rows.push({ 'obj': newObj });
    if (Contains(obj))
        stopLine = true;
}

export function createObjectTable(obj) {
    if (obj.hasOwnProperty('length')) {
        for (var index = 0; index < obj.length; index++) {
            isBelong(index);
            var newObj = ExtractElements(obj[index]);
            if (!isNumber(newObj)) {
                addToTable(newObj, obj[index]);
                handleBody(obj[index]);
            }
        }
        stopLine = false;
    }
    else {
        createObjectTable(obj.body);
    }
}

function ExtractElements(obj) {
    switch (obj.type) {
    case 'VariableDeclaration':
        for (var index = 0; index < obj.declarations.length; index++)
            table.Rows.push({ 'obj': new VariableDeclarator(obj.declarations[index]) });
        break;
    case 'ExpressionStatement':
        return ExtractElement(obj.expression);
    case 'ReturnStatement':
        return new ReturnStatement(obj);
    default:
        return ExtractElement(obj);
    }
    return 0;
}

function isLoop(obj)
{
    var loopDic = ['WhileStatement', 'DoWhileStatement', 'ForStatement', 'ForOfStatement', 'ForInStatement'];
    if (loopDic.indexOf(obj.type) >= 0)
        return true;     
}

function isIf(obj)
{
    var ifDic = ['IfStatement', 'Else If Statement'];
    if (ifDic.indexOf(obj.type) >= 0)
        return true;
}

function ExtractElement(obj) {
    if (obj.type === 'FunctionDeclaration')
        return new FunctionDeclaration(obj);
    if (obj.type === 'AssignmentExpression')
        return new AssignmentExpression(obj);
    else 
        return ExtractSpecial(obj);
}

function ExtractSpecial(obj){
    if (isIf(obj))
        return new If(obj);
    if (isLoop(obj))
        return new Loop(obj);
    return 0;
}

export {parseCode, objectTable};
