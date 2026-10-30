var dgram = require('dgram');
var Buffer = require('buffer').Buffer;

var HEADER       = "Art-Net\0";
var OP_OUTPUT    = 0x5000; // 0x5000 - Standard ArtDMX data packet
var OP_POLL      = 0x2000; // 0x2000 - ArtPoll packet
var OP_POLLREPLY = 0x2100; // 0x2100 - ArtPollReply packet
var PROTOCOL_VERSION = 14;

// Defaults
var SEQUENCE = 0;
var PHYSICAL = 0;

var PORT = 6454;

function artnet_header(opcode) {
	var buf = new Buffer(12);
	buf.write(HEADER);
	buf.writeUInt16LE(opcode, 8);
	buf.writeUInt16BE(PROTOCOL_VERSION, 10);
	return buf;
}

function ArtNetClient(host, port, universe) {
	this._host     = host;
	this._port     = port;
	this._socket   = dgram.createSocket("udp4");
	this.universe = universe;
	this.sequence  = SEQUENCE;
	this.physical  = PHYSICAL;
}

ArtNetClient.prototype.send = function(data, callback) {
	var self = this;

	// Adjust data length, length must be even according to protocol
	if (data.length % 2 == 1) {
		data.push(0);
	}

	var header = artnet_header(OP_OUTPUT);
	var header_opOutput = new Buffer(6);

	// Sequence, Int8
	header_opOutput.writeUInt8(this.sequence, 0);

	// Physical, input Int8
	header_opOutput.writeUInt8(this.physical, 1);

	// Universe number, 15 bit accuracy
	header_opOutput.writeUInt16LE(this.universe & 0x7FFF, 2);

	// Data length
	header_opOutput.writeUInt16BE(data.length, 4);

	var buf = Buffer.concat([header, header_opOutput, new Buffer(data)]);
	this._socket.send(buf, 0, buf.length, this._port, this._host, function(err, res) {
		if (typeof callback == 'function') {
			callback.call(self, err, res);
		}
	});
}

ArtNetClient.prototype.close = function(){
	try {
		this._socket.close();
	} catch (err) {
		// Ignore
	}
}

exports.createClient = function(host, port, universe) {
	return new ArtNetClient(host, port, universe);
}

exports.ArtNetClient = ArtNetClient;
