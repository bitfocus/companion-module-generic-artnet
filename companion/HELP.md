## Generic Artnet

This module will transmit ArtNet packets to the ip and universe you specify below. If you need multiple universes, use multiple artnet instances.

The Receiver IP can be either:

- The IP address of a single node (unicast). This is the recommended mode.
- A broadcast address, such as `2.255.255.255`, `10.255.255.255`, your subnet broadcast address (eg `192.168.1.255`) or `255.255.255.255`. Every node on the network then receives the data. Use this only on small or dedicated lighting networks.

### Actions

- Set Value: Set a channel in the universe to the specified value
- Set Complex Value: Set multiple channels in the universe to their specified values, written as `channel,value;channel,value;`. A range of channels can be set to the same value, eg `1-20,127;`
- Set Consecutive Values: Set a run of channels starting from a start channel, written as `value,value,value`. Useful for fixtures which use multiple channels, as only the start channel needs changing
- Offset Value: Offset a value by a set amount

Each action can fade to the new value, by setting a fade time.

Any of the numeric fields can use variables and expressions, by switching the field to expression mode. Existing 'by Custom Variable' actions have been converted to the equivalent action using expressions.

### Feedbacks

- Channel Value: The value currently being sent for a channel. This can be stored into a local variable, to show the value on a button
