
var common = require('./common');
var ether = require('./ether');
var dhcrypt = require('./dhcrypt');
var msgUtil = require('./msgUtil');
var ethUtils = require('ethereumjs-util');
var Buffer = require('buffer/').Buffer;
var BN = require("bn.js");


document.addEventListener('DOMContentLoaded', function() {
    console.log('content loaded');
    index.main();
}, false);


var index = module.exports = {
    //current messages to display
    'recvMessageNo': 1,
    'sentMessageNo': 1,
    account: null,
    acctInfo: null,
    acctCheckTimer: null,
    publicKey: null,
    listIdx: -1,
    listMode: null,
    listEntries: {},

    main: function() {
	console.log('index.main');
	setMainButtonHandlers();
	setReplyButtonHandlers();
	setValidateButtonHandler();
	setMarkReadButtonHandler();
	setPrevNextButtonHandlers();
	var msgNo = common.getUrlParameterByName(window.location.href, 'msgNo')
	if (!!msgNo)
	    index['recvMessageNo'] = parseInt(msgNo);
	beginTheBeguine();
    },

};

function ListEntry(listIdx, div, msgId, msgNo, addr, date, ref, content) {
    this.listIdx = listIdx;
    this.div = div;
    this.msgId = msgId;
    this.msgNo = msgNo;
    this.addr = addr;
    this.date = date;
    this.ref = ref;
    this.content = content;
}


function setMainButtonHandlers() {
    var registerButton = document.getElementById('registerButton');
    registerButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleRegister();
    });
    var viewRecvButton = document.getElementById('viewRecvButton');
    viewRecvButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleViewRecv(index.acctInfo, true);
    });
    var composeButton = document.getElementById('composeButton');
    composeButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleCompose(index.acctInfo, '');
    });
    var viewSentButton = document.getElementById('viewSentButton');
    viewSentButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleViewSent(index.acctInfo, true);
    });
    var registerSubmitButton = document.getElementById('registerSubmitButton');
    registerSubmitButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleRegisterSubmit();
    });
    var withdrawButton = document.getElementById('withdrawButton');
    withdrawButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleWithdraw();
    });
}


//
// the "reply" button is also the "send" button, depending on the context
// in view{Sent,Recv}Msg modes the reply button creates a special compose mode, via handleReplyCompose. in compose mode (including the
// compose mode created by handleReplyCompose), the reply (send) button actually sends the message.
//
function setReplyButtonHandlers() {
    var replyButton = document.getElementById('replyButton');
    replyButton.addEventListener('click', function() {
	console.log('replyButton');
	var validateAddrButton = document.getElementById('validateAddrButton');
	var composeButton = document.getElementById('composeButton');
	var viewRecvButton = document.getElementById('viewRecvButton');
	var viewSentButton = document.getElementById('viewSentButton');
	var msgAddrArea = document.getElementById('msgAddrArea');
	var msgTextArea = document.getElementById('msgTextArea');
	var message = msgTextArea.value;
	if (composeButton.className == 'menuBarButtonSelected') {
	    //handle send
	    console.log('send');
	    replyButton.disabled = true;
	    msgTextArea.disabled = true;
	    msgAddrArea.disabled = true;
	    validateAddrButton.disabled = true;
	    var mimeType = '0x1';
	    var toAddr = msgAddrArea.value;
	    //the toAddr has already been validated. really.
	    ether.accountQuery(common.web3, toAddr, function(err, toAcctInfo) {
		//encrypt the message...
		var toPublicKey = (!!toAcctInfo) ? toAcctInfo[ether.ACCTINFO_PUBLICKEY] : null;
		if (!toPublicKey || toPublicKey == '0x') {
		    alert('Encryption error: unable to look up destination address in contract!');
		    handleUnlockedMetaMask(continuationMode);
		    return;
		}
		var sentMsgCtrBN = common.numberToBN(index.acctInfo[ether.ACCTINFO_SENTMESSAGECOUNT]);
		sentMsgCtrBN.iaddn(1);
		console.log('setReplyButtonHandlers: toPublicKey = ' + toPublicKey);
		var ptk = dhcrypt.ptk(toPublicKey, toAddr, common.web3.eth.accounts[0], '0x' + sentMsgCtrBN.toString(16));
		console.log('setReplyButtonHandlers: ptk = ' + ptk);
		var encrypted = dhcrypt.encrypt(ptk, message);
		console.log('setReplyButtonHandlers: encrypted (length = ' + encrypted.length + ') = ' + encrypted);
		//in order to figure the message fee we need to see how many messages have been sent from the proposed recipient to me
		ether.getPeerMessageCount(common.web3, toAddr, common.web3.eth.accounts[0], function(err, msgCount) {
		    console.log(msgCount.toString(10) + ' messages have been sent from ' + toAddr + ' to me');
		    var fee = (msgCount > 0) ? toAcctInfo[ether.ACCTINFO_MESSAGEFEE] : toAcctInfo[ether.ACCTINFO_SPAMFEE];
		    console.log('fee is ' + fee + ' wei');
		    //display "waiting for metamask" in case metamask dialog is hidden
		    var metaMaskModal = document.getElementById('metaMaskModal');
		    metaMaskModal.style.display = 'block';
		    var msgRefButton = document.getElementById('msgRefButton');
		    var ref = msgRefButton.ref;
		    ether.sendMessage(common.web3, toAddr, mimeType, ref, encrypted, fee, function(err, txid) {
			console.log('txid = ' + txid);
			metaMaskModal.style.display = 'none';
			var statusDiv = document.getElementById('statusDiv');
			waitForTXID(err, txid, 'Send-Message', statusDiv, 'send', function() {
			});
		    });
		});
	    });
	} else if ((viewRecvButton.className == 'menuBarButtonSelected') ||
		   (viewSentButton.className == 'menuBarButtonSelected') ) {
	    //handle reply
	    var fromAddr = msgAddrArea.value;
	    var subject = '';
	    if (message.startsWith('Subject: ') || message.startsWith('re: ')) {
		var subjectIdx = message.startsWith('re: ') ? 4 : 9;
		var newlineIdx = (message.indexOf('\n') > 0) ? message.indexOf('\n') :  message.length;
		console.log('subjectIdx = ' + subjectIdx);
		subject = 're: ' + message.substring(subjectIdx, newlineIdx) + '\n';
	    }
	    //set ref
	    var msgIdArea = document.getElementById('msgIdArea');
	    var ref = msgIdArea.msgId;
	    console.log('fromAddr = ' + fromAddr);
	    console.log('subject = ' + subject);
	    handleReplyCompose(index.acctInfo, fromAddr, subject, ref);
	}
    });
}

