"use strict";
/**
 * An HTTP server for Providers, primarily for interacting with the Holo Hosting App
 * It's uncertain how this will actually show up in the world.
 * It's a temporary thing for now.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const common_1 = require("./common");
const holo_hosting_1 = require("./flows/holo-hosting");
exports.default = (port, masterClient) => {
    const app = express();
    app.use(bodyParser.json());
    app.post('/holo/happs/register', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        const { uiHash, dnaHashes } = req.body;
        holo_hosting_1.SHIMS.registerHapp(masterClient, { uiHash, dnaHashes })
            .then(() => res.send("Registration successful"))
            .catch(common_1.catchHttp(next));
    }));
    const server = app.listen(port, () => console.log(`Admin HTTP server listening on port ${port}`));
    return server;
};
//# sourceMappingURL=admin-provider-server.js.map