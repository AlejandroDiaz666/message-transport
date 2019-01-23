/*
 * common functions -- no local dependancies here!
 */
const BN = require("bn.js");
const Buffer = require('buffer/').Buffer;
const common = module.exports = {

    web3:              null,

    //
    // if requireAcct, then not only must mm be installed, but also an acct must be unlocked
    // callback(err, myWeb3)
    //
    checkForMetaMask: async function(requireAcct, cb) {
	if (window.ethereum) {
	    // Modern dapp browsers...
            common.web3 = new Web3(ethereum);
	    //console.log('checkForMetaMask: found new metamask');
            try {
		// Request account access if needed
		await ethereum.enable();
		cb(null, common.web3);
	    } catch (error) {
		// User denied account access...
	        console.log('checkForMetaMask: err = ' + error.toString());
		common.web3 = null;
		cb('You must enable the MetaMask plugin to use this utility', null);
	    }
	} else if (typeof window.web3 !== 'undefined') {
	    // Legacy dapp browsers...
	    common.web3 = new Web3(web3.currentProvider);
	    console.log('found old metamask. provider: ' + web3.currentProvider.toString());
	    web3.version.getNetwork((err, netId) => {
		if (!!err)
		    cb(err,null)
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


    //number can be a number or a string, with or without '0x'
    numberToBN: function(number) {
	//first ensure passed parm is a string
	let numberStr = number.toString();
	let base = 10;
	if (numberStr.startsWith('0x')) {
	    base = 16;
	    numberStr = numberStr.substring(2);
	} else if (numberStr.indexOf('e+') >= 0) {
	    const expIdx = numberStr.indexOf('e+');
	    //console.log('numberToBN: expStr =' + numberStr.substring(expIdx + 2));
	    const exp = parseInt(numberStr.substring(expIdx + 2));
	    //console.log('numberToBN: exp = ' + exp);
	    let begPart = numberStr.substring(0, expIdx);
	    //console.log('numberToBN: begPart =' + begPart);
	    let endPart = '';
	    if (numberStr.indexOf('.') >= 0) {
		const dotIdx = numberStr.indexOf('.');
		begPart = numberStr.substring(0, dotIdx);
		endPart = numberStr.substring(dotIdx + 1, expIdx);
	    }
	    endPart = common.rightPadTo(endPart, exp, '0');
	    //console.log('numberToBN: begPart =' + begPart);
	    //console.log('numberToBN: endPart =' + endPart);
	    numberStr = begPart + endPart
	}
	//console.log('numberToBN: converted from ' + number + ' to ' + numberStr);
	const bn = new BN(numberStr, base);
	//console.log('numberToBN: converted from ' + number + ' to 0x' + bn.toString(16) + ', ' + bn.toString(10));
	return(bn);
    },

    stripNonNumber: function(number) {
	//first ensure passed parm is a string
	let numberStr = number.toString();
	if (numberStr.startsWith('0x')) {
	    numberStr = numberStr.substring(2);
	    numberStr = '0x' + numberStr.replace(/[^0-9a-fA-F]/g, '');
	} else {
	    numberStr = numberStr.replace(/[^0-9]/g, '');
	}
	return(numberStr);
    },


    //number can be a number or a string, with or without '0x'
    //Hex256 string will be '0x' followed by 64 hex digits
    numberToHex256: function(number) {
	if (typeof(number) === 'number')
	    return('0x' + common.leftPadTo(number.toString(16), 64, '0'));
	const bn = common.numberToBN(number);
	return(common.BNToHex256(bn));
    },


    //Hex256 string will be '0x' followed by 64 hex digits
    BNToHex256: function(xBN) {
	return('0x' + common.leftPadTo(xBN.toString(16), 64, '0'));
    },


    hexToAscii: function(hexStr) {
	//console.log('hexToAscii');
	//first ensure passed parm is a string
	let hex = hexStr.toString();
	if (hex.startsWith('0x'))
	    hex = hex.substring(2);
	let str = '';
	for (let i = 0; i < hex.length; i += 2)
	    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	return str;
    },


    hexToBytes: function(hexStr) {
	//console.log('hexToBytes: ' + hexStr);
	//first ensure passed parm is a string
	let hex = hexStr.toString();
	if (hex.startsWith('0x'))
	    hex = hex.substring(2);
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0, j = 0; i < hex.length; i += 2)
	    bytes[j++] = parseInt(hex.substr(i, 2), 16);
	return bytes;
    },

    bytesToHex: function(byteArray) {
	const hex = Array.from(byteArray, function(byte) {
	    return('0' + (byte & 0xFF).toString(16)).slice(-2);
	}).join('')
	//console.log('bytesToHex: ' + hex);
	return(hex);
    },


    strToUtf8Bytes: function(str) {
	//javascript encodes strings as UCS2... convert to a buffer of UTF8
	const utf8Buf = Buffer.from(str, 'utf8');
	return(utf8Buf);
    },

    Utf8BytesToStr: function(utf8Bytes) {
	//javascript encodes strings as UCS2, so convert from UTF8
	const utf8Buf = Buffer.from(utf8Bytes);
	return(utf8Buf.toString('utf8'));
    },

    strToUtf8Hex: function(str) {
	//javascript encodes strings as UCS2, so for convert to a buffer of UTF8
	const utf8Buf = Buffer.from(str, 'utf8');
	return(common.bytesToHex(utf8Buf));
    },

    Utf8HexToStr: function(utf8Hex) {
	//javascript encodes strings as UCS2. use Buffer.toString to convert from utf8
	const utf8Buf = Buffer.from(common.hexToBytes(utf8Hex));
	return(utf8Buf.toString('utf8'));
    },


    hexToBase64: function(hexStr) {
	//first ensure passed parm is a string
	let hex = hexStr.toString();
	if (hex.startsWith('0x'))
	    hex = hex.substring(2);
	const base64String = Buffer.from(hex, 'hex').toString('base64');
	return(base64String);
    },


    // html image data used for img tag (<img src='image-data'>) is eg.
    //  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAACx1BMV...'
    // that is, ~20 bytes of text, followed by a comma, followed by base64 data. while we could store the whole thing as utf8,
    // that would be wasteful. so we we create our own custom format. the first byte is the length of the text (utf data), up
    // to and including the comma. followed by the utf8 encoded text, followed by the image data as a byte-stream.
    imageToBytes: function(image) {
	//console.log('imageToBytes: image = ' + image);
	const utf8Len = image.indexOf(',') + 1;
	const utf8Str = image.substring(0, utf8Len);
	//console.log('imageToBytes: utf8Str = ' + utf8Str);
	const utf8Bytes = new Uint8Array(Buffer.from(utf8Str, 'utf8'));
	const base64Str = image.substring(utf8Len);
	const imageBuf = Buffer.from(base64Str, 'base64')
	//every 4 base64 chars is 24 bits
	const bytes = new Uint8Array(1 + utf8Len + (base64Str.length / 4) * 3);
	bytes.set([ utf8Len ]);
	bytes.set(utf8Bytes, 1);
	bytes.set(imageBuf, 1 + utf8Bytes.length);
	//console.log('imageToBytes: bytes = ' + bytes);
	//console.log('imageToBytes: bytes.length = ' + bytes.length);
	return(bytes);
    },

    bytesToImage: function(bytes) {
	const utf8Bytes = bytes.slice(1, bytes[0] + 1);
	const utf8Str = Buffer.from(utf8Bytes).toString('utf8');
	//console.log('bytesToImage: utf8Str = ' + utf8Str);
	const imageBytes = bytes.slice(bytes[0] + 1);
	const base64Str = Buffer.from(imageBytes).toString('base64');
	const image = utf8Str + base64Str;
	//console.log('bytesToImage: image = ' + image);
	return(image);
    },

    hexToImage: function(utf8Hex) {
	const utf8Buf = Buffer.from(common.hexToBytes(utf8Hex));
	return(common.bytesToImage(utf8Buf));
    },

    leftPadTo: function(str, desiredLen, ch) {
	const padChar = (typeof ch !== 'undefined') ? ch : ' ';
	const pad = new Array(1 + desiredLen).join(padChar);
	const padded = (pad + str.toString()).slice(-desiredLen);
	return padded;
    },

    rightPadTo: function(str, desiredLen, ch) {
	const padChar = (typeof ch !== 'undefined') ? ch : ' ';
	const pad = new Array(1 + desiredLen).join(padChar);
	const padded = (str.toString() + pad).slice(0, desiredLen);
	//console.log('padded = X' + padded + 'X');
	return padded;
    },

    setIndexedFlag: function(prefix, index, flag) {
	const wordIdx = Math.floor(index / 48);
	const bitIdx = index % 48;
	const wordIdxStr = '0x' + wordIdx.toString(16)
	let wordStr = localStorage[prefix + '-' + wordIdxStr];
	let word = (!!wordStr) ? parseInt(wordStr) : 0;
	if (!!flag)
	    word |= (1 << bitIdx);
	else
	    word &= ~(1 << bitIdx);
	wordStr = '0x' + word.toString(16);
	localStorage[prefix + '-' + wordIdxStr] = '0x' + word.toString(16);
	//console.log('setIndexedFlag: localStorage[' + prefix + '-' + wordIdxStr + '] = ' + wordStr);
    },

    chkIndexedFlag: function(prefix, index) {
	const wordIdx = Math.floor(index / 48);
	const bitIdx = index % 48;
	const wordIdxStr = '0x' + wordIdx.toString(16)
	const wordStr = localStorage[prefix + '-' + wordIdxStr];
	console.log('chkIndexedFlag: localStorage[' + prefix + '-' + wordIdxStr + '] = ' + wordStr);
	const word = (!!wordStr) ? parseInt(wordStr) : 0;
	const flag = (word & (1 << bitIdx)) ? true : false;
	return(flag);
    },


    //find the index of the first flag that is z or nz, starting with begIndex, goin forward or backwards
    //to endIndex. returns -1 if no flag found.
    findIndexedFlag: function(prefix, begIndex, endIndex, nz) {
	const allOnes = (1 << 48) - 1;
	const increment = (endIndex > begIndex) ? 1 : -1;
	let wordIdx = Math.floor(begIndex / 48);
	let bitIdx = begIndex % 48;
	do {
	    const wordIdxStr = '0x' + wordIdx.toString(16)
	    const wordStr = localStorage[prefix + '-' + wordIdxStr];
	    const word = (!!wordStr) ? parseInt(wordStr) : 0;
	    console.log('findFlag: localStorage[' + prefix + '-' + wordIdxStr + '] = 0x' + word.toString(16));
	    if ((!!nz && word != 0) || (!nz && (word & allOnes) != allOnes)) {
		do {
		    if ((!!nz && (word & (1 << bitIdx)) != 0) ||
			( !nz && (word & (1 << bitIdx)) == 0) ) {
			const foundIdx = wordIdx * 48 + bitIdx;
			console.log('findFlag: foundIdx = ' + foundIdx);
			return((increment > 0 && foundIdx <= endIndex) ||
			       (increment < 0 && foundIdx >= endIndex) ? foundIdx : -1);
		    }
		    bitIdx += increment;
		} while ((increment > 0 && bitIdx < 48) || (increment < 0 && bitIdx >= 0));
		//first time through it's possible to fall out, if the nz bit was
		//lt the start bitIdx
	    }
	    bitIdx = (increment > 0) ? 0 : 47;
	    wordIdx += increment;
	} while ((increment > 0 &&  wordIdx      * 48 < endIndex) ||
		 (increment < 0 && (wordIdx + 1) * 48 > endIndex));
	return(-1);
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
        const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
        const results = regex.exec(url);
        if (!results)
            return null;
        if (!results[2])
            return '';
        const value = decodeURIComponent(results[2].replace(/\+/g, " "));
        return value;
    },


    fetch: function(url, extraOptions, callback) {
	let timeout = false;
	let complete = false;
	const fetch_timer = setTimeout(function() {
	    timeout = true;
	    if (complete == true) {
		return;
	    } else {
		console.log("common.fetch: timeout retrieving " + url);
		callback("", "timeout");
	    }
	}, 15000);
	console.log('common.fetch: fetching ' + url);
	const request = new Request(url);
	const options = { mode: 'cors'};
	Object.assign(options, extraOptions);
	fetch(request, options).then(function(resp) {
	    //console.log('common.fetch: got resp = ' + resp + ', status = ' + resp.status + ', (' + resp.statusText + ')');
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


    makeTextarea: function(id, className, disabled) {
	const textarea = document.createElement("textarea")
	if (!!id)
	    textarea.id = id;
	if (!!className)
	    textarea.className = className;
	textarea.rows = 1;
	textarea.readonly = 'readonly';
	if (!!disabled)
	    textarea.disabled = 'disabled';
	textarea.value = '';
	return(textarea);
    },

    clearStatusDiv: function(statusDiv) {
	while (statusDiv.hasChildNodes()) {
	    statusDiv.removeChild(statusDiv.lastChild);
	}
	statusDiv.style.display = "none";
    },

    //start or stop the wait/loading icon
    setLoadingIcon: function(start) {
	const waitIcon = document.getElementById('waitIcon');
	waitIcon.style.display = (!!start) ? 'block' : 'none';
    },

    //state = 'Disabled' | 'Enabled' | 'Selected'
    setMenuButtonState: function(buttonID, state) {
	var button = document.getElementById(buttonID);
	button.disabled = (state == 'Enabled') ? false : true;
	var newClassName = 'menuBarButton' + state;
	if (button.className.indexOf('menuBarButtonDisabled') >= 0)
	    button.className = (button.className).replace('menuBarButtonDisabled', newClassName);
	else if (button.className.indexOf('menuBarButtonEnabled') >= 0)
	    button.className = (button.className).replace('menuBarButtonEnabled', newClassName);
	else if (button.className.indexOf('menuBarButtonSelected') >= 0)
	    button.className = (button.className).replace('menuBarButtonSelected', newClassName);
	else
	    button.className = (button.className).replace('menuBarButton', newClassName);
    },


    replaceElemClassFromTo: function(elemId, from, to, disabled) {
	var elem = document.getElementById(elemId);
	if (!elem)
	    console.log('replaceElemClassFromTo: could not find elem: ' + elemId);
	elem.className = (elem.className).replace(from, to);
	elem.disabled = disabled;
	return(elem);
    },

    //display (or clear) "waiting for metamask" dialog
    showWaitingForMetaMask: function(show) {
	const metaMaskModal = document.getElementById('metaMaskModal');
	metaMaskModal.style.display = (!!show) ? 'block' : 'none';
    },

};
