if (typeof scriptArgs === null) {
    console.log('Expected to run in Spidermonkey, aborting.');
    quit();
}

load('./lib/index.js');
load('./lib/wasm-constants.js');
load('./lib/wasm-module-builder.js');

let print_success = _ => {};

let successes = 0;
let failures = 0;

function test(func, description) {
    let maybeErr;
    try {
        func();
    } catch(e) {
        maybeErr = e;
    }

    if (typeof maybeErr !== 'undefined') {
        print(`${description}: FAIL.
${maybeErr}`);
        failures++;
    } else {
        print_success(`${description}: PASS.`);
        successes++;
    }
}

function promise_test(func, description) {
    func()
    .then(_ => {
        print_success(`${description}: PASS.`);
        successes++;
    })
    .catch(err => {
        print(`${description}: FAIL.
${err}`);
        failures++;
    });
    drainJobQueue();
}

let assert_equals = assertEq;
let assert_true = assertEq.bind(null, true);
let assert_false = assertEq.bind(null, false);

let postRun = function() {
    console.log(`DONE.
Successes: ${successes}
Failures: ${failures}`);
}

if (scriptArgs.length < 1) {
    console.log('Expected at least one argument: file to run.');
    quit();
}

let fileName = null;
while (scriptArgs.length) {
    let lastArg = scriptArgs.shift();
    switch (lastArg) {
      case '-s': print_success = print; break;
      default: fileName = lastArg;
    }
}

if (!fileName) {
    console.log('Expected at least filename argument.');
    quit();
}

if (!fileName.endsWith('.js')) {
    fileName += '.js';
}

console.log(`Running ${fileName}`);

load(fileName);

// XXX needs to find a way to know what's the name of the function. Maybe we
// could make it a convention that the file contains a function named run(), or
// launch_test().
testJSAPI();

postRun();
