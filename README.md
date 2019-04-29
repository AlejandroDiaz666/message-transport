# Turms Anonmous Message Transport

## Introduction

Turms Anonymous Message Transport is a completely decentralized, peer-to-peer, encrypted mail and messaging system that is intimately tied to the Ethereum blockchain. The user interface provides mechanisms to:
 - create an account that is connected to an Ethereum address
 - send a message to another Turms AMT account (identified by Ethereum address or ENS name)
 - view/search messages that have been sent or received

In addition to the above services, which are pretty standard for an email/messaging system, Turms AMT contains several novel features:
 - All messages are encrypted and can only be decrypted using the private key of the recipient’s Ethereum account.
 - A user can set a "Message Fee" and/or "Spam Fee" for his account. That is, the user can require a small payment with every message – and a different (eg. higher) payment for spam messages.


## Operation

Each Ethereum address that registers with Turms AMT sets a "Message Fee" and a "Spam Fee". A message, sent from a source address to a destination address, is considered spam if no message has ever been sent in the other direction; that is, from the destination address to the source address. The only exception is that an empty message doesn't have to pay any fee at all. Note: 15% of spam and message fees goes to the Turms AMT token holders. 15% of the spam and message fees is burned; that is, it is destroyed to increase the value of Ether.


## Swarm

By default messages are stored in the Ethereum blockchain as event logs. However from the options panel the user can select to store all messages on Swarm (with only the message hashes stored on the Ethereum blockchain as event logs). When storing messages on Swarm it's possible to send much larger messages/attachments. The limit for Ethereum event logs is in the range of 20KB, and the current limit for Swarm is more than 10 times that. Storing messages on Swarm is cheaper, especially when sending large messages/attachments -- however, messages stored on Swarm are not guaranteed to persist. The default swarm gateway is https://swarm-gateways.net, but this can also be changed in the options panel. There is also an option to only use Swarm only for messages that have attachments.


## Encryption

The symmetrical secret keys that are used for encryption are derived from a computed PMK. The PMK is computed using Diffie-Hellman from an encrypted 2048-bit private key that is stored in the Turms AMT contract, together with the public key of the other endpoint, which is also stored in the contract. In order to decrypt the 2048-bit private key you need to generate a code by signing a message with MetaMask. The signature is never transmitted or stored anywhere – it is only used to decrypt the 2048-bit private key. The generated PMK is unique to each pair of endpoints (sender and receiver) and never stored on any server, or ever used to encrypt any messages – instead the PMK is combined with a nonce to create a PTK. The PTK is computed by both the sender and receiver to encrypt and decrypt a single message.


## Building

* `Install browserfy`
* `cd ui`
* `npm install`
* `patch -p0 < ./swarm.patch`
* `make`
* `cp -R build/* /var/web/html/`

To make a deployable version

* `make deploy`
