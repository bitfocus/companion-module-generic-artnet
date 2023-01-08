const UpgradeScripts = [
	function upgradeCombineHostConfigs(_context, props) {
		const res = {
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
	},
]

module.exports = {
	UpgradeScripts,
}
