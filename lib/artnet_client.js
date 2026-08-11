const dgram = require('dgram')

class SimpleArtnetClient {
    constructor(host, port = 6454, universe = 0) {
        this.host = host
        this.port = port
        this.universe = universe || 0
        this.socket = dgram.createSocket('udp4')
    }

    send(data) {
        // data should be an array-like of channel values (0-255)
        const length = Math.min(512, data.length)
        const payload = Buffer.from(data.slice(0, length))

        // Art-Net packet
        // Header: "Art-Net\0"
        const header = Buffer.from('Art-Net\0', 'ascii')

        // OpDmx opcode little-endian: 0x5000 -> 0x00 0x50
        const opDmx = Buffer.from([0x00, 0x50])

        // Protocol version hi, lo (14)
        const protVer = Buffer.from([0x00, 0x0e])

        // Sequence, physical
        const seqPhy = Buffer.from([0x00, 0x00])

        // Universe (low, high)
        const uni = Buffer.from([this.universe & 0xff, (this.universe >> 8) & 0xff])

        // Length hi, lo
        const lenBuf = Buffer.alloc(2)
        lenBuf.writeUInt16BE(payload.length, 0)

        const packet = Buffer.concat([header, opDmx, protVer, seqPhy, uni, lenBuf, payload])

        this.socket.send(packet, 0, packet.length, this.port, this.host, (err) => {
            if (err) {
                // swallow errors for now; instance should handle connectivity via status
                // console.error('ArtNet send error', err)
            }
        })
    }

    close() {
        try {
            this.socket.close()
        } catch (e) {}
        delete this.socket
    }
}

module.exports = {
    SimpleArtnetClient,
}
