/**
 * Server for Holo
 *
 * Accepts requests similar to what the Conductor
 */

import * as express from 'express'
import {Client, Server as RpcServer} from 'rpc-websockets'

import * as Config from './config'
import installHapp, {InstallHappRequest, listHoloApps} from './flows/install-happ'
import zomeCall, {CallRequest, logServiceSignature} from './flows/zome-call'
import newAgent, {NewAgentRequest} from './flows/new-agent'
import ConnectionManager from './connection-manager'

import startWormholeServer from './wormhole-server'
import startAdminHostServer from './admin-host-server'
import startShimServers from './shims/happ-server'

const successResponse = { success: true }

export default (port) => {
  // clients to the interface served by the Conductor
  const masterClient = getMasterClient(true)
  const publicClient = getPublicClient(true)
  const internalClient = getInternalClient(true)
  console.debug("Connecting to admin and happ interfaces...")

  const server = new EnvoyServer({masterClient, publicClient, internalClient})
  server.start(port)
  return server
}

const clientOpts = reconnect => ({ max_reconnects: 0, reconnect })  // zero reconnects means unlimited
export const getMasterClient = (reconnect) => new Client(`ws://localhost:${Config.PORTS.masterInterface}`, clientOpts(reconnect))
export const getPublicClient = (reconnect) => new Client(`ws://localhost:${Config.PORTS.publicInterface}`, clientOpts(reconnect))
export const getInternalClient = (reconnect) => new Client(`ws://localhost:${Config.PORTS.internalInterface}`, clientOpts(reconnect))

type SigningRequest = {
  entry: Object,
  callback: (Object) => void
}

const verifySignature = (entry, signature) => true

const fail = (e) => {
  console.error("envoy server request failure:", e)
  return e
}

const requiredFields = (...fields) => {
  const missing = fields.filter(field => field === undefined)
  if (missing.length > 0) {
    throw `The following fields were missing: ${missing.join(', ')}`
  }
}

/**
 * A wrapper around a rpc-websockets Server and Client which brokers communication between
 * the browser user and the Conductor. The browser communicates with the Server, and the Client
 * is used to make calls to the Conductor's Websocket interface.
 */
export class EnvoyServer {
  server: any
  clients: {[s: string]: any}  // TODO: move masterClient to separate admin-only server that's not publicly exposed!??
  nextCallId = 0
  signingRequests = {}
  connections: ConnectionManager

  constructor({masterClient, publicClient, internalClient}) {
    this.clients = {
      master: masterClient,
      public: publicClient,
      internal: internalClient,
    }
  }

  start = async (port) => {
    let wss, httpServer, shimServer, adminServer, wormholeServer
    const server = this
    const importantConnections = ['master']
    this.connections = new ConnectionManager({
      connections: importantConnections,
      onStart: async () => {
        console.log("Beginning server startup")
        httpServer = await this.buildHttpServer(this.clients.master)
        console.log("HTTP server initialized")
        wss = await this.buildWebsocketServer(httpServer)
        console.log("WS server initialized")

        shimServer = startShimServers(Config.PORTS.shim)
        adminServer = startAdminHostServer(Config.PORTS.admin, Config.defaultEnvoyHome, server.clients.master)
        wormholeServer = startWormholeServer(Config.PORTS.wormhole, server)

        await httpServer.listen(port, () => console.log('HTTP server running on port', port))
        wss.on('listening', () => console.log("Websocket server listening on port", port))
        wss.on('error', data => console.log("<C> error: ", data))

        this.server = wss
      },
      onStop: () => {
        if (wss) {
          wss.close()
          console.log("Shut down wss")
        } else {
          console.log("Not shutting down wss??")
        }
        if (httpServer) {
          httpServer.close()
          console.log("Shut down httpServer")
        } else {
          console.log("Not shutting down httpServer??")
        }
        if (adminServer) {
          adminServer.close()
          console.log("Shut down adminServer")
        } else {
          console.log("Not shutting down adminServer??")
        }
        if (wormholeServer) {
          wormholeServer.close()
          console.log("Shut down wormholeServer")
        } else {
          console.log("Not shutting down wormholeServer??")
        }
        if (shimServer) {
          shimServer.stop()
          console.log("Shut down shimServer")
        } else {
          console.log("Not shutting down shimServer??")
        }

        this.server = null
      },
    })

    // TODO: rework this so public and internal clients going down doesn't shut down
    // stuff that only affects the master client
    importantConnections.forEach(name => {
      const client = this.clients[name]
      client.on('open', () => this.connections.add(name))
      client.on('close', () => this.connections.remove(name))
    })
  }

