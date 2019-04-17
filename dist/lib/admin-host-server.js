"use strict";
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
const cors = require("cors");
const bodyParser = require("body-parser");
const common_1 = require("./common");
const install_happ_1 = require("./flows/install-happ");
const HH = require("./flows/holo-hosting");
exports.default = (port, baseDir, masterClient) => {
    const app = express();
    app.use(bodyParser.json());
    app.use(cors({ origin: true })); // TODO: tighten up CORS before launch!
    app.post('/holo/happs/install', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        const { happId } = req.body;
        install_happ_1.default(masterClient, baseDir)({ happId })
            .then(() => res.send("Installation successful"))
            .catch(common_1.catchHttp(next));
    }));
    app.post('/holo/happs/enable', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        const { happId } = req.body;
        HH.enableHapp(masterClient, happId)
            .then(() => res.send("App enabled successfully"))
            .catch(common_1.catchHttp(next));
    }));
    app.post('/holo/happs/disable', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        const { happId } = req.body;
        HH.disableHapp(masterClient, happId)
            .then(() => res.send("App disabled successfully"))
            .catch(common_1.catchHttp(next));
    }));
    const server = app.listen(port, () => console.log(`Admin HTTP server listening on port ${port}`));
    return server;
};
//# sourceMappingURL=admin-host-server.js.map