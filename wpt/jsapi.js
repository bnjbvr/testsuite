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
function testJSAPI() {

const WasmPage = 64 * 1024;

const emptyModuleBinary = new WasmModuleBuilder().toBuffer();

const importingModuleBinary = (() => {
    let builder = new WasmModuleBuilder();

    builder.addImport('', 'f', kSig_v_v);

    return builder.toBuffer();
})();

const complexImportingModuleBinary = (() => {
    let builder = new WasmModuleBuilder();

    builder.addImport('a', 'b', kSig_v_v);
    builder.addImportedMemory('c', 'd', 1);
    builder.addImportedTable('e', 'f', 1);
    builder.addImportedGlobal('g', '⚡', kWasmI32);

    return builder.toBuffer();
})();

const exportingModuleBinary = (() => {
    let builder = new WasmModuleBuilder();

    builder
        .addFunction('f', kSig_i_v)
        .addBody([
            kExprI32Const,
            42,
            kExprEnd
        ])
        .exportFunc();

    return builder.toBuffer();
})();

const complexExportingModuleBinary = (() => {
    let builder = new WasmModuleBuilder();

    builder
        .addFunction('a', kSig_v_v)
        .addBody([
            kExprEnd
        ])
        .exportFunc();

    builder.addMemory(1, 1, /* exported */ false);
    builder.exportMemoryAs('b');

    builder.setFunctionTableLength(1);
    builder.addExportOfKind('c', kExternalTable, 0);

    // Default init for global values is 0. Keep that.
    builder.addGlobal(kWasmI32, /* mutable */ false)
        .exportAs("⚡");

    return builder.toBuffer();
})();

let Module;
let Instance;
let CompileError;
let LinkError;
let RuntimeError;
let Memory;
let memoryProto;
let mem1;
let Table;
let tbl1;
let tableProto;

let emptyModule;
let exportingModule;
let exportingInstance;
let exportsObj;
let importingModule;

// Start of tests.

test(() => {
    const wasmDesc = Object.getOwnPropertyDescriptor(this, 'WebAssembly');
    assert_equals(typeof wasmDesc.value, "object");
    assert_true(wasmDesc.writable);
    assert_false(wasmDesc.enumerable);
    assert_true(wasmDesc.configurable);
}, "'WebAssembly' data property on global object");

test(() => {
    const wasmDesc = Object.getOwnPropertyDescriptor(this, 'WebAssembly');
    assert_equals(WebAssembly, wasmDesc.value);
    assert_equals(String(WebAssembly), "[object WebAssembly]");
}, "'WebAssembly' object");

test(() => {
    const compileErrorDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'CompileError');
    const linkErrorDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'LinkError');
    const runtimeErrorDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'RuntimeError');
    assert_equals(typeof compileErrorDesc.value, "function");
    assert_equals(typeof linkErrorDesc.value, "function");
    assert_equals(typeof runtimeErrorDesc.value, "function");
    assert_equals(compileErrorDesc.writable, true);
    assert_equals(linkErrorDesc.writable, true);
    assert_equals(runtimeErrorDesc.writable, true);
    assert_equals(compileErrorDesc.enumerable, false);
    assert_equals(linkErrorDesc.enumerable, false);
    assert_equals(runtimeErrorDesc.enumerable, false);
    assert_equals(compileErrorDesc.configurable, true);
    assert_equals(linkErrorDesc.configurable, true);
    assert_equals(runtimeErrorDesc.configurable, true);

    CompileError = WebAssembly.CompileError;
    LinkError = WebAssembly.LinkError;
    RuntimeError = WebAssembly.RuntimeError;
}, "'WebAssembly.(Compile|Link|Runtime)Error' data property");

test(() => {
    const compileErrorDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'CompileError');
    const linkErrorDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'LinkError');
    const runtimeErrorDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'RuntimeError');
    assert_equals(CompileError, compileErrorDesc.value);
    assert_equals(LinkError, linkErrorDesc.value);
    assert_equals(RuntimeError, runtimeErrorDesc.value);
    assert_equals(CompileError.length, 1);
    assert_equals(LinkError.length, 1);
    assert_equals(RuntimeError.length, 1);
    assert_equals(CompileError.name, "CompileError");
    assert_equals(LinkError.name, "LinkError");
    assert_equals(RuntimeError.name, "RuntimeError");
}, "'WebAssembly.(Compile|Runtime)Error' constructor function");

