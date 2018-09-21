
var common = require('./common');
var ether = require('./ether');
var ethUtils = require('ethereumjs-util');
var Buffer = require('buffer/').Buffer;
var BN = require("bn.js");
const keccak = require('keccakjs');


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

    main: function() {
	console.log('index.main');
	setMainButtonHandlers();
	setReplyButtonHandlers();
	setValidateButtonHandler();
	setPrevNextButtonHandlers();
	beginTheBeguine();
    },
};


function setMainButtonHandlers() {
    var registerButton = document.getElementById('registerButton');
    registerButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleRegister();
    });
    var viewRecvButton = document.getElementById('viewRecvButton');
    viewRecvButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleViewRecv(index.acctInfo);
    });
    var composeButton = document.getElementById('composeButton');
    composeButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleCompose(index.acctInfo, '', 'Subject: ');
    });
    var viewSentButton = document.getElementById('viewSentButton');
    viewSentButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleViewSent(index.acctInfo);
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


function setReplyButtonHandlers() {
    var replyButton = document.getElementById('replyButton');
    replyButton.addEventListener('click', function() {
	console.log('replyButton');
	var composeButton = document.getElementById('composeButton');
	var viewRecvButton = document.getElementById('viewRecvButton');
	var viewSentButton = document.getElementById('viewSentButton');
	var msgAddrArea = document.getElementById('msgAddrArea');
	var msgTextArea = document.getElementById('msgTextArea');
	var message = msgTextArea.value;
	if (composeButton.className == 'menuBarButtonSelected') {
	    //handle send
	    console.log('send');
	    var mimeType = 1;
	    var messageHex = ethUtils.bufferToHex(message);
	    var toAddr = msgAddrArea.value;
	    //the toAddr has already been validated. really.
	    ether.accountQuery(common.web3, toAddr, function(err, toAcctInfo) {
		//see how many messages have been sent from the proposed recipient to me
		ether.getPeerMessageCount(common.web3, toAddr, common.web3.eth.accounts[0], function(err, msgCount) {
		    console.log(msgCount.toString(10) + ' messages have been sent from ' + toAddr + ' to me');
		    var fee = (msgCount > 0) ? toAcctInfo[ether.ACCTINFO_MESSAGEFEE] : toAcctInfo[ether.ACCTINFO_SPAMFEE];
		    console.log('fee is ' + fee + ' wei');
		    ether.sendMessage(common.web3, toAddr, mimeType, messageHex, fee, function(err, txid) {
			console.log('txid = ' + txid);
			var statusDiv = document.getElementById('statusDiv');
			waitForTXID(txid, 'Send-Message', statusDiv, function() {
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
	    console.log('fromAddr = ' + fromAddr);
	    console.log('subject = ' + subject);
	    handleCompose(index.acctInfo, fromAddr, subject);
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
		if (toAcctInfo[ether.ACCTINFO_G] == '0') {
		    msgTextArea.value = 'Error: no account was found for this address.';
		    replyButton.disabled = true;
		} else {
		    msgTextArea.disabled = false;
		    msgTextArea.readonly="";
		    replyButton.disabled = false;
		    msgTextArea.value = (!!msgTextArea.subject) ? msgTextArea.subject : '';
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


function setPrevNextButtonHandlers() {
    var prevButton = document.getElementById('prevMsgButton');
    var nextButton = document.getElementById('nextMsgButton');
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
	    handleUnlockedMetaMask();
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
    msgAddrArea.readonly="readonly"
    msgAddrArea.value = '';
    var msgDateArea = document.getElementById('msgDateArea');
    msgDateArea.className = (msgDateArea.className).replace('visibleTC', 'hidden');
    msgDateArea.disabled = true;
    var validateAddrButton = document.getElementById('validateAddrButton');
    validateAddrButton.className = (validateAddrButton.className).replace('visibleTC', 'hidden');
    validateAddrButton.disabled = true;
    var msgFeeArea = document.getElementById('msgFeeArea');
    msgFeeArea.className = (msgFeeArea.className).replace('visibleTC', 'hidden');
    msgFeeArea.disabled = true;
    var replyButton = document.getElementById('replyButton');
    replyButton.disabled = true;
    replyButton.textContent = 'Reply';
    replyButton.className = (replyButton.className).replace('hidden', 'visibleTC');
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly='readonly';
    msgTextArea.placeholder='';
    var registerDiv = document.getElementById('registerDiv');
    registerDiv.className = (registerDiv.className).replace('visibleIB', 'hidden');
    var statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
    alert(err);
}


function handleUnlockedMetaMask() {
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
	console.log('acctInfo: ' + JSON.stringify(index.acctInfo));
	var obfuscatedSecret = index.acctInfo[ether.ACCTINFO_OBFUSCATEDSECRET];
	console.log('obfuscatedSecret: X' + obfuscatedSecret + 'X');
	if (obfuscatedSecret == '0') {
	    handleUnregisteredAcct(index.acctInfo);
	} else {
	    handleRegisteredAcct(index.acctInfo);
	}
    });
}


//
// handle unregistered account
//
function handleUnregisteredAcct(acctInfo) {
    var registerButton = document.getElementById('registerButton');
    registerButton.textContent = 'Register Account';
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Enabled');
    setMenuButtonState('viewRecvButton',      'Disabled');
    setMenuButtonState('composeButton',       'Disabled');
    setMenuButtonState('viewSentButton',      'Disabled');
    setMenuButtonState('withdrawButton',      'Disabled');
    //
    var totalReceivedArea = document.getElementById('totalReceivedArea');
    totalReceivedArea.value = 'This Ethereum address is not registered';
    var feeBalanceArea = document.getElementById('feeBalanceArea');
    feeBalanceArea.value = '';
    //
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly="readonly"
    msgAddrArea.value = '';
    var msgDateArea = document.getElementById('msgDateArea');
    msgDateArea.className = (msgDateArea.className).replace('visibleTC', 'hidden');
    msgDateArea.disabled = true;
    var validateAddrButton = document.getElementById('validateAddrButton');
    validateAddrButton.className = (validateAddrButton.className).replace('visibleTC', 'hidden');
    validateAddrButton.disabled = true;
    var msgFeeArea = document.getElementById('msgFeeArea');
    msgFeeArea.className = (msgFeeArea.className).replace('visibleTC', 'hidden');
    msgFeeArea.disabled = true;
    var replyButton = document.getElementById('replyButton');
    replyButton.disabled = true;
    replyButton.textContent = 'Reply';
    replyButton.className = (replyButton.className).replace('hidden', 'visibleTC');
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly='readonly';
    msgTextArea.placeholder='';
    var registerDiv = document.getElementById('registerDiv');
    registerDiv.className = (registerDiv.className).replace('visibleIB', 'hidden');
    var statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
}


//
// handle registered account
//
function handleRegisteredAcct(acctInfo) {
    var registerButton = document.getElementById('registerButton');
    registerButton.textContent = 'Modify Account';
    var totalReceivedArea = document.getElementById('totalReceivedArea');
    totalReceivedArea.value = 'Messages sent: ' + index.acctInfo[ether.ACCTINFO_SENTMESSAGECOUNT] + '; Messages received: ' + index.acctInfo[ether.ACCTINFO_RECVMESSAGECOUNT];
    var feeBalanceArea = document.getElementById('feeBalanceArea');
    var feebalanceWei = index.acctInfo[ether.ACCTINFO_FEEBALANCE];
    console.log('feeBalanceWei = ' + feebalanceWei);
    feeBalanceArea.value = 'Unclaimed message fees: ' + ether.convertWeiToComfort(common.web3, feebalanceWei);
    handleViewRecv(index.acctInfo);
}



//
// handle View-Recv button
//
function handleViewRecv(acctInfo) {
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Enabled');
    setMenuButtonState('viewRecvButton',      'Selected');
    setMenuButtonState('composeButton',       'Enabled');
    setMenuButtonState('viewSentButton',      'Enabled');
    setMenuButtonState('withdrawButton',      'Enabled');
    //
    var msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'From: ';
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly="readonly"
    msgAddrArea.value = '';
    var msgDateArea = document.getElementById('msgDateArea');
    msgDateArea.disabled = true;
    msgDateArea.readonly="readonly"
    msgDateArea.value = '';
    msgDateArea.className = (msgDateArea.className).replace('hidden', 'visibleTC');
    var validateAddrButton = document.getElementById('validateAddrButton');
    validateAddrButton.className = (validateAddrButton.className).replace('visibleTC', 'hidden');
    validateAddrButton.disabled = true;
    var msgFeeArea = document.getElementById('msgFeeArea');
    msgFeeArea.className = (msgFeeArea.className).replace('visibleTC', 'hidden');
    msgFeeArea.disabled = true;
    //we'll set this to enabled after we have a valid message displayed
    var replyButton = document.getElementById('replyButton');
    replyButton.disabled = true;
    replyButton.textContent = 'Reply';
    replyButton.className = (replyButton.className).replace('hidden', 'visibleTC');
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly='readonly';
    msgTextArea.placeholder='';
    var registerDiv = document.getElementById('registerDiv');
    registerDiv.className = (registerDiv.className).replace('visibleIB', 'hidden');
    var statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
    showMsgLoop(acctInfo);
}


//
// handle Compose button
//
function handleCompose(acctInfo, toAddr, subject) {
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Enabled');
    setMenuButtonState('viewRecvButton',      'Enabled');
    setMenuButtonState('composeButton',       'Selected');
    setMenuButtonState('viewSentButton',      'Enabled');
    setMenuButtonState('withdrawButton',      'Enabled');
    //
    var msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'To: ';
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = false;
    msgAddrArea.readonly="";
    msgAddrArea.value = toAddr;
    var msgDateArea = document.getElementById('msgDateArea');
    msgDateArea.className = (msgDateArea.className).replace('visibleTC', 'hidden');
    msgDateArea.disabled = true;
    var validateAddrButton = document.getElementById('validateAddrButton');
    validateAddrButton.className = (validateAddrButton.className).replace('hidden', 'visibleTC');
    validateAddrButton.disabled = false;
    var msgFeeArea = document.getElementById('msgFeeArea');
    msgFeeArea.className = (msgFeeArea.className).replace('hidden', 'visibleTC');
    msgFeeArea.disabled = true;
    msgFeeArea.value = 'Fee: ';
    var replyButton = document.getElementById('replyButton');
    replyButton.disabled = true;
    replyButton.textContent = 'Send';
    replyButton.className = (replyButton.className).replace('hidden', 'visibleTC');
    //textarea will be enabled after addr is validated
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly='readonly';
    msgTextArea.placeholder="Validate the recipient address, then type your message here...";
    msgTextArea.subject = subject;
    var registerDiv = document.getElementById('registerDiv');
    registerDiv.className = (registerDiv.className).replace('visibleIB', 'hidden');
    var statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
}


//
// handle View-Sent button
//
function handleViewSent(acctInfo) {
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Enabled');
    setMenuButtonState('viewRecvButton',      'Enabled');
    setMenuButtonState('composeButton',       'Enabled');
    setMenuButtonState('viewSentButton',      'Selected');
    setMenuButtonState('withdrawButton',      'Enabled');
    //
    var msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'To: ';
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly="readonly"
    msgAddrArea.value = '';
    var msgDateArea = document.getElementById('msgDateArea');
    msgDateArea.disabled = true;
    msgDateArea.readonly="readonly"
    msgDateArea.value = '';
    msgDateArea.className = (msgDateArea.className).replace('hidden', 'visibleTC');
    var validateAddrButton = document.getElementById('validateAddrButton');
    validateAddrButton.className = (validateAddrButton.className).replace('visibleTC', 'hidden');
    validateAddrButton.disabled = true;
    var msgFeeArea = document.getElementById('msgFeeArea');
    msgFeeArea.className = (msgFeeArea.className).replace('visibleTC', 'hidden');
    msgFeeArea.disabled = true;
    //we'll set this to enabled after we have a valid message displayed
    var replyButton = document.getElementById('replyButton');
    replyButton.disabled = true;
    replyButton.textContent = 'Send again';
    replyButton.className = (replyButton.className).replace('hidden', 'visibleTC');
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly='readonly';
    msgTextArea.placeholder='';
    var registerDiv = document.getElementById('registerDiv');
    registerDiv.className = (registerDiv.className).replace('visibleIB', 'hidden');
    var statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
    showMsgLoop(acctInfo);
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
    var msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'Addr: ';
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly="readonly"
    msgAddrArea.value = common.web3.eth.accounts[0];
    var msgDateArea = document.getElementById('msgDateArea');
    msgDateArea.className = (msgDateArea.className).replace('visibleTC', 'hidden');
    msgDateArea.disabled = true;
    var validateAddrButton = document.getElementById('validateAddrButton');
    validateAddrButton.className = (validateAddrButton.className).replace('visibleTC', 'hidden');
    validateAddrButton.disabled = true;
    var msgFeeArea = document.getElementById('msgFeeArea');
    msgFeeArea.className = (msgFeeArea.className).replace('visibleTC', 'hidden');
    msgFeeArea.disabled = true;
    var replyButton = document.getElementById('replyButton');
    replyButton.disabled = true;
    replyButton.className = (replyButton.className).replace('visibleTC', 'hidden');
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('visibleIB', 'hidden');
    msgTextArea.disabled = true;
    var registerDiv = document.getElementById('registerDiv');
    registerDiv.className = (registerDiv.className).replace('hidden', 'visibleIB');
    var statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
}


function handleRegisterSubmit() {
    var registerDiv = document.getElementById('registerDiv');
    var messageFeeInput = document.getElementById('messageFeeInput');
    var spamFeeInput = document.getElementById('spamFeeInput');
    var messageFee = parseInt(messageFeeInput.value, 10);
    var spamFee = parseInt(spamFeeInput.value, 10);
    console.log('message fee = ' + messageFee + ', spam fee = ' + spamFee);
    var obfuscatedSecret = 1;
    var g = 2;
    var p = 3;
    ether.register(common.web3, messageFee, spamFee, obfuscatedSecret, g, p, function(err, txid) {
	console.log('txid = ' + txid);
	var statusDiv = document.getElementById('statusDiv');
	waitForTXID(txid, 'Register', statusDiv, function() {
	});
    });
}

function handleWithdraw() {
    var msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = '';
    var msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly="readonly"
    msgAddrArea.value = '';
    var msgDateArea = document.getElementById('msgDateArea');
    msgDateArea.className = (msgDateArea.className).replace('visibleTC', 'hidden');
    msgDateArea.disabled = true;
    var validateAddrButton = document.getElementById('validateAddrButton');
    validateAddrButton.className = (validateAddrButton.className).replace('visibleTC', 'hidden');
    validateAddrButton.disabled = true;
    var msgFeeArea = document.getElementById('msgFeeArea');
    msgFeeArea.className = (msgFeeArea.className).replace('visibleTC', 'hidden');
    msgFeeArea.disabled = true;
    var replyButton = document.getElementById('replyButton');
    replyButton.disabled = true;
    replyButton.className = (replyButton.className).replace('visibleTC', 'hidden');
    var msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.disabled = true;
    msgTextArea.value = '';
    //
    ether.withdraw(common.web3, function(err, txid) {
	console.log('txid = ' + txid);
	var statusDiv = document.getElementById('statusDiv');
	waitForTXID(txid, 'Withdraw', statusDiv, function() {
	});
    });
}


//
// handle traversing recv messages
//
var prevAndNextButtonHasOnClick = false;
function showMsgLoop(acctInfo) {
    var prevButton = document.getElementById('prevMsgButton');
    var nextButton = document.getElementById('nextMsgButton');
    var viewRecvButton = document.getElementById('viewRecvButton');
    var msgNoCounter     = (viewRecvButton.className == 'menuBarButtonSelected') ? 'recvMessageNo'                 : 'sentMessageNo';
    var acctInfoCountIdx = (viewRecvButton.className == 'menuBarButtonSelected') ? ether.ACCTINFO_RECVMESSAGECOUNT : ether.ACCTINFO_SENTMESSAGECOUNT;
    var maxMsgNo = parseInt(acctInfo[acctInfoCountIdx], 10);
    if (index[msgNoCounter] > maxMsgNo)
	index[msgNoCounter] = maxMsgNo;
    prevButton.disabled = (index[msgNoCounter] > 1)        ? false : true;
    nextButton.disabled = (index[msgNoCounter] < maxMsgNo) ? false : true;
    console.log('showMsgLoop: index[msgNoCounter] = ' + index[msgNoCounter] + ', maxMsgNo = ' + maxMsgNo);
    console.log('showMsgLoop: viewRecvButton.className = ' + viewRecvButton.className);
    if (index[msgNoCounter] != 0) {
	if (viewRecvButton.className == 'menuBarButtonSelected') {
	    console.log('showMsgLoop: calling showRecvMsg');
	    showRecvMsg(index['recvMessageNo']);
	}
	else {
	    console.log('showMsgLoop: calling showSentMsg');
	    showSentMsg(index['sentMessageNo']);
	}
    }
}


//
// show the current recv message
//
function showRecvMsg(msgNo) {
    console.log('showRecvMsg: enter msgNo = ' + msgNo);
    var msgAreaDiv = document.getElementById('msgAreaDiv');
    var msgAddrArea = document.getElementById('msgAddrArea');
    var msgDateArea = document.getElementById('msgDateArea');
    var msgTextArea = document.getElementById('msgTextArea');
    var msgNoNotButton = document.getElementById('msgNoNotButton');
    //msgAddrArea.cols = 80;
    //msgTextArea.cols = 80;
    //msgTextArea.rows = 10;
    getRecvMsg(common.web3.eth.accounts[0], msgNo, function(err, fromAddr, toAddr, date, msg) {
	if (!!err) {
	    msgTextArea.value = 'Error: ' + err;
	} else {
	    msgNoNotButton.textContent = msgNo.toString(10);
	    msgAddrArea.value = fromAddr;
	    msgDateArea.value = date;
	    console.log('showRecvMsg: msg = ' + msg);
	    msgTextArea.value = msg;
	    if (fromAddr != '') {
		var replyButton = document.getElementById('replyButton');
		replyButton.disabled = false;
	    }
	}
    });
}


//
// show the current sent message
//
function showSentMsg(msgNo) {
    console.log('showSentMsg: enter');
    var msgAreaDiv = document.getElementById('msgAreaDiv');
    var msgAddrArea = document.getElementById('msgAddrArea');
    var msgTextArea = document.getElementById('msgTextArea');
    var msgNoNotButton = document.getElementById('msgNoNotButton');
    msgAddrArea.disabled = true;
    msgTextArea.disabled = true;
    getSentMsg(common.web3.eth.accounts[0], msgNo, function(err, fromAddr, toAddr, date, msg) {
	if (!!err) {
	    msgTextArea.value = 'Error: ' + err;
	} else {
	    msgNoNotButton.textContent = msgNo.toString(10);
	    msgAddrArea.value = toAddr;
	    msgDateArea.value = date;
	    console.log('showSentMsg: addr = ' + toAddr + ', msg = ' + msg);
	    msgTextArea.value = msg;
	    if (toAddr != '') {
		var replyButton = document.getElementById('replyButton');
		replyButton.disabled = false;
	    }
	}
    });
}


//cb(err, fromAddr, toAddr, date, msg)
function getSentMsg(fromAddr, sentMsgNo, cb) {
    var url = 'https://' + ether.etherscanioHost   +
	'/api?module=logs&action=getLogs'          +
	'&fromBlock=0&toBlock=latest'              +
	'&address=' + ether.EMT_CONTRACT_ADDR      +
	'&topic0=' + ether.MESSAGETX_EVENT_TOPIC0  +
	'&topic1=' + '0x' + common.leftPadTo(fromAddr.substring(2), 64, '0') +
	'&topic2=' + '0x' + common.leftPadTo(sentMsgNo.toString(16), 64, '0');
    common.fetch(url, function(str, err) {
	if (!str || !!err) {
	    var err = "error retreiving events: " + err;
	    console.log('getSentMsg: ' + err);
	    cb(err, '', '', '', '');
	    return;
	}
	//typical
	//  { "status"  : "1",
	//    "message" : "OK",
	//    "result"  : [
	//                  { "address"     : "0x170d49612b631bc989a72253d78cb4218ca12aeb",
	//                    "topics"      : [
	//                                      "0xbd6eec70c65c378858289ddb15fba6b7a1f247614a57b602623822fa40def19a",
	//                                      "0x00000000000000000000000053c619594a6f15cd59f32f76257787d5438cd016",
	//                                      "0x0000000000000000000000000000000000000000000000000000000000000001"
	//                                    ],
	//                    "data"        : "0x000000000000000000000000f48ae436e4813c7dcd5cdeb305131d07ca022469     -- toAddr
	//                                       0000000000000000000000000000000000000000000000000000000000000001",   -- toCount
	//                    "blockNumber" : "0x3d8fb3",
	//                    "timeStamp"   : "0x5b9b0ae5",
	//                    "gasPrice"    : "0x3b9aca00",
	//                    "gasUsed"     : "0x2076a",
	//                    "logIndex"    : "0x13",
	//                    "transactionHash"  : "0x9b729a9025ca7c12829fba145bf1edbdcd6426224d80be372296c0b0cd17bf95",
	//                    "transactionIndex" : "0x11"
	//                 }
	//               ]
	//  }
	var eventsResp = JSON.parse(str);
	if (eventsResp.status == 0 && eventsResp.message == 'No records found') {
	    //this is not an err... just no events
	    cb(err, '', '', '', '');
	    return;
	}
	if (eventsResp.status != 1 || eventsResp.message != 'OK') {
	    var err = "error retreiving events: bad status (" + eventsResp.status + ", " + eventsResp.message + ")";
	    console.log('getSentMsg: ' + err);
	    cb(err, '', '', '', '');
	    return;
	}
	var toAddr = '';
	var toCount = 0;
	var i = 0;
	{
	    console.log(eventsResp.result[i]);
	    //var blockNumber = parseInt(eventsResp.result[i].blockNumber, 16);
	    var timeStamp = parseInt(eventsResp.result[i].timeStamp, 16);
	    var sentDate = (new Date(timeStamp * 1000)).toUTCString();
	    console.log('sentDate = ' + sentDate);
	    //first 2 chars are '0x'
	    toAddr = eventsResp.result[i].data.slice(0+2, 64+2);
	    toAddr = '0x' + toAddr.substring(12*2);
	    var toCountHex = eventsResp.result[i].data.slice(64+2, 128+2);
	    toCount = parseInt(toCountHex, 16);
	    console.log('getSentMsg: toAddr = ' + toAddr + ', toCount = ' + toCount);
	    //get the n'th messages received by the toAddr
	    getRecvMsg(toAddr, toCount, function(err, fromAddr, toAddr, date, msg) {
		cb(err, fromAddr, toAddr, sentDate, msg);
	    });
	}
    });
}


//cb(err, fromAddr, toAddr, date, msg)
function getRecvMsg(toAddr, recvMsgNo, cb) {
    var url = 'https://' + ether.etherscanioHost   +
	'/api?module=logs&action=getLogs'          +
	'&fromBlock=0&toBlock=latest'              +
	'&address=' + ether.EMT_CONTRACT_ADDR      +
	'&topic0=' + ether.MESSAGERX_EVENT_TOPIC0  +
	'&topic1=' + '0x' + common.leftPadTo(toAddr.substring(2), 64, '0') +
	'&topic2=' + '0x' + common.leftPadTo(recvMsgNo.toString(16), 64, '0');
    common.fetch(url, function(str, err) {
	if (!str || !!err) {
	    var err = "error retreiving events: " + err;
	    console.log('getRecvMsg: ' + err);
	    cb(err, '', '', '', '');
	    return;
	}
	//typical
	//  { "status"  : "1",
	//    "message" : "OK",
	//    "result"  : [
	//                  { "address" : "0x800bf6d2bb0156fd21a84ae20e1b9479dea0dca9",
	//                    "topics"  : [
	//                                  "0xa4b1fcc6b4f905c800aeac882ea4cbff09ab73cb784c8e0caad226fbeab35b63",
	//                                  "0x00000000000000000000000053c619594a6f15cd59f32f76257787d5438cd016", -- _toAddr
	//                                  "0x0000000000000000000000000000000000000000000000000000000000000001"  -- _count
	//                                ],
	//                    "data"    : "0x000000000000000000000000f48ae436e4813c7dcd5cdeb305131d07ca022469     -- _fromAddr
	//                                   0000000000000000000000000000000000000000000000000000000000000001     -- _mimeType
	//                                   0000000000000000000000000000000000000000000000000000000000000060     -- offset to message
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
	//                ]
	//  }
	var eventsResp = JSON.parse(str);
	if (eventsResp.status == 0 && eventsResp.message == 'No records found') {
	    //this is not an err... just no events
	    cb(err, '', '', '');
	    return;
	}
	if (eventsResp.status != 1 || eventsResp.message != 'OK') {
	    var err = "error retreiving events: bad status (" + eventsResp.status + ", " + eventsResp.message + ")";
	    console.log('getRecvMsg: ' + err);
	    cb(err, '', '', '', '');
	    return;
	}
	var msg = '';
	var fromAddr = '';
	var mimeType = 0;
	var i = 0;
	{
	    console.log(eventsResp.result[i]);
	    //var blockNumber = parseInt(eventsResp.result[i].blockNumber, 16);
	    var timeStamp = parseInt(eventsResp.result[i].timeStamp, 16);
	    var date = (new Date(timeStamp * 1000)).toUTCString();
	    console.log('date = ' + date);
	    //first 2 chars are '0x'
	    fromAddr = eventsResp.result[i].data.slice(0+2, 64+2);
	    fromAddr = '0x' + fromAddr.substring(12*2);
	    var mimeTypeHex = eventsResp.result[i].data.slice(64+2, 128+2);
	    mimeType = parseInt(mimeTypeHex, 16);
	    console.log('getRecvMsg: mimeType = ' + mimeType.toString(10));
	    var msgOffsetHex = eventsResp.result[i].data.slice(128+2, 192+2);
	    var msgOffset = parseInt(msgOffsetHex, 16);
	    var msgLenHex = eventsResp.result[i].data.slice((2*msgOffset)+2, (2*msgOffset)+64+2);
	    var msgLen = parseInt(msgLenHex, 16);
	    console.log('getRecvMsg: msgLen = ' + msgLen.toString(16));
	    var msgHex = eventsResp.result[i].data.slice((2*msgOffset)+64+2, (2*msgOffset)+64+2+(msgLen*2));
	    console.log('msg = 0x' + msgHex);
	    msg = common.hexToAscii(msgHex);
	}
	cb(null, fromAddr, toAddr, date, msg);
    });
}


function waitForTXID(txid, desc, statusDiv, callback) {
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
		if (!!err || !!receipt) {
		    if (!err && !!receipt && receipt.status == 0)
			err = "Transaction Failed with REVERT opcode";
		    statusText.textContent = (!!err) ? 'Error in ' + desc + ' transaction: ' + err : desc + ' transaction succeeded!';
		    console.log('transaction is in block ' + (!!receipt ? receipt.blockNumber : 'err'));
		    //statusText.textContent = desc + ' transaction succeeded!';
		    clearInterval(timer);
		    //
		    var reloadLink = document.createElement('a');
		    reloadLink.href = 'javascript:location.reload();';
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
