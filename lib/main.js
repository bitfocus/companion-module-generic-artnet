const artnet = require('artnet-node')
const artnetClient = artnet.Client
const instance_skel = require('../../../instance_skel')
const { upgradeCombineHostConfigs } = require('./upgrade')
// const DiscoveryInstance = require('./discovery')
const { Transitions } = require('./transitions')

const MAX_UNIVERSE = (1 << 15) - 1 // 15bit int
const MAX_CHANNEL = 512
const MAX_VALUE = 255

const TIMER_SLOW_DEFAULT = 1000 // 1hz
const TIMER_FAST_DEFAULT = 40 // 25hz

class instance extends instance_skel {
	constructor(system, id, config) {
		super(system, id, config)

		this.data = new Array(MAX_CHANNEL).fill(0)

		this.init_actions()
	}

	static GetUpgradeScripts() {
		return [upgradeCombineHostConfigs]
	}

	updateConfig(config) {
		this.config = config

		this.transitions.stopAll()
		this.transitions = new Transitions(this.data, this.config.timer_fast || TIMER_FAST_DEFAULT, this.do_send.bind(this))

		this.init_artnet()
		this.init_timers()
	}

	init() {
		this.status(this.STATE_UNKNOWN)

		// DiscoveryInstance.subscribe(this.id)

		this.transitions = new Transitions(this.data, this.config.timer_fast || TIMER_FAST_DEFAULT, this.do_send.bind(this))

		this.init_artnet()
		this.init_timers()
	}
	// When module gets deleted
	destroy() {
		// DiscoveryInstance.unsubscribe(this.id)

		this.transitions.stopAll()

		if (this.client !== undefined) {
			this.client.close()
			delete this.client
		}

		if (this.slow_send_timer) {
			clearInterval(this.slow_send_timer)
			this.slow_send_timer = undefined
		}
	}

	init_timers() {
		if (this.slow_send_timer) {
			clearInterval(this.slow_send_timer)
			this.slow_send_timer = undefined
		}

		this.slow_send_timer = setInterval(() => {
			// Skip the slow poll if a transition is running
			if (!this.transitions.isRunning()) {
				this.do_send()
			}
		}, this.config.timer_slow || TIMER_SLOW_DEFAULT)
	}

	do_send() {
		if (this.client !== undefined) {
			this.client.send(this.data)
		}
	}

	init_artnet() {
		this.status(this.STATE_UNKNOWN)

		// Close current client
		if (this.client !== undefined) {
			this.client.close()
			delete this.client
		}

		if (this.config.host) {
			this.client = new artnetClient(this.config.host, 6454, this.config.universe || 0)

			this.status(this.STATE_OK)
		} else {
			this.status(this.STATUS_ERROR, 'Missing host')
		}
	}
	// Return config fields for web config
	config_fields() {
		return [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value:
					'This module will transmit ArtNet packets to the ip and universe you specify below. If you need more universes, add multiple artnet instances.',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Receiver IP',
				width: 6,
				default: '',
				regex: this.REGEX_IP,
			},
			// {
			// 	type: 'dropdown',
			// 	id: 'host',
			// 	label: 'Receiver IP',
			// 	width: 6,
			// 	choices: DiscoveryInstance.listKnown().map((dev) => ({
			// 		id: dev.address,
			// 		label: `${dev.name} (${dev.address})`,
			// 	})),
			// 	default: '',
			// 	allowCustom: true,
			// 	regex: this.REGEX_IP,
			// },
			{
				type: 'number',
				id: 'universe',
				label: `Universe number (0-${MAX_UNIVERSE})`,
				width: 6,
				default: 0,
				min: 0,
				max: MAX_UNIVERSE,
				step: 1,
			},
			{
				type: 'number',
				id: 'timer_slow',
				label: `Update interval when no fades are running (ms)`,
				width: 6,
				default: TIMER_SLOW_DEFAULT,
				min: 10,
				step: 1,
			},
			{
				type: 'number',
				id: 'timer_fast',
				label: `Update interval for fades (ms)`,
				width: 6,
				default: TIMER_FAST_DEFAULT,
				min: 5,
				step: 1,
			},
		]
	}

	init_actions() {
		this.setActions({
			set: {
				label: 'Set value',
				options: [
					{
						type: 'number',
						label: `Channel (Range 1-${MAX_CHANNEL})`,
						id: 'channel',
						default: 1,
						min: 1,
						max: MAX_CHANNEL,
						step: 1,
					},
					{
						type: 'number',
						label: `Value (Range 0-${MAX_VALUE})`,
						id: 'value',
						default: 0,
						min: 0,
						max: MAX_VALUE,
						step: 1,
					},
					{
						type: 'number',
						label: `Fade time (ms)`,
						id: 'duration',
						default: 0,
						min: 0,
						step: 1,
					},
				],
				callback: (action) => {
					const val = Number(action.options.value)
					const duration = Number(action.options.duration)
					this.transitions.run(action.options.channel - 1, isNaN(val) ? 0 : val, isNaN(duration) ? 0 : duration)
				},
			},
			offset: {
				label: 'Offset value',
				options: [
					{
						type: 'number',
						label: `Channel (Range 1-${MAX_CHANNEL})`,
						id: 'channel',
						default: 1,
						min: 1,
						max: MAX_CHANNEL,
						step: 1,
					},
					{
						type: 'number',
						label: `Value change`,
						id: 'value',
						default: 1,
						min: -MAX_VALUE,
						max: MAX_VALUE,
						step: 1,
					},
					{
						type: 'number',
						label: `Fade time (ms)`,
						id: 'duration',
						default: 0,
						min: 0,
						step: 1,
					},
				],
				callback: (action) => {
					const channel = action.options.channel - 1
					const val = Number(action.options.value)
					const duration = Number(action.options.duration)
					const newval = Math.min(MAX_VALUE, Math.max(0, this.data[channel] + val)) // clamp to range

					this.transitions.run(action.options.channel - 1, isNaN(newval) ? 0 : newval, isNaN(duration) ? 0 : duration)
				},
			},
		})
	}
}

exports = module.exports = instance