  /**
   * Close the client connections
   */
  close() {
    Object.keys(this.clients).forEach((name) => {
      console.log(`Closing client: `, name)
      this.clients[name].reconnect = false
      this.clients[name].close()
    })
    // this.connections.dismantle()
  }


  buildHttpServer = async (masterClient) => {
    const app = express()

    // Simply rely on the fact that UIs are installed in a directory
    // named after their happId
    // TODO: check access to prevent cross-UI requests?
    app.use(`/`, express.static(Config.uiStorageDir(Config.defaultEnvoyHome)))

    return require('http').createServer(app)
  }

  buildWebsocketServer = async (httpServer) => {
    const wss = new RpcServer({server: httpServer})

    // NB: the following closures are intentional, i.e. just passing the
    // member function to wss.register causes sinon to not correctly be able
    // to spy on the function calls. Don't simplify!

    wss.register('holo/identify', a => this.identifyAgent(a))

    wss.register('holo/clientSignature', a => this.wormholeSignature(a))  // TODO: deprecated
    wss.register('holo/wormholeSignature', a => this.wormholeSignature(a))

    wss.register('holo/serviceSignature', a => this.serviceSignature(a))

    wss.register('holo/call', a => this.zomeCall(a))

    // TODO: something in here to update the agent key subscription? i.e. re-identify?
    wss.register('holo/agents/new', a => this.newHostedAgent(a))

    return wss
  }

  identifyAgent = ({agentId}) => {
    requiredFields(agentId)

    // TODO: also take salt and signature of salt to prove browser owns agent ID
    console.log("adding new event to server", `agent/${agentId}/sign`)

    try {
      this.server!.event(`agent/${agentId}/sign`)
    } catch (e) {
      if (e.message.includes('Already registered event')) {
        console.log('welcome back', agentId)
      } else {
        throw e
      }
    }

    console.log('identified as ', agentId)
    return { agentId }
  }

  wormholeSignature = ({signature, requestId}) => {
    console.log("Totally gettin' called...", {signature, requestId})
    requiredFields(requestId)
    const {entry, callback} = this.signingRequests[requestId]
    verifySignature(entry, signature)  // TODO: really?
    callback(signature)
    delete this.signingRequests[requestId]
    return successResponse
  }

  serviceSignature = ({happId, responseEntryHash, signature}) => {
    requiredFields(happId, responseEntryHash, signature)
    return logServiceSignature(this.clients.internal, {happId, responseEntryHash, signature})
  }

  newHostedAgent = async ({agentId, happId}) => {
    requiredFields(agentId, happId)
    const signature = 'TODO'
    await newAgent(this.clients.master)({agentId, happId, signature})
    return successResponse
  }

  zomeCall = (params: CallRequest) => {
    return zomeCall(this.clients.public, this.clients.internal)(params).catch(fail)
  }

  /**
   * Function to be called externally, registers a signing request which will be fulfilled
   * by the `holo/wormholeSignature` JSON-RPC method registered on this server
   */
  startHoloSigningRequest(agentId: string, entry: Object, callback: (Object) => void) {
    const id = this.nextCallId++
    console.debug('envoy server emitting sign request event: ', `agent/${agentId}/sign`, {entry, id})
    this.server.emit(`agent/${agentId}/sign`, {entry, id})
    this.signingRequests[id] = {entry, callback}
  }

}
