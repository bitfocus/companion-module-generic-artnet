import { InstanceBase, runEntrypoint, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { ArtNetClient } from './artnet.js'
import { UpgradeScripts } from './upgrades.js'
import { Transitions } from './transitions.js'
import { MAX_CHANNEL, TIMER_SLOW_DEFAULT, TIMER_FAST_DEFAULT } from './constants.js'
import { GetActionDefinitions } from './actions.js'
import { GetConfigFields, type ModuleConfig } from './config.js'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()

	readonly data: number[] = new Array<number>(MAX_CHANNEL).fill(0)
	transitions!: Transitions // Setup in init()

	#client: ArtNetClient | undefined
	#slowSendTimer: NodeJS.Timeout | undefined

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.setActionDefinitions(GetActionDefinitions(this))

		await this.configUpdated(config)
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config

		if (this.transitions) this.transitions.stopAll()
		this.transitions = new Transitions(this.data, this.config.timer_fast || TIMER_FAST_DEFAULT, () => this.doSend())

		// Close current client
		if (this.#client !== undefined) {
			this.#client.close()
			this.#client = undefined
		}

		if (this.config.host) {
			let lastError: string | null = null
			this.#client = new ArtNetClient(this.config.host, this.config.universe || 0, (err) => {
				if (err) {
					// Avoid flooding the log with the same error on every send
					if (lastError !== err.message) {
						lastError = err.message
						this.log('error', `Network error: ${err.message}`)
						this.updateStatus(InstanceStatus.ConnectionFailure, err.message)
					}
				} else if (lastError !== null) {
					// Sending has recovered
					lastError = null
					this.log('info', 'Network error cleared')
					this.updateStatus(InstanceStatus.Ok)
				}
			})

			this.updateStatus(InstanceStatus.Ok)
		} else {
			this.updateStatus(InstanceStatus.BadConfig, 'Missing host')
		}

		if (this.#slowSendTimer) {
			clearInterval(this.#slowSendTimer)
			this.#slowSendTimer = undefined
		}

		this.#slowSendTimer = setInterval(() => {
			// Skip the slow poll if a transition is running
			if (!this.transitions.isRunning()) {
				this.doSend()
			}
		}, this.config.timer_slow || TIMER_SLOW_DEFAULT)
	}

	// When module gets deleted
	async destroy(): Promise<void> {
		this.transitions.stopAll()

		if (this.#client) {
			this.#client.close()
			this.#client = undefined
		}

		if (this.#slowSendTimer) {
			clearInterval(this.#slowSendTimer)
			this.#slowSendTimer = undefined
		}
	}

	doSend(): void {
		if (this.#client) {
			this.#client.send(this.data)
		}
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
