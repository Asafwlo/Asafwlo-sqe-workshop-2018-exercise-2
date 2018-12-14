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
    fixValues();
    return { 'func': func, 'values': values };
};

function fixValues(){
    for (var i in values)
        if(!isNumber(values[i]) && values[i].includes('['))
        {
            var index = 0;
            var vals = values[i].substring(1, values[i].length-1).split(',');
            for (var j = 0; j<vals.length;j++){
                values[i + '_'+index+'_'] = vals[j];
                index++;
            }
        }
}

function replaceValue(row, f) {
    var i, j, replace = '';
    i = row.indexOf(f) + f.length - 1;
    if (values[f] == 0) {
        j = row.indexOf(f) - 1;
        while (row[j] == ' ')
            j--;
    }
    else {
        j = row.indexOf(f);
        replace = values[f];
    }
    row = row.slice(0, j) + replace + row.slice(i + 1);
    return row;
}

function insertToFunc(row) {
    var features = row.match(/(\w+)/g);
    if (features != null)
        for (var f =0; f<features.length; f++) {
            if (values.hasOwnProperty(features[f]) && globals.indexOf(features[f]) < 0) {
                row = replaceValue(row, features[f]);
            }
        }
    func.push(row);
}

function handleFD(row, index) {
    isGlobals = false;
    var s = 'function ' + row.name + '(';
    for (var i = 0; i < row.params.length; i++) {
        globals.push(row.params[i].name);
        if (!row.params[i].hasOwnProperty('value'))
            s += row.params[i].name + ', ';
        else {
            s += row.params[i].name + ' = ' + row.params[i].value + ', ';
            values[row.params[i].name] = row.params[i].value;
        }
    }
    s = s.substring(0, s.length - 2) + ') {';
    insertToFunc(s);
    return index;
}

function handleAE(row, index) {
    if (!isNumber(row.value))
        replaceVariables(row);
    else
        values[row.name] = row.value;
    if (globals.indexOf(row.name) > -1)
        insertToFunc(row.name + ' = ' + row.value + ';');
    return index;
}

function replaceVars(a, b, text) {
    text = text.replaceAll(a, b);
    return text;
}

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function setRowValue(row, features, i) {
    if (row.value.indexOf(features[i]) < row.value.length - 1 && (row.value[row.value.indexOf(features[i]) + 1] == '*' || row.value[row.value.indexOf(features[i]) + 1] == '/'))
        row.value = replaceVars(features[i], '(' + variables[features[i]] + ')', row.value);
    else
        row.value = replaceVars(features[i], variables[features[i]], row.value);
    return row.value;
}

function replaceVariables(row) {
    var features = row.value.match(/(\w+)/g);
    for (var i in features)
        if (features[i] in variables) {
            row.value = setRowValue(row, features, i);
            variables[row.name] = row.value;
        }
        else
            variables[row.name] = row.value;
    return row.value;
}

function handleVD(row, index) {
    if (row.hasOwnProperty('value')) {
        if (!isNumber(row.value)) {
            row.value = replaceVariables(row);
        }
        else
            values[row.name] = row.value;
    }
    if (isGlobals)
        globals.push(row.name);
    return index;
}

function handleRS(row, index) {
    if (!isNumber(row.value) && globals.indexOf(row.value) < 0) {
        var features = row.value.match(/(\w+)/g);
        for (var i in features)
            if (features[i] in variables)
                row.value = replaceVars(features[i], variables[features[i]], row.value);
    }
    insertToFunc('return ' + row.value);
    return index;
}

function handleCases(type, obj, index) {
    switch (type) {
    case 'Function Declaration':
        return handleFD(obj, index);
    case 'Assignment Expression':
        return handleAE(obj, index);
    case 'Variable Declaration':
        return handleVD(obj, index);
    default:
        return handleStatements(type, obj, index);
    }
}

function handleStatements(type, obj, index) {
    switch (type) {
    case 'Return Statement':
        return handleRS(obj, index);
    case 'WhileStatement':
        return handleWS(obj, index);
    default:
        return handleIfCases(type, obj, index);
    }
}

