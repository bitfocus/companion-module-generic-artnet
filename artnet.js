var artnet = require('artnet-node')
var artnetClient = artnet.Client
var instance_skel = require('../../instance_skel')

var discoveries = {}

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

		if (this.config.host_dd || this.config.host) {
			this.client = new artnetClient(this.config.host_dd || this.config.host, 6454, this.config.universe || 0)

			this.status(this.STATE_OK)
		}
	}
	// Return config fields for web config
	config_fields() {
		var fields = [
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
				regex: this.REGEX_IP,
			},
		]

		if (Object.keys(discoveries).length > 0 || this.config.host_dd) {
			var choices = [{ id: '', label: 'Custom ip' }]

			if (this.config.host_dd && discoveries[this.config.host_dd] === undefined) {
				choices.push({ id: this.config.host_dd, label: this.config.host_dd + ' (not seen for a while)' })
			}

			for (var key in discoveries) {
				choices.push({ id: key, label: discoveries[key].name + ' (' + key + ')' })
			}

			fields.push({
				type: 'dropdown',
				id: 'host_dd',
				label: 'Or choose from discovered receivers:',
				width: 6,
				default: '',
				choices: choices,
			})
		}

		fields.push({
			type: 'textinput',
			id: 'universe',
			label: 'Universe number (0-63)',
			width: 6,
			default: 0,
			regex: '/^0*([0-9]|[1-5][0-9]|6[0-3])$/',
		})

		return fields
	}

	init_actions() {
		this.setActions({
			set: {
				label: 'Set value',
				options: [
					{
						type: 'textinput',
						label: 'Channel (Range 1-512)',
						id: 'channel',
						default: '1',
						regex: '/^0*([1-9]|[1-8][0-9]|9[0-9]|[1-4][0-9]{2}|50[0-9]|51[012])$/', // 1-512
					},
					{
						type: 'textinput',
						label: 'Value (Range 0-255)',
						id: 'value',
						default: '0',
						regex: '/^0*([0-9]|[1-8][0-9]|9[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/', // 0-255
					},
				],
				callback: (action) => {
					if (this.client !== undefined) {
						this.data[action.options.channel - 1] = action.options.value
						this.client.send(this.data)
					}
				},
			},
		})
	}
}

exports = module.exports = instance
