
//
// High level fcns related to interaction w/ EMT contract
//
const common = require('./common');
const ether = require('./ether');
const mtEther = require('./mtEther');
const dhcrypt = require('./dhcrypt');
const BN = require("bn.js");
const swarmjs = require("swarm-js");

const mtUtil = module.exports = {
    acctInfo: null,
    publicKey: null,
    //set internally by encryptMsg
    reCacheAccount: true,
    storageMode: 'ethereum',
    swarm: null,

    // mode: 'ethereum' | 'swarm' | 'auto'
    setMessageStorage: function(mode, swarmGateway) {
	mtUtil.storageMode = mode;
	mtUtil.swarm = swarmjs.at(swarmGateway);
	console.log('setMessageStorage: mtUtil.swarm = ' + !!mtUtil.swarm + ', gateway = ' + swarmGateway);
    },


    //cb(err, acctInfo)
    refreshAcctInfo: function(force, cb) {
	if (!force && !mtUtil.reCacheAccount && !!mtUtil.acctInfo && !!mtUtil.acctInfo.publicKey) {
	    cb(null, mtUtil.acctInfo);
	} else {
	    mtEther.accountQuery(common.web3.eth.accounts[0], function(err, _acctInfo) {
		console.log('refreshAcctInfo: acctInfo: ' + JSON.stringify(_acctInfo));
		if (!!err) {
		    cb(err, null);
		} else {
		    mtUtil.reCacheAccount = false;
		    mtUtil.acctInfo = _acctInfo;
		    mtUtil.publicKey = (!!mtUtil.acctInfo) ? mtUtil.acctInfo.publicKey : null;
		    cb(err, mtUtil.acctInfo);
		}
	    });
	}
    },


    // create a shorter base64 message id from a long hex msgId
    // note: every 3 bytes produces 4 base64 chars; so use a multiple of 3 bytes to avoid padding chars, '=='
    abbreviateMsgId: function(msgId) {
	const idShortHex = common.leftPadTo(common.numberToBN(msgId).toString(16), 36, '0');
	return(common.hexToBase64(idShortHex));
    },


    extractSubject: function(message, maxLen) {
	if (!message)
	    return('');
	if (message.startsWith('Subject: '))
	    message = message.substring(9);
	let newlineIdx = (message.indexOf('\n') > 0) ? message.indexOf('\n') :  message.length;
	if (newlineIdx > maxLen - 1)
	    newlineIdx = maxLen - 1;
	return(message.substring(0, newlineIdx));
    },


    //cb(err, msgIds)
    getSentMsgIds: function(fromAddr, startIdx, count, cb) {
	const msgIds = [];
	const startIdxBn = common.numberToBN(startIdx);
	mtEther.getSentMsgIds(fromAddr, startIdxBn, count, function(err, lastIdx, results) {
	    if (!err) {
		for (let i = 0; i < results.length; ++i)
		    msgIds.push(common.numberToHex256(results[i]));
	    }
	    cb(err, msgIds);
	});
    },


    //cb(err, msgIds)
    getRecvMsgIds: function(toAddr, startIdx, count, cb) {
	const msgIds = [];
	const startIdxBn = common.numberToBN(startIdx);
	mtEther.getRecvMsgIds(toAddr, startIdxBn, count, function(err, lastIdx, results) {
	    if (!err) {
		for (let i = 0; i < results.length; ++i)
		    msgIds.push(common.numberToHex256(results[i]));
	    }
	    cb(err, msgIds);
	});
    },


    //
    // cb(err, msgId, fromAddr, toAddr, viaAddr, txCount, rxCount, attachmentIdxBN, ref, msgHex, blockNumber, date)
    // wrapper around mtEther.parseMessageEvent which masks the use of swarm
    //
    parseMessageEvent: function(msgResult, cb) {
	mtEther.parseMessageEvent(msgResult, function(err, msgId, fromAddr, toAddr, viaAddr, txCount, rxCount, attachmentIdxBN, ref, msgHex, blockNumber, date) {
	    if (!attachmentIdxBN.testn(247)) {
		cb(err, msgId, fromAddr, toAddr, viaAddr, txCount, rxCount, attachmentIdxBN, ref, msgHex, blockNumber, date);
	    } else if (msgHex.length != 66) {
		console.log('parseMessageEvent: ignoring crazy swarm hash = ' + hash);
		cb(err, msgId, fromAddr, toAddr, viaAddr, txCount, rxCount, attachmentIdxBN, ref, msgHex, blockNumber, date);
	    } else {
		const bit247BN = (new BN('0', 16)).setn(247, 1);
		attachmentIdxBN.ixor(bit247BN);
		const hash = msgHex.substring(2);
		console.log('parseMessageEvent: swarm hash = ' + hash);
		mtUtil.swarm.download(hash).then(array => {
		    const swarmMsgHex = mtUtil.swarm.toString(array);
		    //console.log("parseMessageEvent: swarm downloaded:", swarmMsgHex);
		    cb(err, msgId, fromAddr, toAddr, viaAddr, txCount, rxCount, attachmentIdxBN, ref, swarmMsgHex, blockNumber, date);
		}).catch(err => {
		    console.log('parseMessageEvent: swarm error downloading: err = ' + err + ', msg = ', hash);
		    cb(err, msgId, fromAddr, toAddr, viaAddr, txCount, rxCount, attachmentIdxBN, ref, msgHex, blockNumber, date);
		});
	    }
	});
    },


    //
    // wrapper around mtEther.sendMessage which masks the use of swarm
    // cb(err, txid)
    //
    sendMessage: function(toAddr, attachmentIdxBN, ref, encrypted, msgFee, cb) {
	if ((!!mtUtil.swarm                                                                                ) &&
	    (encrypted.length > 0                                                                          ) &&
	    (mtUtil.storageMode == 'swarm' || (mtUtil.storageMode == 'auto' && !attachmentIdxBN.isZero())) ) {
	    const swarmAttachmentIdxBN = attachmentIdxBN.setn(247, 1);
	    console.log('sendMessage: swarmAttachmentIdxBN = 0x' + swarmAttachmentIdxBN.toString(16));
	    const was = common.setLoadingIcon('start');
	    mtUtil.swarm.upload(encrypted).then(hash => {
		console.log("Uploaded file. Address:", hash);
		common.setLoadingIcon(was);
		if (!!hash) {
		    mtEther.sendMessage(toAddr, swarmAttachmentIdxBN, ref, hash, msgFee, cb)
		} else {
		    alert('swarm upload -- no hash!');
		    cb('error uploading to swarm', null);
		}
	    }).catch((err, status) => {
		common.setLoadingIcon(was);
		console.log('sendMessage: swarm upload error: ' + err.toString());
		err = err.message + '\nmessage too large?';
		cb(err, null); });
	} else {
	    mtEther.sendMessage(toAddr, attachmentIdxBN, ref, encrypted, msgFee, cb);
	}
    },


    //
    // get and parse a single msg
    // cb(err, msgId, fromAddr, toAddr, viaAddr, txCount, rxCount, attachmentIdxBN, ref, msgHex, blockNumber, date)
    //
    getAndParseIdMsg: function(msgId, cb) {
	console.log('getAndParseIdMsg: enter msgId = ' + msgId);
	const options = {
	    fromBlock: mtEther.firstBlock,
	    toBlock: 'latest',
	    address: mtEther.EMT_CONTRACT_ADDR,
	    topics: [mtEther.getMessageEventTopic0(), msgId ]
	};
	ether.getLogs(options, function(err, msgResult) {
	    if (!!err || !msgResult || msgResult.length == 0) {
		if (!!err)
		    console.log('getAndParseIdMsg: err = ' + err);
		//either an error, or maybe just no events
		cb(err, '', '', '', '', '', '', null, '', '', '', '');
		return;
	    }
	    mtUtil.parseMessageEvent(msgResult[0], cb);
	});
    },


    //
    // gets up to 9 messages specified in msgIds[]
    // msgCb(err, cookie, msgId, fromAddr, toAddr, viaAddr, txCount, rxCount, attachmentIdxBN, ref, msgHex, blockNumber, date)
    // doneCb(noMessagesProcessed)
    //
    getAndParseIdMsgs: function(msgIds, msgCookies, msgCb, doneCb) {
	console.log('getAndParseIdMsgs: enter msgIds = ' + msgIds.toString());
	const options = {
	    fromBlock: mtEther.firstBlock,
	    toBlock: 'latest',
	    address: mtEther.EMT_CONTRACT_ADDR,
	    topics: [ mtEther.getMessageEventTopic0(), [] ]
	};
	const topicGroup = options.topics[1];
	for (let i = 0; i < msgIds.length; ++i)
	    topicGroup.push(msgIds[i]);
	console.log('getAndParseIdMsgs: options = ' + JSON.stringify(options));
	ether.getLogs3(options, function(err, msgResults) {
	    console.log('getAndParseIdMsgs: err = ' + err + ', msgResults.length = ' + msgResults.length);
	    if (!!err || !msgResults || msgResults.length == 0) {
		if (!!err)
		    console.log('getAndParseIdMsgs: err = ' + err);
		//either an error, or maybe just no events
		for (let i = 0; i < msgIds.length; ++i)
		    msgCb(err, msgCookies[msgIds[i]], msgIds[i], '', '', '', '', '', null, '', '', '', '');
		doneCb(msgIds.length);
		return;
	    }
	    let msgCbCount = 0;
	    let bogusCount = 0;
	    for (let i = 0; i < msgResults.length; ++i) {
		mtUtil.parseMessageEvent(msgResults[i], function(err, msgId, fromAddr, toAddr, viaAddr, txCount, rxCount, attachmentIdxBN, ref, msgHex, blockNumber, date) {
		    if (!!msgCookies[msgId]) {
			console.log('getAndParseIdMsgs: msgId = ' + msgId + ', fromAddr = ' + fromAddr + ', toAddr = ' + toAddr);
			msgCb(err, msgCookies[msgId], msgId, fromAddr, toAddr, viaAddr, txCount, rxCount, attachmentIdxBN, ref, msgHex, blockNumber, date);
			++msgCbCount;
		    } else {
			console.log('getAndParseIdMsgs: got an unexpected msg, msgId = ' + msgId + ', fromAddr = ' + fromAddr + ', toAddr = ' + toAddr);
			++bogusCount;
		    }
		    if (msgCbCount + bogusCount >= msgResults.length)
			doneCb(msgCbCount);
		});
	    }
	});
    },



    //
    // cb(err, messageText, attachment)
    // decrypt message and extract attachment
    //  attachment: { name: 'name', blob: 'saveable-blob' };
    //
    decryptMsg: function(otherAddr, fromAddr, toAddr, nonce, msgHex, attachmentIdxBN, cb) {
	console.log('decryptMsg: otherAddr = ' + otherAddr);
	mtEther.accountQuery(otherAddr, function(err, otherAcctInfo) {
	    const otherPublicKey = (!!otherAcctInfo) ? otherAcctInfo.publicKey : null;
	    if (!!otherPublicKey && otherPublicKey != '0x') {
		const ptk = dhcrypt.ptk(otherPublicKey, toAddr, fromAddr, nonce);
		const decrypted = dhcrypt.decrypt(ptk, msgHex);
		console.log('decryptMsg: decrypted (length = ' + decrypted.length + ') = ' + decrypted.substring(0, 30));
		let messageText = decrypted;
		let attachment = null;
		if (!!attachmentIdxBN && !attachmentIdxBN.isZero()) {
		    console.log('decryptMsg: attachmentIdxBN = 0x' + attachmentIdxBN.toString(16));
		    const idx = attachmentIdxBN.maskn(53).toNumber();
		    console.log('decryptMsg: attachment at idx ' + idx);
		    if (idx > 0) {
			messageText = decrypted.substring(0, idx);
			const nameLen = attachmentIdxBN.iushrn(248).toNumber();
			attachment = { name: decrypted.substring(idx, idx + nameLen), blob: decrypted.substring(idx + nameLen) };
		    }
		}
		cb(null, messageText, attachment);
	    } else {
		console.log('decryptMsg: error looking up account for ' + otherAddr + ', otherPublicKey = ' + otherPublicKey);
		cb('Error looking up account for ' + otherAddr, '', null);
	    }
	});
    },


    // cb(err, msgFee, encrypted, msgNoBN)
    encryptMsg: function(toAddr, message, cb) {
	console.log('encryptMsg');
	mtEther.accountQuery(toAddr, function(err, toAcctInfo) {
	    //encrypt the message...
	    const toPublicKey = (!!toAcctInfo) ? toAcctInfo.publicKey : null;
	    //console.log('encryptMsg: toPublicKey = ' + toPublicKey);
	    if (!toPublicKey || toPublicKey == '0x') {
		cb('Encryption error: unable to look up destination address in contract!', null, null);
		return;
	    }
	    mtUtil.refreshAcctInfo(false, function() {
		//console.log('encryptMsg: mtUtil.acctInfo.sentMsgCount = ' + mtUtil.acctInfo.sentMsgCount);
		const sentMsgCtrBN = common.numberToBN(mtUtil.acctInfo.sentMsgCount);
		sentMsgCtrBN.iaddn(1);
		//console.log('encryptMsg: toPublicKey = ' + toPublicKey);
		const ptk = dhcrypt.ptk(toPublicKey, toAddr, common.web3.eth.accounts[0], '0x' + sentMsgCtrBN.toString(16));
		//console.log('encryptMsg: ptk = ' + ptk);
		const encrypted = (message.length == 0) ? '' : dhcrypt.encrypt(ptk, message);
		console.log('encryptMsg: encrypted (length = ' + encrypted.length + ') = ' + encrypted);
		//in order to figure the message fee we need to see how many messages have been sent from the proposed recipient to me
		mtEther.getPeerMessageCount(toAddr, common.web3.eth.accounts[0], function(err, msgCount) {
		    console.log('encryptMsg: ' + msgCount.toString(10) + ' messages have been sent from ' + toAddr + ' to me');
		    const msgFee = (encrypted.length == 0) ? 0 : (msgCount > 0) ? toAcctInfo.msgFee : toAcctInfo.spamFee;
		    mtUtil.reCacheAccount = true;
		    cb(null, msgFee, encrypted, sentMsgCtrBN);
		});
	    });
	});
    },

    // cb(err)
    // cb is called after user clicks continue
    encryptAndSendMsg: function(msgDesc, toAddr, ref, attachmentIdxBN, message, cb) {
	console.log('encryptAndSendMsg');
	mtUtil.encryptMsg(toAddr, message, function(err, msgFee, encrypted, msgNoBN) {
	    if (!!err) {
		cb(err);
		return;
	    }
	    console.log('encryptAndSendMsg: msgFee is ' + msgFee + ' wei');
	    common.showWaitingForMetaMask(true);
	    const continueFcn = (err, receipt) => {
		common.waitingForTxid = false;
		common.clearStatusDiv(statusDiv);
		cb(err);
	    };
	    mtUtil.sendMessage(toAddr, attachmentIdxBN, ref, encrypted, msgFee, function(err, txid) {
		console.log('encryptAndSendMsg: txid = ' + txid);
		common.showWaitingForMetaMask(false);
		common.waitForTXID(err, txid, msgDesc, continueFcn, ether.etherscanioTxStatusHost, null);
	    });
	});
    },

}
