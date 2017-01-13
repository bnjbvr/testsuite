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

function assertErrorMessage(f, ctor, test) {
    try {
        f();
    } catch (e) {
        assert_true(e instanceof ctor, "expected exception " + ctor.name + ", got " + e);
        if (typeof test == "string") {
            assert_true(test === e.message, "expected " + test + ", got " + e.message);
        } else {
            assert_true(test.test(e.message), "expected " + test.toString() + ", got " + e.message);
        }
        return;
    }
    assert_true(false, "expected exception " + ctor.name + ", no exception thrown");
};
