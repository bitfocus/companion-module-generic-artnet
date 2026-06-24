const { MAX_CHANNEL, MAX_VALUE } = require('./constants')

function getActionDefinitions(self) {
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
					allowExpressions: true,
				},
				{
					type: 'number',
					label: `Value (Range 0-${MAX_VALUE})`,
					id: 'value',
					default: 0,
					min: 0,
					max: MAX_VALUE,
					step: 1,
					allowExpressions: true,
				},
				{
					type: 'number',
					label: `Fade time (ms)`,
					id: 'duration',
					default: 0,
					min: 0,
					step: 1,
					allowExpressions: true,
				},
			],
			callback: (action) => {
				const val = Number(action.options.value)
				const duration = Number(action.options.duration)
				self.transitions.run(action.options.channel - 1, isNaN(val) ? 0 : val, isNaN(duration) ? 0 : duration)
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
					allowExpressions: true,
				},
				{
					type: 'textinput',
					label: `Value (Range 0-${MAX_VALUE})`,
					id: 'value',
					default: '0',
					allowExpressions: true,
				},
				{
					type: 'textinput',
					label: `Fade time (ms)`,
					id: 'duration',
					default: '0',
					allowExpressions: true,
				},
			],
			callback: (action) => {
				const channel = action.options.channel
				const val = action.options.value
				const duration = action.options.duration

				self.transitions.run(Number(channel) - 1, isNaN(val) ? 0 : Number(val), isNaN(duration) ? 0 : Number(duration))
			},
		},
		set_complex: {
			name: 'Set Complex Value',
			options: [
				{
					type: 'textinput',
					label: `Channel (Range 1-${MAX_CHANNEL}), Value (Range 0-${MAX_VALUE});`,
					tooltip:
						'Each parameter should be separated by a comma (,) and each group of parameters should be separated by a semicolon (;). Range notation is supported: use `start-end,value;` to set a value across a channel range (e.g. `1-20,127;`).',
					id: 'params',
					default: '1,0;',
					allowExpressions: true,
					expressionDescription:
						"Format: 'channel,value;channel,value;...'. You can use ranges: 'start-end,value;'. Example: '1-20,127;'. Values are clamped to 0.." + MAX_VALUE + ".",
				},
				{
					type: 'textinput',
					label: `Fade time (ms)`,
					id: 'duration',
					default: 0,
					min: 0,
					step: 1,
					allowExpressions: true,
					expressionDescription: 'Fade time in milliseconds. Provide a number or expression that evaluates to a number (ms).',
				},
			],
			callback: (action) => {
				let params = action.options.params
				let duration = Number(action.options.duration)

				params = String(params || '').replace(/;+$/, '').trim() // remove trailing ';' and trim

				if (params.length === 0) {
					return
				}

				let params_groups = params.split(';')

				const parseChannelSpec = (spec) => {
					spec = String(spec).trim()
					if (spec.indexOf('-') !== -1) {
						const parts = spec.split('-').map((s) => s.trim())
						const start = Number(parts[0])
						const end = Number(parts[1])
						if (isNaN(start) || isNaN(end) || start < 1 || end < start) return []
						const arr = []
						for (let c = start; c <= end; c++) arr.push(c)
						return arr
					}
					const n = Number(spec)
					if (isNaN(n) || n < 1) return []
					return [n]
				}

				for (let i = 0; i < params_groups.length; i++) {
					const group = String(params_groups[i] || '').trim()
					if (group === '') continue

					if (group.indexOf(',') === -1) {
						self.log('error', 'One or more of your parameters are set incorrectly in the "Set Complex Value" action: ' + group)
						return
					}

					let params_values = group.split(',')
					let channelSpec = params_values[0].trim()
					let valRaw = params_values[1].trim()

					const channels = parseChannelSpec(channelSpec)
					if (channels.length === 0) {
						self.log('error', 'Invalid channel specification in Set Complex Value: ' + channelSpec)
						return
					}

					let val = Number(valRaw)
					if (isNaN(val)) val = 0
					// clamp value to allowed range
					val = Math.min(MAX_VALUE, Math.max(0, val))

					for (const ch of channels) {
						if (ch < 1 || ch > MAX_CHANNEL) continue
						self.transitions.run(ch - 1, val, isNaN(duration) ? 0 : duration)
					}
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
					allowExpressions: true,
				},
				{
					type: 'number',
					label: `Value change`,
					id: 'value',
					default: 1,
					min: -MAX_VALUE,
					max: MAX_VALUE,
					step: 1,
					allowExpressions: true,
				},
				{
					type: 'number',
					label: `Fade time (ms)`,
					id: 'duration',
					default: 0,
					min: 0,
					step: 1,
					allowExpressions: true,
				},
			],
			callback: (action) => {
				const channel = action.options.channel - 1
				const val = Number(action.options.value)
				const duration = Number(action.options.duration)
				const newval = Math.min(MAX_VALUE, Math.max(0, self.data[channel] + val)) // clamp to range

				self.transitions.run(action.options.channel - 1, isNaN(newval) ? 0 : newval, isNaN(duration) ? 0 : duration)
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
					allowExpressions: true,
				},
				{
					type: 'textinput',
					label: `Value change`,
					id: 'value',
					default: '1',
					allowExpressions: true,
				},
				{
					type: 'textinput',
					label: `Fade time (ms)`,
					id: 'duration',
					default: '0',
					allowExpressions: true,
				},
			],
			callback: (action) => {
				const channel = action.options.channel
				const val = action.options.value
				const duration = action.options.duration

				let newval = Math.min(MAX_VALUE, Math.max(0, self.data[channel] + Number(val))) // clamp to range

				self.transitions.run(Number(channel) - 1, isNaN(newval) ? 0 : newval, isNaN(duration) ? 0 : Number(duration))
			},
		},
	}
}

module.exports = {
	getActionDefinitions,
}
