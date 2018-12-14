import assert from 'assert';
import {parseCode, objectTable} from '../src/js/code-analyzer';

describe('The javascript parser', () => {
    it('is parsing an empty function correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('')),
            '{"type":"Program","body":[],"sourceType":"script"}'
        );
    });

    it('is parsing a simple variable declaration correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('let a = 1;')),
            '{"type":"Program","body":[{"type":"VariableDeclaration","declarations":[{"type":"VariableDeclarator","id":{"type":"Identifier","name":"a"},"init":{"type":"Literal","value":1,"raw":"1"}}],"kind":"let"}],"sourceType":"script"}'
        );
    });
});

describe('The convertion from parsed data to models object',()=>{
    it('is converting simple variable declaration correctly', ()=>{
        var parsed = parseCode('function foo(x) {let a = x; return a;}');
        var data = objectTable(parsed);
        assert.equal(JSON.stringify(data),'{"func":["function foo(x) {","return x","}"],"values":{}}');
    });
    it('is converting simple if correctly', ()=>{
        var parsed = parseCode('function foo(x = 2){let a = x;if (a<3){return a+1;}return a;}');
        var data = objectTable(parsed);
        assert.equal(JSON.stringify(data),'{"func":["function foo(x = 2) {","if (x<3) {","return x+1","}","return x","}"],"values":{"x":2}}');
    });
    it('is converting simple if else correctly', ()=>{
        var parsed = parseCode('function foo(x=2){let a = x + 1;if (a < 3) {return a;} else {return a+2;}}');
        var data = objectTable(parsed);
        assert.equal(JSON.stringify(data),'{"func":["function foo(x = 2) {","if (x+1<3) {","return x+1","}","else {","return x+1+2","}","}"],"values":{"x":2}}');
    });
    it('is converting simple if else if correctly', ()=>{
        var parsed = parseCode('function foo(x=2){let a = x + 1;if (a < 3) {return a;} else if (a >= 3) {return a+2;}}');
        var data = objectTable(parsed);
        assert.equal(JSON.stringify(data),'{"func":["function foo(x = 2) {","if (x+1<3) {","return x+1","}","else if (x+1>=3) {","return x+1+2","}","}"],"values":{"x":2}}');
    });
    it('is converting complex if function correctly', ()=>{
        var parsed = parseCode('function foo(x=1, y=2, z=3){let a = x + 1;let b = a + y;let c = 0;if (b < z) {c = c + 5;return x + y + z + c;} else if (b < z * 2) {c = c + x + 5;return x + y + z + c;} else {c = c + z + 5;return x + y + z + c;}}');
        var data = objectTable(parsed);
        assert.equal(JSON.stringify(data),'{"func":["function foo(x = 1, y = 2, z = 3) {","if (x+1+y<z) {","return x+y+z+5","}","else if (x+1+y<z*2) {","return x+y+z+x+5","}","else {","return x+y+z+z+5","}","}"],"values":{"x":1,"y":2,"z":3,"c":0}}');
    });
    it('is converting simple while function correctly', ()=>{
        var parsed = parseCode('function foo(x=1, y=2, z=3){let a = x + 1;let b = a + y;let c = 0;while (a < z) {c = a + b;z = c * 2;}        return z;}');
        var data = objectTable(parsed);
        assert.equal(JSON.stringify(data),'{"func":["function foo(x = 1, y = 2, z = 3) {","while (x+1<z) {","z = (x+1+x+1+y)*2;","}","return z","}"],"values":{"x":1,"y":2,"z":3,"c":0}}');
    });

    it('is converting simple array correctly', ()=>{
        var parsed = parseCode('function foo(x=[1,2,3]){a = x[2] + 1;if (a < 5){return x[1];}}');
        var data = objectTable(parsed);
        assert.equal(JSON.stringify(data),'{"func":["function foo(x = [1,2,3]) {","if (x[2]+1<5) {","return x[1]","}","}"],"values":{"x":"[1,2,3]","x_0_":"1","x_1_":"2","x_2_":"3"}}');
    });
    
});
