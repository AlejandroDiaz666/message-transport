
//
// high level fcns related to interaction w/ EMT contract
//
const common = require('./common');
const ether = require('./ether');
const mtEther = require('./mtEther');
const dhcrypt = require('./dhcrypt');
const BN = require("bn.js");

const mtUtil = module.exports = {

    // create a shorter base64 message id from a long hex msgId
    // note: every 3 bytes produces 4 base64 chars; so use a multiple of 3 bytes to avoid padding chars, '=='
    abbreviateMsgId: function(msgId) {
	const idShortHex = common.leftPadTo(common.numberToBN(msgId).toString(16), 36, '0');
	return(common.hexToBase64(idShortHex));
    },


    extractSubject: function(message, maxLen) {
	if (message.startsWith('Subject: '))
	    message = message.substring(9);
	let newlineIdx = (message.indexOf('\n') > 0) ? message.indexOf('\n') :  message.length;
	if (newlineIdx > maxLen - 1)
	    newlineIdx = maxLen - 1;
	return(message.substring(0, newlineIdx));
    },


    //cb(err, msgIds)
    getSentMsgIds: function(fromAddr, batch, cb) {
	const msgIds = [];
	const startIdxBn = new BN(batch).imuln(10);
	mtEther.getSentMsgIds(common.web3, fromAddr, startIdxBn, 10, function(err, lastIdx, results) {
	    if (!err) {
		for (let i = 0; i < results.length; ++i)
		    msgIds.push(common.numberToHex256(results[i]));
	    }
	    cb(err, msgIds);
	});
    },


    //cb(err, msgIds)
    getRecvMsgIds: function(toAddr, batch, cb) {
	const msgIds = [];
	const startIdxBn = new BN(batch).imuln(10);
	mtEther.getRecvMsgIds(common.web3, toAddr, startIdxBn, 10, function(err, lastIdx, results) {
	    if (!err) {
		for (let i = 0; i < results.length; ++i)
		    msgIds.push(common.numberToHex256(results[i]));
	    }
	    cb(err, msgIds);
	});
    },


    //
    // get and parse a single msg
    // cb(err, msgId, fromAddr, toAddr, txCount, rxCount, mimeType, ref, msgHex, blockNumber, date)
    //
    getAndParseIdMsg: function(msgId, cb) {
	console.log('getAndParseIdMsg: enter msgId = ' + msgId);
	const options = {
	    fromBlock: 0,
	    toBlock: 'latest',
	    address: mtEther.EMT_CONTRACT_ADDR,
	    topics: [mtEther.getMessageEventTopic0(), msgId ]
	};
	ether.getLogs(options, function(err, msgResult) {
	    if (!!err || !msgResult || msgResult.length == 0) {
		if (!!err)
		    console.log('getAndParseIdMsg: err = ' + err);
		//either an error, or maybe just no events
		cb(err, '', '', '', '', '', '', '', '', '', '');
		return;
	    }
	    mtEther.parseMessageEvent(msgResult[0], cb);
	});
    },


    //
    // gets up to 3 messages specified in msgIds[]
    // msgCb(err, msgId, fromAddr, toAddr, txCount, rxCount, mimeType, ref, msgHex, blockNumber, date)
    // doneCb(noMessagesProcessed)
    //
    getAndParseIdMsgs: function(msgIds, msgCookies, msgCb, doneCb) {
	console.log('getAndParseIdMsgs: enter msgIds = ' + msgIds);
	const options = {
	    fromBlock: 0,
	    toBlock: 'latest',
	    address: mtEther.EMT_CONTRACT_ADDR,
	    topics: [ mtEther.getMessageEventTopic0() ]
	};
	if (msgIds.length > 0) {
	    if (!!msgIds[0])
		options.topics.push(msgIds[0]);
	    if (options.topics.length > 1) {
		if (!!msgIds[1])
		    options.topics.push(msgIds[1]);
		if (options.topics.length > 2) {
		    if (!!msgIds[2])
			options.topics.push(msgIds[2]);
		}
	    }
	}
	console.log('getAndParseIdMsgs: options = ' + JSON.stringify(options));
	ether.getLogs3(options, function(err, msgResults) {
	    console.log('getAndParseIdMsgs: err = ' + err + ', msgResults.length = ' + msgResults.length);
	    if (!!err || !msgResults || msgResults.length == 0) {
		if (!!err)
		    console.log('getAndParseIdMsgs: err = ' + err);
		//either an error, or maybe just no events
		for (let i = 0; i < msgIds.length; ++i)
		    msgCb(err, msgCookies[msgIds[i]], msgIds[i], '', '', '', '', '', '', '', '', '');
		doneCb(msgIds.length);
		return;
	    }
	    let msgCbCount = 0;
	    let bogusCount = 0;
	    for (let i = 0; i < msgResults.length; ++i) {
		mtEther.parseMessageEvent(msgResults[i], function(err, msgId, fromAddr, toAddr, txCount, rxCount, mimeType, ref, msgHex, blockNumber, date) {
		    if (!!msgCookies[msgId]) {
			console.log('getAndParseIdMsgs: msgId = ' + msgId + ', fromAddr = ' + fromAddr + ', toAddr = ' + toAddr + ', idx = ' + msgCookies[msgId].idx);
			msgCb(err, msgCookies[msgId], msgId, fromAddr, toAddr, txCount, rxCount, mimeType, ref, msgHex, blockNumber, date);
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
    //cb(err, decrypted)
    //decrypt and display the message in the msgTextArea. also displays the msgId, ref, date & msgNo
    //msgNo is either txCount or rxCount depending on whether the message was sent or received
    //
    decryptMsg: function(otherAddr, fromAddr, toAddr, nonce, msgHex, cb) {
	console.log('decryptMsg: otherAddr = ' + otherAddr);
	mtEther.accountQuery(common.web3, otherAddr, function(err, otherAcctInfo) {
	    const otherPublicKey = (!!otherAcctInfo) ? otherAcctInfo.publicKey : null;
	    if (!!otherPublicKey && otherPublicKey != '0x') {
		console.log('decryptMsg: otherPublicKey = ' + otherPublicKey);
		const ptk = dhcrypt.ptk(otherPublicKey, toAddr, fromAddr, nonce);
		console.log('decryptMsg: ptk = ' + ptk);
		const decrypted = dhcrypt.decrypt(ptk, msgHex);
		console.log('decryptMsg: decrypted (length = ' + decrypted.length + ') = ' + decrypted);
		cb(null, decrypted);
	    } else {
		console.log('decryptMsg: error looking up account for ' + otherAddr + ', otherPublicKey = ' + otherPublicKey);
		cb('Error looking up account for ' + otherAddr, '');
	    }
	});
    },

}
