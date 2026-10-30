import {
	FixupNumericOrVariablesValueToExpressions,
	type CompanionStaticUpgradeProps,
	type CompanionStaticUpgradeResult,
	type CompanionStaticUpgradeScript,
	type CompanionUpgradeContext,
	type ExpressionOrValue,
	type JsonValue,
} from '@companion-module/base'
import type { ModuleConfig } from './config.js'

type LegacyModuleConfig = ModuleConfig & {
	host_dd?: string
}

function upgradeCombineHostConfigs(
	_context: CompanionUpgradeContext<LegacyModuleConfig>,
	props: CompanionStaticUpgradeProps<LegacyModuleConfig, undefined>,
): CompanionStaticUpgradeResult<LegacyModuleConfig, undefined> {
	const res: CompanionStaticUpgradeResult<LegacyModuleConfig, undefined> = {
		updatedConfig: null,
		updatedActions: [],
		updatedFeedbacks: [],
	}

	if (props.config && props.config.host_dd) {
		props.config.host = props.config.host_dd
		delete props.config.host_dd

		res.updatedConfig = props.config
	}

	return res
}

/**
 * Convert a textinput value that may contain variables to a number or expression.
 * An empty value was previously treated as 0, so preserve that
 */
function fixupNumberValue(
	value: ExpressionOrValue<JsonValue | undefined> | undefined,
	emptyAsZero: boolean,
): ExpressionOrValue<JsonValue | undefined> | undefined {
	if (
		emptyAsZero &&
		value &&
		!value.isExpression &&
		(value.value == null || (typeof value.value === 'string' && value.value.trim() === ''))
	) {
		return { isExpression: false, value: 0 }
	}
	return FixupNumericOrVariablesValueToExpressions(value)
}

/**
 * Since Companion 4.3, users can provide every value as an expression.
 * This makes the 'by Custom Variable' actions redundant, so merge them into their number based equivalents,
 * and convert the fade time of 'Set Complex Value' to a number field
 */
function upgradeMergeVariableActions(
	_context: CompanionUpgradeContext<ModuleConfig>,
	props: CompanionStaticUpgradeProps<ModuleConfig, undefined>,
): CompanionStaticUpgradeResult<ModuleConfig, undefined> {
	const res: CompanionStaticUpgradeResult<ModuleConfig, undefined> = {
		updatedConfig: null,
		updatedActions: [],
		updatedFeedbacks: [],
	}

	const mergedActions: Record<string, string> = {
		set_customvariable: 'set',
		offset_customvariable: 'offset',
	}

	for (const action of props.actions) {
		const newActionId = mergedActions[action.actionId]
		if (newActionId) {
			action.actionId = newActionId
			// An empty channel did nothing before, and will still fail validation
			action.options.channel = fixupNumberValue(action.options.channel, false)
			action.options.value = fixupNumberValue(action.options.value, true)
			action.options.duration = fixupNumberValue(action.options.duration, true)
			res.updatedActions.push(action)
		} else if (action.actionId === 'set_complex') {
			action.options.duration = fixupNumberValue(action.options.duration, true)
			res.updatedActions.push(action)
		}
	}

	return res
}

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig>[] = [
	upgradeCombineHostConfigs,
	upgradeMergeVariableActions,
]
