"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
exports.default = (port, icServer) => {
    const app = express();
    app.use(bodyParser.json());
    app.post('/', (req, res) => {
        console.log("WORMHOLE REQUEST: ", req.body);
        const { agent_id: agentId, payload: entry } = req.body;
        const callback = (signature) => {
            console.log("Got signature from wormhole: ", signature);
            res.send(signature);
        };
        icServer.startHoloSigningRequest(agentId, entry, callback);
    });
    const server = app.listen(port, () => console.log(`Wormhole HTTP server listening on port ${port}`));
    return server;
};
//# sourceMappingURL=wormhole-server.js.map