test(() => {
    const compileError = new CompileError;
    const runtimeError = new RuntimeError;
    assert_equals(compileError instanceof CompileError, true);
    assert_equals(runtimeError instanceof RuntimeError, true);
    assert_equals(compileError instanceof Error, true);
    assert_equals(runtimeError instanceof Error, true);
    assert_equals(compileError instanceof TypeError, false);
    assert_equals(runtimeError instanceof TypeError, false);
    assert_equals(compileError.message, "");
    assert_equals(runtimeError.message, "");
    assert_equals(new CompileError("hi").message, "hi");
    assert_equals(new RuntimeError("hi").message, "hi");
}, "'WebAssembly.(Compile|Runtime)Error' instance objects");

test(() => {
    const moduleDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'Module');
    assert_equals(typeof moduleDesc.value, "function");
    assert_equals(moduleDesc.writable, true);
    assert_equals(moduleDesc.enumerable, false);
    assert_equals(moduleDesc.configurable, true);
    Module = WebAssembly.Module;
}, "'WebAssembly.Module' data property")

test(() => {
    const moduleDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'Module');
    assert_equals(Module, moduleDesc.value);
    assert_equals(Module.length, 1);
    assert_equals(Module.name, "Module");
    assertErrorMessage(() => Module(), TypeError, /constructor without new is forbidden/);
    assertErrorMessage(() => new Module(), TypeError, /requires more than 0 arguments/);
    assertErrorMessage(() => new Module(undefined), TypeError, "first argument must be an ArrayBuffer or typed array object");
    assertErrorMessage(() => new Module(1), TypeError, "first argument must be an ArrayBuffer or typed array object");
    assertErrorMessage(() => new Module({}), TypeError, "first argument must be an ArrayBuffer or typed array object");
    assertErrorMessage(() => new Module(new Uint8Array()), CompileError, /failed to match magic number/);
    assertErrorMessage(() => new Module(new ArrayBuffer()), CompileError, /failed to match magic number/);
    assert_equals(new Module(emptyModuleBinary) instanceof Module, true);
    assert_equals(new Module(emptyModuleBinary.buffer) instanceof Module, true);
}, "'WebAssembly.Module' constructor function");

test(() => {
    const moduleProtoDesc = Object.getOwnPropertyDescriptor(Module, 'prototype');
    assert_equals(typeof moduleProtoDesc.value, "object");
    assert_equals(moduleProtoDesc.writable, false);
    assert_equals(moduleProtoDesc.enumerable, false);
    assert_equals(moduleProtoDesc.configurable, false);
}, "'WebAssembly.Module.prototype' data property");

test(() => {
    const moduleProtoDesc = Object.getOwnPropertyDescriptor(Module, 'prototype');
    const moduleProto = Module.prototype;
    assert_equals(moduleProto, moduleProtoDesc.value);
    assert_equals(String(moduleProto), "[object Object]");
    assert_equals(Object.getPrototypeOf(moduleProto), Object.prototype);
}, "'WebAssembly.Module.prototype' object");

test(() => {
    const moduleProto = Module.prototype;
    emptyModule = new Module(emptyModuleBinary);
    exportingModule = new Module(exportingModuleBinary);
    importingModule = new Module(importingModuleBinary);
    assert_equals(typeof emptyModule, "object");
    assert_equals(String(emptyModule), "[object WebAssembly.Module]");
    assert_equals(Object.getPrototypeOf(emptyModule), moduleProto);
}, "'WebAssembly.Module' instance objects");

test(() => {
    const moduleImportsDesc = Object.getOwnPropertyDescriptor(Module, 'imports');
    assert_equals(typeof moduleImportsDesc.value, "function");
    assert_equals(moduleImportsDesc.writable, true);
    assert_equals(moduleImportsDesc.enumerable, false);
    assert_equals(moduleImportsDesc.configurable, true);
}, "'WebAssembly.Module.imports' data property");

test(() => {
    const moduleImportsDesc = Object.getOwnPropertyDescriptor(Module, 'imports');
    const moduleImports = moduleImportsDesc.value;
    assert_equals(moduleImports.length, 1);
    assertErrorMessage(() => moduleImports(), TypeError, /requires more than 0 arguments/);
    assertErrorMessage(() => moduleImports(undefined), TypeError, /first argument must be a WebAssembly.Module/);
    assertErrorMessage(() => moduleImports({}), TypeError, /first argument must be a WebAssembly.Module/);
    var arr = moduleImports(emptyModule);
    assert_equals(arr instanceof Array, true);
    assert_equals(arr.length, 0);
    var arr = moduleImports(new Module(complexImportingModuleBinary));
    assert_equals(arr instanceof Array, true);
    assert_equals(arr.length, 4);
    assert_equals(arr[0].kind, "function");
    assert_equals(arr[0].module, "a");
    assert_equals(arr[0].name, "b");
    assert_equals(arr[1].kind, "memory");
    assert_equals(arr[1].module, "c");
    assert_equals(arr[1].name, "d");
    assert_equals(arr[2].kind, "table");
    assert_equals(arr[2].module, "e");
    assert_equals(arr[2].name, "f");
    assert_equals(arr[3].kind, "global");
    assert_equals(arr[3].module, "g");
    assert_equals(arr[3].name, "⚡");
}, "'WebAssembly.Module.imports' method");

