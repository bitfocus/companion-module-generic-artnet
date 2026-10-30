## Generic Artnet

This module will transmit ArtNet packets to the ip and universe you specify below. If you need multiple universes, use multiple artnet instances.

The Receiver IP can be either:

- The IP address of a single node (unicast). This is the recommended mode.
- A broadcast address, such as `2.255.255.255`, `10.255.255.255`, your subnet broadcast address (eg `192.168.1.255`) or `255.255.255.255`. Every node on the network then receives the data. Use this only on small or dedicated lighting networks.

### Actions

- Set Value: Set a channel in the universe to the specified value
- Set Value by Custom Variable: Set a channel in the universe to the specified value, by typing in custom variables
- Set Complex Value: Set multiple channels in the universe to their specified values
- Ofset Value: Offset a value by a set amount
- Ofset Value by Custom Variable: Offset a value by a set amount, by typing in custom variables
