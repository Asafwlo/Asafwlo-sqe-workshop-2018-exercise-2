import $ from 'jquery';
import {parseCode, objectTable} from './code-analyzer';
import {Parser} from 'expr-eval';

var data;

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

function replaceParams(input, code){
    var ci = code.indexOf('('),co = code.indexOf(')'),ii = input.indexOf('('),io = input.indexOf(')');
    var cparams = code.substring(ci+1,co).split(','), iparams = input.substring(ii+1,io).split(',');
    var indexV=0, indexC=0, len = Math.max([cparams.length, iparams.length]);
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
    indexV=0;
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


function drawFunction(funcObject){
//    funcObject.values = fixValues(funcObject.values);
    var toPrint = '';
    var ifVal = false;
    var exp;
    var sol;
    var color;
    var level = 1;
    var tab = '&nbsp;&nbsp;&nbsp;&nbsp;';
    var parser = new Parser({operators:{'in':true, '<':true, '>': true, '==': true, '!=': true, '<=': true, '>=': true}});
    for (var row=0; row< funcObject.func.length; row++)
    {
        if (funcObject.func[row].includes('else if'))
        {
            exp = funcObject.func[row].substring(9,funcObject.func[row].length-3);
            exp = exp.replace(/\[/g,'_');
            exp = exp.replace(/\]/g,'_');
            exp = exp.replace(/\&\&/g,' and ');
            exp = exp.replace(/\|\|/g,' or ');
            sol = parser.evaluate(exp, funcObject.values);
            if (!ifVal && sol){
                color = 'green';
                ifVal = true;
            }
            else {
                color = 'red';
                ifVal = false;
            }
            toPrint += '<p class="'+color+'">'+tab.repeat(level)+funcObject.func[row].replace(/</g," &lt; ").replace(/>/g," &gt; ")+'</p>';
            level++;
            while (funcObject.func[row+1] !== '}')
            {
                row++;
                toPrint += '<p>'+tab.repeat(level)+funcObject.func[row]+'</p>';
            }
            level--;
            continue;
        } else if (funcObject.func[row].includes('else'))
        {
            if (ifVal)
                color = 'red';
            else
                color = 'green';
            toPrint += '<p class="'+color+'">'+tab.repeat(level)+funcObject.func[row]+'</p>';
            level++;
            while (funcObject.func[row+1] !== '}')
            {
                row++;
                toPrint += '<p>'+tab.repeat(level)+funcObject.func[row]+'</p>';
            }
            level--;
            continue;
        }
        else if (funcObject.func[row].includes('if'))
        {
            exp = funcObject.func[row].substring(4,funcObject.func[row].length-3);
            exp = exp.replace(/\[/g,'_');
            exp = exp.replace(/\]/g,'_');
            exp = exp.replace(/\&\&/g,' and ');
            exp = exp.replace(/\|\|/g,' or ');
            sol = parser.evaluate(exp, funcObject.values);
            if (sol){
                color = 'green';
                ifVal = true;
            }
            else{
                color = 'red';
                ifVal = false;
            }
            toPrint += '<p class="'+color+'">'+tab.repeat(level)+funcObject.func[row].replace(/</g," &lt; ").replace(/>/g," &gt; ")+'</p>';
            level++;
            while (funcObject.func[row+1] !== '}')
            {
                row++;
                toPrint += '<p>'+tab.repeat(level)+funcObject.func[row]+'</p>';
            }
            level--;
            continue;
        }
        else
            toPrint += '<p>'+tab.repeat(level)+funcObject.func[row].replace(/</g," &lt; ").replace(/>/g," &gt; ")+'</p>';
    }
    document.getElementById('outPutFunction').innerHTML = toPrint;
}