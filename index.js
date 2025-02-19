'use strict'

const https = require('https')
const http = require('http')
const { URL } = require('url')

class HttpProxyAgent extends http.Agent {
  constructor (options) {
    const { proxy, proxyOptions, ...opts } = options
    super(opts)
    this.proxy = typeof proxy === 'string'
      ? new URL(proxy)
      : proxy
    this.proxyOptions = proxyOptions
  }

  createConnection (options, callback) {
    const requestOptions = {
      method: 'CONNECT',
      host: this.proxy.hostname,
      port: this.proxy.port,
      path: `${options.host}:${options.port}`,
      setHost: false,
      headers: { connection: this.keepAlive ? 'keep-alive' : 'close', host: `${options.host}:${options.port}` },
      agent: false,
      timeout: options.timeout || 0,
      ...this.proxyOptions
    }

    if (this.proxy.username || this.proxy.password) {
      const base64 = Buffer.from(`${decodeURIComponent(this.proxy.username || '')}:${decodeURIComponent(this.proxy.password || '')}`).toString('base64')
      requestOptions.headers['proxy-authorization'] = `Basic ${base64}`
    }

    if (this.proxy.protocol === 'https:') {
      requestOptions.servername = this.proxy.hostname
    }

    const request = (this.proxy.protocol === 'http:' ? http : https).request(requestOptions)
    request.once('connect', (response, socket, head) => {
      request.removeAllListeners()
      socket.removeAllListeners()
      if (response.statusCode === 200) {
        callback(null, socket)
      } else {
        callback(new Error(`Bad response: ${response.statusCode}`), null)
      }
    })

    request.once('timeout', () => {
      request.destroy(new Error('Proxy timeout'))
    })

    request.once('error', err => {
      request.removeAllListeners()
      callback(err, null)
    })

    request.end()
  }
}

class HttpsProxyAgent extends https.Agent {
  constructor (options) {
    const { proxy, proxyOptions, ...opts } = options
    super(opts)
    this.proxy = typeof proxy === 'string'
      ? new URL(proxy)
      : proxy
    this.proxyOptions = proxyOptions
  }

  createConnection (options, callback) {
    const requestOptions = {
      method: 'CONNECT',
      host: this.proxy.hostname,
      port: this.proxy.port,
      path: `${options.host}:${options.port}`,
      setHost: false,
      headers: { connection: this.keepAlive ? 'keep-alive' : 'close', host: `${options.host}:${options.port}` },
      agent: false,
      timeout: options.timeout || 0,
      ...this.proxyOptions
    }

    if (this.proxy.username || this.proxy.password) {
      const base64 = Buffer.from(`${decodeURIComponent(this.proxy.username || '')}:${decodeURIComponent(this.proxy.password || '')}`).toString('base64')
      requestOptions.headers['proxy-authorization'] = `Basic ${base64}`
    }

    // Necessary for the TLS check with the proxy to succeed.
    if (this.proxy.protocol === 'https:') {
      requestOptions.servername = this.proxy.hostname
    }

    const request = (this.proxy.protocol === 'http:' ? http : https).request(requestOptions)
    request.once('connect', (response, socket, head) => {
      request.removeAllListeners()
      socket.removeAllListeners()
      if (response.statusCode === 200) {
        const secureSocket = super.createConnection({ ...options, socket })
        callback(null, secureSocket)
      } else {
        callback(new Error(`Bad response: ${response.statusCode}`), null)
      }
    })

    request.once('timeout', () => {
      request.destroy(new Error('Proxy timeout'))
    })

    request.once('error', err => {
      request.removeAllListeners()
      callback(err, null)
    })

    request.end()
  }
}

module.exports = {
  HttpProxyAgent,
  HttpsProxyAgent
}
