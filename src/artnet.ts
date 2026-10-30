import dgram from 'node:dgram'

export const ARTNET_PORT = 6454 // 0x1936
const ARTNET_ID = Buffer.from('Art-Net\0', 'ascii')
const OP_DMX = 0x5000 // ArtDmx (aka OpOutput)
const PROTOCOL_VERSION = 14

const DMX_HEADER_LENGTH = 18
const DMX_MAX_CHANNELS = 512

export type ArtNetStatusCallback = (err: Error | null) => void

/**
 * A minimal Art-Net transmitter, sending ArtDmx packets for a single universe to a single address.
 *
 * The target address can be either:
 *  - a unicast address of a node (the preferred mode since Art-Net II)
 *  - a broadcast address, such as 2.255.255.255, 10.255.255.255, a directed subnet broadcast (eg 192.168.1.255)
 *    or 255.255.255.255 (the Art-Net I style of transmission)
 */
export class ArtNetClient {
	readonly #host: string
	readonly #port: number
	readonly #universe: number
	readonly #socket: dgram.Socket
	#sequence = 0
	readonly #onStatus: ArtNetStatusCallback | undefined

	/**
	 * @param host Target ip address (unicast or broadcast)
	 * @param universe 15bit Port-Address (Net + Sub-Net + Universe)
	 * @param onStatus Called with an error when something fails, or null after each successful send
	 * @param port
	 */
	constructor(host: string, universe: number, onStatus?: ArtNetStatusCallback, port = ARTNET_PORT) {
		this.#host = host
		this.#port = port
		this.#universe = universe & 0x7fff
		this.#onStatus = onStatus

		this.#socket = dgram.createSocket('udp4')
		this.#socket.on('error', (err) => this.#reportError(err))

		// Bind to an ephemeral port, so that we can enable broadcast before the first send
		this.#socket.bind(0, () => {
			try {
				this.#socket.setBroadcast(true)
			} catch (e) {
				this.#reportError(e instanceof Error ? e : new Error(String(e)))
			}
		})
	}

	#reportError(err: Error): void {
		if (this.#onStatus) this.#onStatus(err)
	}

	/**
	 * Build an ArtDmx packet
	 * @param data channel values
	 */
	buildDmxPacket(data: ArrayLike<number>): Buffer {
		// Length must be even, and in the range 2-512
		let length = Math.min(data.length, DMX_MAX_CHANNELS)
		if (length % 2 === 1) length++
		if (length < 2) length = 2

		// 0 means sequencing is disabled, so cycle through 1-255
		this.#sequence = (this.#sequence % 255) + 1

		const buf = Buffer.alloc(DMX_HEADER_LENGTH + length)
		ARTNET_ID.copy(buf, 0)
		buf.writeUInt16LE(OP_DMX, 8)
		buf.writeUInt16BE(PROTOCOL_VERSION, 10)
		buf.writeUInt8(this.#sequence, 12)
		buf.writeUInt8(0, 13) // Physical: informational only
		buf.writeUInt16LE(this.#universe, 14) // SubUni (low byte), then Net (high 7 bits)
		buf.writeUInt16BE(length, 16)

		const count = Math.min(data.length, length)
		for (let i = 0; i < count; i++) {
			const value = Math.round(Number(data[i]) || 0)
			buf[DMX_HEADER_LENGTH + i] = Math.max(0, Math.min(255, value))
		}

		return buf
	}

	/**
	 * Send a frame of dmx data
	 * @param data channel values
	 */
	send(data: ArrayLike<number>): void {
		const buf = this.buildDmxPacket(data)
		this.#socket.send(buf, this.#port, this.#host, (err) => {
			if (this.#onStatus) this.#onStatus(err || null)
		})
	}

	close(): void {
		try {
			this.#socket.close()
		} catch (_e) {
			// Ignore
		}
	}
}