function handleIfCases(type, obj, index) {
    switch (type) {
    case 'If Statement':
        return handleIS(obj, index);
    case 'else':
        return handleES(obj, index);
    case 'Else If Statement':
        return handleEIS(obj, index);
    }
}

function handleES(row, index) {
    var first = true;
    insertToFunc('else {');
    variables = tempVars;
    index = bodyIterator(index, first);
    insertToFunc('}');
    return index;
}

function bodyIterator(index, first) {
    while (index < table.Rows.length - 1 && (table.Rows[index + 1].hasOwnProperty('belong') || first)) {
        index++;
        first = false;
        index = handleCases(table.Rows[index].obj.type, table.Rows[index].obj, index);
    }
    return index;
}

function handleEIS(row, index) {
    variables = tempVars;
    var first = true;
    var features = row.condition.match(/(\w+)/g);
    for (var i in features)
        if (features[i] in variables)
            row.condition = replaceVars(features[i], variables[features[i]], row.condition);
    insertToFunc('}');
    insertToFunc('else if (' + row.condition + ') {');
    tempVars = JSON.parse(JSON.stringify(variables));
    return bodyIterator(index, first);
}

function handleWS(row, index) {
    var first = true;
    var features = row.condition.match(/(\w+)/g);
    for (var i in features)
        if (features[i] in variables)
            row.condition = replaceVars(features[i], variables[features[i]], row.condition);
    func.push('while (' + row.condition + ') {');
    while (table.Rows[index + 1].hasOwnProperty('belong') || first) {
        index++;
        first = false;
        index = handleCases(table.Rows[index].obj.type, table.Rows[index].obj, index);
    }
    func.push('}');
    return index;
}

function handleIS(row, index) {
    var first = true;
    var features = row.condition.match(/(\w+)/g);
    for (var i in features)
        if (features[i] in variables)
            row.condition = replaceVars(features[i], variables[features[i]], row.condition);
    insertToFunc('if (' + row.condition + ') {');
    tempVars = JSON.parse(JSON.stringify(variables));
    index = bodyIterator(index, first);
    insertToFunc('}');
    return index;
}

function createFunction() {
    for (let index = 0; index < table.Rows.length; index++) {
        index = handleCases(table.Rows[index].obj.type, table.Rows[index].obj, index);
    }
    insertToFunc('}');
}

function isElseIf(obj) {
    if (obj !== null && obj.type === 'IfStatement') {
        obj.type = 'Else If Statement';
        return 'ifElse';
    }
    else if (obj !== null) {
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

function IfBody(obj) {
    if (obj.type === 'BlockStatement')
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
        createElseObjectTable(obj);
        break;
    case 'if':
        createObjectTable(IfBody(obj.consequent));
        break;
    default:
        break;
    }
}

function createElseObjectTable(obj) {
    createObjectTable(IfBody(obj.consequent));
    alternate = true;
    table.Rows.push({ 'obj': { 'type': 'else' } });
    createObjectTable(IfBody(obj.alternate));
}

function Contains(obj) {
    var list = ['WhileStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'If Statement', 'Else If Statement', 'IfStatement', 'else'];
    if (list.indexOf(obj.type) >= 0 || alternate) {
        alternate = false;
        return true;
    }
    return false;
}

function isBelong(index) {
    if (table.Rows.length > 0 && table.Rows[table.Rows.length - 1].hasOwnProperty('belong') && index == 0)
        stopLine = true;
}

function addToTable(newObj, obj) {
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

function isLoop(obj) {
    var loopDic = ['WhileStatement', 'DoWhileStatement', 'ForStatement', 'ForOfStatement', 'ForInStatement'];
    if (loopDic.indexOf(obj.type) >= 0)
        return true;
}

function isIf(obj) {
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

function ExtractSpecial(obj) {
    if (isIf(obj))
        return new If(obj);
    if (isLoop(obj))
        return new Loop(obj);
    return 0;
}

export { parseCode, objectTable };
