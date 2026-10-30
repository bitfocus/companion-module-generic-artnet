const dgram = require('dgram')

const ARTNET_PORT = 6454 // 0x1936
const ARTNET_ID = Buffer.from('Art-Net\0', 'ascii')
const OP_DMX = 0x5000 // ArtDmx (aka OpOutput)
const PROTOCOL_VERSION = 14

const DMX_HEADER_LENGTH = 18
const DMX_MAX_CHANNELS = 512

/**
 * A minimal Art-Net transmitter, sending ArtDmx packets for a single universe to a single address.
 *
 * The target address can be either:
 *  - a unicast address of a node (the preferred mode since Art-Net II)
 *  - a broadcast address, such as 2.255.255.255, 10.255.255.255, a directed subnet broadcast (eg 192.168.1.255)
 *    or 255.255.255.255 (the Art-Net I style of transmission)
 */
class ArtNetClient {
	#host
	#port
	#universe
	#socket
	#sequence = 0
	#onError

	/**
	 * @param {string} host Target ip address (unicast or broadcast)
	 * @param {number} universe 15bit Port-Address (Net + Sub-Net + Universe)
	 * @param {(err: Error) => void} [onError]
	 * @param {number} [port]
	 */
	constructor(host, universe, onError, port = ARTNET_PORT) {
		this.#host = host
		this.#port = port
		this.#universe = universe & 0x7fff
		this.#onError = onError

		this.#socket = dgram.createSocket('udp4')
		this.#socket.on('error', (err) => this.#reportError(err))

		// Bind to an ephemeral port, so that we can enable broadcast before the first send
		this.#socket.bind(0, () => {
			try {
				this.#socket.setBroadcast(true)
			} catch (e) {
				this.#reportError(e)
			}
		})
	}

	#reportError(err) {
		if (this.#onError) this.#onError(err)
	}

	/**
	 * Build an ArtDmx packet
	 * @param {ArrayLike<number>} data channel values
	 * @returns {Buffer}
	 */
	buildDmxPacket(data) {
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
	 * @param {ArrayLike<number>} data channel values
	 */
	send(data) {
		const buf = this.buildDmxPacket(data)
		this.#socket.send(buf, this.#port, this.#host, (err) => {
			if (err) this.#reportError(err)
		})
	}

	close() {
		try {
			this.#socket.close()
		} catch (_e) {
			// Ignore
		}
	}
}

module.exports = {
	ArtNetClient,
	ARTNET_PORT,
}
