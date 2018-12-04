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

}