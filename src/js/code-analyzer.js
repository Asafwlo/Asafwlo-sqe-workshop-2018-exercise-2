import * as esprima from 'esprima';
import { isNumber } from 'util';

const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse);
};

var jsoned;
var variables = {};

const objectTable = (parsedCode) => {
    functionJson(parsedCode);
    return jsoned;
};

function handleUnaryExpression(obj){
    var ans = '';
    ans = ans + obj.operator;
    ans = ans + getDeclaration(obj.argument);
    return ans;
}

function handleBinaryExpression(obj){
    var left = '', right = '';
    left = getDeclaration(obj.left);
    right = getDeclaration(obj.right);
    return left + obj.operator + right;
}

function handleUpdateExpression(obj){
    var ans = '';
    ans = ans + getDeclaration(obj.argument);
    if (obj.prefix === true)
        ans = obj.operator + ans;
    else
        ans = ans + obj.operator;
    return ans;
}

function ExtractArgument(obj){
    switch(obj.type){
    case 'UnaryExpression':
        return handleUnaryExpression(obj);
    case 'BinaryExpression':
        return handleBinaryExpression(obj);
    case 'LogicalExpression':
        return handleBinaryExpression(obj);
    case 'UpdateExpression':
        return handleUpdateExpression(obj);
    }
}

function getDeclaration(obj){
    if (obj.type === 'Literal')
        return obj.value;
    if (obj.type === 'Identifier')
        return obj.name;
    if (obj.type === 'VariableDeclaration'){
        return handleDeclare(obj.declarations[0]); 
    }
    return ExtractArgument(obj);
}

function handleDeclare(obj){
    if (obj.hasOwnProperty('init') && obj.init != null)
        variables[obj.id.name] = getDeclaration(obj.init);
    else
        variables[obj.id.name] = '';
}

function handlefunctionDeclaration(obj){
    for (var index = 0; index < obj.params.length;index++){
        switch (obj.params[index].type){
        case 'AssignmentPattern':
            variables[getDeclaration(obj.params[index].left)] = getDeclaration(obj.right);
            break;
        case 'Identifier':
            variables[obj.params[index].name] = '';
            break;
        }
    }
}

function handleAssignmentExpression(obj){
    if (obj.right.type === 'Literal')
        variables[obj.left.name] = obj.right.value;
    else if (obj.right.type === 'Identifier')
        variables[obj.left.name] = obj.right.name;
    else
        variables[obj.left.name] = ExtractArgument(obj.right);
}

function ExtractElement(obj) {
    if (obj.type === 'FunctionDeclaration')
        handlefunctionDeclaration(obj);
    if (obj.type === 'AssignmentExpression')
        handleAssignmentExpression(obj);
    // else 
    //     return ExtractSpecial(obj);
}

function ExtractElements(obj) {
    switch (obj.type) {
    case 'VariableDeclaration':
        for (var index = 0; index < obj.declarations.length; index++)
            handleDeclare(obj.declarations[index]);
        break;
    case 'ExpressionStatement':
        return ExtractElement(obj.expression);
    // case 'ReturnStatement':
    //     return new ReturnStatement(obj);
    default:
        return ExtractElement(obj);
    }
    return 0;
}

function isElseIf(obj) {
    if (obj !== null && obj.type === 'IfStatement'){
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
        functionJson(obj.body);
        break;
    case 'ifElse':
        functionJson(IfBody(obj.consequent));
        functionJson(IfBody(obj.alternate));
        break;
    case 'else':
        functionJson(IfBody(obj.alternate));
        break;
    case 'if':
        functionJson(IfBody(obj.consequent));
        break;
    default:
        break;
    }
}

function functionJson(obj){
    if (obj.hasOwnProperty('length')) {
        for (var index = 0; index < obj.length; index++) {
            //isBelong(index);
            var newObj = ExtractElements(obj[index]);
            if (!isNumber(newObj)) {
                handleBody(obj[index]);
            }
        }
    }
    else {
        functionJson(obj.body);
    }
}

export {parseCode, objectTable};
