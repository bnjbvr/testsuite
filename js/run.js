if (typeof scriptArgs === null) {
    console.log('Expected to run in Spidermonkey, aborting.');
    quit();
}

load('./lib/index.js');
load('./lib/wasm-constants.js');
load('./lib/wasm-module-builder.js');

let successes = 0;
let failures = 0;

function addSuccess() {
    successes++;
    console.log('SUCCESS!');
}

function addFailure(msg) {
    failures++;
    console.log(`FAIL: ${msg}`);
}

let postRun = function() {
    drainJobQueue();
    console.log(`DONE.\nSuccesses: ${successes}\nFailures: ${failures}`);
}

if (scriptArgs.length < 1) {
    console.log('Expected at least one argument: file to run.');
    quit();
}

var fileName = scriptArgs.shift();
if (!fileName.endsWith('.js')) {
    fileName += '.js';
}

console.log(`Running ${fileName}`);
load(fileName);

postRun();