test(() => {
    const moduleExportsDesc = Object.getOwnPropertyDescriptor(Module, 'exports');
    assert_equals(typeof moduleExportsDesc.value, "function");
    assert_equals(moduleExportsDesc.writable, true);
    assert_equals(moduleExportsDesc.enumerable, false);
    assert_equals(moduleExportsDesc.configurable, true);
}, "'WebAssembly.Module.exports' data property");

test(() => {
    const moduleExportsDesc = Object.getOwnPropertyDescriptor(Module, 'exports');
    const moduleExports = moduleExportsDesc.value;
    assert_equals(moduleExports.length, 1);
    assertErrorMessage(() => moduleExports(), TypeError, /requires more than 0 arguments/);
    assertErrorMessage(() => moduleExports(undefined), TypeError, /first argument must be a WebAssembly.Module/);
    assertErrorMessage(() => moduleExports({}), TypeError, /first argument must be a WebAssembly.Module/);
    var arr = moduleExports(emptyModule);
    assert_equals(arr instanceof Array, true);
    assert_equals(arr.length, 0);
    var arr = moduleExports(new Module(complexExportingModuleBinary));
    assert_equals(arr instanceof Array, true);
    assert_equals(arr.length, 4);
    assert_equals(arr[0].kind, "function");
    assert_equals(arr[0].name, "a");
    assert_equals(arr[1].kind, "memory");
    assert_equals(arr[1].name, "b");
    assert_equals(arr[2].kind, "table");
    assert_equals(arr[2].name, "c");
    assert_equals(arr[3].kind, "global");
    assert_equals(arr[3].name, "⚡");
}, "'WebAssembly.Module.exports' method");

test(() => {
    const customSectionsDesc = Object.getOwnPropertyDescriptor(Module, 'customSections');
    assert_equals(typeof customSectionsDesc.value, "function");
    assert_equals(customSectionsDesc.writable, true);
    assert_equals(customSectionsDesc.enumerable, false);
    assert_equals(customSectionsDesc.configurable, true);
}, "'WebAssembly.Module.customSections' data property");

test(() => {
    const customSectionsDesc = Object.getOwnPropertyDescriptor(Module, 'customSections');
    const moduleCustomSections = customSectionsDesc.value;
    assert_equals(moduleCustomSections.length, 2);
    assertErrorMessage(() => moduleCustomSections(), TypeError, /requires more than 0 arguments/);
    assertErrorMessage(() => moduleCustomSections(undefined), TypeError, /first argument must be a WebAssembly.Module/);
    assertErrorMessage(() => moduleCustomSections({}), TypeError, /first argument must be a WebAssembly.Module/);
    var arr = moduleCustomSections(emptyModule);
    assert_equals(arr instanceof Array, true);
    assert_equals(arr.length, 0);
}, "'WebAssembly.Module.customSections' method");

test(() => {
    const instanceDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'Instance');
    assert_equals(typeof instanceDesc.value, "function");
    assert_equals(instanceDesc.writable, true);
    assert_equals(instanceDesc.enumerable, false);
    assert_equals(instanceDesc.configurable, true);
    Instance = WebAssembly.Instance;
}, "'WebAssembly.Instance' data property");

test(() => {
    const instanceDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'Instance');
    assert_equals(Instance, instanceDesc.value);
    assert_equals(Instance.length, 1);
    assert_equals(Instance.name, "Instance");
    assertErrorMessage(() => Instance(), TypeError, /constructor without new is forbidden/);
    assertErrorMessage(() => new Instance(1), TypeError, "first argument must be a WebAssembly.Module");
    assertErrorMessage(() => new Instance({}), TypeError, "first argument must be a WebAssembly.Module");
    assertErrorMessage(() => new Instance(emptyModule, null), TypeError, "second argument must be an object");
    assert_equals(new Instance(emptyModule) instanceof Instance, true);
    assert_equals(new Instance(emptyModule, {}) instanceof Instance, true);
}, "'WebAssembly.Instance' constructor function");

