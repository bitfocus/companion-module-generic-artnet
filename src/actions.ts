import type { CompanionActionDefinitions, InputValue } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import { MAX_CHANNEL, MAX_VALUE } from './constants.js'

/** Convert an option value to a number, falling back to 0 when it is not a valid number */
function toNumber(value: InputValue | undefined): number {
	const num = Number(value)
	return isNaN(num) ? 0 : num
}

export function GetActionDefinitions(self: ModuleInstance): CompanionActionDefinitions {
	return {
		set: {
			name: 'Set Value',
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
					max: Number.MAX_SAFE_INTEGER,
					step: 1,
				},
			],
			callback: (action) => {
				self.transitions.run(
					Number(action.options.channel) - 1,
					toNumber(action.options.value),
					toNumber(action.options.duration),
				)
			},
		},
		set_customvariable: {
			name: 'Set Value by Custom Variable',
			options: [
				{
					type: 'textinput',
					label: `Channel (Range 1-${MAX_CHANNEL})`,
					id: 'channel',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: `Value (Range 0-${MAX_VALUE})`,
					id: 'value',
					default: '0',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: `Fade time (ms)`,
					id: 'duration',
					default: '0',
					useVariables: true,
				},
			],
			callback: (action) => {
				// Variables in these textinput fields are parsed by Companion before the callback is called
				self.transitions.run(
					Number(action.options.channel) - 1,
					toNumber(action.options.value),
					toNumber(action.options.duration),
				)
			},
		},
		set_complex: {
			name: 'Set Complex Value',
			options: [
				{
					type: 'textinput',
					label: `Channel (Range 1-${MAX_CHANNEL}), Value (Range 0-${MAX_VALUE});`,
					tooltip:
						'Each parameter should be separated by a colon (,) and each group of parameters should be separated by a semicolon (;)',
					id: 'params',
					default: '1,0;',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: `Fade time (ms)`,
					id: 'duration',
					default: '0',
					useVariables: true,
				},
			],
			callback: (action) => {
				// Variables in these textinput fields are parsed by Companion before the callback is called
				const params = String(action.options.params ?? '').replace(/;+$/, '') //remove any trailing ';' as they are not needed
				const duration = toNumber(action.options.duration)

				const params_groups = params.split(';')

				for (const group of params_groups) {
					if (group.indexOf(',') === -1) {
						self.log(
							'error',
							'One or more of your parameters are set incorrectly in the "Set Complex Value" action: ' + group,
						)
						return
					}

					const params_values = group.split(',')

					const channel = Number(params_values[0])

					self.transitions.run(channel - 1, toNumber(params_values[1]), duration)
				}
			},
		},
		offset: {
			name: 'Offset Value',
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
					max: Number.MAX_SAFE_INTEGER,
					step: 1,
				},
			],
			callback: (action) => {
				const channel = Number(action.options.channel) - 1
				const newval = Math.min(MAX_VALUE, Math.max(0, self.data[channel] + Number(action.options.value))) // clamp to range

				self.transitions.run(channel, isNaN(newval) ? 0 : newval, toNumber(action.options.duration))
			},
		},
		offset_customvariable: {
			name: 'Offset Value by Custom Variable',
			options: [
				{
					type: 'textinput',
					label: `Channel (Range 1-${MAX_CHANNEL})`,
					id: 'channel',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: `Value change`,
					id: 'value',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: `Fade time (ms)`,
					id: 'duration',
					default: '0',
					useVariables: true,
				},
			],
			callback: (action) => {
				// Variables in these textinput fields are parsed by Companion before the callback is called
				const channel = Number(action.options.channel) - 1
				const newval = Math.min(MAX_VALUE, Math.max(0, self.data[channel] + Number(action.options.value))) // clamp to range

				self.transitions.run(channel, isNaN(newval) ? 0 : newval, toNumber(action.options.duration))
			},
		},
	}
}
