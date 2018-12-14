import $ from 'jquery';
import {parseCode, objectTable} from './code-analyzer';
import {Parser} from 'expr-eval';

var data;

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
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

function drawFunction(funcObject){
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
            exp = exp.replace('[','_');
            exp = exp.replace(']','_');
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
            exp = exp.replace('[','_');
            exp = exp.replace(']','_');
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