test(() => {
    const instanceProtoDesc = Object.getOwnPropertyDescriptor(Instance, 'prototype');
    assert_equals(typeof instanceProtoDesc.value, "object");
    assert_equals(instanceProtoDesc.writable, false);
    assert_equals(instanceProtoDesc.enumerable, false);
    assert_equals(instanceProtoDesc.configurable, false);
}, "'WebAssembly.Instance.prototype' data property");

test(() => {
    const instanceProto = Instance.prototype;
    const instanceProtoDesc = Object.getOwnPropertyDescriptor(Instance, 'prototype');
    assert_equals(instanceProto, instanceProtoDesc.value);
    assert_equals(String(instanceProto), "[object Object]");
    assert_equals(Object.getPrototypeOf(instanceProto), Object.prototype);
}, "'WebAssembly.Instance.prototype' object");

test(() => {
    const instanceProto = Instance.prototype;
    exportingInstance = new Instance(exportingModule);
    assert_equals(typeof exportingInstance, "object");
    assert_equals(String(exportingInstance), "[object WebAssembly.Instance]");
    assert_equals(Object.getPrototypeOf(exportingInstance), instanceProto);
}, "'WebAssembly.Instance' instance objects");

test(() => {
    const instanceExportsDesc = Object.getOwnPropertyDescriptor(exportingInstance, 'exports');
    assert_equals(typeof instanceExportsDesc.value, "object");
    assert_equals(instanceExportsDesc.writable, true);
    assert_equals(instanceExportsDesc.enumerable, true);
    assert_equals(instanceExportsDesc.configurable, true);
}, "'WebAssembly.Instance' 'exports' data property");

test(() => {
    exportsObj = exportingInstance.exports;
    assert_equals(typeof exportsObj, "object");
    assert_equals(Object.isExtensible(exportsObj), false);
    assert_equals(Object.getPrototypeOf(exportsObj), null);
    assert_equals(Object.keys(exportsObj).join(), "f");
    exportsObj.g = 1;
    assert_equals(Object.keys(exportsObj).join(), "f");
    assertErrorMessage(() => Object.setPrototypeOf(exportsObj, {}), TypeError, /can't set prototype of this object/);
    assert_equals(Object.getPrototypeOf(exportsObj), null);
    assertErrorMessage(() => Object.defineProperty(exportsObj, 'g', {}), TypeError, /Object is not extensible/);
    assert_equals(Object.keys(exportsObj).join(), "f");
}, "'WebAssembly.Instance' 'exports' object");

test(() => {
    const f = exportsObj.f;
    assert_equals(f instanceof Function, true);
    assert_equals(f.length, 0);
    assert_equals('name' in f, true);
    assert_equals(Function.prototype.call.call(f), 42);
    assertErrorMessage(() => new f(), TypeError, /is not a constructor/);
}, "Exported WebAssembly functions");

test(() => {
    const memoryDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'Memory');
    assert_equals(typeof memoryDesc.value, "function");
    assert_equals(memoryDesc.writable, true);
    assert_equals(memoryDesc.enumerable, false);
    assert_equals(memoryDesc.configurable, true);
    Memory = WebAssembly.Memory;
}, "'WebAssembly.Memory' data property");

test(() => {
    const memoryDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'Memory');
    assert_equals(Memory, memoryDesc.value);
    assert_equals(Memory.length, 1);
    assert_equals(Memory.name, "Memory");
    assertErrorMessage(() => Memory(), TypeError, /constructor without new is forbidden/);
    assertErrorMessage(() => new Memory(1), TypeError, "first argument must be a memory descriptor");
    assertErrorMessage(() => new Memory({initial:{valueOf() { throw new Error("here")}}}), Error, "here");
    assertErrorMessage(() => new Memory({initial:-1}), RangeError, /bad Memory initial size/);
    assertErrorMessage(() => new Memory({initial:Math.pow(2,32)}), RangeError, /bad Memory initial size/);
    assertErrorMessage(() => new Memory({initial:1, maximum: Math.pow(2,32)/Math.pow(2,14) }), RangeError, /bad Memory maximum size/);
    assertErrorMessage(() => new Memory({initial:2, maximum:1 }), RangeError, /bad Memory maximum size/);
    assertErrorMessage(() => new Memory({maximum: -1 }), RangeError, /bad Memory maximum size/);
    assert_equals(new Memory({initial:1}) instanceof Memory, true);
    assert_equals(new Memory({initial:1.5}).buffer.byteLength, WasmPage);
}, "'WebAssembly.Memory' constructor function");

