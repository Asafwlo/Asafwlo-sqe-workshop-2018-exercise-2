import $ from 'jquery';
import {parseCode, objectTable} from './code-analyzer';
import {Parser} from 'expr-eval';

var data;
var parser = new Parser({operators:{'in':true, '<':true, '>': true, '==': true, '!=': true, '<=': true, '>=': true}});

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let inputFunc = document.getElementById('functionInput').value;
        codeToParse = replaceParams(inputFunc, codeToParse);
        let parsedCode = parseCode(codeToParse);
        $('#parsedCode').val(JSON.stringify(parsedCode, null, 2));
        try{
            data = parsedCode;
            var functionJsoned = objectTable(data);
            drawFunction(functionJsoned);
        } catch (error){
            throw new 'Invalid Input.';
        }
    });
});

function replaceInputParams(cparams, iparams, code)
{
    var indexV=0;
    var been = {};
    for (let index=0;index<iparams.length;index++)
    {
        let inputText = setInputParams(iparams, index);
        let vars = inputText.split(';')[0];
        var res = getVName(cparams[indexV], indexV);
        been[res.split(';')[0]] = true; 
        indexV = parseInt(res.split(';')[1]) + 1;
        code = 'let ' + res.split(';')[0] + '=' + vars + ';' + code;
        index = inputText.split(';')[1];
    }
    return {'code':code,'been': been};
}

function replaceCodeParams(cparams, been, code){
    var indexV = 0;
    for (let index=0;index<cparams.length;index++)
    {
        if (!cparams[index].includes('='))
            continue;
        let inputText = setInputParams(cparams, index);
        let vars = inputText.split(';')[0];
        var res = getVName(cparams[indexV], indexV);
        indexV = parseInt(res.split(';')[1]) + 1;
        index = inputText.split(';')[1];
        if (res.split(';')[0] in been)
            continue;
        code = 'let ' + res.split(';')[0] + '=' + vars + ';' + code;
    }
    return code;
}

function replaceParams(input, code){
    var ci = code.indexOf('('),co = code.indexOf(')'),ii = input.indexOf('('),io = input.indexOf(')');
    var cparams = code.substring(ci+1,co).split(','), iparams = input.substring(ii+1,io).split(',');
    var been = {};
    var iRes = replaceInputParams(cparams, iparams, code);
    code = iRes.code;
    been = iRes.been;
    code = replaceCodeParams(cparams, been, code);
    return code;
}

function getVName(v, index){
    var res = '';
    if (v[index].includes('[')){
        res = v[index].split('=')[0].trim();
        while (!v.includes(']'))
            index++;
    }
    else
        res = v[index].trim();
    res += ';' + index;
    return res;
}

function setInputParams(input, index){
    var text = '';
    if (input[index].includes('[') && !input[index].includes(']'))
    {
        do {
            text += input[index].trim() + ',';
            index++;
        }
        while (!input[index].includes(']'));
        text += input[index].trim() + ';' + index;
        return text;
    }
    else
        return input[index].trim() + ';' + index;
}

// function fixValues(v){
//     var parser = new Parser({operators:{'in':true, '<':true, '>': true, '==': true, '!=': true, '<=': true, '>=': true}});
//     for (let item in v)
//     {
//         var numbs = true;
//         var b = v[item].match(/(\w+)/g);
//         for (var i in b)
//             if (isNaN(b[i]))
//                 numbs = false;
//         if (!v[item].includes('\'') && numbs && !v[item].includes('['))
//             v[item] = parser.parse(v[item]).evaluate({});
//     }
//     return v;
// }

function drawElseIf(funcObject, toPrint, parser, ifVal, color, tab, row, level){
    var exp = funcObject.func[row].substring(9,funcObject.func[row].length-3);
    exp = exp.replace(/\[/g,'_').replace(/\]/g,'_').replace(/&&/g,' and ').replace(/\|\|/g,' or ');
    var sol = parser.evaluate(exp, funcObject.values);
    if (!ifVal && sol){
        color = 'green';
        ifVal = true;
    }
    else {
        color = 'red';
        ifVal = false;
    }
    toPrint += '<p class="'+color+'">'+tab.repeat(level)+funcObject.func[row].replace(/</g,' &lt; ').replace(/>/g,' &gt; ')+'</p>';
    while (funcObject.func[row+1] !== '}')
    {
        row++;
        toPrint += '<p>'+tab.repeat(level + 1)+funcObject.func[row]+'</p>';
    }
    return {'toPrint': toPrint, 'ifVal': ifVal, 'row': row};
}

function drawElse(toPrint, ifVal, color, tab, funcObject, row, level){
    if (ifVal)
        color = 'red';
    else
        color = 'green';
    toPrint += '<p class="'+color+'">'+tab.repeat(level)+funcObject.func[row]+'</p>';
    while (funcObject.func[row+1] !== '}')
    {
        row++;
        toPrint += '<p>'+tab.repeat(level+1)+funcObject.func[row]+'</p>';
    }
    return {'toPrint': toPrint, 'ifVal': ifVal, 'row': row};
}

function drawIf(sol, parser,color,ifVal, funcObject,toPrint, level, tab, row){
    var exp = funcObject.func[row].substring(4,funcObject.func[row].length-3);
    exp = exp.replace(/\[/g,'_').replace(/\]/g,'_').replace(/&&/g,' and ').replace(/\|\|/g,' or ');
    sol = parser.evaluate(exp, funcObject.values);
    if (sol){
        color = 'green';
        ifVal = true;
    }
    else{
        color = 'red';
        ifVal = false;
    }
    toPrint += '<p class="'+color+'">'+tab.repeat(level)+funcObject.func[row].replace(/</g,' &lt; ').replace(/>/g,' &gt; ')+'</p>';
    while (funcObject.func[row+1] !== '}')
    {
        row++;
        toPrint += '<p>'+tab.repeat(level + 1)+funcObject.func[row]+'</p>';
    }
    return {'toPrint': toPrint, 'ifVal': ifVal, 'row': row};
}

function drawFunction(funcObject){
    var toPrint = '', ifVal = false, exp, sol, color, level = 1, tab = '&nbsp;&nbsp;&nbsp;&nbsp;';
    for (var row=0; row < funcObject.func.length; row++)
        if (funcObject.func[row].includes('else if')){
            let res = drawElseIf(exp, funcObject, toPrint, parser, ifVal,color,tab, row, level);
            toPrint = res.toPrint; ifVal = res.ifVal; row = res.row;
        } else if (funcObject.func[row].includes('else')){
            let res = drawElse(toPrint, ifVal, color, tab, funcObject, row, level);
            toPrint = res.toPrint; ifVal = res.ifVal; row = res.row;
        } else if (funcObject.func[row].includes('if')){
            let res = drawIf(sol, parser,color, ifVal, funcObject, exp,toPrint, level, tab, row);
            toPrint = res.toPrint; ifVal = res.ifVal; row = res.row;
        }
        else
            toPrint += '<p>'+tab.repeat(level)+funcObject.func[row].replace(/</g,' &lt; ').replace(/>/g,' &gt; ')+'</p>';
    document.getElementById('outPutFunction').innerHTML = toPrint;
}