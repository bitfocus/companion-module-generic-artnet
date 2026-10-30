import type { CompanionActionDefinitions, CompanionInputFieldNumber } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { MAX_CHANNEL, MAX_VALUE } from './constants.js'

export type ActionsSchema = {
	set: { options: { channel: number; value: number; duration: number } }
	set_complex: { options: { params: string; duration: number } }
	set_consecutive: { options: { start: number; values: string; duration: number } }
	offset: { options: { channel: number; value: number; duration: number } }
}

/** Convert a value to a number, falling back to 0 when it is not a valid number */
function toNumber(value: unknown): number {
	const num = Number(value)
	return isNaN(num) ? 0 : num
}

function channelField<TKey extends string>(id: TKey, label: string): CompanionInputFieldNumber<TKey> {
	return {
		type: 'number',
		label: `${label} (Range 1-${MAX_CHANNEL})`,
		id,
		default: 1,
		min: 1,
		max: MAX_CHANNEL,
		step: 1,
		asInteger: true,
	}
}

const durationField: CompanionInputFieldNumber<'duration'> = {
	type: 'number',
	label: `Fade time (ms)`,
	id: 'duration',
	default: 0,
	min: 0,
	max: Number.MAX_SAFE_INTEGER,
	step: 1,
	clampValues: true,
}

/**
 * Parse a list of values, separated by commas
 * @returns the values, or null if any of them are not a finite number
 */
function parseValueList(str: string): number[] | null {
	const values: number[] = []
	for (const part of str.replace(/,+\s*$/, '').split(',')) {
		const value = Number(part.trim())
		if (part.trim() === '' || !Number.isFinite(value)) return null
		values.push(value)
	}
	return values
}

export function GetActionDefinitions(self: ModuleInstance): CompanionActionDefinitions<ActionsSchema> {
	return {
		set: {
			name: 'Set Value',
			options: [
				channelField('channel', 'Channel'),
				{
					type: 'number',
					label: `Value (Range 0-${MAX_VALUE})`,
					id: 'value',
					default: 0,
					min: 0,
					max: MAX_VALUE,
					step: 1,
					clampValues: true,
				},
				durationField,
			],
			callback: (action) => {
				self.transitions.run(
					action.options.channel - 1,
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
						'Each parameter should be separated by a comma (,) and each group of parameters should be separated by a semicolon (;)',
					id: 'params',
					default: '1,0;',
					useVariables: true,
				},
				durationField,
			],
			callback: (action) => {
				// Variables in this textinput field are parsed by Companion before the callback is called
				const params = String(action.options.params ?? '').replace(/;+\s*$/, '') //remove any trailing ';' as they are not needed
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
		set_consecutive: {
			name: 'Set Consecutive Values',
			description: 'Set a run of channels, starting from the given channel. Useful for fixtures with multiple channels',
			options: [
				channelField('start', 'Start channel'),
				{
					type: 'textinput',
					label: `Values (Range 0-${MAX_VALUE})`,
					tooltip: 'Each value should be separated by a comma (,). The first value is set on the start channel',
					description: 'eg 255,100,0 sets the start channel to 255, the next channel to 100 and the one after to 0',
					id: 'values',
					default: '0',
					useVariables: true,
				},
				durationField,
			],
			callback: (action) => {
				// Variables in this textinput field are parsed by Companion before the callback is called
				const values = parseValueList(String(action.options.values ?? ''))
				if (!values) {
					self.log(
						'error',
						'One or more of your values are set incorrectly in the "Set Consecutive Values" action: ' +
							action.options.values,
					)
					return
				}

				const start = action.options.start - 1
				const duration = toNumber(action.options.duration)

				values.forEach((value, i) => self.transitions.run(start + i, value, duration))
			},
		},
		offset: {
			name: 'Offset Value',
			options: [
				channelField('channel', 'Channel'),
				{
					type: 'number',
					label: `Value change`,
					id: 'value',
					default: 1,
					min: -MAX_VALUE,
					max: MAX_VALUE,
					step: 1,
					clampValues: true,
				},
				durationField,
			],
			callback: (action) => {
				const channel = action.options.channel - 1
				const newval = Math.min(MAX_VALUE, Math.max(0, self.data[channel] + Number(action.options.value))) // clamp to range

				self.transitions.run(channel, isNaN(newval) ? 0 : newval, toNumber(action.options.duration))
			},
		},
	}
}
