import type { CompanionFeedbackDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { MAX_CHANNEL } from './constants.js'
import { toDmxValue } from './artnet.js'

export type FeedbacksSchema = {
	channel_value: {
		type: 'value'
		options: { channel: number }
	}
}

export function GetFeedbackDefinitions(self: ModuleInstance): CompanionFeedbackDefinitions<FeedbacksSchema> {
	return {
		channel_value: {
			name: 'Channel Value',
			description:
				'The value currently being sent for a channel. Store this in a local variable to show it on a button',
			type: 'value',
			options: [
				{
					type: 'number',
					label: `Channel (Range 1-${MAX_CHANNEL})`,
					id: 'channel',
					default: 1,
					min: 1,
					max: MAX_CHANNEL,
					step: 1,
					asInteger: true,
				},
			],
			callback: (feedback) => {
				const value = self.data[feedback.options.channel - 1]
				// Report the value as it is sent
				return value === undefined ? null : toDmxValue(value)
			},
		},
	}
}
