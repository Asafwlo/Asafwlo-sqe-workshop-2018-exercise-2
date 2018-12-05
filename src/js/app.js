import $ from 'jquery';
import {parseCode, objectTable} from './code-analyzer';

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

function drawFunction(func){
    var toPrint = document.getElementById('codePlaceholder').value;
    for (var letter=0;letter < toPrint.length;letter++)
    {
        if (letter > 0 && letter < toPrint.length-1)
        {
            if (toPrint[letter] in func && toPrint[letter-1] == " " && toPrint[letter+1] == " ")
                toPrint[letter].style.color = "green";
        }
    }
    document.getElementById('outPutFunction').value = toPrint;
}