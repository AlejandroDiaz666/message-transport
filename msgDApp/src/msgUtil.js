
//
// high level fcns related to interaction w/ EMT contract
//
var common = require('./common');
var ether = require('./ether');
var mtEther = require('./mtEther');
var dhcrypt = require('./dhcrypt');
var BN = require("bn.js");

var msgUtil = module.exports = {

    // create a shorter base64 message id from a long hex msgId
    // note: every 3 bytes produces 4 base64 chars; so use a multiple of 3 bytes to avoid padding chars, '=='
    abbreviateMsgId: function(msgId) {
	var idShortHex = common.leftPadTo(common.numberToBN(msgId).toString(16), 36, '0');
	return(common.hexToBase64(idShortHex));
    },


    extractSubject: function(message, maxLen) {
	var subject = '';
	if (message.startsWith('Subject: '))
	    message = message.substring(9);
	var newlineIdx = (message.indexOf('\n') > 0) ? message.indexOf('\n') :  message.length;
	if (newlineIdx > maxLen - 1)
	    newlineIdx = maxLen - 1;
	return(message.substring(0, newlineIdx));
    },


    //cb(err, result)
    getSentMsgLogs: function(fromAddr, batch, cb) {
	const txOptions = {
	    fromBlock: 0,
	    toBlock: 'latest',
	    address: mtEther.EMT_CONTRACT_ADDR,
	    topics: [mtEther.getMessageTxEventTopic0(),
		     '0x' + common.leftPadTo(fromAddr.substring(2), 64, '0'),
		     '0x' + common.leftPadTo(batch.toString(16), 64, '0') ]
	};
	ether.getLogs(txOptions, cb);
    },


    //cb(err, result)
    getRecvMsgLogs: function(toAddr, batch, cb) {
	const rxOptions = {
	    fromBlock: 0,
	    toBlock: 'latest',
	    address: mtEther.EMT_CONTRACT_ADDR,
	    topics: [mtEther.getMessageRxEventTopic0(),
		     '0x' + common.leftPadTo(toAddr.substring(2), 64, '0'),
		     '0x' + common.leftPadTo(batch.toString(16), 64, '0') ]
	};
	ether.getLogs(rxOptions, cb);
    },


    //
    //cb(err, msgId, fromAddr, toAddr, txCount, rxCount, mimeType, ref, msgHex, blockNumber, date)
    //
    getAndParseIdMsg: function(msgId, cb) {
	console.log('getAndParseIdMsg: enter msgId = ' + msgId);
	const msgOptions = {
	    fromBlock: 0,
	    toBlock: 'latest',
	    address: mtEther.EMT_CONTRACT_ADDR,
	    topics: [mtEther.getMessageEventTopic0(), msgId ]
	};
	ether.getLogs(msgOptions, function(err, msgResult) {
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
    //cb(err, decrypted)
    //decrypt and display the message in the msgTextArea. also displays the msgId, ref, date & msgNo
    //msgNo is either txCount or rxCount depending on whether the message was sent or received
    //
    decryptMsg: function(otherAddr, fromAddr, toAddr, nonce, msgHex, cb) {
	console.log('decryptMsg: otherAddr = ' + otherAddr);
	mtEther.accountQuery(common.web3, otherAddr, function(err, otherAcctInfo) {
	    var otherPublicKey = (!!otherAcctInfo) ? otherAcctInfo[mtEther.ACCTINFO_PUBLICKEY] : null;
	    if (!!otherPublicKey && otherPublicKey != '0x') {
		console.log('decryptMsg: otherPublicKey = ' + otherPublicKey);
		var ptk = dhcrypt.ptk(otherPublicKey, toAddr, fromAddr, nonce);
		console.log('decryptMsg: ptk = ' + ptk);
		var decrypted = dhcrypt.decrypt(ptk, msgHex);
		console.log('decryptMsg: decrypted (length = ' + decrypted.length + ') = ' + decrypted);
		cb(null, decrypted);
	    } else {
		console.log('decryptMsg: error looking up account for ' + otherAddr + ', otherPublicKey = ' + otherPublicKey);
		cb('Error looking up account for ' + otherAddr, '');
	    }
	});
    },

}
