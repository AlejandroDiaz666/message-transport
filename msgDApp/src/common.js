/*
 * common functions -- no local dependancies here!
 */
var BN = require("bn.js");

var common = module.exports = {

    web3:              null,

    //
    // if requireAcct, then not only must mm be installed, but also an acct must be unlocked
    // callback(err, myWeb3)
    //
    checkForMetaMask: async function(requireAcct, cb) {
	if (window.ethereum) {
	    // Modern dapp browsers...
            common.web3 = new Web3(ethereum);
	    console.log('found new metamask. prvider: ' + common.web3.currentProvider.toString());
            try {
		// Request account access if needed
		await ethereum.enable();
		cb(null, common.web3);
            } catch (error) {
		// User denied account access...
		common.web3 = null;
		cb('You must enable the MetaMask plugin to use this utility', null);
            }
	} else if (typeof window.web3 !== 'undefined') {
	    // Legacy dapp browsers...
	    common.web3 = new Web3(web3.currentProvider);
	    console.log('found old metamask. prvider: ' + web3.currentProvider.toString());
	    web3.version.getNetwork((err, netId) => {
		if (!!err)
		    cb(err,null)
		else if (false && netId != "1")
		    cb('MetaMask must be set to mainnet!', null);
		else if (!!requireAcct && !web3.eth.accounts[0])
		    cb('To use this utility, a MetaMask account must be unlocked', null);
		else
		    cb(null, common.web3);
	    });
	} else {
	    common.web3 = null;
	    cb('You must enable the MetaMask plugin to use this utility', null);
	}
    },


    //number can be a numver or a string, with or without '0x'
    numberToBN: function(number) {
	//first ensure passed parm is a string
	var numberStr = number.toString();
	var base = 10;
	if (numberStr.startsWith('0x')) {
	    base = 16;
	    numberStr = numberStr.substring(2);
	}
	return(new BN(numberStr, base));
    },


    hexToAscii: function(hexStr) {
	console.log('hexToAscii');
	//first ensure passed parm is a string
	var hex = hexStr.toString();
	if (hex.startsWith('0x'))
	    hex = hex.substring(2);
	var str = '';
	for (var i = 0; i < hex.length; i += 2)
	    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	return str;
    },


    hexToBytes: function(hexStr) {
	console.log('hexToAscii');
	//first ensure passed parm is a string
	var hex = hexStr.toString();
	if (hex.startsWith('0x'))
	    hex = hex.substring(2);
	var bytes = new Uint8Array(hex.length / 2);
	for (var i = 0, j = 0; i < hex.length; i += 2)
	    bytes[j++] = parseInt(hex.substr(i, 2), 16);
	return bytes;
    },


    bytesToHex: function(bytesStr) {
	console.log('bytesToHex');
	//first ensure passed parm is a string
	var hex = hexStr.toString();
	if (hex.startsWith('0x'))
	    hex = hex.substring(2);
	var bytes = new Uint8Array(hex.length / 2);
	for (var i = 0, j = 0; i < hex.length; i += 2)
	    bytes[j++] = parseInt(hex.substr(i, 2), 16);
	return bytes;
    },


    leftPadTo: function(str, desiredLen, ch) {
	var padChar = (typeof ch !== 'undefined') ? ch : ' ';
	var pad = new Array(1 + desiredLen).join(padChar);
	var padded = (pad + str.toString()).slice(-desiredLen);
	return padded;
    },

    rightPadTo: function(str, desiredLen) {
	var bigPad = '                                                                                                    ';
	return((str + bigPad).slice(0, desiredLen));
    },


    retrieve_username: function() {
	console.log('in retrieve_username... localStorage["username"] = ' + localStorage["username"]);
	/*
	if (localStorage["username"] == null)
	    bg.bglog('is null');
	else
	    bg.bglog('is not null');
	if (!!localStorage["username"])
	    bg.bglog('!!localStorage["username"] is true');
	else
	    bg.bglog('!!localStorage["username"] is false');
	*/
	callback((!localStorage["username"]) ? "" : localStorage["username"]);
    },


    //
    // query string: ?foo=lorem&bar=&baz
    // var foo = getUrlParameterByName('foo'); // "lorem"
    // var bar = getUrlParameterByName('bar'); // "" (present with empty value)
    // var baz = getUrlParameterByName('baz'); // "" (present with no value)
    // var qux = getUrlParameterByName('qux'); // null (absent)
    //
    getUrlParameterByName: function(url, name) {
	url = url.toLowerCase();
        name = name.replace(/[\[\]]/g, "\\$&");
	name = name.toLowerCase();
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
        var results = regex.exec(url);
        if (!results)
            return null;
        if (!results[2])
            return '';
        var value = decodeURIComponent(results[2].replace(/\+/g, " "));
        return value;
    },


    fetch: function(url, callback) {
	var timeout = false;
	var complete = false;
	var fetch_timer = setTimeout(function() {
	    timeout = true;
	    if (complete == true) {
		return;
	    } else {
		console.log("common.fetch: timeout retrieving " + url);
		callback("", "timeout");
	    }
	}, 15000);
	console.log('common.fetch: fetching ' + url);
	var request = new Request(url);
	fetch(request, { mode: 'cors'} ).then(function(resp) {
	    console.log('common.fetch: got resp = ' + resp + ', status = ' + resp.status + ', (' + resp.statusText + ')');
	    clearTimeout(fetch_timer);
	    complete = true;
	    if (timeout == true) {
		console.log("common.fetch: fetch returned after timeout! url = " + url);
		return;
	    }
	    if (resp.ok) {
		resp.text().then(function(str) {
		    callback(str, "");
		});
	    } else {
		console.log("common.fetch: got err = " + resp.blob());
		callback("", "unknown");
	    }
	}).catch(function(error) {
	    console.log("common.fetch: exeption = " + error);
	    complete = true;
	    callback("", error);
	});
    },


    //callback(err, transactionReceipt)
    waitForTXID: function(txid, desc, statusDiv, statusContentDiv, callback) {
	var statusCtr = 0;
	var statusText = document.createTextNode('No status yet...');
	//status div starts out hidden
	common.showDiv(statusDiv);
	common.showDiv(common.clearDivChildren(statusContentDiv));
	statusContentDiv.appendChild(statusText);
	var link = document.createElement('a');
	link.href = 'https://etherscan.io/tx/' + txid;
	link.innerHTML = "<h3>View transaction</h3>";
	link.target = '_blank';
	link.disabled = false;
	statusContentDiv.appendChild(link);
	var timer = setInterval(function() {
	    statusText.textContent = 'Waiting for ' + desc + ' transaction: ' + ++statusCtr + ' seconds...';
	    if ((statusCtr & 0xf) == 0) {
		common.web3.eth.getTransactionReceipt(txid, function(err, receipt) {
		    if (!!err || !!receipt) {
			if (!err && !!receipt && receipt.status == 0)
			    err = "Transaction Failed with REVERT opcode";
			statusText.textContent = (!!err) ? ('Error in ' + desc + ' transaction: ' + err) : (desc + ' transaction succeeded!');
			console.log('transaction is in block ' + (!!receipt ? receipt.blockNumber : 'err'));
			//statusText.textContent = desc + ' transaction succeeded!';
			clearInterval(timer);
			callback(err, receipt);
			return;
		    }
		});
	    }
	}, 1000);
    },

};
