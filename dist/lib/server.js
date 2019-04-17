"use strict";
/**
 * Server for Holo
 *
 * Accepts requests similar to what the Conductor
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
const rpc_websockets_1 = require("rpc-websockets");
const Config = require("./config");
const zome_call_1 = require("./flows/zome-call");
const new_agent_1 = require("./flows/new-agent");
const connection_manager_1 = require("./connection-manager");
const wormhole_server_1 = require("./wormhole-server");
const admin_host_server_1 = require("./admin-host-server");
const happ_server_1 = require("./shims/happ-server");
const successResponse = { success: true };
exports.default = (port) => {
    // clients to the interface served by the Conductor
    const masterClient = exports.getMasterClient(true);
    const publicClient = exports.getPublicClient(true);
    const internalClient = exports.getInternalClient(true);
    console.debug("Connecting to admin and happ interfaces...");
    const server = new EnvoyServer({ masterClient, publicClient, internalClient });
    server.start(port);
    return server;
};
const clientOpts = reconnect => ({ max_reconnects: 0, reconnect }); // zero reconnects means unlimited
exports.getMasterClient = (reconnect) => new rpc_websockets_1.Client(`ws://localhost:${Config.PORTS.masterInterface}`, clientOpts(reconnect));
exports.getPublicClient = (reconnect) => new rpc_websockets_1.Client(`ws://localhost:${Config.PORTS.publicInterface}`, clientOpts(reconnect));
exports.getInternalClient = (reconnect) => new rpc_websockets_1.Client(`ws://localhost:${Config.PORTS.internalInterface}`, clientOpts(reconnect));
const verifySignature = (entry, signature) => true;
const fail = (e) => {
    console.error("envoy server request failure:", e);
    return e;
};
const requiredFields = (...fields) => {
    const missing = fields.filter(field => field === undefined);
    if (missing.length > 0) {
        throw `The following fields were missing: ${missing.join(', ')}`;
    }
};
/**
 * A wrapper around a rpc-websockets Server and Client which brokers communication between
 * the browser user and the Conductor. The browser communicates with the Server, and the Client
 * is used to make calls to the Conductor's Websocket interface.
 */
