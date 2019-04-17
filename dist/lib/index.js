"use strict";
/**
 * Server for Holo
 *
 * Accepts requests similar to what the Conductor
 */
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const C = require("./config");
// console.debug = () => {}
console.log('----------------------------------');
process.on('unhandledRejection', (reason, p) => {
    console.log("*** UNHANDLED REJECTION ***");
    console.log("reason: ", reason);
});
server_1.default(C.PORTS.external);
//# sourceMappingURL=index.js.map