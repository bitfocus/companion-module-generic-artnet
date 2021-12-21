const artnet = require('artnet-node')
const artnetClient = artnet.Client
const instance_skel = require('../../../instance_skel')
const { upgradeCombineHostConfigs } = require('./upgrade')

var discoveries = {}

const MAX_UNIVERSE = (1 << 15) - 1 // 15bit int
const MAX_CHANNEL = 512
const MAX_VALUE = 255

function discovery(err, data) {
	if (!err && data) {
		if (data.length > 0) {
			for (var i = 0; i < data.length; ++i) {
				if (discoveries[data[i].address] === undefined) {
					data[i].ts = Date.now()
					discoveries[data[i].address] = data[i]
				} else {
					discoveries[data[i].address].ts = Date.now()
				}
			}
		}
	}
}

// Check every 5 seconds for artnet hosts
setInterval(function () {
	artnet.Server.discover(discovery, 5000, '10.255.255.255')
	artnet.Server.discover(discovery, 5000, '2.255.255.255')

	// HACK
	discoveries['10.42.13.197'] = { name: 'HACK local test', ts: Date.now() }

	for (var key in discoveries) {
		if (Date.now() > discoveries[key].ts + 10000) {
			delete discoveries[key]
		}
	}
}, 5000)

class instance extends instance_skel {
	constructor(system, id, config) {
		super(system, id, config)

		this.data = []
		for (var i = 0; i < 511; ++i) {
			this.data[i] = 0
		}

		this.init_actions()
	}

	static GetUpgradeScripts() {
		return [upgradeCombineHostConfigs]
	}

	updateConfig(config) {
		this.config = config

		this.init_artnet()
	}

	init() {
		this.status(this.STATE_UNKNOWN)

		this.init_artnet()

		this.send_timer = setInterval(() => {
			if (this.client !== undefined) {
				this.client.send(this.data)
			}
		}, 1000)
	}
	// When module gets deleted
	destroy() {
		if (this.client !== undefined) {
			this.client.close()
			delete this.client
		}

		if (this.send_timer) {
			clearInterval(this.send_timer)
			this.send_timer = undefined
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
				type: 'dropdown',
				id: 'host',
				label: 'Receiver IP',
				width: 6,
				choices: Object.entries(discoveries).map(([id, d]) => ({
					id: id,
					label: `${d.name} (${id})`,
				})),
				default: '',
				allowCustom: true,
				regex: this.REGEX_IP,
			},
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
				],
				callback: (action) => {
					if (this.client !== undefined) {
						const val = Number(action.options.value)
						this.data[action.options.channel - 1] = isNaN(val) ? 0 : val
						this.client.send(this.data)
					}
				},
			},
		})
	}
}

exports = module.exports = instance