class EnvoyServer {
    constructor({ masterClient, publicClient, internalClient }) {
        this.nextCallId = 0;
        this.signingRequests = {};
        this.start = (port) => __awaiter(this, void 0, void 0, function* () {
            let wss, httpServer, shimServer, adminServer, wormholeServer;
            const server = this;
            const importantConnections = ['master'];
            this.connections = new connection_manager_1.default({
                connections: importantConnections,
                onStart: () => __awaiter(this, void 0, void 0, function* () {
                    console.log("Beginning server startup");
                    httpServer = yield this.buildHttpServer(this.clients.master);
                    console.log("HTTP server initialized");
                    wss = yield this.buildWebsocketServer(httpServer);
                    console.log("WS server initialized");
                    shimServer = happ_server_1.default(Config.PORTS.shim);
                    adminServer = admin_host_server_1.default(Config.PORTS.admin, Config.defaultEnvoyHome, server.clients.master);
                    wormholeServer = wormhole_server_1.default(Config.PORTS.wormhole, server);
                    yield httpServer.listen(port, () => console.log('HTTP server running on port', port));
                    wss.on('listening', () => console.log("Websocket server listening on port", port));
                    wss.on('error', data => console.log("<C> error: ", data));
                    this.server = wss;
                }),
                onStop: () => {
                    if (wss) {
                        wss.close();
                        console.log("Shut down wss");
                    }
                    else {
                        console.log("Not shutting down wss??");
                    }
                    if (httpServer) {
                        httpServer.close();
                        console.log("Shut down httpServer");
                    }
                    else {
                        console.log("Not shutting down httpServer??");
                    }
                    if (adminServer) {
                        adminServer.close();
                        console.log("Shut down adminServer");
                    }
                    else {
                        console.log("Not shutting down adminServer??");
                    }
                    if (wormholeServer) {
                        wormholeServer.close();
                        console.log("Shut down wormholeServer");
                    }
                    else {
                        console.log("Not shutting down wormholeServer??");
                    }
                    if (shimServer) {
                        shimServer.stop();
                        console.log("Shut down shimServer");
                    }
                    else {
                        console.log("Not shutting down shimServer??");
                    }
                    this.server = null;
                },
            });
            // TODO: rework this so public and internal clients going down doesn't shut down
            // stuff that only affects the master client
            importantConnections.forEach(name => {
                const client = this.clients[name];
                client.on('open', () => this.connections.add(name));
                client.on('close', () => this.connections.remove(name));
            });
        });
        this.buildHttpServer = (masterClient) => __awaiter(this, void 0, void 0, function* () {
            const app = express();
            // Simply rely on the fact that UIs are installed in a directory
            // named after their happId
            // TODO: check access to prevent cross-UI requests?
            app.use(`/`, express.static(Config.uiStorageDir(Config.defaultEnvoyHome)));
            return require('http').createServer(app);
        });
        this.buildWebsocketServer = (httpServer) => __awaiter(this, void 0, void 0, function* () {
            const wss = new rpc_websockets_1.Server({ server: httpServer });
            // NB: the following closures are intentional, i.e. just passing the
            // member function to wss.register causes sinon to not correctly be able
            // to spy on the function calls. Don't simplify!
            wss.register('holo/identify', a => this.identifyAgent(a));
            wss.register('holo/clientSignature', a => this.wormholeSignature(a)); // TODO: deprecated
            wss.register('holo/wormholeSignature', a => this.wormholeSignature(a));
            wss.register('holo/serviceSignature', a => this.serviceSignature(a));
            wss.register('holo/call', a => this.zomeCall(a));
            // TODO: something in here to update the agent key subscription? i.e. re-identify?
            wss.register('holo/agents/new', a => this.newHostedAgent(a));
            return wss;
        });
        this.identifyAgent = ({ agentId }) => {
            requiredFields(agentId);
            // TODO: also take salt and signature of salt to prove browser owns agent ID
            console.log("adding new event to server", `agent/${agentId}/sign`);
            try {
                this.server.event(`agent/${agentId}/sign`);
            }
            catch (e) {
                if (e.message.includes('Already registered event')) {
                    console.log('welcome back', agentId);
                }
                else {
                    throw e;
                }
            }
            console.log('identified as ', agentId);
            return { agentId };
        };
        this.wormholeSignature = ({ signature, requestId }) => {
            console.log("Totally gettin' called...", { signature, requestId });
            requiredFields(requestId);
            const { entry, callback } = this.signingRequests[requestId];
            verifySignature(entry, signature); // TODO: really?
            callback(signature);
            delete this.signingRequests[requestId];
            return successResponse;
        };
        this.serviceSignature = ({ happId, responseEntryHash, signature }) => {
            requiredFields(happId, responseEntryHash, signature);
            return zome_call_1.logServiceSignature(this.clients.internal, { happId, responseEntryHash, signature });
        };
        this.newHostedAgent = ({ agentId, happId }) => __awaiter(this, void 0, void 0, function* () {
            requiredFields(agentId, happId);
            const signature = 'TODO';
            yield new_agent_1.default(this.clients.master)({ agentId, happId, signature });
            return successResponse;
        });
        this.zomeCall = (params) => {
            return zome_call_1.default(this.clients.public, this.clients.internal)(params).catch(fail);
        };
        this.clients = {
            master: masterClient,
            public: publicClient,
            internal: internalClient,
        };
    }
    /**
     * Close the client connections
     */
    close() {
        Object.keys(this.clients).forEach((name) => {
            console.log(`Closing client: `, name);
            this.clients[name].reconnect = false;
            this.clients[name].close();
        });
        // this.connections.dismantle()
    }
    /**
     * Function to be called externally, registers a signing request which will be fulfilled
     * by the `holo/wormholeSignature` JSON-RPC method registered on this server
     */
    startHoloSigningRequest(agentId, entry, callback) {
        const id = this.nextCallId++;
        console.debug('envoy server emitting sign request event: ', `agent/${agentId}/sign`, { entry, id });
        this.server.emit(`agent/${agentId}/sign`, { entry, id });
        this.signingRequests[id] = { entry, callback };
    }
}
exports.EnvoyServer = EnvoyServer;
//# sourceMappingURL=server.js.map