test(() => {
    const memoryProtoDesc = Object.getOwnPropertyDescriptor(Memory, 'prototype');
    assert_equals(typeof memoryProtoDesc.value, "object");
    assert_equals(memoryProtoDesc.writable, false);
    assert_equals(memoryProtoDesc.enumerable, false);
    assert_equals(memoryProtoDesc.configurable, false);
}, "'WebAssembly.Memory.prototype' data property");

test(() => {
    memoryProto = Memory.prototype;
    const memoryProtoDesc = Object.getOwnPropertyDescriptor(Memory, 'prototype');
    assert_equals(memoryProto, memoryProtoDesc.value);
    assert_equals(String(memoryProto), "[object Object]");
    assert_equals(Object.getPrototypeOf(memoryProto), Object.prototype);
}, "'WebAssembly.Memory.prototype' object");

test(() => {
    mem1 = new Memory({initial:1});
    assert_equals(typeof mem1, "object");
    assert_equals(String(mem1), "[object WebAssembly.Memory]");
    assert_equals(Object.getPrototypeOf(mem1), memoryProto);
}, "'WebAssembly.Memory' instance objects");

test(() => {
    const bufferDesc = Object.getOwnPropertyDescriptor(memoryProto, 'buffer');
    assert_equals(typeof bufferDesc.get, "function");
    assert_equals(bufferDesc.set, undefined);
    assert_equals(bufferDesc.enumerable, false);
    assert_equals(bufferDesc.configurable, true);
}, "'WebAssembly.Memory.prototype.buffer' accessor property");

test(() => {
    const bufferDesc = Object.getOwnPropertyDescriptor(memoryProto, 'buffer');
    const bufferGetter = bufferDesc.get;
    assertErrorMessage(() => bufferGetter.call(), TypeError, /called on incompatible undefined/);
    assertErrorMessage(() => bufferGetter.call({}), TypeError, /called on incompatible Object/);
    assert_equals(bufferGetter.call(mem1) instanceof ArrayBuffer, true);
    assert_equals(bufferGetter.call(mem1).byteLength, WasmPage);
}, "'WebAssembly.Memory.prototype.buffer' getter");

test(() => {
    const memGrowDesc = Object.getOwnPropertyDescriptor(memoryProto, 'grow');
    assert_equals(typeof memGrowDesc.value, "function");
    assert_equals(memGrowDesc.enumerable, false);
    assert_equals(memGrowDesc.configurable, true);
}, "'WebAssembly.Memory.prototype.grow' data property");

test(() => {
    const memGrowDesc = Object.getOwnPropertyDescriptor(memoryProto, 'grow');
    const memGrow = memGrowDesc.value;
    assert_equals(memGrow.length, 1);
    assertErrorMessage(() => memGrow.call(), TypeError, /called on incompatible undefined/);
    assertErrorMessage(() => memGrow.call({}), TypeError, /called on incompatible Object/);
    assertErrorMessage(() => memGrow.call(mem1, -1), RangeError, /bad Memory grow delta/);
    assertErrorMessage(() => memGrow.call(mem1, Math.pow(2,32)), RangeError, /bad Memory grow delta/);
    var mem = new Memory({initial:1, maximum:2});
    var buf = mem.buffer;
    assert_equals(buf.byteLength, WasmPage);
    assert_equals(mem.grow(0), 1);
    assert_equals(buf !== mem.buffer, true);
    assert_equals(buf.byteLength, 0);
    buf = mem.buffer;
    assert_equals(buf.byteLength, WasmPage);
    assert_equals(mem.grow(1), 1);
    assert_equals(buf !== mem.buffer, true);
    assert_equals(buf.byteLength, 0);
    buf = mem.buffer;
    assert_equals(buf.byteLength, 2 * WasmPage);
    assertErrorMessage(() => mem.grow(1), Error, /failed to grow memory/);
    assert_equals(buf, mem.buffer);
}, "'WebAssembly.Memory.prototype.grow' method");

test(() => {
    const tableDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'Table');
    assert_equals(typeof tableDesc.value, "function");
    assert_equals(tableDesc.writable, true);
    assert_equals(tableDesc.enumerable, false);
    assert_equals(tableDesc.configurable, true);
    Table = WebAssembly.Table;
}, "'WebAssembly.Table' data property");