function setValidateButtonHandler() {
    var msgAddrArea = document.getElementById('msgAddrArea');
    var msgFeeArea = document.getElementById('msgFeeArea');
    var replyButton = document.getElementById('replyButton');
    var msgTextArea = document.getElementById('msgTextArea');
    msgAddrArea.addEventListener('input', function() {
	replyButton.disabled = true;
	msgTextArea.disabled = true;
	msgFeeArea.value = 'Fee: ';
    });
    //validateAddrButton is only enabled in compose mode
    var validateAddrButton = document.getElementById('validateAddrButton');
    validateAddrButton.addEventListener('click', function() {
	var toAddr = msgAddrArea.value;
	console.log('toAddr = ' + toAddr);
	if (!ether.validateAddr(toAddr)) {
	    msgTextArea.value = 'Error: invalid Ethereum address.';
	    replyButton.disabled = true;
	} else {
	    ether.accountQuery(common.web3, toAddr, function(err, toAcctInfo) {
		var toPublicKey = (!!toAcctInfo) ? toAcctInfo[ether.ACCTINFO_PUBLICKEY] : null;
		console.log('validateAddrButton.listener: toPublicKey: ' + toPublicKey);
		if (!toPublicKey || toPublicKey == '0x') {
		    msgTextArea.value = 'Error: no account was found for this address.';
		    replyButton.disabled = true;
		} else {
		    msgTextArea.disabled = false;
		    msgTextArea.readonly = "";
		    replyButton.disabled = false;
		    msgTextArea.value = 'Subject: ';
		    //in case user erases subject...
		    msgTextArea.placeholder='Type your message here...';
		    //see how many messages have been sent from the proposed recipient to me
		    ether.getPeerMessageCount(common.web3, toAddr, common.web3.eth.accounts[0], function(err, msgCount) {
			console.log(msgCount.toString(10) + ' messages have been sent from ' + toAddr + ' to me');
			var fee = (msgCount > 0) ? toAcctInfo[ether.ACCTINFO_MESSAGEFEE] : toAcctInfo[ether.ACCTINFO_SPAMFEE];
			msgFeeArea.value = 'Fee: ' + ether.convertWeiToComfort(common.web3, fee);
		    });
		}
	    });
	}
    });
}


function setMarkReadButtonHandler() {
    var markReadButton = document.getElementById('markReadButton');
    markReadButton.addEventListener('click', function() {
	if (index.listMode != 'recv') {
	    console.log('setMarkReadButtonHandlr: we should never be here!');
	    return;
	}
	var msgNo = index.listEntries[index.listIdx].msgNo;
	var div = index.listEntries[index.listIdx].div;
	var flag = common.chkIndexedFlag('beenRead', msgNo);
	flag = (flag) ? false : true;
	common.setIndexedFlag('beenRead', msgNo, flag);
	var newSuffix = (flag) ? '' : 'New';
	div.className = 'msgListItemDivSelected' + newSuffix;
	markReadButton.textContent = (!!newSuffix) ? 'Mark as Read' : 'Mark as Unread';
    });
}

//this also sets the msgRefButton handler
function setPrevNextButtonHandlers() {
    var prevButton = document.getElementById('prevMsgButton');
    var nextButton = document.getElementById('nextMsgButton');
    var firstButton = document.getElementById('firstMsgButton');
    var lastButton = document.getElementById('lastMsgButton');
    var msgRefButton = document.getElementById('msgRefButton');
    var viewRecvButton = document.getElementById('viewRecvButton');
    prevButton.addEventListener('click', function() {
	var msgNoCounter = (viewRecvButton.className == 'menuBarButtonSelected') ? 'recvMessageNo' : 'sentMessageNo';
	--index[msgNoCounter];
	showMsgLoop(index.acctInfo);
    });
    nextButton.addEventListener('click', function() {
	var msgNoCounter = (viewRecvButton.className == 'menuBarButtonSelected') ? 'recvMessageNo' : 'sentMessageNo';
	++index[msgNoCounter];
	showMsgLoop(index.acctInfo);
    });
    firstButton.addEventListener('click', function() {
	var msgNoCounter = (viewRecvButton.className == 'menuBarButtonSelected') ? 'recvMessageNo' : 'sentMessageNo';
	var acctInfoCountIdx = (viewRecvButton.className == 'menuBarButtonSelected') ? ether.ACCTINFO_RECVMESSAGECOUNT : ether.ACCTINFO_SENTMESSAGECOUNT;
	var maxMsgNo = parseInt(index.acctInfo[acctInfoCountIdx]);
	index[msgNoCounter] = (maxMsgNo > 0) ? 1 : 0;
	showMsgLoop(index.acctInfo);
    });
    lastButton.addEventListener('click', function() {
	var msgNoCounter = (viewRecvButton.className == 'menuBarButtonSelected') ? 'recvMessageNo' : 'sentMessageNo';
	var acctInfoCountIdx = (viewRecvButton.className == 'menuBarButtonSelected') ? ether.ACCTINFO_RECVMESSAGECOUNT : ether.ACCTINFO_SENTMESSAGECOUNT;
	var maxMsgNo = parseInt(index.acctInfo[acctInfoCountIdx]);
	index[msgNoCounter] = maxMsgNo;
	showMsgLoop(index.acctInfo);
    });
    msgRefButton.addEventListener('click', function() {
	var ref = msgRefButton.ref;
	if (!!ref) {
	    msgUtil.getAndParseIdMsg(ref, function(err, msgId, fromAddr, toAddr, txCount, rxCount, mimeType, ref, msgHex, blockNumber, date) {
		var otherAddr, msgCount;
		var msgTextArea = document.getElementById('msgTextArea');
		var viewRecvButton = document.getElementById('viewRecvButton');
		if (!!err) {
		    msgTextArea.value = 'Error: ' + err;
		} else if (fromAddr == common.web3.eth.accounts[0]) {
		    index['sentMessageNo'] = txCount;
		    //if we're already in View-Sent mode, then showMsgLoop will update the msg list only if necessary
		    (viewRecvButton.className == 'menuBarButtonSelected') ? handleViewSent(index.acctInfo, true) : showMsgLoop(index.acctInfo);
		} else if (toAddr == common.web3.eth.accounts[0]) {
		    index['recvMessageNo'] = rxCount;
		    (viewRecvButton.className != 'menuBarButtonSelected') ? handleViewRecv(index.acctInfo, true) : showMsgLoop(index.acctInfo);
		}
	    });
	}
    });
}


