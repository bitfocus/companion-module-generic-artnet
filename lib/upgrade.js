function upgradeCombineHostConfigs(_context, config, _actions, _feedbacks) {
	if (config.host_dd) {
		config.host = config.host_dd
		delete config.host_dd
		return true
	} else {
		return false
	}
}

module.exports = {
	upgradeCombineHostConfigs,
}