test(() => {
    const tableDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'Table');
    assert_equals(Table, tableDesc.value);
    assert_equals(Table.length, 1);
    assert_equals(Table.name, "Table");
    assertErrorMessage(() => Table(), TypeError, /constructor without new is forbidden/);
    assertErrorMessage(() => new Table(1), TypeError, "first argument must be a table descriptor");
    assertErrorMessage(() => new Table({initial:1, element:1}), TypeError, /must be "anyfunc"/);
    assertErrorMessage(() => new Table({initial:1, element:"any"}), TypeError, /must be "anyfunc"/);
    assertErrorMessage(() => new Table({initial:1, element:{valueOf() { return "anyfunc" }}}), TypeError, /must be "anyfunc"/);
    assertErrorMessage(() => new Table({initial:{valueOf() { throw new Error("here")}}, element:"anyfunc"}), Error, "here");
    assertErrorMessage(() => new Table({initial:-1, element:"anyfunc"}), RangeError, /bad Table initial size/);
    assertErrorMessage(() => new Table({initial:Math.pow(2,32), element:"anyfunc"}), RangeError, /bad Table initial size/);
    assertErrorMessage(() => new Table({initial:2, maximum:1, element:"anyfunc"}), RangeError, /bad Table maximum size/);
    assertErrorMessage(() => new Table({initial:2, maximum:Math.pow(2,32), element:"anyfunc"}), RangeError, /bad Table maximum size/);
    assert_equals(new Table({initial:1, element:"anyfunc"}) instanceof Table, true);
    assert_equals(new Table({initial:1.5, element:"anyfunc"}) instanceof Table, true);
    assert_equals(new Table({initial:1, maximum:1.5, element:"anyfunc"}) instanceof Table, true);
    assert_equals(new Table({initial:1, maximum:Math.pow(2,32)-1, element:"anyfunc"}) instanceof Table, true);
}, "'WebAssembly.Table' constructor function");

test(() => {
    const tableProtoDesc = Object.getOwnPropertyDescriptor(Table, 'prototype');
    assert_equals(typeof tableProtoDesc.value, "object");
    assert_equals(tableProtoDesc.writable, false);
    assert_equals(tableProtoDesc.enumerable, false);
    assert_equals(tableProtoDesc.configurable, false);
}, "'WebAssembly.Table.prototype' data property");

test(() => {
    const tableProtoDesc = Object.getOwnPropertyDescriptor(Table, 'prototype');
    tableProto = Table.prototype;
    assert_equals(tableProto, tableProtoDesc.value);
    assert_equals(String(tableProto), "[object Object]");
    assert_equals(Object.getPrototypeOf(tableProto), Object.prototype);
}, "'WebAssembly.Table.prototype' object");

test(() => {
    tbl1 = new Table({initial:2, element:"anyfunc"});
    assert_equals(typeof tbl1, "object");
    assert_equals(String(tbl1), "[object WebAssembly.Table]");
    assert_equals(Object.getPrototypeOf(tbl1), tableProto);
}, "'WebAssembly.Table' instance objects");

test(() => {
    const lengthDesc = Object.getOwnPropertyDescriptor(tableProto, 'length');
    assert_equals(typeof lengthDesc.get, "function");
    assert_equals(lengthDesc.set, undefined);
    assert_equals(lengthDesc.enumerable, false);
    assert_equals(lengthDesc.configurable, true);
}, "'WebAssembly.Table.prototype.length' accessor data property");

test(() => {
    const lengthDesc = Object.getOwnPropertyDescriptor(tableProto, 'length');
    const lengthGetter = lengthDesc.get;
    assert_equals(lengthGetter.length, 0);
    assertErrorMessage(() => lengthGetter.call(), TypeError, /called on incompatible undefined/);
    assertErrorMessage(() => lengthGetter.call({}), TypeError, /called on incompatible Object/);
    assert_equals(typeof lengthGetter.call(tbl1), "number");
    assert_equals(lengthGetter.call(tbl1), 2);
}, "'WebAssembly.Table.prototype.length' getter");

test(() => {
    const getDesc = Object.getOwnPropertyDescriptor(tableProto, 'get');
    assert_equals(typeof getDesc.value, "function");
    assert_equals(getDesc.enumerable, false);
    assert_equals(getDesc.configurable, true);
}, "'WebAssembly.Table.prototype.get' data property");

