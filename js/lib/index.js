/*
 * Copyright 2017 WebAssembly Community Group participants
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

function assert(x, msg) {
    if (!x) {
        let description = `Assertion failure: ${msg}`;
        try {
            throw new Error();
        } catch(e) {
            description += `\n${e.stack}`;
            addFailure(description);
        }
    } else {
        addSuccess(msg);
    }
}

function assertEq(observed, expected) {
    if (Number.isNaN(expected)) {
        assert(Number.isNaN(observed), `Expected NaN, observed ${observed}`);
    } else if (expected === 0) {
        assert(1/expected === 1/observed, `Expected ${expected}, observed ${observed}`);
    } else {
        assert(observed === expected, `Expected ${expected}, observed ${observed}`);
    }
}

function assertErrorMessage(f, ctor, test) {
    try {
        f();
    } catch (e) {
        assert(e instanceof ctor, "expected exception " + ctor.name + ", got " + e);
        if (typeof test == "string") {
            assert(test === e.message, "expected " + test + ", got " + e.message);
        } else {
            assert(test.test(e.message), "expected " + test.toString() + ", got " + e.message);
        }
        return;
    }
    assert(false, "expected exception " + ctor.name + ", no exception thrown");
};

function ToBuffer(builder) {
    return new Uint8Array(builder.toBuffer());
}
