const artnet = require('artnet-node')
const artnetClient = artnet.Client
const { UpgradeScripts } = require('./upgrade')
// const DiscoveryInstance = require('./discovery')
const { Transitions } = require('./transitions')
const { MAX_CHANNEL, TIMER_SLOW_DEFAULT, TIMER_FAST_DEFAULT } = require('./constants')
const { getActionDefinitions } = require('./actions')
const { InstanceBase, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const { ConfigFields } = require('./config')

class ArtnetInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		this.data = new Array(MAX_CHANNEL).fill(0)
	}

	async init(config) {
		this.config = config

		this.setActionDefinitions(getActionDefinitions(this))

		// DiscoveryInstance.subscribe(this.id)

		await this.configUpdated(config)
	}

	async configUpdated(config) {
		this.config = config

		if (this.transitions) this.transitions.stopAll()
		this.transitions = new Transitions(this.data, this.config.timer_fast || TIMER_FAST_DEFAULT, this.do_send.bind(this))

		// Close current client
		if (this.client !== undefined) {
			this.client.close()
			delete this.client
		}

		if (this.config.host) {
			this.client = new artnetClient(this.config.host, 6454, this.config.universe || 0)

			this.updateStatus(InstanceStatus.Ok)
		} else {
			this.updateStatus(InstanceStatus.BadConfig, 'Missing host')
		}

		if (this.slow_send_timer) {
			clearInterval(this.slow_send_timer)
			delete this.slow_send_timer
		}

		this.slow_send_timer = setInterval(() => {
			// Skip the slow poll if a transition is running
			if (!this.transitions.isRunning()) {
				this.do_send()
			}
		}, this.config.timer_slow || TIMER_SLOW_DEFAULT)
	}

	// When module gets deleted
	async destroy() {
		// DiscoveryInstance.unsubscribe(this.id)

		this.transitions.stopAll()

		if (this.client) {
			this.client.close()
			delete this.client
		}

		if (this.slow_send_timer) {
			clearInterval(this.slow_send_timer)
			delete this.slow_send_timer
		}
	}

	do_send() {
		if (this.client) {
			this.client.send(this.data)
		}
	}

	// Return config fields for web config
	getConfigFields() {
		return ConfigFields
	}
}

runEntrypoint(ArtnetInstance, UpgradeScripts)
