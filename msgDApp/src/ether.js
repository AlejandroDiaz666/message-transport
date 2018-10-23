
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
    EMT_CONTRACT_ADDR: '0x851d499549f1fF282fc7D67c23cb765473e6d334',
    //kovan
    //EMT_CONTRACT_ADDR: '0x05251e4537c2cE7cD0142Ae03cbD5BAe2fa411E2',
    EMT_CONTRACT_ABI:  '[{"constant":true,"inputs":[],"name":"communityAddr","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"killContract","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_messageFee","type":"uint256"},{"name":"_spamFee","type":"uint256"},{"name":"_publicKey","type":"bytes"},{"name":"_encryptedPrivateKey","type":"bytes"}],"name":"register","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"accounts","outputs":[{"name":"messageFee","type":"uint256"},{"name":"spamFee","type":"uint256"},{"name":"feeBalance","type":"uint256"},{"name":"recvMessageCount","type":"uint256"},{"name":"sentMessageCount","type":"uint256"},{"name":"publicKey","type":"bytes"},{"name":"encryptedPrivateKey","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"trusted","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_toAddr","type":"address"},{"name":"mimeType","type":"uint256"},{"name":"message","type":"bytes"}],"name":"sendMessage","outputs":[{"name":"_recvMessageCount","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"isLocked","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"}],"name":"getPeerMessageCount","outputs":[{"name":"_messageCount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"withdrawCommunityFunds","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_fromAddr","type":"address"},{"name":"_toAddr","type":"address"},{"name":"mimeType","type":"uint256"},{"name":"message","type":"bytes"}],"name":"sendMessage","outputs":[{"name":"_recvMessageCount","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"_toAddr","type":"address"}],"name":"getFee","outputs":[{"name":"_fee","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_contractSendGas","type":"uint256"}],"name":"tune","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_trustedAddr","type":"address"},{"name":"_trust","type":"bool"}],"name":"setTrust","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"lock","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_fromAddr","type":"address"},{"name":"_toAddr","type":"address"}],"name":"getFee","outputs":[{"name":"_fee","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_toAddr","type":"address"},{"indexed":true,"name":"_fromAddr","type":"address"}],"name":"InviteEvent","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_fromAddr","type":"address"},{"indexed":true,"name":"_count","type":"uint256"},{"indexed":false,"name":"_toAddr","type":"address"},{"indexed":false,"name":"_toCount","type":"uint256"}],"name":"MessageTxEvent","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_toAddr","type":"address"},{"indexed":true,"name":"_count","type":"uint256"},{"indexed":false,"name":"_fromAddr","type":"address"},{"indexed":false,"name":"_mimeType","type":"uint256"},{"indexed":false,"name":"_sentMsgCtr","type":"uint256"},{"indexed":false,"name":"message","type":"bytes"}],"name":"MessageRxEvent","type":"event"}]',
    //sha3('MessageRxEvent(address,uint256,address,uint256,uint256,bytes)')
    MESSAGERX_EVENT_TOPIC0: '0xc0426bfb7648d886d73dae8cf5dd9668d2308269b7dbe22f483cef229a56ea3d',
    //sha3('MessageTxEvent(address,uint256,address,uint256)');
    MESSAGETX_EVENT_TOPIC0: '0xbd6eec70c65c378858289ddb15fba6b7a1f247614a57b602623822fa40def19a',
    etherscanioHost_kovan: 'api-kovan.etherscan.io',
    etherscanioTxStatusHost_kovan: 'kovan.etherscan.io',
    etherscanioHost_ropsten: 'api-ropsten.etherscan.io',
    etherscanioTxStatusHost_ropsten: 'ropsten.etherscan.io',
    etherscanioHost_main: 'api.etherscan.io',
    etherscanioTxStatusHost_main: 'etherscan.io',

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
    sendMessage: function(web3, toAddr, mimeType, messageHex, size, cb) {
	var abiSendMessageFcn = ether.abiEncodeSendMessage();
	var abiParms = ether.abiEncodeSendMessageParms(toAddr, mimeType, messageHex);
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

    abiEncodeSendMessage: function() {
	//address toAddr, uint256 mimeType, bytes message
	encoded = ethabi.methodID('sendMessage', [ 'address', 'uint256', 'bytes' ]).toString('hex');
	return(encoded);
    },

    abiEncodeSendMessageParms: function(toAddr, mimeType, message) {
	if (toAddr.startsWith('0x'))
	    toAddr = toAddr.substring(2);
	var bytes = common.hexToBytes(message);
	//console.log('abiEncodeSendMessageParms: message (length = ' + bytes.length + '): ' + bytes.toString(16));
	encoded = ethabi.rawEncode([ 'address', 'uint256', 'bytes' ], [ new BN(toAddr, 16), new BN(mimeType, 16), bytes ] ).toString('hex');
	return(encoded);
    },

    abiEncodeRegister: function() {
	//uint256 messageFee, uint256 spamFee, bytes publicKey, bytes encryptedPrivateKey
	encoded = ethabi.methodID('register', [ 'uint256', 'uint256', 'bytes', 'bytes' ]).toString('hex');
	return(encoded);
    },

    abiEncodeRegisterParms: function(messageFee, spamFee, publicKey, encryptedPrivateKey) {
	console.log('publicKey (' + publicKey.length + '): ' + publicKey);
	console.log('encryptedPrivate (' + encryptedPrivateKey.length + '): ' + encryptedPrivateKey);
	if (publicKey.startsWith('0x'))
	    publicKey = publicKey.substring(2);
	var publicKeyBytes = common.hexToBytes(publicKey);
	if (encryptedPrivateKey.startsWith('0x'))
	    encryptedPrivateKey = encryptedPrivateKey.substring(2);
	var encryptedPrivateKeyBytes = common.hexToBytes(encryptedPrivateKey);
	encoded = ethabi.rawEncode([ 'uint256', 'uint256', 'bytes', 'bytes' ],
				   [ new BN(messageFee, 16), new BN(spamFee, 16), publicKeyBytes, encryptedPrivateKeyBytes ] ).toString('hex');
	return(encoded);
    },

    abiEncodeWithdraw: function() {
	encoded = ethabi.methodID('withdraw', [ ]).toString('hex');
	return(encoded);
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

};
