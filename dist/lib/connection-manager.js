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
/**
 * Specifies a named list of "connections" to manage.
 * Allows you to manually add or remove them from the set of established connections.
 * When all connections have finally been added, runs onStart
 * When any connection is lost, run onStop
 */
class ConnectionManager {
    constructor(opts) {
        const { connections, onStart, onStop } = opts;
        this.target = new Set(connections);
        this.current = new Set();
        // this.update = update
        this.onStart = onStart;
        this.onStop = onStop;
        this._setPromise();
    }
    _setPromise() {
        const self = this;
        this.promise = new Promise(function (resolve) {
            self.promiseResolve = resolve;
        });
    }
    add(name) {
        this.update(() => this.current.add(name));
    }
    remove(name) {
        this.update(() => this.current.delete(name));
    }
    ready() {
        return this.promise;
    }
    isReady() {
        return eqSet(this.current, this.target);
    }
    update(fn) {
        const sizeBefore = this.current.size;
        const wasFull = this.isReady();
        fn();
        const isFull = this.isReady();
        const diff = this.current.size - sizeBefore;
        const established = Array.from(this.current);
        if (wasFull && !isFull) {
            console.log("Connection lost, stopping...");
            this.onStop();
            this._setPromise();
        }
        else if (!wasFull && isFull) {
            console.log("All connections established!", established, ". Starting...");
            this.promiseResolve();
            this.onStart();
        }
        else {
            console.info(`connections established: ${this.current.size}/${this.target.size}`, established);
        }
    }
    dismantle() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.onStop();
            this.add = () => { throw 'ConnectionManager is dismantled!'; };
        });
    }
}
exports.default = ConnectionManager;
function eqSet(as, bs) {
    return as.size === bs.size && all(isIn(bs), as);
}
function all(pred, as) {
    for (var a of as)
        if (!pred(a))
            return false;
    return true;
}
function isIn(as) {
    return function (a) {
        return as.has(a);
    };
}
////////////////////////////////////////////////
//# sourceMappingURL=connection-manager.js.map