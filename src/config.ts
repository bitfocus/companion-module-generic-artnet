import { Regex, type SomeCompanionConfigField } from '@companion-module/base'
import { MAX_UNIVERSE, TIMER_SLOW_DEFAULT, TIMER_FAST_DEFAULT } from './constants.js'

export interface ModuleConfig {
	host: string
	universe: number
	timer_slow: number
	timer_fast: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value:
				'This module will transmit ArtNet packets to the ip and universe you specify below. If you need more universes, add multiple artnet instances. The Receiver IP can be the address of a single node (unicast, recommended), or a broadcast address such as 2.255.255.255, 10.255.255.255 or your subnet broadcast address (eg 192.168.1.255).',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Receiver IP',
			width: 6,
			default: '',
			regex: Regex.IP,
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
		{
			type: 'number',
			id: 'timer_slow',
			label: `Update interval when no fades are running (ms)`,
			width: 6,
			default: TIMER_SLOW_DEFAULT,
			min: 10,
			max: Number.MAX_SAFE_INTEGER,
			step: 1,
		},
		{
			type: 'number',
			id: 'timer_fast',
			label: `Update interval for fades (ms)`,
			width: 6,
			default: TIMER_FAST_DEFAULT,
			min: 5,
			max: Number.MAX_SAFE_INTEGER,
			step: 1,
		},
	]
}