function beginTheBeguine() {
    if (!index.acctCheckTimer) {
	console.log('init acctCheckTimer');
	index.acctCheckTimer = setInterval(function() {
	    common.checkForMetaMask(true, function(err, w3) {
		var acct = (!err && !!w3) ? w3.eth.accounts[0] : null;
		if (acct != index.account) {
		    console.log('MetaMask account changed!');
		    beginTheBeguine();
		} else {
		    console.log('MetaMask account unchanged...');
		}
	    });
	}, 10000);
    }
    common.checkForMetaMask(true, function(err, w3) {
	var acct = (!err && !!w3) ? w3.eth.accounts[0] : null;
	index.account = acct;
	if (!!err) {
	    handleLockedMetaMask(err);
	} else {
	    setMenuButtonState('importantInfoButton', 'Disabled');
	    setMenuButtonState('registerButton',      'Disabled');
	    setMenuButtonState('viewRecvButton',      'Disabled');
	    setMenuButtonState('composeButton',       'Disabled');
	    setMenuButtonState('viewSentButton',      'Disabled');
	    setMenuButtonState('withdrawButton',      'Disabled');
	    handleUnlockedMetaMask(null);
	}
    });
}


//
// handle locked metamask
//
function handleLockedMetaMask(err) {
    var registerButton = document.getElementById('registerButton');
    registerButton.textContent = 'Register Account';
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Disabled');
    setMenuButtonState('viewRecvButton',      'Disabled');
    setMenuButtonState('composeButton',       'Disabled');
    setMenuButtonState('viewSentButton',      'Disabled');
    setMenuButtonState('withdrawButton',      'Disabled');
    //
    var networkArea = document.getElementById('networkArea');
    networkArea.value = '';
    var accountArea = document.getElementById('accountArea');
    accountArea.value = '';
    var balanceArea = document.getElementById('balanceArea');
    balanceArea.value = '';
    var totalReceivedArea = document.getElementById('totalReceivedArea');
    totalReceivedArea.value = '';
    var feeBalanceArea = document.getElementById('feeBalanceArea');
    feeBalanceArea.value = '';
    //
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly = "readonly"
    msgAddrArea.value = '';
    //
    replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('msgRefButton',       'visibleTC', 'hidden',    true).textContent = '';
    replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('msgFeeArea',         'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('replyButton',        'visibleTC', 'hidden',    true).textContent = 'Reply';
    replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('markReadButton',     'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    //
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    var statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
    alert(err);
}


//
// handle unlocked metamask
// displays the users's eth account info; retreives the users DH public key (will be set if the user is
// registered); then continues on to handleRegistered or handleUnregistered.
//
// note: after a transaction is completed we come back to this fcn. the mode parm provides a hint so that
// we can continue with a relevant part of the display.
//
function handleUnlockedMetaMask(mode) {
    console.log('handleUnlockedMetaMask: mode = ' + mode);
    var accountArea = document.getElementById('accountArea');
    accountArea.value = 'Your account: ' + common.web3.eth.accounts[0];
    ether.getNetwork(common.web3, function(err, network) {
	var networkArea = document.getElementById('networkArea');
	if (!!err) {
	    networkArea.value = 'Error: ' + err;
	} else {
	    networkArea.value = 'Network: ' + network;
	    if (network.startsWith('Mainnet'))
		networkArea.className = (networkArea.className).replace('attention', '');
	    else if (networkArea.className.indexOf(' attention' < 0))
		networkArea.className += ' attention';
	}
    });
    ether.getBalance(common.web3, 'szabo', function(err, balance) {
	var balanceArea = document.getElementById('balanceArea');
	var balanceSzabo = parseInt(balance);
	console.log('balanceSzabo = ' + balanceSzabo);
	var balanceETH = (balanceSzabo / ether.SZABO_PER_ETH).toFixed(6);
	balanceArea.value = 'Balance: ' + balanceETH.toString(10) + ' Eth';
    });
    ether.accountQuery(common.web3, common.web3.eth.accounts[0], function(err, _acctInfo) {
	index.acctInfo = _acctInfo;
	index.publicKey = (!!index.acctInfo) ? index.acctInfo[ether.ACCTINFO_PUBLICKEY] : null;
	console.log('handleUnlockedMetaMask: acctInfo: ' + JSON.stringify(index.acctInfo));
	console.log('handleUnlockedMetaMask: publicKey: ' + index.publicKey);
	if (!index.publicKey || index.publicKey == '0x') {
	    handleUnregisteredAcct();
	} else {
	    handleRegisteredAcct(mode);
	}
    });
}


//
// handle unregistered account
//
function handleUnregisteredAcct() {
    var registerButton = document.getElementById('registerButton');
    registerButton.textContent = 'Register Account';
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Disabled');
    setMenuButtonState('viewRecvButton',      'Disabled');
    setMenuButtonState('composeButton',       'Disabled');
    setMenuButtonState('viewSentButton',      'Disabled');
    setMenuButtonState('withdrawButton',      'Disabled');
    //display "waiting for metamask" in case metamask dialog is hidden
    var metaMaskModal = document.getElementById('metaMaskModal');
    metaMaskModal.style.display = 'block';
    dhcrypt.initDH(null, function(err) {
	metaMaskModal.style.display = 'none';
	if (!err) {
	    setMenuButtonState('registerButton',   'Enabled');
	}
    });
    //
    var totalReceivedArea = document.getElementById('totalReceivedArea');
    totalReceivedArea.value = 'This Ethereum address is not registered';
    var feeBalanceArea = document.getElementById('feeBalanceArea');
    feeBalanceArea.value = '';
    //
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly = "readonly"
    msgAddrArea.value = '';
    //
    replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('msgRefButton',       'visibleTC', 'hidden',    true).textContent = '';
    replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('msgFeeArea',         'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('replyButton',        'visibleTC', 'hidden',    true).textContent = 'Reply';
    replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('markReadButton',     'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    //
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    var statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
}


//
// handle registered account
//
function handleRegisteredAcct(mode) {
    var registerButton = document.getElementById('registerButton');
    registerButton.textContent = 'Modify Account';
    var totalReceivedArea = document.getElementById('totalReceivedArea');
    totalReceivedArea.value = 'Messages sent: ' + index.acctInfo[ether.ACCTINFO_SENTMESSAGECOUNT] + '; Messages received: ' + index.acctInfo[ether.ACCTINFO_RECVMESSAGECOUNT];
    var feeBalanceArea = document.getElementById('feeBalanceArea');
    var feebalanceWei = index.acctInfo[ether.ACCTINFO_FEEBALANCE];
    //console.log('feeBalanceWei = ' + feebalanceWei);
    feeBalanceArea.value = 'Unclaimed message fees: ' + ether.convertWeiToComfort(common.web3, feebalanceWei);
    //see if new messages have been received. if yes, display new message modal until user clicks anywhere outside
    var noRxMsgs = localStorage["noRxMsgs"];
    var currentNoRxMsgs = parseInt(index.acctInfo[ether.ACCTINFO_RECVMESSAGECOUNT]);
    if (currentNoRxMsgs > 0 && noRxMsgs != currentNoRxMsgs) {
	var newMsgCountNotButton = document.getElementById('newMsgCountNotButton');
	newMsgCountNotButton.textContent = currentNoRxMsgs.toString(10);
	localStorage["noRxMsgs"] = currentNoRxMsgs.toString(10);
	var newMsgModal = document.getElementById('newMsgModal');
	newMsgModal.style.display = 'block';
    }
    if (!!mode && !!dhcrypt.dh && index.publicKey == dhcrypt.publicKey()) {
	if (mode == 'recv')
	    handleViewRecv(index.acctInfo, true);
	else
	    handleViewSent(index.acctInfo, true);
    } else {
	//display "waiting for metamask" in case metamask dialog is hidden
	var metaMaskModal = document.getElementById('metaMaskModal');
	metaMaskModal.style.display = 'block';
	var encryptedPrivateKey = index.acctInfo[ether.ACCTINFO_ENCRYPTEDPRIVATEKEY];
	dhcrypt.initDH(encryptedPrivateKey, function(err) {
	    metaMaskModal.style.display = 'none';
	    if (!err)
		handleViewRecv(index.acctInfo, true);
	});
    }
}


//
// handle Compose button
//
function handleCompose(acctInfo, toAddr) {
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Enabled');
    setMenuButtonState('viewRecvButton',      'Enabled');
    setMenuButtonState('composeButton',       'Selected');
    setMenuButtonState('viewSentButton',      'Enabled');
    setMenuButtonState('withdrawButton',      'Enabled');
    //
    if (index.listIdx >= 0)
	(index.listEntries[index.listIdx].div).className = 'msgListItemDiv';
    index.listIdx = -1;
    //
    var msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'To: ';
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = false;
    msgAddrArea.readonly = '';
    msgAddrArea.value = toAddr;
    //
    replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('msgRefButton',       'visibleTC', 'hidden',    true).textContent = '';
    replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('validateAddrButton', 'hidden',    'visibleTC', false);
    replaceElemClassFromTo('msgFeeArea',         'hidden',    'visibleTC', true).value = 'Fee: ';
    replaceElemClassFromTo('replyButton',        'hidden',    'visibleTC', true).textContent = 'Send';
    replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('markReadButton',     'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    //
    var msgRefButton = document.getElementById('msgRefButton');
    msgRefButton.ref = '0';
    //textarea will be enabled after addr is validated
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder="Validate the recipient address, then type your message here...";
    var statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
}


//
// handle reply button -- this is a special compose mode
// addr should already be valid. if somehow it isn't valid, then we shunt over to handleCompose. otherwise addr
// modifications will be disabled.
//
function handleReplyCompose(acctInfo, toAddr, subject, ref) {
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Enabled');
    setMenuButtonState('viewRecvButton',      'Enabled');
    setMenuButtonState('composeButton',       'Selected');
    setMenuButtonState('viewSentButton',      'Enabled');
    setMenuButtonState('withdrawButton',      'Enabled');
    //
    if (!ether.validateAddr(toAddr)) {
	msgTextArea.value = 'Error: invalid Ethereum address.';
	replyButton.disabled = true;
	handleCompose(index.acctInfo, toAddr);
	return;
    }
    //
    if (index.listIdx >= 0)
	(index.listEntries[index.listIdx].div).className = 'msgListItemDiv';
    index.listIdx = -1;
    //
    ether.accountQuery(common.web3, toAddr, function(err, toAcctInfo) {
	var toPublicKey = (!!toAcctInfo) ? toAcctInfo[ether.ACCTINFO_PUBLICKEY] : null;
	if (!toPublicKey || toPublicKey == '0x') {
	    msgTextArea.value = 'Error: no account was found for this address.';
	    replyButton.disabled = true;
	    handleCompose(index.acctInfo, toAddr);
	    return;
	}
	var msgPromptArea = document.getElementById('msgPromptArea');
	msgPromptArea.value = 'To: ';
	var msgAddrArea = document.getElementById('msgAddrArea');
	msgAddrArea.disabled = true;
	msgAddrArea.readonly = 'readonly';
	msgAddrArea.value = toAddr;
	//
	replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
	replaceElemClassFromTo('msgRefButton',       'hidden',    'visibleTC', true);
	replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
	replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
	replaceElemClassFromTo('msgFeeArea',         'hidden',    'visibleTC', true).value = 'Fee: ';
	replaceElemClassFromTo('replyButton',        'hidden',    'visibleTC', false).textContent = 'Send';
	replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
	replaceElemClassFromTo('markReadButton',     'visibleTC', 'hidden',    true);
	replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
	//
	showIdAndRef('', ref, false);
	var msgTextArea = document.getElementById('msgTextArea');
	msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
	msgTextArea.value = (!!subject) ? subject : '';
	msgTextArea.disabled = false;
	msgTextArea.readonly = '';
	msgTextArea.placeholder='Type your message here...';
	var statusDiv = document.getElementById('statusDiv');
	clearStatusDiv(statusDiv);
	//fees: see how many messages have been sent from the proposed recipient to me
	ether.getPeerMessageCount(common.web3, toAddr, common.web3.eth.accounts[0], function(err, msgCount) {
	    console.log(msgCount.toString(10) + ' messages have been sent from ' + toAddr + ' to me');
	    var fee = (msgCount > 0) ? toAcctInfo[ether.ACCTINFO_MESSAGEFEE] : toAcctInfo[ether.ACCTINFO_SPAMFEE];
	    msgFeeArea.value = 'Fee: ' + ether.convertWeiToComfort(common.web3, fee);
	});
    });
}


function handleRegister() {
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Selected');
    var obfuscatedSecret = index.acctInfo[ether.ACCTINFO_OBFUSCATEDSECRET];
    if (obfuscatedSecret != '0') {
	setMenuButtonState('viewRecvButton',      'Enabled');
	setMenuButtonState('composeButton',       'Enabled');
	setMenuButtonState('viewSentButton',      'Enabled');
	setMenuButtonState('withdrawButton',      'Enabled');
    } else {
	setMenuButtonState('viewRecvButton',      'Disabled');
	setMenuButtonState('composeButton',       'Disabled');
	setMenuButtonState('viewSentButton',      'Disabled');
	setMenuButtonState('withdrawButton',      'Disabled');
    }
    //
    if (index.listIdx >= 0)
	(index.listEntries[index.listIdx].div).className = 'msgListItemDiv';
    index.listIdx = -1;
    //
    var msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'Addr: ';
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly = "readonly"
    msgAddrArea.value = common.web3.eth.accounts[0];
    //
    replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('msgRefButton',       'visibleTC', 'hidden',    true).textContent = '';
    replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('msgFeeArea',         'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('replyButton',        'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('registerDiv',        'hidden',    'visibleIB', true);
    replaceElemClassFromTo('markReadButton',     'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    //
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('visibleIB', 'hidden');
    msgTextArea.disabled = true;
    var messageFeeInput = document.getElementById('messageFeeInput');
    messageFeeInput.value = index.acctInfo[ether.ACCTINFO_MESSAGEFEE];
    var spamFeeInput = document.getElementById('spamFeeInput');
    spamFeeInput.value = index.acctInfo[ether.ACCTINFO_SPAMFEE];
    var statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
}


function handleRegisterSubmit() {
    console.log('handleRegisterSubmit');
    var registerDiv = document.getElementById('registerDiv');
    var messageFeeInput = document.getElementById('messageFeeInput');
    var messageFee = common.stripNonNumber(messageFeeInput.value);
    messageFeeInput.value = messageFee;
    var spamFeeInput = document.getElementById('spamFeeInput');
    var spamFee = common.stripNonNumber(spamFeeInput.value);
    spamFeeInput.value = spamFee;
    console.log('message fee = ' + messageFee + ', spam fee = ' + spamFee);
    var publicKey = dhcrypt.publicKey();
    var encryptedPrivateKey = dhcrypt.encryptedPrivateKey();
    //display "waiting for metamask" in case metamask dialog is hidden
    var metaMaskModal = document.getElementById('metaMaskModal');
    metaMaskModal.style.display = 'block';
    ether.register(common.web3, messageFee, spamFee, publicKey, encryptedPrivateKey, function(err, txid) {
	console.log('handleRegisterSubmit: err = ' + err);
	console.log('handleRegisterSubmit: txid = ' + txid);
	metaMaskModal.style.display = 'none';
	var statusDiv = document.getElementById('statusDiv');
	waitForTXID(err, txid, 'Register', statusDiv, 'recv', function() {
	});
    });
}

function handleWithdraw() {
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Enabled');
    setMenuButtonState('viewRecvButton',      'Enabled');
    setMenuButtonState('composeButton',       'Enabled');
    setMenuButtonState('viewSentButton',      'Enabled');
    setMenuButtonState('withdrawButton',      'Selected');
    //
    if (index.listIdx >= 0)
	(index.listEntries[index.listIdx].div).className = 'msgListItemDiv';
    index.listIdx = -1;
    //
    var msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'Addr: ';
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly = "readonly"
    msgAddrArea.value = common.web3.eth.accounts[0];
    //
    replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('msgRefButton',       'visibleTC', 'hidden',    true).textContent = '';
    replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('msgFeeArea',         'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('replyButton',        'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('markReadButton',     'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    //
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('visibleIB', 'hidden');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    //
    //display "waiting for metamask" in case metamask dialog is hidden
    var metaMaskModal = document.getElementById('metaMaskModal');
    metaMaskModal.style.display = 'block';
    ether.withdraw(common.web3, function(err, txid) {
	console.log('txid = ' + txid);
	metaMaskModal.style.display = 'none';
	var statusDiv = document.getElementById('statusDiv');
	waitForTXID(err, txid, 'Withdraw', statusDiv, 'recv', function() {
	});
    });
}



//
// handle View-Recv button
// if refreshMsgList then call showMsgLoop to look up the message corresponding to the current index['recvMessageNo']
// otherwise just set up the View-Recv mode and return.
//
// if refreshing the msg-list, then we only enable view-sent mode after the list is copmlete. if you don't take that
// precaution, then it's possible for a user to flip between recv and sent modes, and makeMsgListEntry will be confounded
// because the index.listMode has changed.
//
function handleViewRecv(acctInfo, refreshMsgList) {
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Enabled');
    setMenuButtonState('viewRecvButton',      'Selected');
    setMenuButtonState('composeButton',       'Enabled');
    setMenuButtonState('viewSentButton',      refreshMsgList ? 'Disabled' : 'Enabled');
    setMenuButtonState('withdrawButton',      'Enabled');
    //
    var msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'From: ';
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly = "readonly"
    msgAddrArea.value = '';
    //
    replaceElemClassFromTo('msgIdArea',          'hidden',    'visibleTC', true).value = 'Msg ID: N/A';
    replaceElemClassFromTo('msgRefButton',       'hidden',    'visibleTC', true).textContent = 'Ref: N/A';
    replaceElemClassFromTo('msgDateArea',        'hidden',    'visibleTC', true).value = '';
    replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('msgFeeArea',         'visibleTC', 'hidden',    true);
    //we'll set this to enabled after we have a valid message displayed
    replaceElemClassFromTo('replyButton',        'hidden',    'visibleTC', true).textContent = 'Reply';
    replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('markReadButton',     'hidden',    'visibleTC', false);
    replaceElemClassFromTo('navButtonsSpan',     'hidden',    'visibleIB', true);
    //
    var msgIdArea = document.getElementById('msgIdArea');
    msgIdArea.readonly = "readonly"
    var msgDateArea = document.getElementById('msgDateArea');
    msgDateArea.readonly = "readonly"
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    var statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
    //
    var msgListHeaderAddr = document.getElementById('msgListHeaderAddr');
    msgListHeaderAddr.value = 'From: ';
    if (!!refreshMsgList) {
	index.listMode = 'recv';
	var msgNo = getCurMsgNo(acctInfo);
	makeMsgList(msgNo, function() {
	    showMsgLoop(acctInfo);
	    if (refreshMsgList)
		setMenuButtonState('viewSentButton', 'Enabled');
	});
    }
}



//
// handle View-Sent button
// if refreshMsgList then call showMsgLoop to look up the message corresponding to the current index['sentMessageNo']
// otherwise just set up the View-Sent mode and return.
//
// if refreshing the msg-list, then we only enable view-recv mode after the list is copmlete. if you don't take that
// precaution, then it's possible for a user to flip between recv and sent modes, and makeMsgListEntry will be confounded
// because the index.listMode has changed.
//
function handleViewSent(acctInfo, refreshMsgList) {
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Enabled');
    setMenuButtonState('viewRecvButton',      refreshMsgList ? 'Disabled' : 'Enabled');
    setMenuButtonState('composeButton',       'Enabled');
    setMenuButtonState('viewSentButton',      'Selected');
    setMenuButtonState('withdrawButton',      'Enabled');
    //
    var msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'To: ';
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly = "readonly"
    msgAddrArea.value = '';
    //
    replaceElemClassFromTo('msgIdArea',          'hidden',    'visibleTC', true).value = 'Msg ID: N/A';
    replaceElemClassFromTo('msgRefButton',       'hidden',    'visibleTC', true).textContent = 'Ref: N/A';
    replaceElemClassFromTo('msgDateArea',        'hidden',    'visibleTC', true).value = '';
    replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('msgFeeArea',         'visibleTC', 'hidden',    true);
    //we'll set this to enabled after we have a valid message displayed
    replaceElemClassFromTo('replyButton',        'hidden',    'visibleTC', true).textContent = 'Send again';
    replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('markReadButton',     'visibleTC', 'hidden',    true);
    replaceElemClassFromTo('navButtonsSpan',     'hidden',    'visibleIB', true);
    //
    var msgIdArea = document.getElementById('msgIdArea');
    msgIdArea.readonly = "readonly"
    var msgRefButton = document.getElementById('msgRefButton');
    msgRefButton.disabled = true;
    var msgDateArea = document.getElementById('msgDateArea');
    msgDateArea.readonly = "readonly"
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    var statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
    //
    var msgListHeaderAddr = document.getElementById('msgListHeaderAddr');
    msgListHeaderAddr.value = 'To: ';
    if (!!refreshMsgList) {
	index.listMode = 'sent';
	var msgNo = getCurMsgNo(acctInfo);
	makeMsgList(msgNo, function() {
	    showMsgLoop(acctInfo);
	    if (refreshMsgList)
		setMenuButtonState('viewRecvButton', 'Enabled');
	});
    }
}


//
// make the the message list, according to the current View-Sent / View-Recv mode.
// this fcn displays the group of 10 messages that include the passed msgNo
//
function makeMsgList(msgNo, cb) {
    var listTableBody = document.getElementById('listAreaDiv');
    while (listTableBody.hasChildNodes()) {
	var child = listTableBody.lastChild;
	if (!!child.id && child.id.startsWith("msgListHeader"))
	    break;
	listTableBody.removeChild(child);
    }
    index.listIdx = -1;
    console.log('makeMsgList: msgNo = ' + msgNo + ', index.listIdx = ' + index.listIdx);
    var batch = (msgNo > 0) ? Math.floor((msgNo - 1) / 10) : 0;
    var listIdx = (msgNo > 0) ? (msgNo - 1) % 10 : 0;
    var firstMsgNo = batch * 10 + 1;
    var viewRecvButton = document.getElementById('viewRecvButton');
    var getMsgLogFcn   = (viewRecvButton.className == 'menuBarButtonSelected') ? msgUtil.getRecvMsgLogs    : msgUtil.getSentMsgLogs;
    var parseLogsFcn   = (viewRecvButton.className == 'menuBarButtonSelected') ? ether.parseMessageRxEvent : ether.parseMessageTxEvent;
    getMsgLogFcn(common.web3.eth.accounts[0], batch, function(err, result) {
	if (!!err || !result || result.length < listIdx + 1) {
	    var msgTextArea = document.getElementById('msgTextArea');
	    //either an error, or maybe just no events
	    msgTextArea.value = (!!err) ? 'Error: ' + err : (msgNo > 0) ? 'Error: Unable to retreive message logs' : 'No messages';
	    result = null;
	}
	console.log('makeMsgList: calling makeMsgListEntry(0, ' + firstMsgNo + ')');
	makeMsgListEntry(parseLogsFcn, result, 0, firstMsgNo, cb);
    });
}



//
// make one entry of the sent message list
// recursive fcn to populate the entire list
//
// parseFcn: ether.parseMessageTxEvent or ether.parseMessageRxEvent
// result: array of logs (can be null)
// listIdx: index into list (0 - 9)
// msgNo: msgNo of this entry
// cb: callback when all done
//
function makeMsgListEntry(parseFcn, result, listIdx, msgNo, cb) {
    var listTableBody = document.getElementById('listAreaDiv');
    console.log('makeMsgListEntry[' + listIdx + '] = msgNo(' + msgNo + '), result.length = ' + (!!result ? result.length : 0));
    if (!result || listIdx >= result.length) {
	addToMsgList(listIdx, '', '', '', '', '', '', listTableBody);
	(listIdx < 9) ? makeMsgListEntry(parseFcn, result, listIdx + 1, msgNo + 1, cb) : cb();
	return;
    }
    parseFcn(result[listIdx], function(err, fromAddr, txCount, msgId, blockNumber, date) {
	if (!!err || !msgId) {
	    if (!err)
		err = 'Unable to parse message';
	    console.log('makeMsgListEntry parseFcn: err = ' + err);
	    addToMsgList(listIdx, msgNo, '', '', '', '', err, listTableBody);
	    (listIdx < 9) ? makeMsgListEntry(parseFcn, result, listIdx + 1, msgNo + 1, cb) : cb();
	    return;
	}
	msgUtil.getAndParseIdMsg(msgId, function(err, msgId, fromAddr, toAddr, txCount, rxCount, mimeType, ref, msgHex, blockNumber, date) {
	    if (!!err) {
		err = 'Message ID ' + msgId + ' not found';
		addToMsgList(listIdx, msgNo, '', '', '', '', err, listTableBody);
		(listIdx < 9) ? makeMsgListEntry(parseFcn, result, listIdx + 1, msgNo + 1, cb) : cb();
		return;
	    }
	    var otherAddr = (index.listMode == 'sent') ? toAddr : fromAddr;
	    msgUtil.decryptMsg(otherAddr, fromAddr, toAddr, txCount, msgHex, (err, decrypted) => {
		if (!!err) {
		    addToMsgList(listIdx, msgNo, '', '', '', '', 'message decryption error', listTableBody);
		    (listIdx < 9) ? makeMsgListEntry(parseFcn, result, listIdx + 1, msgNo + 1, cb) : cb();
		    return;
		} else {
		    addToMsgList(listIdx, msgNo, otherAddr, date, msgId, ref, decrypted, listTableBody);
		    (listIdx < 9) ? makeMsgListEntry(parseFcn, result, listIdx + 1, msgNo + 1, cb) : cb();
		}
	    });
	});
    });
}


function addToMsgList(listIdx, msgNo, addr, date, msgId, ref, content, table) {
    console.log('addToMsgList: msgNo = ' + msgNo + ', subject = ' + content.substring(0, 20));
    var subject = msgUtil.extractSubject(content, 80);
    var div, msgNoArea, addrArea, subjectArea, dateArea, msgIdArea

    (div = document.createElement("div")).id = 'msgListDivIdx-' + listIdx;
    var newSuffix = (index.listMode == 'sent' || common.chkIndexedFlag('beenRead', msgNo)) ? '' : 'New';
    div.className = 'msgListItemDiv' + newSuffix;
    index.listEntries[listIdx] = new ListEntry(listIdx, div, msgId, msgNo, addr, date, ref, content);
    if (!!msgNo) {
	div.addEventListener('click', function() {
	    //re-establish View-Sent of View-Recv mode as appropriate, but no need to refresh the msg list since
	    //by definition we are selecting a message from the current list
	    var msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
	    var viewSentButton = document.getElementById('viewSentButton');
	    var viewRecvButton = document.getElementById('viewRecvButton');
	    index[msgNoCounter] = msgNo;
	    if (index.listMode == 'recv' && viewRecvButton.className != 'menuBarButtonSelected')
		handleViewRecv(index.acctInfo, false);
	    else if (index.listMode == 'sent' && viewSentButton.className != 'menuBarButtonSelected')
		handleViewSent(index.acctInfo, false);
	    showMsgLoop(index.acctInfo);
	});
    }
    (msgNoArea = document.createElement("textarea")).className = 'msgListMsgNoArea';
    msgNoArea.rows = 1;
    msgNoArea.readonly = 'readonly';
    msgNoArea.disabled = 'disabled';
    msgNoArea.value = msgNo.toString(10);
    (addrArea = document.createElement("textarea")).className = 'msgListAddrArea';
    addrArea.rows = 1;
    addrArea.readonly = 'readonly';
    addrArea.disabled = 'disabled';
    addrArea.value = addr;
    (dateArea = document.createElement("textarea")).className = 'msgListDateArea';
    dateArea.rows = 1;
    dateArea.readonly = 'readonly';
    dateArea.disabled = 'disabled';
    dateArea.value = date;
    (msgIdArea = document.createElement("textarea")).className = 'msgListMsgIdArea';
    msgIdArea.rows = 1;
    msgIdArea.readonly = 'readonly';
    msgIdArea.disabled = 'disabled';
    msgIdArea.value = (!!msgId) ? msgUtil.abbreviateMsgId(msgId) : '';
    (subjectArea = document.createElement("textarea")).className = 'msgListSubjectArea';
    subjectArea.rows = 1;
    subjectArea.readonly = 'readonly';
    subjectArea.disabled = 'disabled';
    subjectArea.value = subject;
    div.appendChild(msgNoArea);
    div.appendChild(addrArea);
    div.appendChild(dateArea);
    div.appendChild(msgIdArea);
    div.appendChild(subjectArea);
    table.appendChild(div);
}


//
// return the current msgNo
// note: separate msgNo's are maintained for View-Sent and View-Received modes. this fcn returns the correct
// msgNo depending on the current mode
//
function getCurMsgNo(acctInfo) {
    var viewRecvButton = document.getElementById('viewRecvButton');
    var msgNoCounter     = (viewRecvButton.className == 'menuBarButtonSelected') ? 'recvMessageNo'                 : 'sentMessageNo';
    var acctInfoCountIdx = (viewRecvButton.className == 'menuBarButtonSelected') ? ether.ACCTINFO_RECVMESSAGECOUNT : ether.ACCTINFO_SENTMESSAGECOUNT;
    var maxMsgNo = parseInt(acctInfo[acctInfoCountIdx]);
    if (index[msgNoCounter] == 0 && maxMsgNo > 0)
	index[msgNoCounter] = 1;
    if (index[msgNoCounter] > maxMsgNo)
	index[msgNoCounter] = maxMsgNo;
    console.log('getCurMsgNo: curMsgNo = ' + index[msgNoCounter]);
    return(index[msgNoCounter]);
}


//
// handle traversing messages via prev, next buttons
// call this fcn anytime the current msgNo changes. it will validate the msgNo, and then re-display the message list if
// necessary, and calculate the current listIdx and hightlight the correct listEntry.
//
var prevAndNextButtonHasOnClick = false;
function showMsgLoop(acctInfo) {
    var prevButton = document.getElementById('prevMsgButton');
    var nextButton = document.getElementById('nextMsgButton');
    var viewRecvButton = document.getElementById('viewRecvButton');
    var acctInfoCountIdx = (viewRecvButton.className == 'menuBarButtonSelected') ? ether.ACCTINFO_RECVMESSAGECOUNT : ether.ACCTINFO_SENTMESSAGECOUNT;
    var maxMsgNo = parseInt(acctInfo[acctInfoCountIdx]);
    var msgNo = getCurMsgNo(acctInfo);
    prevButton.disabled = (msgNo > 1)        ? false : true;
    nextButton.disabled = (msgNo < maxMsgNo) ? false : true;
    //check msgNo outside of listEntries.... if yes, regenerate listEntries, and call us again
    var minListMsgNo = index.listEntries[0].msgNo;
    if (msgNo != 0 && (msgNo < minListMsgNo || msgNo >= minListMsgNo + 10)) {
	makeMsgList(msgNo, function() {
	    showMsgLoop(acctInfo);
	    return;
	});
	return;
    }
    var listIdx = (msgNo > 0) ? (msgNo - 1) % 10 : -1;
    console.log('showMsgLoop: listIdx = ' + listIdx + ', index.listIdx = ' + index.listIdx);
    if (listIdx != index.listIdx) {
	if (index.listIdx >= 0) {
	    var oldMsgNo = index.listEntries[index.listIdx].msgNo;
	    var newSuffix = (index.listMode == 'sent' || common.chkIndexedFlag('beenRead', oldMsgNo)) ? '' : 'New';
	    (index.listEntries[index.listIdx].div).className = 'msgListItemDiv' + newSuffix;
	}
	index.listIdx = listIdx;
	if (index.listIdx >= 0) {
	    var newSuffix = (index.listMode == 'sent' || common.chkIndexedFlag('beenRead', msgNo)) ? '' : 'New';
	    (index.listEntries[index.listIdx].div).className = 'msgListItemDivSelected' + newSuffix;
	    var markReadButton = document.getElementById('markReadButton');
	    markReadButton.textContent = (!!newSuffix) ? 'Mark as Read' : 'Mark as Unread';
	}
    }
    console.log('showMsgLoop: index[msgNoCounter] = ' + msgNo + ', maxMsgNo = ' + maxMsgNo);
    if (msgNo != 0) {
	var listIdx = (msgNo - 1) % 10;
	console.log('showMsgLoop: calling showMsgDetail(msgNo = ' + msgNo + ')');
	showMsgDetail(index.listEntries[listIdx].msgId, index.listEntries[listIdx].msgNo, index.listEntries[listIdx].addr,
		      index.listEntries[listIdx].date, index.listEntries[listIdx].ref, index.listEntries[listIdx].content);
    }
}


//
//cb(err)
//decrypt and display the message in the msgTextArea. also displays the msgId, ref, date & msgNo
//msgNo is either txCount or rxCount depending on whether the message was sent or received
//
function showMsgDetail(msgId, msgNo, otherAddr, date, ref, msgContent) {
    console.log('showMsg: enter');
    var msgAddrArea = document.getElementById('msgAddrArea');
    var msgTextArea = document.getElementById('msgTextArea');
    var msgNoNotButton = document.getElementById('msgNoNotButton');
    msgAddrArea.disabled = true;
    msgTextArea.disabled = true;
    msgAddrArea.value = otherAddr;
    showIdAndRef(msgId, ref, true);
    msgDateArea.value = date;
    var msgNoNotButton = document.getElementById('msgNoNotButton');
    msgNoNotButton.textContent = parseInt(msgNo).toString(10);
    msgTextArea.value = msgContent;
    var replyButton = document.getElementById('replyButton');
    replyButton.disabled = false;
}


//
// as a convenience, in case an error has already occurred (for example if the user rejects the transaction), you can
// call this fcn with the error message and no txid.
//
function waitForTXID(err, txid, desc, statusDiv, continuationMode, callback) {
    //
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Disabled');
    setMenuButtonState('viewRecvButton',      'Disabled');
    setMenuButtonState('composeButton',       'Disabled');
    setMenuButtonState('viewSentButton',      'Disabled');
    setMenuButtonState('withdrawButton',      'Disabled');
    var replyButton = document.getElementById('replyButton');
    replyButton.disabled = true;
    //
    //status div starts out hidden
    console.log('show status div');
    statusDiv.style.display = "block";
    var leftDiv = document.createElement("div");
    leftDiv.className = 'visibleIB';
    statusDiv.appendChild(leftDiv);
    var rightDiv = document.createElement("div");
    rightDiv.className = 'visibleIB';
    statusDiv.appendChild(rightDiv);
    var statusCtr = 0;
    var statusText = document.createTextNode('No status yet...');
    leftDiv.appendChild(statusText);
    if (!!err || !txid) {
	if (!err)
	    err = 'No transaction hash was generated.';
	statusText.textContent = 'Error in ' + desc + ' transaction: ' + err;
	var reloadLink = document.createElement('a');
	reloadLink.addEventListener('click', function() {
	    handleUnlockedMetaMask(continuationMode);
	});
	reloadLink.href = 'javascript:null;';
	reloadLink.innerHTML = "<h2>Continue</h2>";
	reloadLink.disabled = false;
	rightDiv.appendChild(reloadLink);
	callback(err);
	return;
    }
    //
    var viewTxLink = document.createElement('a');
    viewTxLink.href = 'https://' + ether.etherscanioTxStatusHost + '/tx/' + txid;
    viewTxLink.innerHTML = "<h2>View transaction</h2>";
    viewTxLink.target = '_blank';
    viewTxLink.disabled = false;
    leftDiv.appendChild(viewTxLink);
    //
    var timer = setInterval(function() {
	statusText.textContent = 'Waiting for ' + desc + ' transaction: ' + ++statusCtr + ' seconds...';
	if ((statusCtr & 0xf) == 0) {
	    common.web3.eth.getTransactionReceipt(txid, function(err, receipt) {
		console.log('waitForTXID: err = ' + err);
		console.log('waitForTXID: receipt = ' + receipt);
		if (!!err || !!receipt) {
		    if (!err && !!receipt && receipt.status == 0)
			err = "Transaction Failed with REVERT opcode";
		    statusText.textContent = (!!err) ? 'Error in ' + desc + ' transaction: ' + err : desc + ' transaction succeeded!';
		    console.log('transaction is in block ' + (!!receipt ? receipt.blockNumber : 'err'));
		    //statusText.textContent = desc + ' transaction succeeded!';
		    clearInterval(timer);
		    //
		    var reloadLink = document.createElement('a');
		    reloadLink.addEventListener('click', function() {
			handleUnlockedMetaMask(continuationMode);
		    });
		    reloadLink.href = 'javascript:null;';
		    reloadLink.innerHTML = "<h2>Continue</h2>";
		    reloadLink.disabled = false;
		    rightDiv.appendChild(reloadLink);
		    callback(err);
		    return;
		}
	    });
	}
    }, 1000);
}

function clearStatusDiv(statusDiv) {
    while (statusDiv.hasChildNodes()) {
	statusDiv.removeChild(statusDiv.lastChild);
    }
    statusDiv.style.display = "none";
}


//state = 'Disabled' | 'Enabled' | 'Selected'
function setMenuButtonState(buttonID, state) {
    var button = document.getElementById(buttonID);
    button.disabled = (state == 'Enabled') ? false : true;
    button.className = 'menuBarButton' + state;
}

function replaceElemClassFromTo(elemId, from, to, disabled) {
    var elem = document.getElementById(elemId);
    if (!elem)
	console.log('could not find elem: ' + elemId);
    elem.className = (elem.className).replace(from, to);
    elem.disabled = disabled;
    return(elem);
}

//we also save the id and ref in the area/button objects, for onclick
//if enable is set, then the msgRefButton is enabled, but only if ref is nz
function showIdAndRef(msgId, ref, enable) {
    if (!!msgId) {
	var msgIdArea = document.getElementById('msgIdArea');
	msgIdArea.value = 'Msg ID: ' + msgUtil.abbreviateMsgId(msgId);
	msgIdArea.msgId = msgId;
    }
    var msgRefButton = document.getElementById('msgRefButton');
    var refShortBN = common.numberToBN(ref);
    if (refShortBN.isZero()) {
	msgRefButton.textContent = 'Ref: none';
	msgRefButton.ref = '';
	msgRefButton.disabled = true;
    } else {
	msgRefButton.textContent = 'Ref: ' + msgUtil.abbreviateMsgId(ref);
	msgRefButton.ref = ref;
	msgRefButton.disabled = (enable) ? false : true;
    }
}