test(() => {
    const getDesc = Object.getOwnPropertyDescriptor(tableProto, 'get');
    const get = getDesc.value;
    assert_equals(get.length, 1);
    assertErrorMessage(() => get.call(), TypeError, /called on incompatible undefined/);
    assertErrorMessage(() => get.call({}), TypeError, /called on incompatible Object/);
    assert_equals(get.call(tbl1, 0), null);
    assert_equals(get.call(tbl1, 1), null);
    assert_equals(get.call(tbl1, 1.5), null);
    assertErrorMessage(() => get.call(tbl1, 2), RangeError, /bad Table get index/);
    assertErrorMessage(() => get.call(tbl1, 2.5), RangeError, /bad Table get index/);
    assertErrorMessage(() => get.call(tbl1, -1), RangeError, /bad Table get index/);
    assertErrorMessage(() => get.call(tbl1, Math.pow(2,33)), RangeError, /bad Table get index/);
    assertErrorMessage(() => get.call(tbl1, {valueOf() { throw new Error("hi") }}), Error, "hi");
}, "'WebAssembly.Table.prototype.get' method");

test(() => {
    const setDesc = Object.getOwnPropertyDescriptor(tableProto, 'set');
    assert_equals(typeof setDesc.value, "function");
    assert_equals(setDesc.enumerable, false);
    assert_equals(setDesc.configurable, true);
}, "'WebAssembly.Table.prototype.set' data property");

test(() => {
    const setDesc = Object.getOwnPropertyDescriptor(tableProto, 'set');
    const set = setDesc.value;
    assert_equals(set.length, 2);
    assertErrorMessage(() => set.call(), TypeError, /called on incompatible undefined/);
    assertErrorMessage(() => set.call({}), TypeError, /called on incompatible Object/);
    assertErrorMessage(() => set.call(tbl1, 0), TypeError, /requires more than 1 argument/);
    assertErrorMessage(() => set.call(tbl1, 2, null), RangeError, /bad Table set index/);
    assertErrorMessage(() => set.call(tbl1, -1, null), RangeError, /bad Table set index/);
    assertErrorMessage(() => set.call(tbl1, Math.pow(2,33), null), RangeError, /bad Table set index/);
    assertErrorMessage(() => set.call(tbl1, 0, undefined), TypeError, /can only assign WebAssembly exported functions to Table/);
    assertErrorMessage(() => set.call(tbl1, 0, {}), TypeError, /can only assign WebAssembly exported functions to Table/);
    assertErrorMessage(() => set.call(tbl1, 0, function() {}), TypeError, /can only assign WebAssembly exported functions to Table/);
    assertErrorMessage(() => set.call(tbl1, 0, Math.sin), TypeError, /can only assign WebAssembly exported functions to Table/);
    assertErrorMessage(() => set.call(tbl1, {valueOf() { throw Error("hai") }}, null), Error, "hai");
    assert_equals(set.call(tbl1, 0, null), undefined);
    assert_equals(set.call(tbl1, 1, null), undefined);
}, "'WebAssembly.Table.prototype.set' method");

test(() => {
    const tblGrowDesc = Object.getOwnPropertyDescriptor(tableProto, 'grow');
    assert_equals(typeof tblGrowDesc.value, "function");
    assert_equals(tblGrowDesc.enumerable, false);
    assert_equals(tblGrowDesc.configurable, true);
}, "'WebAssembly.Table.prototype.grow' data property");

test(() => {
    const tblGrowDesc = Object.getOwnPropertyDescriptor(tableProto, 'grow');
    const tblGrow = tblGrowDesc.value;
    assert_equals(tblGrow.length, 1);
    assertErrorMessage(() => tblGrow.call(), TypeError, /called on incompatible undefined/);
    assertErrorMessage(() => tblGrow.call({}), TypeError, /called on incompatible Object/);
    assertErrorMessage(() => tblGrow.call(tbl1, -1), RangeError, /bad Table grow delta/);
    assertErrorMessage(() => tblGrow.call(tbl1, Math.pow(2,32)), RangeError, /bad Table grow delta/);
    var tbl = new Table({element:"anyfunc", initial:1, maximum:2});
    assert_equals(tbl.length, 1);
    assert_equals(tbl.grow(0), 1);
    assert_equals(tbl.length, 1);
    assert_equals(tbl.grow(1), 1);
    assert_equals(tbl.length, 2);
    assertErrorMessage(() => tbl.grow(1), Error, /failed to grow table/);
}, "'WebAssembly.Table.prototype.grow' method");

test(() => {
    const compileDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'compile');
    assert_equals(typeof compileDesc.value, "function");
    assert_equals(compileDesc.writable, true);
    assert_equals(compileDesc.enumerable, false);
    assert_equals(compileDesc.configurable, true);
}, "'WebAssembly.compile' data property");

