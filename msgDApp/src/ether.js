
//
// fcns related to interaction w/ EMT contract
//
var common = require('./common');
var ethUtils = require('ethereumjs-util');
var ethtx = require('ethereumjs-tx');
var ethabi = require('ethereumjs-abi');
var Buffer = require('buffer/').Buffer;
var BN = require("bn.js");

var ether = module.exports = {

    SZABO_PER_ETH:     1000000,
    GWEI_PER_ETH:      1000000000,
    WEI_PER_GWEI:      1000000000,
    WEI_PER_SZABO:     1000000000000,
    WEI_PER_FINNEY:    1000000000000000,
    WEI_PER_ETH:       1000000000000000000,
    //ropsten
    EMT_CONTRACT_ADDR: '0x1D7037d94454Ac5C81111eC82Cc0EE7965E77639',
    EMT_CONTRACT_ABI:  '[{"constant":true,"inputs":[],"name":"communityAddr","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"killContract","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_messageFee","type":"uint256"},{"name":"_spamFee","type":"uint256"},{"name":"_publicKey","type":"bytes"},{"name":"_encryptedPrivateKey","type":"bytes"}],"name":"register","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_toAddr","type":"address"},{"name":"mimeType","type":"uint256"},{"name":"_ref","type":"uint256"},{"name":"_message","type":"bytes"}],"name":"sendMessage","outputs":[{"name":"_messageId","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"accounts","outputs":[{"name":"messageFee","type":"uint256"},{"name":"spamFee","type":"uint256"},{"name":"feeBalance","type":"uint256"},{"name":"recvMessageCount","type":"uint256"},{"name":"sentMessageCount","type":"uint256"},{"name":"publicKey","type":"bytes"},{"name":"encryptedPrivateKey","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"trusted","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isLocked","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"}],"name":"getPeerMessageCount","outputs":[{"name":"_messageCount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"withdrawCommunityFunds","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_fromAddr","type":"address"},{"name":"_toAddr","type":"address"},{"name":"mimeType","type":"uint256"},{"name":"_ref","type":"uint256"},{"name":"_message","type":"bytes"}],"name":"sendMessage","outputs":[{"name":"_messageId","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"_toAddr","type":"address"}],"name":"getFee","outputs":[{"name":"_fee","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_contractSendGas","type":"uint256"}],"name":"tune","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_trustedAddr","type":"address"},{"name":"_trust","type":"bool"}],"name":"setTrust","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"lock","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_fromAddr","type":"address"},{"name":"_toAddr","type":"address"}],"name":"getFee","outputs":[{"name":"_fee","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_toAddr","type":"address"},{"indexed":true,"name":"_fromAddr","type":"address"}],"name":"InviteEvent","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_id","type":"uint256"},{"indexed":false,"name":"_fromAddr","type":"address"},{"indexed":false,"name":"_toAddr","type":"address"},{"indexed":false,"name":"_txCount","type":"uint256"},{"indexed":false,"name":"_rxCount","type":"uint256"},{"indexed":false,"name":"_mimeType","type":"uint256"},{"indexed":false,"name":"_ref","type":"uint256"},{"indexed":false,"name":"message","type":"bytes"}],"name":"MessageEvent","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_fromAddr","type":"address"},{"indexed":true,"name":"_txCount","type":"uint256"},{"indexed":false,"name":"_id","type":"uint256"}],"name":"MessageTxEvent","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_toAddr","type":"address"},{"indexed":true,"name":"_rxCount","type":"uint256"},{"indexed":false,"name":"_id","type":"uint256"}],"name":"MessageRxEvent","type":"event"}]',
    MESSAGE_EVENT_TOPIC0: '0x596d3d9b5ebe5bd65bada957b5c08d7323689b3c88b982c038ff58d83cc6aadc',
    MESSAGETX_EVENT_TOPIC0: '0x4bcf98108ff4d6f03fa677c21f24090af2dd74fd30efd93fb64416e7d9ae6627',
    MESSAGERX_EVENT_TOPIC0: '0x465db5959120135083ac12b219a64554e97cb7b57f94c50e437cf7a22b5f1f8d',
    etherscanioHost_kovan: 'api-kovan.etherscan.io',
    etherscanioTxStatusHost_kovan: 'kovan.etherscan.io',
    etherscanioHost_ropsten: 'api-ropsten.etherscan.io',
    etherscanioTxStatusHost_ropsten: 'ropsten.etherscan.io',
    etherscanioHost_main: 'api.etherscan.io',
    etherscanioTxStatusHost_main: 'etherscan.io',
    sendMessageABI: null,
    registerABI: null,
    withdrawABI: null,

    //cb(err, network)
    getNetwork: function(web3, cb) {
	var network = 'Unknown Network';
	web3.version.getNetwork((err, netId) => {
	    switch (netId) {
	    case "1":
		network = 'Mainnet';
		console.log('This is mainnet')
		ether.etherscanioHost = ether.etherscanioHost_main;
		ether.etherscanioTxStatusHost = ether.etherscanioTxStatusHost_main;
		break
	    case "2":
		network = 'Morden test network';
		console.log('This is the deprecated Morden test network.')
		break
	    case "3":
		network = 'Ropsten test network';
		console.log('This is the ropsten test network.')
		ether.etherscanioHost = ether.etherscanioHost_ropsten;
		ether.etherscanioTxStatusHost = ether.etherscanioTxStatusHost_ropsten;
		break
	    case "4":
		network = 'Rinkeby test network';
		console.log('This is the Rinkeby test network.')
		break
	    case "42":
		network = 'Kovan test network';
		console.log('This is the Kovan test network.')
		ether.etherscanioHost = ether.etherscanioHost_kovan;
		ether.etherscanioTxStatusHost = ether.etherscanioTxStatusHost_kovan;
		break
	    default:
		console.log('This is an unknown network.')
	    }
	    cb(null, network);
	});
    },

    ACCTINFO_MESSAGEFEE: 0,
    ACCTINFO_SPAMFEE: 1,
    ACCTINFO_FEEBALANCE: 2,
    ACCTINFO_RECVMESSAGECOUNT: 3,
    ACCTINFO_SENTMESSAGECOUNT: 4,
    ACCTINFO_PUBLICKEY: 5,
    ACCTINFO_ENCRYPTEDPRIVATEKEY: 6,
    accountQuery: function(web3, acct, cb) {
	var ABIArray = JSON.parse(ether.EMT_CONTRACT_ABI);
	var EMTcontract = web3.eth.contract(ABIArray);
	console.log('contract: ' + EMTcontract);
	console.log('contract addr: ' + ether.EMT_CONTRACT_ADDR);
	var EMTContractInstance = EMTcontract.at(ether.EMT_CONTRACT_ADDR);
	console.log('contract: ' + EMTContractInstance);
	EMTContractInstance.accounts(acct, cb);
    },

    getPeerMessageCount: function(web3, from, to, cb) {
	var ABIArray = JSON.parse(ether.EMT_CONTRACT_ABI);
	var EMTcontract = web3.eth.contract(ABIArray);
	var EMTContractInstance = EMTcontract.at(ether.EMT_CONTRACT_ADDR);
	EMTContractInstance.getPeerMessageCount(from, to, cb);
    },

    //cb(err, txid)
    sendMessage: function(web3, toAddr, mimeType, ref, messageHex, size, cb) {
	console.log('sendMessageParms: toAddr = ' + toAddr);
	console.log('sendMessageParms: mimeType = ' + mimeType);
	console.log('sendMessageParms: ref = ' + ref);
	var abiSendMessageFcn = ether.abiEncodeSendMessage();
	var abiParms = ether.abiEncodeSendMessageParms(toAddr, mimeType, ref, messageHex);
        var sendData = "0x" + abiSendMessageFcn + abiParms;
	ether.send(web3, ether.EMT_CONTRACT_ADDR, size, 'wei', sendData, 0, cb);
    },

    //cb(err, txid)
    register: function(web3, messageFee, spamFee, publicKey, encryptedPrivateKey, cb) {
	var abiRegisterFcn = ether.abiEncodeRegister();
	var abiParms = ether.abiEncodeRegisterParms(messageFee, spamFee, publicKey, encryptedPrivateKey);
        var sendData = "0x" + abiRegisterFcn + abiParms;
	console.log('sendData = ' + sendData);
	ether.send(web3, ether.EMT_CONTRACT_ADDR, 0, 'wei', sendData, 0, cb);
    },

    //cb(err, txid)
    withdraw: function(web3, cb) {
	var abiWithdrawFcn = ether.abiEncodeWithdraw();
        var sendData = "0x" + abiWithdrawFcn;
	console.log('sendData = ' + sendData);
	ether.send(web3, ether.EMT_CONTRACT_ADDR, 0, 'wei', sendData, 0, cb);
    },

    abiEncodeSendMessage: function() {
	//address toAddr, uint256 mimeType, uint256 ref, bytes message
	if (!ether.sendMessageABI)
	    ether.sendMessageABI = ethabi.methodID('sendMessage', [ 'address', 'uint256', 'uint256', 'bytes' ]).toString('hex');
	return(ether.sendMessageABI);
    },

    abiEncodeSendMessageParms: function(toAddr, mimeType, ref, message) {
	if (toAddr.startsWith('0x'))
	    toAddr = toAddr.substring(2);
	if (mimeType.startsWith('0x'))
	    mimeType = mimeType.substring(2);
	if (ref.startsWith('0x'))
	    ref = ref.substring(2);
	var bytes = common.hexToBytes(message);
	console.log('abiEncodeSendMessageParms: toAddr = ' + toAddr);
	console.log('abiEncodeSendMessageParms: mimeType = ' + mimeType);
	console.log('abiEncodeSendMessageParms: ref = ' + ref);
	//console.log('abiEncodeSendMessageParms: message (length = ' + bytes.length + '): ' + bytes.toString(16));
	var encoded = ethabi.rawEncode([ 'address', 'uint256', 'uint256', 'bytes' ],
				   [ new BN(toAddr, 16), new BN(mimeType, 16), new BN(ref, 16), bytes ] ).toString('hex');
	return(encoded);
    },

    abiEncodeRegister: function() {
	//uint256 messageFee, uint256 spamFee, bytes publicKey, bytes encryptedPrivateKey
	if (!ether.registerABI)
	    ether.registerABI = ethabi.methodID('register', [ 'uint256', 'uint256', 'bytes', 'bytes' ]).toString('hex');
	return(ether.registerABI);
    },

    abiEncodeRegisterParms: function(messageFee, spamFee, publicKey, encryptedPrivateKey) {
	console.log('abiEncodeRegisterParms: messageFee = ' + messageFee);
	console.log('abiEncodeRegisterParms: spamFee = ' + spamFee);
	console.log('abiEncodeRegisterParms: publicKey (' + publicKey.length + ') = ' + publicKey);
	console.log('abiEncodeRegisterParms: encryptedPrivate (' + encryptedPrivateKey.length + ') = ' + encryptedPrivateKey);
	if (publicKey.startsWith('0x'))
	    publicKey = publicKey.substring(2);
	var publicKeyBytes = common.hexToBytes(publicKey);
	if (encryptedPrivateKey.startsWith('0x'))
	    encryptedPrivateKey = encryptedPrivateKey.substring(2);
	var encryptedPrivateKeyBytes = common.hexToBytes(encryptedPrivateKey);
	encoded = ethabi.rawEncode([ 'uint256', 'uint256', 'bytes', 'bytes' ],
				   [ common.numberToBN(messageFee), common.numberToBN(spamFee), publicKeyBytes, encryptedPrivateKeyBytes ] ).toString('hex');
	return(encoded);
    },

    abiEncodeWithdraw: function() {
	if (!ether.withdrawABI)
	    ether.withdrawABI = ethabi.methodID('withdraw', [ ]).toString('hex');
	return(ether.withdrawABI);
    },


    //convert an amount in wei to a comfortable representation
    //for example: 1000000000000 => '1 gwei'
    convertWeiToComfort: function(web3, wei) {
	var units =
	    (wei < ether.WEI_PER_GWEI)   ? 'Wei'   :
	    (wei < ether.WEI_PER_SZABO)  ? 'Gwei'   :
	    (wei < ether.WEI_PER_FINNEY) ? 'Szabo'  :
	    (wei < ether.WEI_PER_ETH)    ? 'Finney' : 'Eth';
	return(web3.fromWei(wei, units).toString() + ' ' + units);
    },

    validateAddr: function (addr) {
	if (!addr.startsWith('0x'))
	    return(false);
	if (!addr.length == 42)
	    return(false);
	//see EIP44
	if (!/^(0x)?[0-9a-f]{40}$/i.test(addr)) {
            // check if it has the basic requirements of an address
            return false;
	} else if (/^(0x)?[0-9a-f]{40}$/.test(addr) || /^(0x)?[0-9A-F]{40}$/.test(addr)) {
            // If it's all small caps or all upper caps, return true
            return true;
	} else {
	    // Check each case
	    addr = addr.replace('0x','');
	    var addressHash = common.web3.sha3(addr.toLowerCase());
	    addressHash = addressHash.replace('0x','');
	    for (var i = 0; i < 40; i++ ) {
		// the nth letter should be uppercase if the nth digit of casemap is 1
		if ((parseInt(addressHash[i], 16) > 7 && addr[i].toUpperCase() !== addr[i]) || (parseInt(addressHash[i], 16) <= 7 && addr[i].toLowerCase() !== addr[i])) {
		    console.log('addr = ' + addr + ', addressHash = ' + addressHash);
		    console.log('at index ' + i + ': ' + addressHash[i] + ' is not correct');
		    return false;
		}
	    }
	    return true;
	}
    },


    //
    // units: 'szabo' | 'finney' | 'ether'
    // cb(err, balance)
    //
    getBalance: function(web3, units, cb) {
	web3.eth.getBalance(web3.eth.accounts[0], function (err, balance) {
	    console.log('get_balance bal = ' + balance.toString() + ', type = ' + typeof(balance));
	    cb(null, web3.fromWei(balance, units).toString());
	});
    },


    //
    // units: 'szabo' | 'finney' | 'ether'
    //
    send: function(web3, to_addr, size, units, data, gasLimit, callback) {
	var tx = {};
	tx.from = web3.eth.accounts[0];
	tx.value = web3.toWei(size, units);
	tx.to = to_addr,
	tx.data = data;
	if (gasLimit > 0)
	    tx.gas = gasLimit;
	console.log('calling sendTransaction');
	web3.eth.sendTransaction(tx, callback)
    },


    //cb(err, result)
    //options: {
    //	fromBlock, toBlock, address, topics[]
    //
    //this is the more correct way to get logs.... except that it's not reliable :(
    /*
    getLogs: function(options, cb) {
        const filter = common.web3.eth.filter(options);
	filter.get(cb);
	filter.stopWatching();
    },
    */
    getLogs: function(options, cb) {
	var url = 'https://' + ether.etherscanioHost   +
	    '/api?module=logs&action=getLogs'          +
	    '&fromBlock=' + options.fromBlock          +
	    '&toBlock=' + options.toBlock              +
	    '&address=' + options.address              +
	    '&topic0=' + options.topics[0];
	if (options.topics.length > 1) {
	    url += '&topic1=' + options.topics[1];
	    if (options.topics.length > 2)
		url += '&topic2=' + options.topics[2];
	}
	common.fetch(url, function(str, err) {
	    if (!str || !!err) {
		var err = "error retreiving events: " + err;
		console.log('ether.getLogs: ' + err);
		cb(err, '');
		return;
	    }
	    //typical
	    //  { "status"  : "1",
	    //    "message" : "OK",
	    //    "result"  : [...]
	    //  }
	    var eventsResp = JSON.parse(str);
	    if (eventsResp.status == 0 && eventsResp.message == 'No records found') {
		//this is not an err... just no events
		cb(err, '');
		return;
	    }
	    if (eventsResp.status != 1 || eventsResp.message != 'OK') {
		var err = "error retreiving events: bad status (" + eventsResp.status + ", " + eventsResp.message + ")";
		console.log('ether.getLogs: ' + err);
		cb(err, '');
		return;
	    }
	    cb(null, eventsResp.result);
	});
    },


    //cb(null, msgId, fromAddr, toAddr, txCount, rxCount, mimeType, ref, msgHex, blockNumber, date)
    //pass in in a single result object
    //note: numbers may be in hex or dec. hex if preceeded by 0x. topics and data are always hex.
    parseMessageEvent: function(result, cb) {
	//event MessageEvent(uint indexed _id, address _fromAddr, address _toAddr, uint _txCount, uint _rxCount, uint _mimeType, uint _ref, bytes message);
	//typical
	//                  { "address" : "0x800bf6d2bb0156fd21a84ae20e1b9479dea0dca9",
	//                    "topics"  : [
	//                                  "0xa4b1fcc6b4f905c800aeac882ea4cbff09ab73cb784c8e0caad226fbeab35b63",
	//                                  "0x00000000000000000000000053c619594a6f15cd59f32f76257787d5438cd016", -- id
	//                                ],
	//                    "data"    : "0x000000000000000000000000f48ae436e4813c7dcd5cdeb305131d07ca022469     -- _fromAddr
	//                                   000000000000000000000000f48ae436e4813c7dcd5cdeb305131d07ca022469     -- _toAddr
	//                                   0000000000000000000000000000000000000000000000000000000000000005     -- _txCount
	//                                   0000000000000000000000000000000000000000000000000000000000000005     -- _rxCount
	//                                   0000000000000000000000000000000000000000000000000000000000000001     -- _mimeType
	//                                   0000000000000000000000000000000000000000000000000000000000000005     -- _ref
	//                                   00000000000000000000000000000000000000000000000000000000000000b0     -- offset to message
	//                                   000000000000000000000000000000000000000000000000000000000000000d     -- message (length)
	//                                   4669727374206d65737361676500000000000000000000000000000000000000",   -- message text
	//                    "blockNumber" : "0x3d7f1d",
	//                    "timeStamp"   : "0x5b9a2cf4",
	//                    "gasPrice"    : "0x77359400",
	//                    "gasUsed"     : "0x1afcf",
	//                    "logIndex"    : "0x1a",
	//                    "transactionHash"  : "0x266d1d418629668f5f23acc6b30c1283e9ea8d124e6f1aeac6e8e33f150e6747",
	//                    "transactionIndex" : "0x15"
	//                  }
	console.log('parseMessageEvent: result = ' + result);
	console.log('parseMessageEvent: string = ' + JSON.stringify(result));
	var msgId = result.topics[1];
	console.log('msgId: ' + msgId);
	//first 2 chars are '0x'; we want rightmost 20 out of 32 bytes
	var fromAddr = '0x' + result.data.slice(0+2, 64+2).substring(12*2);
	var toAddr = '0x' + result.data.slice(64+2, 128+2).substring(12*2);
	console.log('parseMessageEvent: fromAddr = ' + fromAddr);
	console.log('parseMessageEvent: toAddr = ' + toAddr);
	var txCount = '0x' + result.data.slice(128+2, 192+2);
	console.log('parseMessageEvent: txCount = ' + txCount);
	var rxCount = '0x' + result.data.slice(192+2, 256+2);
	console.log('parseMessageEvent: rxCount = ' + rxCount);
	var mimeTypeHex = result.data.slice(256+2, 320+2);
	var mimeType = parseInt(mimeTypeHex, 16);
	console.log('parseMessageEvent: mimeType = ' + mimeType.toString(10));
	var ref = '0x' + result.data.slice(320+2, 384+2);
	console.log('parseMessageEvent: ref = ' + ref);
	var msgOffsetHex = result.data.slice(384+2, 448+2);
	var msgOffset = parseInt(msgOffsetHex, 16);
	var msgLenHex = result.data.slice((2*msgOffset)+2, (2*msgOffset)+64+2);
	var msgLen = parseInt(msgLenHex, 16);
	console.log('parseMessageEvent: msgLen = 0x' + msgLen.toString(16));
	var msgHex = '0x' + result.data.slice((2*msgOffset)+64+2, (2*msgOffset)+64+2+(msgLen*2));
	var blockNumber = parseInt(result.blockNumber);
	console.log('parseMessageEvent: blockNumber = ' + blockNumber);
	var timeStamp = parseInt(result.timeStamp);
	var date = (new Date(timeStamp * 1000)).toUTCString();
	console.log('parseMessageEvent: date = ' + date);
	cb(null, msgId, fromAddr, toAddr, txCount, rxCount, mimeType, ref, msgHex, blockNumber, date);
    },


    //cb(err, fromAddr, txCount, id, blockNumber, date);
    //pass in in a single result object
    //note: numbers may be in hex or dec. hex if preceeded by 0x. topics and data are always hex.
    parseMessageTxEvent: function(result, cb) {
	//typical
	//                  { "address" : "0x800bf6d2bb0156fd21a84ae20e1b9479dea0dca9",
	//                    "topics"  : [
	//                                  "0xa4b1fcc6b4f905c800aeac882ea4cbff09ab73cb784c8e0caad226fbeab35b63",
	//                                  "0x00000000000000000000000053c619594a6f15cd59f32f76257787d5438cd016", -- _fromAddr
	//                                  "0x0000000000000000000000000000000000000000000000000000000000000001"  -- _txCount
	//                                ],
	//                    "data"    : "0x000000000000000000000000f48ae436e4813c7dcd5cdeb305131d07ca022469"    -- _id
	//                    "blockNumber" : "0x3d7f1d",
	//                    "timeStamp"   : "0x5b9a2cf4",
	//                    "gasPrice"    : "0x77359400",
	//                    "gasUsed"     : "0x1afcf",
	//                    "logIndex"    : "0x1a",
	//                    "transactionHash"  : "0x266d1d418629668f5f23acc6b30c1283e9ea8d124e6f1aeac6e8e33f150e6747",
	//                    "transactionIndex" : "0x15"
	//                  }
	console.log('parseMessageTxEvent: result = ' + result);
	console.log('parseMessageTxEvent: string = ' + JSON.stringify(result));
	var fromAddr = result.topics[1];
	var txCount = result.topics[2];
	console.log('parseMessageTxEvent: fromAddr = ' + fromAddr);
	console.log('parseMessageTxEvent: txCount = ' + txCount);
	//first 2 chars are '0x'; we want rightmost 20 out of 32 bytes
	var msgId = result.data;
	var blockNumber = parseInt(result.blockNumber);
	console.log('parseMessageTxEvent: blockNumber = ' + blockNumber);
	var timeStamp = parseInt(result.timeStamp);
	var date = (new Date(timeStamp * 1000)).toUTCString();
	console.log('parseMessageTxEvent: date = ' + date);
	cb(null, fromAddr, txCount, msgId, blockNumber, date);
    },

    //cb(null, toAddr, rxCount, id, blockNumber, date);
    //pass in in a single result object
    //note: numbers may be in hex or dec. hex if preceeded by 0x. topics and data are always hex.
    parseMessageRxEvent: function(result, cb) {
	//typical
	//                  { "address" : "0x800bf6d2bb0156fd21a84ae20e1b9479dea0dca9",
	//                    "topics"  : [
	//                                  "0xa4b1fcc6b4f905c800aeac882ea4cbff09ab73cb784c8e0caad226fbeab35b63",
	//                                  "0x00000000000000000000000053c619594a6f15cd59f32f76257787d5438cd016", -- _toAddr
	//                                  "0x0000000000000000000000000000000000000000000000000000000000000001"  -- _rxCount
	//                                ],
	//                    "data"    : "0x000000000000000000000000f48ae436e4813c7dcd5cdeb305131d07ca022469"    -- _id
	//                    "blockNumber" : "0x3d7f1d",
	//                    "timeStamp"   : "0x5b9a2cf4",
	//                    "gasPrice"    : "0x77359400",
	//                    "gasUsed"     : "0x1afcf",
	//                    "logIndex"    : "0x1a",
	//                    "transactionHash"  : "0x266d1d418629668f5f23acc6b30c1283e9ea8d124e6f1aeac6e8e33f150e6747",
	//                    "transactionIndex" : "0x15"
	//                  }
	console.log('parseMessageRxEvent: result = ' + result);
	console.log('parseMessageRxEvent: string = ' + JSON.stringify(result));
	var toAddr = result.topics[1];
	var rxCount = result.topics[2];
	console.log('parseMessageRxEvent: toAddr = ' + toAddr);
	console.log('parseMessageRxEvent: rxCount = ' + rxCount);
	//first 2 chars are '0x'; we want rightmost 20 out of 32 bytes
	var msgId = result.data;
	var blockNumber = parseInt(result.blockNumber);
	console.log('parseMessageRxEvent: blockNumber = ' + blockNumber);
	var timeStamp = parseInt(result.timeStamp);
	var date = (new Date(timeStamp * 1000)).toUTCString();
	console.log('parseMessageRxEvent: date = ' + date);
	cb(null, toAddr, rxCount, msgId, blockNumber, date);
    },

};
