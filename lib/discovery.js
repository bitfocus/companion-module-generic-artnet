const artnet = require('artnet-node')

/**
 * Note: this does not work properly on any os.
 * It has to bind to the artnet udp port, and if that is done by anything else, then it will fail.
 * Also, it creates a new listener for each concurrent discover call, resulting in only the first one actually working
 * If this discovery wants to be fixed, it needs to coordinate with companion core, to share a single binding to the port.
 */
class ArtnetDiscovery {
	subscribers = new Set()
	knownHosts = new Map()
	queryTimer = undefined

	subscribe(instanceId) {
		const startListening = this.subscribers.size === 0

		this.subscribers.add(instanceId)

		if (startListening) {
			this._startListening()
		}
	}

	unsubscribe(instanceId) {
		if (this.subscribers.delete(instanceId) && this.subscribers.size === 0) {
			this._stopListening()
		}
	}

	listKnown() {
		return Array.from(this.knownHosts.values()).sort((a, b) => a.name.localeCompare(b.name))
	}

	_startListening() {
		this.knownHosts.clear()

		if (!this.queryTimer) {
			this.queryTimer = setInterval(() => this._doPoll(), 5000)
		}

		this._doPoll()
	}

	_discoveredNode(err, devs) {
		if (!err && devs) {
			if (devs.length > 0) {
				for (const dev of devs) {
					if (dev.address) {
						this.knownHosts.set(dev.address, {
							address: dev.address,
							name: dev.name || dev.address,
							seen: Date.now(),
						})
					}
				}
			}
		}
	}

	_stopListening() {
		this.knownHosts.clear()
		if (this.queryTimer) {
			clearInterval(this.queryTimer)
			delete this.queryTimer
		}
	}

	_doPoll() {
		artnet.Server.discover(this._discoveredNode.bind(this), 5000, '10.255.255.255')
		artnet.Server.discover(this._discoveredNode.bind(this), 5000, '2.255.255.255')

		// Forget devices not seen in a while
		for (const [id, entry] in Object.entries(this.knownHosts)) {
			if (Date.now() > entry.seen + 30000) {
				this.knownHosts.delete(id)
			}
		}
	}
}

module.exports = new ArtnetDiscovery()
