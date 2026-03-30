/**
 * vMix API client (Electron main process)
 *
 * vMix exposes two interfaces:
 *  - TCP port 8099  → XML state + TALLY subscription
 *  - HTTP port 8088 → REST commands  (GET /api?Function=...)
 *
 * This module wraps both and emits events consumed by main.js.
 */

const net = require('net');
const http = require('http');
const EventEmitter = require('events');

class VmixApi extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.host = '127.0.0.1';
    this.port = 8099;
    this.httpPort = 8088;
    this.connected = false;
    this._buffer = '';
  }

  connect(host = '127.0.0.1', port = 8099) {
    this.host = host;
    this.port = port;

    return new Promise((resolve, reject) => {
      if (this.socket) this.socket.destroy();

      this.socket = new net.Socket();

      this.socket.connect(port, host, () => {
        this.connected = true;
        // Subscribe to XML state updates
        this.socket.write('SUBSCRIBE TALLY\r\n');
        this.socket.write('SUBSCRIBE ACTS\r\n');
        this.emit('connected');
        resolve({ ok: true });
      });

      this.socket.on('data', (data) => {
        this._buffer += data.toString();
        this._processBuffer();
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
      });

      this.socket.on('error', (err) => {
        this.connected = false;
        reject({ ok: false, error: err.message });
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    return { ok: true };
  }

  _processBuffer() {
    const lines = this._buffer.split('\r\n');
    this._buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      if (line.startsWith('TALLY OK')) {
        // Format: TALLY OK <tally string>  e.g. "10020000"
        const tally = line.substring('TALLY OK '.length).trim().split('').map(Number);
        this.emit('tally', tally);
      } else if (line.startsWith('VERSION OK')) {
        // Initial handshake — request full state via HTTP
        this.getState();
      }
    }
  }

  /** Fetch full XML state via HTTP API */
  getState() {
    return new Promise((resolve, reject) => {
      const url = `http://${this.host}:${this.httpPort}/api`;
      http.get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          this.emit('state', body); // raw XML — parse in renderer or here
          resolve(body);
        });
      }).on('error', (e) => reject({ ok: false, error: e.message }));
    });
  }

  /**
   * Send a command via HTTP API
   * Example: sendCommand('Cut') or sendCommand('Transition1&Duration=1000')
   */
  sendCommand(command) {
    return new Promise((resolve, reject) => {
      const url = `http://${this.host}:${this.httpPort}/api?Function=${encodeURIComponent(command)}`;
      http.get(url, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ ok: true, response: body }));
      }).on('error', (e) => reject({ ok: false, error: e.message }));
    });
  }
}

module.exports = new VmixApi();
