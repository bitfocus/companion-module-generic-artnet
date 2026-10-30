import type {
	CompanionStaticUpgradeProps,
	CompanionStaticUpgradeResult,
	CompanionStaticUpgradeScript,
	CompanionUpgradeContext,
} from '@companion-module/base'
import type { ModuleConfig } from './config.js'

interface LegacyModuleConfig extends ModuleConfig {
	host_dd?: string
}

function upgradeCombineHostConfigs(
	_context: CompanionUpgradeContext<LegacyModuleConfig>,
	props: CompanionStaticUpgradeProps<LegacyModuleConfig>,
): CompanionStaticUpgradeResult<LegacyModuleConfig> {
	const res: CompanionStaticUpgradeResult<LegacyModuleConfig> = {
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