test(() => {
    const compile = WebAssembly.compile;
    const compileDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'compile');

    assert_equals(compile, compileDesc.value);
    assert_equals(compile.length, 1);
    assert_equals(compile.name, "compile");
}, "'WebAssembly.compile' function");

var num_tests = 1;
function assertCompileError(args, err, msg) {
    promise_test(() => {
        return WebAssembly.compile(...args)
        .then(_ => {
            throw null;
        })
        .catch(error => {
            assert_equals(error instanceof err, true);
            assert_equals(Boolean(error.stack.match("jsapi.js")), true);
            assert_equals(Boolean(error.message.match(msg)), true);
            return Promise.resolve()
        });
    }, `assertCompileError ${num_tests++}`);
}

assertCompileError([], TypeError, /requires more than 0 arguments/);
assertCompileError([undefined], TypeError, /first argument must be an ArrayBuffer or typed array object/);
assertCompileError([1], TypeError, /first argument must be an ArrayBuffer or typed array object/);
assertCompileError([{}], TypeError, /first argument must be an ArrayBuffer or typed array object/);
assertCompileError([new Uint8Array()], CompileError, /failed to match magic number/);
assertCompileError([new ArrayBuffer()], CompileError, /failed to match magic number/);

num_tests = 1;
function assertCompileSuccess(bytes) {
    promise_test(() => {
        return WebAssembly.compile(bytes)
        .then(module => {
            assert_equals(module instanceof Module, true);
        });
    }, `assertCompileSuccess ${num_tests++}`);
}

assertCompileSuccess(emptyModuleBinary);
assertCompileSuccess(emptyModuleBinary.buffer);

test(() => {
    const instantiateDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'instantiate');
    assert_equals(typeof instantiateDesc.value, "function");
    assert_equals(instantiateDesc.writable, true);
    assert_equals(instantiateDesc.enumerable, false);
    assert_equals(instantiateDesc.configurable, true);
}, "'WebAssembly.instantiate' data property");

test(() => {
    const instantiateDesc = Object.getOwnPropertyDescriptor(WebAssembly, 'instantiate');
    const instantiate = WebAssembly.instantiate;
    assert_equals(instantiate, instantiateDesc.value);
    assert_equals(instantiate.length, 2);
    assert_equals(instantiate.name, "instantiate");
    function assertInstantiateError(args, err, msg) {
        instantiate(...args)
        .then(m => {
            throw new Error('unexpected success in assertInstantiateError');
        })
        .catch(error => {
            assert_equals(error instanceof err, true);
            assert_equals(Boolean(error.stack.match("jsapi.js")), true);
            assert_equals(Boolean(error.message.match(msg)), true);
        });
    }
    assertInstantiateError([], TypeError, /requires more than 0 arguments/);
    assertInstantiateError([undefined], TypeError, /first argument must be a WebAssembly.Module, ArrayBuffer or typed array object/);
    assertInstantiateError([1], TypeError, /first argument must be a WebAssembly.Module, ArrayBuffer or typed array object/);
    assertInstantiateError([{}], TypeError, /first argument must be a WebAssembly.Module, ArrayBuffer or typed array object/);
    assertInstantiateError([new Uint8Array()], CompileError, /failed to match magic number/);
    assertInstantiateError([new ArrayBuffer()], CompileError, /failed to match magic number/);
    assertInstantiateError([importingModule], TypeError, /second argument must be an object/);
    assertInstantiateError([importingModule, null], TypeError, /second argument must be an object/);
    assertInstantiateError([importingModuleBinary, null], TypeError, /second argument must be an object/);
    function assertInstantiateSuccess(module, imports) {
        instantiate(module, imports)
        .then(result => {
            if (module instanceof Module) {
                assert_equals(result instanceof Instance, true);
            } else {
                assert_equals(result.module instanceof Module, true);
                assert_equals(result.instance instanceof Instance, true);
            }
        })
        .catch(err => {
            assert(false, 'unexpected failure in assertInstantiateSuccess')
        });
    }
    assertInstantiateSuccess(emptyModule);
    assertInstantiateSuccess(emptyModuleBinary);
    assertInstantiateSuccess(emptyModuleBinary.buffer);
    assertInstantiateSuccess(importingModule, {"":{f:()=>{}}});
    assertInstantiateSuccess(importingModuleBinary, {"":{f:()=>{}}});
    assertInstantiateSuccess(importingModuleBinary.buffer, {"":{f:()=>{}}});
}, "'WebAssembly.instantiate' function");
}
