const { Regex } = require('@companion-module/base')
const { MAX_UNIVERSE, TIMER_SLOW_DEFAULT, TIMER_FAST_DEFAULT } = require('./constants')

const ConfigFields = [
	{
		type: 'static-text',
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
		regex: Regex.IP,
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
	// 	regex: Regex.IP,
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

module.exports = {
	ConfigFields,
}
