import type {
	CompanionStaticUpgradeProps,
	CompanionStaticUpgradeResult,
	CompanionStaticUpgradeScript,
	CompanionUpgradeContext,
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

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig>[] = [upgradeCombineHostConfigs]
