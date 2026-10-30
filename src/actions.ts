import type { CompanionActionDefinitions, CompanionInputFieldNumber } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { MAX_CHANNEL, MAX_VALUE } from './constants.js'
import { toDmxValue } from './artnet.js'

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

interface ChannelValue {
	/** 0-based channel index */
	channel: number
	value: number
}

/**
 * Parse a channel number or range, eg `5` or `1-20`
 * @returns the 0-based channel indices, or null if invalid
 */
function parseChannelSpec(spec: string): number[] | null {
	const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(spec.trim())
	if (!match) return null

	const start = Number(match[1])
	const end = match[2] === undefined ? start : Number(match[2])
	if (start < 1 || end > MAX_CHANNEL || end < start) return null

	const channels: number[] = []
	for (let ch = start; ch <= end; ch++) channels.push(ch - 1)
	return channels
}

/**
 * Parse groups of `channel,value` separated by semicolons. The channel can be a range, eg `1-20,127`
 * @returns the values to set, or an error describing the first invalid group
 */
function parseComplexParams(str: string): { values: ChannelValue[] } | { error: string } {
	const values: ChannelValue[] = []

	for (const rawGroup of str.split(';')) {
		const group = rawGroup.trim()
		if (group === '') continue // Allow trailing or doubled up separators

		const [channelSpec, valueStr] = group.split(',')
		if (valueStr === undefined) return { error: `Missing value in "${group}"` }

		const channels = parseChannelSpec(channelSpec)
		if (!channels) return { error: `Invalid channel "${channelSpec.trim()}" in "${group}"` }

		const value = Number(valueStr.trim())
		if (valueStr.trim() === '' || !Number.isFinite(value)) return { error: `Invalid value in "${group}"` }

		for (const channel of channels) values.push({ channel, value })
	}

	return { values }
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
					description: 'Use a range to set multiple channels to the same value, eg 1-20,127;30,255;',
					id: 'params',
					default: '1,0;',
					useVariables: true,
				},
				durationField,
			],
			callback: (action) => {
				// Variables in this textinput field are parsed by Companion before the callback is called
				const result = parseComplexParams(String(action.options.params ?? ''))
				if ('error' in result) {
					self.log('error', `Invalid parameters in the "Set Complex Value" action: ${result.error}`)
					return
				}

				const duration = toNumber(action.options.duration)
				for (const { channel, value } of result.values) {
					self.transitions.run(channel, value, duration)
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
				const newval = toDmxValue(self.data[channel] + Number(action.options.value)) // clamp to range

				self.transitions.run(channel, isNaN(newval) ? 0 : newval, toNumber(action.options.duration))
			},
		},
	}
}
