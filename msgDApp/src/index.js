
const common = require('./common');
const ether = require('./ether');
const mtEther = require('./mtEther');
const dhcrypt = require('./dhcrypt');
const mtUtil = require('./mtUtil');
const autoVersion = require('./autoVersion');
const ethUtils = require('ethereumjs-util');
const Buffer = require('buffer/').Buffer;
const BN = require("bn.js");




document.addEventListener('DOMContentLoaded', function() {
    console.log('content loaded');
    console.log('window.innerWidth = ' + window.innerWidth);
    console.log('window.innerHeight = ' + window.innerHeight);
    index.main();
});


const index = module.exports = {
    //current messages to display
    recvMessageNo: 1,
    sentMessageNo: 1,
    account: null,
    acctInfo: null,
    acctCheckTimer: null,
    publicKey: null,
    listIdx: -1,
    listMode: null,
    listEntries: {},
    msgListElems: [],
    waitingForTxid: false,
    localStoragePrefix: '',
    introCompletePromise: null,
    periodicAcctCheckCount: 0,

    main: function() {
	console.log('index.main');
	setOptionsButtonHandlers();
	setMainButtonHandlers();
	setReplyButtonHandlers();
	setValidateButtonHandler();
	setAttachButtonHandler();
	setMsgRefButtonHandler();
	setMarkReadButtonHandler();
	setPrevNextButtonHandlers();
	beginTheBeguine('startup');
	periodicCheckForAccountChanges();
    },

};

function ListEntry(listIdx, div, msgId, msgNo, addr, date, ref, text, attachment) {
    this.listIdx = listIdx;
    this.div = div;
    this.msgId = msgId;
    this.msgNo = msgNo;
    this.addr = addr;
    this.date = date;
    this.ref = ref;
    this.text = text;
    this.attachment = attachment;
}


function setOptionsButtonHandlers() {
    const versionArea = document.getElementById('versionArea');
    versionArea.textContent = 'Build: ' + autoVersion.version();
    const optionsButton = document.getElementById('optionsButton');
    optionsButton.addEventListener('click', () => { replaceElemClassFromTo('optionsPanel', 'hidden', 'visibleB', null); });
    const closeOptionsButton = document.getElementById('closeOptionsButton');
    closeOptionsButton.addEventListener('click', () => {
	replaceElemClassFromTo('optionsPanel', 'visibleB', 'hidden', null);
	if (localStorage['logsNode'] != ether.node) {
	    //if node changed...
	    ether.node = localStorage['logsNode'];
	    if (!!index.acctInfo && !!index.listMode)
		makeMsgList(getCurMsgNo(index.acctInfo), () => { showMsgLoop(index.acctInfo); });
	}
    });
    const marysThemeButton = document.getElementById('marysThemeButton');
    const wandasThemeButton = document.getElementById('wandasThemeButton');
    const relaxThemeButton = document.getElementById('relaxThemeButton');
    const themedStyle = document.getElementById('themedStyle');
    const updateThemeFcn = (theme) => {
	localStorage['theme'] = theme;
	if (themedStyle.href.indexOf('marys-style') >= 0)
	    themedStyle.href = themedStyle.href.replace('marys-style', localStorage['theme']);
	if (themedStyle.href.indexOf('wandas-style') >= 0)
	    themedStyle.href = themedStyle.href.replace('wandas-style', localStorage['theme']);
	if (themedStyle.href.indexOf('relax-style') >= 0)
	    themedStyle.href = themedStyle.href.replace('relax-style', localStorage['theme']);
    };
    if (!!localStorage['theme'] && localStorage['theme'].indexOf('wanda') >= 0) {
	wandasThemeButton.checked = true;
	updateThemeFcn('wandas-style');
    } else if (!!localStorage['theme'] && localStorage['theme'].indexOf('relax') >= 0) {
	relaxThemeButton.checked = true;
	updateThemeFcn('relax-style');
    } else {
	marysThemeButton.checked = true;
	updateThemeFcn('marys-style');
    }
    marysThemeButton.addEventListener('click', () => {	updateThemeFcn('marys-style'); });
    wandasThemeButton.addEventListener('click', () => { updateThemeFcn('wandas-style'); });
    relaxThemeButton.addEventListener('click', () => { updateThemeFcn('relax-style'); });
    const logServerSelect = document.getElementById('logServerSelect');
    const logServerSelectFcn = () => { localStorage['logsNode'] = logServerSelect.value; };
    if (!localStorage['logsNode'])
	localStorage['logsNode'] = ether.node;
    logServerSelect.value = ether.node = localStorage['logsNode'];
    logServerSelect.addEventListener('change', logServerSelectFcn);
    //
    const startFirstUnreadButton = document.getElementById('startFirstUnreadButton');
    const startLastViewedButton = document.getElementById('startLastViewedButton');
    if (!localStorage['onStartGoto'])
	localStorage['onStartGoto'] = 'first-unread';
    if (localStorage['onStartGoto'].indexOf('last-viewed') >= 0)
	startLastViewedButton.checked = true;
    else
	startFirstUnreadButton.checked = true;
    const updateStartGotoFcn = (goto) => { localStorage['onStartGoto'] = goto; };
    startFirstUnreadButton.addEventListener('click', () => { updateStartGotoFcn('first-unread'); });
    startLastViewedButton.addEventListener('click', () => { updateStartGotoFcn('last-viewed'); });
}

function setMainButtonHandlers() {
    const registerButton = document.getElementById('registerButton');
    registerButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleRegister();
    });
    const viewRecvButton = document.getElementById('viewRecvButton');
    viewRecvButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleViewRecv(index.acctInfo, true);
    });
    const composeButton = document.getElementById('composeButton');
    composeButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleCompose(index.acctInfo, '');
    });
    const viewSentButton = document.getElementById('viewSentButton');
    viewSentButton.addEventListener('click', function() {
	console.log('viewSentButton: got click');
	if (!!index.acctInfo)
	    handleViewSent(index.acctInfo, true);
    });
    const registerSubmitButton = document.getElementById('registerSubmitButton');
    registerSubmitButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleRegisterSubmit();
    });
    const withdrawButton = document.getElementById('withdrawButton');
    withdrawButton.addEventListener('click', function() {
	if (!!index.acctInfo)
	    handleWithdraw();
    });
    const importantInfoButton = document.getElementById('importantInfoButton');
    importantInfoButton.addEventListener('click', function() {
	doFirstIntro(true);
    });
    const newMsgModal = document.getElementById('newMsgModal');
    window.onclick = function(event) {
        //when user clicks anywhere, close new message modal
        newMsgModal.style.display = "none";
    };
}


//
// the "reply" button is also the "send" button, depending on the context
// in view{Sent,Recv}Msg modes the reply button creates a special compose mode, via handleReplyCompose. in compose mode (including the
// compose mode created by handleReplyCompose), the reply (send) button actually sends the message.
//
function setReplyButtonHandlers() {
    const replyButton = document.getElementById('replyButton');
    replyButton.addEventListener('click', function() {
	console.log('replyButton');
	const validateAddrButton = document.getElementById('validateAddrButton');
	const composeButton = document.getElementById('composeButton');
	const viewRecvButton = document.getElementById('viewRecvButton');
	const viewSentButton = document.getElementById('viewSentButton');
	const msgAddrArea = document.getElementById('msgAddrArea');
	const msgTextArea = document.getElementById('msgTextArea');
	let message = msgTextArea.value;
	if (composeButton.className == 'menuBarButtonSelected') {
	    //handle send
	    console.log('send');
	    replyButton.disabled = true;
	    msgTextArea.disabled = true;
	    msgAddrArea.disabled = true;
	    validateAddrButton.disabled = true;
	    //
	    let attachmentIdxBN;
	    const attachmentSaveA = document.getElementById('attachmentSaveA');
	    if (!attachmentSaveA.href || !attachmentSaveA.download) {
		attachmentIdxBN = new BN(0);
	    } else {
		const nameLenBN = new BN(attachmentSaveA.download.length);
		attachmentIdxBN = new BN(message.length).iuor(nameLenBN.ushln(248));
		message += attachmentSaveA.download + attachmentSaveA.href;
		console.log('replyButton: attachmentIdxBN = 0x' + attachmentIdxBN.toString(16));
		console.log('replyButton: message = ' + message);
	    }
	    //
	    const toAddr = msgAddrArea.value;
	    //the toAddr has already been validated. really.
	    mtEther.accountQuery(common.web3, toAddr, function(err, toAcctInfo) {
		//encrypt the message...
		const toPublicKey = (!!toAcctInfo) ? toAcctInfo.publicKey : null;
		if (!toPublicKey || toPublicKey == '0x') {
		    alert('Encryption error: unable to look up destination address in contract!');
		    handleUnlockedMetaMask(null);
		    return;
		}
		const sentMsgCtrBN = common.numberToBN(index.acctInfo.sentMsgCount);
		sentMsgCtrBN.iaddn(1);
		console.log('setReplyButtonHandlers: toPublicKey = ' + toPublicKey);
		const ptk = dhcrypt.ptk(toPublicKey, toAddr, common.web3.eth.accounts[0], '0x' + sentMsgCtrBN.toString(16));
		console.log('setReplyButtonHandlers: ptk = ' + ptk);
		const encrypted = dhcrypt.encrypt(ptk, message);
		console.log('setReplyButtonHandlers: encrypted (length = ' + encrypted.length + ') = ' + encrypted);
		//in order to figure the message fee we need to see how many messages have been sent from the proposed recipient to me
		mtEther.getPeerMessageCount(common.web3, toAddr, common.web3.eth.accounts[0], function(err, msgCount) {
		    console.log(msgCount.toString(10) + ' messages have been sent from ' + toAddr + ' to me');
		    const fee = (msgCount > 0) ? toAcctInfo.msgFee : toAcctInfo.spamFee;
		    console.log('fee is ' + fee + ' wei');
		    //display "waiting for metamask" in case metamask dialog is hidden
		    const metaMaskModal = document.getElementById('metaMaskModal');
		    metaMaskModal.style.display = 'block';
		    const msgRefButton = document.getElementById('msgRefButton');
		    const ref = msgRefButton.ref;
		    mtEther.sendMessage(common.web3, toAddr, attachmentIdxBN, ref, encrypted, fee, function(err, txid) {
			console.log('txid = ' + txid);
			metaMaskModal.style.display = 'none';
			const statusDiv = document.getElementById('statusDiv');
			waitForTXID(err, txid, 'Send-Message', statusDiv, 'send', function() {
			});
		    });
		});
	    });
	} else if ((viewRecvButton.className == 'menuBarButtonSelected') ||
		   (viewSentButton.className == 'menuBarButtonSelected') ) {
	    //handle reply
	    const fromAddr = msgAddrArea.value;
	    let subject = '';
	    if (message.startsWith('Subject: ') || message.startsWith('re: ')) {
		const subjectIdx = message.startsWith('re: ') ? 4 : 9;
		const newlineIdx = (message.indexOf('\n') > 0) ? message.indexOf('\n') :  message.length;
		console.log('subjectIdx = ' + subjectIdx);
		subject = 're: ' + message.substring(subjectIdx, newlineIdx) + '\n';
	    }
	    //set ref
	    const msgIdArea = document.getElementById('msgIdArea');
	    const ref = msgIdArea.msgId;
	    console.log('fromAddr = ' + fromAddr);
	    console.log('subject = ' + subject);
	    handleReplyCompose(index.acctInfo, fromAddr, subject, ref);
	}
    });
}


function setValidateButtonHandler() {
    const msgAddrArea = document.getElementById('msgAddrArea');
    const msgFeeArea = document.getElementById('msgFeeArea');
    const replyButton = document.getElementById('replyButton');
    const msgTextArea = document.getElementById('msgTextArea');
    const attachmentButton = document.getElementById('attachmentButton');
    msgAddrArea.addEventListener('input', function() {
	replyButton.disabled = true;
	msgTextArea.disabled = true;
	attachmentButton.disabled = true;
	msgFeeArea.value = 'Fee: ';
    });
    const validatedAddress = (toAddr) => {
	mtEther.accountQuery(common.web3, toAddr, function(err, toAcctInfo) {
	    const toPublicKey = (!!toAcctInfo) ? toAcctInfo.publicKey : null;
	    console.log('validateAddrButton.listener: toPublicKey: ' + toPublicKey);
	    if (!toPublicKey || toPublicKey == '0x') {
		msgTextArea.value = 'Error: no account was found for this address.';
		replyButton.disabled = true;
	    } else {
		msgTextArea.disabled = false;
		msgTextArea.readonly = "";
		replyButton.disabled = false;
		msgTextArea.value = 'Subject: ';
		attachmentButton.disabled = false;
		//in case user erases subject...
		msgTextArea.placeholder='Type your message here...';
		//see how many messages have been sent from the proposed recipient to me
		mtEther.getPeerMessageCount(common.web3, toAddr, common.web3.eth.accounts[0], function(err, msgCount) {
		    console.log(msgCount.toString(10) + ' messages have been sent from ' + toAddr + ' to me');
		    const fee = (msgCount > 0) ? toAcctInfo.msgFee : toAcctInfo.spamFee;
		    msgFeeArea.value = 'Fee: ' + ether.convertWeiToComfort(common.web3, fee);
		});
	    }
	});
    };
    //validateAddrButton is only enabled in compose mode
    const validateAddrButton = document.getElementById('validateAddrButton');
    validateAddrButton.addEventListener('click', function() {
	const toAddrIn = msgAddrArea.value;
	console.log('toAddrIn = ' + toAddrIn);
	if (ether.validateAddr(toAddrIn)) {
	    validatedAddress(toAddrIn);
	    return;
	}
	ether.ensLookup(toAddrIn, function(err, addr) {
	    if (!!err || !addr) {
		msgTextArea.value = (!!err) ? err : 'Error: invalid Ethereum address.';
		replyButton.disabled = true;
		return;
	    }
	    msgAddrArea.value = toAddrIn + ' (' + addr + ')';
	    validatedAddress(addr);
	});
    });
}


function setAttachButtonHandler() {
    const attachmentButton = document.getElementById('attachmentButton');
    const attachmentInput = document.getElementById('attachmentInput');
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentButton.addEventListener('click', function() {
	if (composeButton.className == 'menuBarButtonSelected') {
	    replaceElemClassFromTo('attachmentButton', 'visibleIB', 'hidden', true);
	    replaceElemClassFromTo('attachmentInput', 'hidden', 'visibleIB', false);
	}
    });
    attachmentInput.addEventListener('change', function() {
	console.log('attachmentInput: got change event');
	if (attachmentInput.files && attachmentInput.files[0]) {
	    console.log('attachmentInput: got ' + attachmentInput.files[0].name);
            const reader = new FileReader();
            reader.onload = (e) => {
		//eg. e.target.result = data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAACx1BMV...
		console.log('attachmentInput: e.target.result = ' + e.target.result);
		//
		attachmentSaveA.href = e.target.result;
		attachmentSaveA.download = attachmentInput.files[0].name;
		const attachmentSaveSpan = document.getElementById('attachmentSaveSpan');
		attachmentSaveSpan.textContent = attachmentInput.files[0].name;
		attachmentSaveA.style.display = 'inline-block';
		replaceElemClassFromTo('attachmentInput', 'visibleIB', 'hidden', true);
            };
            reader.readAsDataURL(attachmentInput.files[0]);
        } else {
	    attachmentSaveA.href = null;
	}
    });
}


function setMsgRefButtonHandler() {
    const msgRefButton = document.getElementById('msgRefButton');
    msgRefButton.addEventListener('click', function() {
	const ref = msgRefButton.ref;
	if (!!ref) {
	    mtUtil.getAndParseIdMsg(ref, function(err, msgId, fromAddr, toAddr, txCount, rxCount, mimeType, ref, msgHex, blockNumber, date) {
		const msgTextArea = document.getElementById('msgTextArea');
		const viewRecvButton = document.getElementById('viewRecvButton');
		if (!!err) {
		    msgTextArea.value = 'Error: ' + err;
		} else if (fromAddr == common.web3.eth.accounts[0]) {
		    index.sentMessageNo = txCount;
		    //if we're already in View-Sent mode, then showMsgLoop will update the msg list only if necessary
		    (viewRecvButton.className == 'menuBarButtonSelected') ? handleViewSent(index.acctInfo, true) : showMsgLoop(index.acctInfo);
		} else if (toAddr == common.web3.eth.accounts[0]) {
		    index.recvMessageNo = rxCount;
		    (viewRecvButton.className != 'menuBarButtonSelected') ? handleViewRecv(index.acctInfo, true) : showMsgLoop(index.acctInfo);
		}
	    });
	}
    });
}


function setMarkReadButtonHandler() {
    const markReadButton = document.getElementById('markReadButton');
    markReadButton.addEventListener('click', function() {
	if (index.listMode != 'recv') {
	    console.log('setMarkReadButtonHandlr: we should never be here!');
	    return;
	}
	if (!!index.listEntries[index.listIdx]) {
	    const msgNo = index.listEntries[index.listIdx].msgNo;
	    const div = index.listEntries[index.listIdx].div;
	    let flag = common.chkIndexedFlag(index.localStoragePrefix + 'beenRead', msgNo);
	    flag = (flag) ? false : true;
	    common.setIndexedFlag(index.localStoragePrefix + 'beenRead', msgNo, flag);
	    const newSuffix = (flag) ? '' : 'New';
	    div.className = 'msgListItemDivSelected' + newSuffix;
	    //modify the markReadButton text, in case the nextMsgButton has no effect
	    markReadButton.textContent = (!!newSuffix) ? 'Mark as Read' : 'Mark as Unread';
	    const nextMsgButton = document.getElementById('nextMsgButton');
	    if (!nextMsgButton.disabled)
		index.nextMsgButtonFcn();
	}
    });
}


function setPrevNextButtonHandlers() {
    const prevMsgButton = document.getElementById('prevMsgButton');
    const nextMsgButton = document.getElementById('nextMsgButton');
    const prevPageButton = document.getElementById('prevPageButton');
    const nextPageButton = document.getElementById('nextPageButton');
    const prevUnreadButton = document.getElementById('prevUnreadButton');
    const nextUnreadButton = document.getElementById('nextUnreadButton');
    const firstButton = document.getElementById('firstMsgButton');
    const lastButton = document.getElementById('lastMsgButton');
    prevMsgButton.addEventListener('click', function() {
	const msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
	if (index[msgNoCounter] > 0) {
	    --index[msgNoCounter];
	    showMsgLoop(index.acctInfo);
	}
    });
    index.nextMsgButtonFcn = () => {
	const maxMsgNo = (index.listMode == 'recv') ? parseInt(index.acctInfo.recvMsgCount) : parseInt(index.acctInfo.sentMsgCount);
	const msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
	if (index[msgNoCounter] < maxMsgNo) {
	    ++index[msgNoCounter];
	    showMsgLoop(index.acctInfo);
	}
    };
    nextMsgButton.addEventListener('click', index.nextMsgButtonFcn);
    firstButton.addEventListener('click', function() {
	const maxMsgNo = (index.listMode == 'recv') ? parseInt(index.acctInfo.recvMsgCount) : parseInt(index.acctInfo.sentMsgCount);
	const msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
	index[msgNoCounter] = (maxMsgNo > 0) ? 1 : 0;
	showMsgLoop(index.acctInfo);
    });
    lastButton.addEventListener('click', function() {
	const maxMsgNo = (index.listMode == 'recv') ? parseInt(index.acctInfo.recvMsgCount) : parseInt(index.acctInfo.sentMsgCount);
	const msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
	index[msgNoCounter] = maxMsgNo;
	showMsgLoop(index.acctInfo);
    });
    prevPageButton.addEventListener('click', function() {
	const msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
	const msgNo = index[msgNoCounter];
	let pageIdx = Math.floor((msgNo - 1) / 10);
	console.log('pageIdx = ' + pageIdx);
	if (pageIdx > 0) {
	    --pageIdx;
	    index[msgNoCounter] = (pageIdx * 10) + 1;
	    showMsgLoop(index.acctInfo);
	}
    });
    nextPageButton.addEventListener('click', function() {
	const msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
	const msgNo = index[msgNoCounter];
	let pageIdx = Math.floor((msgNo - 1) / 10);
	console.log('pageIdx = ' + pageIdx);
	++pageIdx;
	index[msgNoCounter] = (pageIdx * 10) + 1;
	showMsgLoop(index.acctInfo);
    });
    prevUnreadButton.addEventListener('click', function() {
	const msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
	const msgNo = index[msgNoCounter];
	const unreadMsgNo = common.findIndexedFlag(index.localStoragePrefix + 'beenRead', msgNo - 1, 1, false);
	if (unreadMsgNo > 0) {
	    index[msgNoCounter] = unreadMsgNo;
	    showMsgLoop(index.acctInfo);
	}
    });
    nextUnreadButton.addEventListener('click', function() {
	const maxMsgNo = (index.listMode == 'recv') ? parseInt(index.acctInfo.recvMsgCount) : parseInt(index.acctInfo.sentMsgCount);
	const msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
	const msgNo = index[msgNoCounter];
	const unreadMsgNo = common.findIndexedFlag(index.localStoragePrefix + 'beenRead', msgNo + 1, maxMsgNo, false);
	if (unreadMsgNo > 0) {
	    index[msgNoCounter] = unreadMsgNo;
	    showMsgLoop(index.acctInfo);
	}
    });
}



async function doFirstIntro(ignoreFirstIntroCompleteFlag) {
    if (!ignoreFirstIntroCompleteFlag && !!localStorage['FirstIntroCompleteFlag']) {
	return(new Promise((resolve, reject) => {
	    resolve(1);
	}));
    }
    replaceElemClassFromTo('intro0Div', 'hidden', 'visibleB', null);
    if (!index.introCompletePromise) {
	index.introCompletePromise = new Promise((resolve, reject) => {
	    const intro0Next = document.getElementById('intro0Next');
	    intro0Next.addEventListener('click', function() {
		replaceElemClassFromTo('intro0Div', 'visibleB', 'hidden', null);
		replaceElemClassFromTo('intro1Div', 'hidden', 'visibleB', null);
	    });
	    const intro1Prev = document.getElementById('intro1Prev');
	    intro1Prev.addEventListener('click', function() {
		replaceElemClassFromTo('intro1Div', 'visibleB', 'hidden', null);
		replaceElemClassFromTo('intro0Div', 'hidden', 'visibleB', null);
	    });
	    const intro1Next = document.getElementById('intro1Next');
	    intro1Next.addEventListener('click', function() {
		replaceElemClassFromTo('intro1Div', 'visibleB', 'hidden', null);
		replaceElemClassFromTo('intro2Div', 'hidden', 'visibleB', null);
	    });
	    const intro2Prev = document.getElementById('intro2Prev');
	    intro2Prev.addEventListener('click', function() {
		replaceElemClassFromTo('intro2Div', 'visibleB', 'hidden', null);
		replaceElemClassFromTo('intro1Div', 'hidden', 'visibleB', null);
	    });
	    const intro2Next = document.getElementById('intro2Next');
	    intro2Next.addEventListener('click', function() {
		replaceElemClassFromTo('intro2Div', 'visibleB', 'hidden', null);
		replaceElemClassFromTo('intro3Div', 'hidden', 'visibleB', null);
	    });
	    const intro3Prev = document.getElementById('intro3Prev');
	    intro3Prev.addEventListener('click', function() {
		replaceElemClassFromTo('intro3Div', 'visibleB', 'hidden', null);
		replaceElemClassFromTo('intro2Div', 'hidden', 'visibleB', null);
	    });
	    const intro3Next = document.getElementById('intro3Next');
	    intro3Next.addEventListener('click', function() {
		replaceElemClassFromTo('intro3Div', 'visibleB', 'hidden', null);
		replaceElemClassFromTo('intro4Div', 'hidden', 'visibleB', null);
	    });
	    const intro4Prev = document.getElementById('intro4Prev');
	    intro4Prev.addEventListener('click', function() {
		replaceElemClassFromTo('intro4Div', 'visibleB', 'hidden', null);
		replaceElemClassFromTo('intro3Div', 'hidden', 'visibleB', null);
	    });
	    const intro4Next = document.getElementById('intro4Next');
	    intro4Next.addEventListener('click', function() {
		replaceElemClassFromTo('intro4Div', 'visibleB', 'hidden', null);
		//if we wanted to stop displaying the intro once the user had clicked through
		//to the end at least one time...
		//localStorage['FirstIntroCompleteFlag'] = true;
		resolve(null);
	    });
	    const intro0Close = document.getElementById('intro0Close');
	    intro0Close.addEventListener('click', function() {
		replaceElemClassFromTo('intro0Div', 'visibleB', 'hidden', null);
		resolve(null);
	    });
	    const intro1Close = document.getElementById('intro1Close');
	    intro1Close.addEventListener('click', function() {
		replaceElemClassFromTo('intro1Div', 'visibleB', 'hidden', null);
		resolve(null);
	    });
	    const intro2Close = document.getElementById('intro2Close');
	    intro2Close.addEventListener('click', function() {
		replaceElemClassFromTo('intro2Div', 'visibleB', 'hidden', null);
		resolve(null);
	    });
	    const intro3Close = document.getElementById('intro3Close');
	    intro3Close.addEventListener('click', function() {
		replaceElemClassFromTo('intro3Div', 'visibleB', 'hidden', null);
		resolve(null);
	    });
	    const intro4Close = document.getElementById('intro4Close');
	    intro4Close.addEventListener('click', function() {
		replaceElemClassFromTo('intro4Div', 'visibleB', 'hidden', null);
		//if we wanted to stop displaying the intro once the user had clicked through
		//to the end at least one time...
		//localStorage['FirstIntroCompleteFlag'] = true;
		resolve(null);
	    });
	});
    }
    return(index.introCompletePromise);
}


//
// periodically check for metamask account changes
// also checks for any changes in the number of messages sent or received
// this fcn reschedules itself
//
const timerIsPaused = () => {
    if (index.waitingForTxid)
	return(true);
    const viewRecvButton = document.getElementById('viewRecvButton');
    const viewSentButton = document.getElementById('viewSentButton');
    return(((viewRecvButton.className.indexOf('Disabled') >= 0 && viewSentButton.className.indexOf('Disabled') >= 0 ) ||
	    (viewRecvButton.className.indexOf('Selected') >= 0 || viewSentButton.className.indexOf('Selected') >= 0 ) ) ? false : true);
}
//
function periodicCheckForAccountChanges() {
    console.log('periodicCheckForAccountChanges: enter');
    if (timerIsPaused()) {
	console.log('timerIsPaused!');
	setTimeout(periodicCheckForAccountChanges, 10000);
	return;
    }
    common.checkForMetaMask(true, function(err, w3) {
	const acct = (!err && !!w3) ? w3.eth.accounts[0] : null;
	if (acct != index.account) {
	    console.log('periodicCheckForAccountChanges: MetaMask account changed!');
	    console.log('periodicCheckForAccountChanges: MM acct = ' + acct + ', index.account = ' + index.account);
	    beginTheBeguine(null);
	    setTimeout(periodicCheckForAccountChanges, 10000);
	    return;
	}
	if (!acct || ++index.periodicAcctCheckCount < 5 || timerIsPaused()) {
	    setTimeout(periodicCheckForAccountChanges, 10000);
	    return;
	}
	index.periodicAcctCheckCount = 0;
	console.log('periodicCheckForAccountChanges: MetaMask account unchanged...');
	mtEther.accountQuery(common.web3, common.web3.eth.accounts[0], function(err, _acctInfo) {
	    console.log('index.acctInfo = ' + index.acctInfo + '_acctInfo = ' + _acctInfo);
	    if ((!!_acctInfo && !index.acctInfo) || (!_acctInfo && !!index.acctInfo)) {
		beginTheBeguine('null');
	    } else if (!!index.acctInfo && !!_acctInfo) {
		const recvCntNew = parseInt(_acctInfo.recvMsgCount);
		const sentCntNew = parseInt(_acctInfo.sentMsgCount);
		const recvCntOld = parseInt(index.acctInfo.recvMsgCount);
		const sentCntOld = parseInt(index.acctInfo.sentMsgCount);
		if (recvCntNew != recvCntOld) {
		    console.log('periodicCheckForAccountChanges: recvCnt ' + recvCntOld + ' => ' + recvCntNew);
		    beginTheBeguine('recv');
		} else if (sentCntNew != sentCntOld) {
		    console.log('periodicCheckForAccountChanges: sentCnt ' + sentCntOld + ' => ' + sentCntNew);
		    beginTheBeguine('send');
		}
	    }
	    setTimeout(periodicCheckForAccountChanges, 10000);
	    return;
	});
    });
}


//
// mode = [ 'startup' | 'send' | 'recv' | null ]
//
async function beginTheBeguine(mode) {
    await doFirstIntro(false);
    //listMode starts off here null. it will be set in handleViewRecv and handleViewSent. it's used
    //as a flag by button handlers to indicate that it's ok to redraw the list.
    index.listMode = null;
    common.checkForMetaMask(true, function(err, w3) {
	const acct = (!err && !!w3) ? w3.eth.accounts[0] : null;
	console.log('beginTheBeguine: checkForMetaMask acct = ' + acct);
	index.account = acct;
	if (!!err) {
	    console.log('beginTheBeguine: checkForMetaMask err = ' + err);
	    handleLockedMetaMask(err);
	} else {
	    setMenuButtonState('importantInfoButton', 'Disabled');
	    setMenuButtonState('registerButton',      'Disabled');
	    setMenuButtonState('viewRecvButton',      'Disabled');
	    setMenuButtonState('composeButton',       'Disabled');
	    setMenuButtonState('viewSentButton',      'Disabled');
	    setMenuButtonState('withdrawButton',      'Disabled');
	    handleUnlockedMetaMask(mode);
	}
    });
}


//
// handle locked metamask
//
function handleLockedMetaMask(err) {
    const registerButton = document.getElementById('registerButton');
    registerButton.textContent = 'Register Account';
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Disabled');
    setMenuButtonState('viewRecvButton',      'Disabled');
    setMenuButtonState('composeButton',       'Disabled');
    setMenuButtonState('viewSentButton',      'Disabled');
    setMenuButtonState('withdrawButton',      'Disabled');
    //
    const networkArea = document.getElementById('networkArea');
    networkArea.value = '';
    const accountArea = document.getElementById('accountArea');
    accountArea.value = '';
    const balanceArea = document.getElementById('balanceArea');
    balanceArea.value = '';
    const totalReceivedArea = document.getElementById('totalReceivedArea');
    totalReceivedArea.value = '';
    const feeBalanceArea = document.getElementById('feeBalanceArea');
    feeBalanceArea.value = '';
    //
    const msgAddrArea = document.getElementById('msgAddrArea');
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
    replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('attachmentButton',   'visibleIB', 'hidden',    true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    //
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    const listTableBody = document.getElementById('listAreaDiv');
    clearMsgList(listTableBody);
    const statusDiv = document.getElementById('statusDiv');
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
// mode = [ 'startup' | 'send' | 'recv' | null ]
// startup is converted to recv, but we initialize the current rx msg to first unread.
//
function handleUnlockedMetaMask(mode) {
    console.log('handleUnlockedMetaMask: mode = ' + mode);
    //we can be called from the 'continue' link in waitForTXID, so clear waiting flag. this re-enables the interval
    //timer to check for changed rx/tx counts
    index.waitingForTxid = false;
    index.localStoragePrefix = (common.web3.eth.accounts[0]).substring(2, 10) + '-';
    //
    let recvMsgNoFromURL = null;
    let sentMsgNoFromURL = null;
    if (mode == 'startup') {
	recvMsgNoFromURL = common.getUrlParameterByName(window.location.href, 'recvMsgNo')
	sentMsgNoFromURL = common.getUrlParameterByName(window.location.href, 'sentMsgNo')
	if (!!sentMsgNoFromURL)
	    index.sentMessageNo = parseInt(sentMsgNoFromURL);
	else if (!!localStorage[index.localStoragePrefix + '-sentMessageNo'])
	    index.sentMessageNo = localStorage[index.localStoragePrefix + '-sentMessageNo'];
	else
	    index.sentMessageNo = 1;
	if (!!recvMsgNoFromURL)
	    index.recvMessageNo = parseInt(recvMsgNoFromURL);
	else if (!!localStorage[index.localStoragePrefix + '-recvMessageNo'] && localStorage['onStartGoto'] == 'last-viewed')
	    index.recvMessageNo = localStorage[index.localStoragePrefix + '-recvMessageNo'];
	else
	    index.recvMessageNo = 1;
    }
    //
    const accountArea = document.getElementById('accountArea');
    accountArea.value = 'Your account: ' + common.web3.eth.accounts[0];
    ether.getBalance(common.web3, 'szabo', function(err, balance) {
	const balanceArea = document.getElementById('balanceArea');
	const balanceSzabo = parseInt(balance);
	console.log('balanceSzabo = ' + balanceSzabo);
	const balanceETH = (balanceSzabo / ether.SZABO_PER_ETH).toFixed(6);
	balanceArea.value = 'Balance: ' + balanceETH.toString(10) + ' Eth';
    });
    ether.getNetwork(common.web3, function(err, network) {
	const networkArea = document.getElementById('networkArea');
	if (!!err) {
	    networkArea.value = 'Error: ' + err;
	} else {
	    networkArea.value = 'Network: ' + network;
	    mtEther.setNetwork(network);
	    if (network.startsWith('Mainnet'))
		networkArea.className = (networkArea.className).replace('attention', '');
	    else if (networkArea.className.indexOf(' attention' < 0))
		networkArea.className += ' attention';
	}
	mtEther.accountQuery(common.web3, common.web3.eth.accounts[0], function(err, _acctInfo) {
	    index.acctInfo = _acctInfo;
	    index.publicKey = (!!index.acctInfo) ? index.acctInfo.publicKey : null;
	    //console.log('handleUnlockedMetaMask: acctInfo: ' + JSON.stringify(index.acctInfo));
	    //console.log('handleUnlockedMetaMask: publicKey: ' + index.publicKey);
	    if (!index.publicKey || index.publicKey == '0x') {
		handleUnregisteredAcct();
	    } else {
		if (mode == 'startup' && localStorage['onStartGoto'] == 'first-unread' && !recvMsgNoFromURL) {
		    const msgNo = index.recvMessageNo;
		    const maxMsgNo = parseInt(index.acctInfo.recvMsgCount);
		    const unreadMsgNo = common.findIndexedFlag(index.localStoragePrefix + 'beenRead', msgNo + 1, maxMsgNo, false);
		    console.log('handleUnlockedMetaMask: unreadMsgNo = ' + unreadMsgNo);
		    index.recvMessageNo = (unreadMsgNo < 0) ? maxMsgNo : unreadMsgNo;
		    mode = 'recv';
		}
		handleRegisteredAcct(mode);
	    }
	});
    });
}


//
// handle unregistered account
//
function handleUnregisteredAcct() {
    const registerButton = document.getElementById('registerButton');
    registerButton.textContent = 'Register Account';
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Disabled');
    setMenuButtonState('viewRecvButton',      'Disabled');
    setMenuButtonState('composeButton',       'Disabled');
    setMenuButtonState('viewSentButton',      'Disabled');
    setMenuButtonState('withdrawButton',      'Disabled');
    //display "waiting for metamask" in case metamask dialog is hidden
    const metaMaskModal = document.getElementById('metaMaskModal');
    metaMaskModal.style.display = 'block';
    dhcrypt.initDH(null, function(err) {
	metaMaskModal.style.display = 'none';
	if (!err) {
	    setMenuButtonState('registerButton',   'Enabled');
	}
    });
    //
    const totalReceivedArea = document.getElementById('totalReceivedArea');
    totalReceivedArea.value = 'This Ethereum address is not registered';
    const feeBalanceArea = document.getElementById('feeBalanceArea');
    feeBalanceArea.value = '';
    //
    const msgAddrArea = document.getElementById('msgAddrArea');
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
    replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('attachmentButton',   'visibleIB', 'hidden',    true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    //
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    const listTableBody = document.getElementById('listAreaDiv');
    clearMsgList(listTableBody);
    const statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
}


//
// handle registered account
//
function handleRegisteredAcct(mode) {
    //once an account has been registered we don't force the intro to run each time the dapp is loaded
    localStorage['FirstIntroCompleteFlag'] = true;
    const registerButton = document.getElementById('registerButton');
    registerButton.textContent = 'Modify Account';
    const totalReceivedArea = document.getElementById('totalReceivedArea');
    totalReceivedArea.value = 'Messages sent: ' + index.acctInfo.sentMsgCount + '; Messages received: ' + index.acctInfo.recvMsgCount;
    const feeBalanceArea = document.getElementById('feeBalanceArea');
    const feebalanceWei = index.acctInfo.feeBalance;
    //console.log('feeBalanceWei = ' + feebalanceWei);
    feeBalanceArea.value = 'Unclaimed message fees: ' + ether.convertWeiToComfort(common.web3, feebalanceWei);
    //see if new messages have been received. if yes, display new message modal until user clicks anywhere outside
    const noRxMsgs = localStorage[index.localStoragePrefix + 'noRxMsgs'];
    const currentNoRxMsgs = parseInt(index.acctInfo.recvMsgCount);
    const deltaRxMsgCount = currentNoRxMsgs - noRxMsgs;
    if (currentNoRxMsgs > 0 && deltaRxMsgCount > 0) {
	const newMsgCountNotButton = document.getElementById('newMsgCountNotButton');
	newMsgCountNotButton.textContent = deltaRxMsgCount.toString(10);
	localStorage[index.localStoragePrefix + 'noRxMsgs'] = currentNoRxMsgs.toString(10);
	const newMsgModal = document.getElementById('newMsgModal');
	newMsgModal.style.display = 'block';
    }
    if (!!mode && !!dhcrypt.dh && index.publicKey == dhcrypt.publicKey()) {
	if (mode == 'recv')
	    handleViewRecv(index.acctInfo, true);
	else
	    handleViewSent(index.acctInfo, true);
    } else {
	const listTableBody = document.getElementById('listAreaDiv');
	clearMsgList(listTableBody);
	//display "waiting for metamask" in case metamask dialog is hidden
	const metaMaskModal = document.getElementById('metaMaskModal');
	metaMaskModal.style.display = 'block';
	const encryptedPrivateKey = index.acctInfo.encryptedPrivateKey;
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
    if (index.listIdx >= 0) {
	//unselect any currently selected message
	const newSuffix = (index.listMode == 'sent' || common.chkIndexedFlag(index.localStoragePrefix + 'beenRead', index.listEntries[index.listIdx].msgNo)) ? '' : 'New';
	(index.listEntries[index.listIdx].div).className = 'msgListItemDiv' + newSuffix;
    }
    index.listIdx = -1;
    //
    const msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'To: ';
    const msgAddrArea = document.getElementById('msgAddrArea');
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
    replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    //attach button will be enabled after addr is validated
    replaceElemClassFromTo('attachmentButton',    'hidden',   'visibleIB', true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    //
    const msgRefButton = document.getElementById('msgRefButton');
    msgRefButton.ref = '0';
    //textarea will be enabled after addr is validated
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder="Validate the recipient address, then type your message here...";
    const statusDiv = document.getElementById('statusDiv');
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
    //replying to a message implies that it has been read
    console.log('handleReplyCompose: listmode = ' + index.listMode + ', index.listEntries[index.listIdx].msgId = ' + index.listEntries[index.listIdx].msgId + ', ref = ' + ref);
    if (index.listMode.indexOf('recv') >= 0 && index.listEntries[index.listIdx].msgId == ref) {
	common.setIndexedFlag(index.localStoragePrefix + 'beenRead', index.listEntries[index.listIdx].msgNo, true);
    }
    //
    if (index.listIdx >= 0)
	(index.listEntries[index.listIdx].div).className = 'msgListItemDiv';
    index.listIdx = -1;
    //
    mtEther.accountQuery(common.web3, toAddr, function(err, toAcctInfo) {
	const toPublicKey = (!!toAcctInfo) ? toAcctInfo.publicKey : null;
	if (!toPublicKey || toPublicKey == '0x') {
	    msgTextArea.value = 'Error: no account was found for this address.';
	    replyButton.disabled = true;
	    handleCompose(index.acctInfo, toAddr);
	    return;
	}
	const msgPromptArea = document.getElementById('msgPromptArea');
	msgPromptArea.value = 'To: ';
	const msgAddrArea = document.getElementById('msgAddrArea');
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
	replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
	replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
	//attach button can be enabled, since addr is already validated
	replaceElemClassFromTo('attachmentButton',    'hidden',   'visibleIB', false);
	const attachmentSaveA = document.getElementById('attachmentSaveA');
	attachmentSaveA.style.display = 'none';
	//
	showIdAndRef('', ref, false);
	const msgTextArea = document.getElementById('msgTextArea');
	msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
	msgTextArea.value = (!!subject) ? subject : '';
	msgTextArea.disabled = false;
	msgTextArea.readonly = '';
	msgTextArea.placeholder='Type your message here...';
	const statusDiv = document.getElementById('statusDiv');
	clearStatusDiv(statusDiv);
	//fees: see how many messages have been sent from the proposed recipient to me
	mtEther.getPeerMessageCount(common.web3, toAddr, common.web3.eth.accounts[0], function(err, msgCount) {
	    console.log('handleReplyCompose: ' + msgCount.toString(10) + ' messages have been sent from ' + toAddr + ' to me');
	    const fee = (msgCount > 0) ? toAcctInfo.msgFee : toAcctInfo.spamFee;
	    msgFeeArea.value = 'Fee: ' + ether.convertWeiToComfort(common.web3, fee);
	});
    });
}


function handleRegister() {
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Selected');
    if (!!index.acctInfo.encryptedPrivateKey) {
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
    const msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'Addr: ';
    const msgAddrArea = document.getElementById('msgAddrArea');
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
    replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('attachmentButton',   'visibleIB', 'hidden',    true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    //
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('visibleIB', 'hidden');
    msgTextArea.disabled = true;
    const messageFeeInput = document.getElementById('messageFeeInput');
    messageFeeInput.value = index.acctInfo.msgFee;
    const spamFeeInput = document.getElementById('spamFeeInput');
    spamFeeInput.value = index.acctInfo.spamFee;
    const statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
}


function handleRegisterSubmit() {
    console.log('handleRegisterSubmit');
    const registerDiv = document.getElementById('registerDiv');
    const messageFeeInput = document.getElementById('messageFeeInput');
    const messageFee = common.stripNonNumber(messageFeeInput.value);
    messageFeeInput.value = messageFee;
    const spamFeeInput = document.getElementById('spamFeeInput');
    const spamFee = common.stripNonNumber(spamFeeInput.value);
    spamFeeInput.value = spamFee;
    const messageFeeUnits = document.getElementById('messageFeeUnits');
    const spamFeeUnits = document.getElementById('spamFeeUnits');
    console.log('message fee = ' + messageFee + ' X ' + messageFeeUnits.value + ', spam fee = ' + spamFee + ' X ' + spamFeeUnits.value);
    const spamFeeBN = common.numberToBN(spamFee);
    const messageFeeBN = common.numberToBN(messageFee);
    messageFeeBN.imul(common.numberToBN(messageFeeUnits.value));
    spamFeeBN.imul(common.numberToBN(spamFeeUnits.value));
    const publicKey = dhcrypt.publicKey();
    const encryptedPrivateKey = dhcrypt.encryptedPrivateKey();
    //display "waiting for metamask" in case metamask dialog is hidden
    const metaMaskModal = document.getElementById('metaMaskModal');
    metaMaskModal.style.display = 'block';
    mtEther.register(common.web3, messageFeeBN, spamFeeBN, publicKey, encryptedPrivateKey, function(err, txid) {
	console.log('handleRegisterSubmit: err = ' + err);
	console.log('handleRegisterSubmit: txid = ' + txid);
	metaMaskModal.style.display = 'none';
	const statusDiv = document.getElementById('statusDiv');
	waitForTXID(err, txid, 'Register', statusDiv, 'recv', function() {
	    //once he has registered we stop showing the intro automatically each time the page is loaded
	    //note: we get the cb from waitForTXID as soon as the tx completes.
	    localStorage['FirstIntroCompleteFlag'] = true;
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
    const msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'Addr: ';
    const msgAddrArea = document.getElementById('msgAddrArea');
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
    replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('attachmentButton',   'visibleIB', 'hidden',    true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    //
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('visibleIB', 'hidden');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    //
    //display "waiting for metamask" in case metamask dialog is hidden
    const metaMaskModal = document.getElementById('metaMaskModal');
    metaMaskModal.style.display = 'block';
    mtEther.withdraw(common.web3, function(err, txid) {
	console.log('txid = ' + txid);
	metaMaskModal.style.display = 'none';
	const statusDiv = document.getElementById('statusDiv');
	waitForTXID(err, txid, 'Withdraw', statusDiv, 'recv', function() {
	});
    });
}



//
// handle View-Recv button
// if refreshMsgList then call showMsgLoop to look up the message corresponding to the current index.recvMessageNo
// otherwise just set up the View-Recv mode and return.
//
// if refreshing the msg-list, then we only enable view-sent mode after the list is copmlete. if you don't take that
// precaution, then it's possible for a user to flip between recv and sent modes, and makeMsgListEntry will be confounded
// because the index.listMode has changed. same considerations apply to navButtons.
//
function handleViewRecv(acctInfo, refreshMsgList) {
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Enabled');
    setMenuButtonState('viewRecvButton',      'Selected');
    setMenuButtonState('composeButton',       'Enabled');
    setMenuButtonState('viewSentButton',      refreshMsgList ? 'Disabled' : 'Enabled');
    setMenuButtonState('withdrawButton',      'Enabled');
    //
    const msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'From: ';
    const msgAddrArea = document.getElementById('msgAddrArea');
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
    replaceElemClassFromTo('markReadButton',     'hidden',    'visibleIB', false);
    if (refreshMsgList)
	replaceElemClassFromTo('navButtonsSpan', 'visibleIB', 'hidden',    true);
    else
	replaceElemClassFromTo('navButtonsSpan', 'hidden',    'visibleIB', true);
    replaceElemClassFromTo('attachmentButton',   'visibleIB', 'hidden',    true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    //
    const msgIdArea = document.getElementById('msgIdArea');
    msgIdArea.readonly = "readonly"
    const msgDateArea = document.getElementById('msgDateArea');
    msgDateArea.readonly = "readonly"
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    const statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
    //
    const msgListHeaderAddr = document.getElementById('msgListHeaderAddr');
    msgListHeaderAddr.value = 'From';
    if (!!refreshMsgList) {
	index.listMode = 'recv';
	const msgNo = getCurMsgNo(acctInfo);
	makeMsgList(msgNo, function() {
	    showMsgLoop(acctInfo);
	    setMenuButtonState('viewRecvButton', 'Selected');
	    setMenuButtonState('viewSentButton', 'Enabled');
	    replaceElemClassFromTo('nextUnreadButton', 'hidden', 'visibleIB', false);
	    replaceElemClassFromTo('prevUnreadButton', 'hidden', 'visibleIB', false);
	    replaceElemClassFromTo('navButtonsSpan', 'hidden', 'visibleIB', true);
	});
    }
}



//
// handle View-Sent button
// if refreshMsgList then call showMsgLoop to look up the message corresponding to the current index.sentMessageNo
// otherwise just set up the View-Sent mode and return.
//
// if refreshing the msg-list, then we only enable view-recv mode after the list is copmlete. if you don't take that
// precaution, then it's possible for a user to flip between recv and sent modes, and makeMsgListEntry will be confounded
// because the index.listMode has changed. same considerations apply to navButtons.
//
function handleViewSent(acctInfo, refreshMsgList) {
    setMenuButtonState('importantInfoButton', 'Enabled');
    setMenuButtonState('registerButton',      'Enabled');
    setMenuButtonState('viewRecvButton',      refreshMsgList ? 'Disabled' : 'Enabled');
    setMenuButtonState('composeButton',       'Enabled');
    setMenuButtonState('viewSentButton',      'Selected');
    setMenuButtonState('withdrawButton',      'Enabled');
    //
    const msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'To: ';
    const msgAddrArea = document.getElementById('msgAddrArea');
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
    replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('nextUnreadButton',   'visibleIB', 'hidden',    true);
    replaceElemClassFromTo('prevUnreadButton',   'visibleIB', 'hidden',    true);
    if (refreshMsgList)
	replaceElemClassFromTo('navButtonsSpan', 'visibleIB', 'hidden',    true);
    else
	replaceElemClassFromTo('navButtonsSpan', 'hidden',    'visibleIB', true);
    replaceElemClassFromTo('attachmentButton',   'visibleIB', 'hidden',    true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    //
    const msgIdArea = document.getElementById('msgIdArea');
    msgIdArea.readonly = "readonly"
    const msgRefButton = document.getElementById('msgRefButton');
    msgRefButton.disabled = true;
    const msgDateArea = document.getElementById('msgDateArea');
    msgDateArea.readonly = "readonly"
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    const statusDiv = document.getElementById('statusDiv');
    clearStatusDiv(statusDiv);
    //
    const msgListHeaderAddr = document.getElementById('msgListHeaderAddr');
    msgListHeaderAddr.value = 'To: ';
    if (!!refreshMsgList) {
	index.listMode = 'sent';
	const msgNo = getCurMsgNo(acctInfo);
	makeMsgList(msgNo, function() {
	    showMsgLoop(acctInfo);
	    setMenuButtonState('viewRecvButton', 'Enabled');
	    setMenuButtonState('viewSentButton', 'Selected');
	    replaceElemClassFromTo('navButtonsSpan', 'hidden', 'visibleIB', true);
	});
    }
}


//
// make the the message list, according to the current View-Sent / View-Recv mode.
// this fcn displays the group of 10 messages that include the passed msgNo
//
function makeMsgList(msgNo, cb) {
    const retrievingMsgsModal = document.getElementById('retrievingMsgsModal');
    retrievingMsgsModal.style.display = 'block';
    const listTableBody = document.getElementById('listAreaDiv');
    const batch = (msgNo > 0) ? Math.floor((msgNo - 1) / 10) : 0;
    const listIdx = (msgNo > 0) ? (msgNo - 1) % 10 : 0;
    const firstMsgNo = batch * 10 + 1;
    clearMsgList(listTableBody);
    makeMsgListElems(listTableBody, firstMsgNo);
    console.log('makeMsgList: msgNo = ' + msgNo + ', index.listIdx = ' + index.listIdx);
    //only etherscan.io provides timestamp
    const msgListHeaderDate = document.getElementById('msgListHeaderDate');
    msgListHeaderDate.textContent = (ether.node.indexOf('etherscan.io') >= 0) ? 'Date' : 'Block';
    const getMsgIdsFcn   = (index.listMode == 'recv') ? mtUtil.getRecvMsgIds        : mtUtil.getSentMsgIds;
    getMsgIdsFcn(common.web3.eth.accounts[0], batch, function(err, result) {
	if (!!err || !result || result.length < listIdx + 1) {
	    const msgTextArea = document.getElementById('msgTextArea');
	    //either an error, or maybe just no events
	    msgTextArea.value = (!!err) ? 'Error: ' + err : (msgNo > 0) ? 'Error: Unable to retreive message logs' : 'No messages';
	    result = null;
	}
	console.log('makeMsgList: calling makeMsgListEntries(msgIds = ' + result.toString() + ' listIdx = 0, firstMsgNo = ' + firstMsgNo + ')');
	makeMsgListEntries(result, 0, firstMsgNo, function() {
	    retrievingMsgsModal.style.display = 'none';
	    cb();
	});
    });
}



//
// make some entries of the recv/sent message list
// recursive fcn to populate the entire list
//
// msgIds: array of up to 10 message ID's (can be null)
// listIdx: index into list (0 - 9)
// msgNo: msgNo of this entry
// cb: callback when all done
//
function makeMsgListEntries(msgIds, listIdx, msgNo, cb) {
    console.log('makeMsgListEntries: msgIds = ' + msgIds.toString() + ', msgIds.length = ' + msgIds.length + ', listIdx = 0, msgNo = ' + msgNo + ')');
    if (!msgIds || listIdx >= msgIds.length || common.numberToBN(msgIds[listIdx]).isZero()) {
	const maxMsgNo = (index.listMode == 'recv') ? parseInt(index.acctInfo.recvMsgCount) : parseInt(index.acctInfo.sentMsgCount);
	for (; listIdx < 9; ++listIdx, ++msgNo) {
	    const addr = (msgNo <= maxMsgNo) ? 'Message data unavailable...' : '';
	    const msgNoDsp = (msgNo <= maxMsgNo) ? msgNo : '';
	    addToMsgList(listIdx, msgNoDsp, addr, '', '', '', '', null);
	}
	cb();
	return;
    }
    const threeMsgIds = [];
    const msgCookies = {};
    for (let i = 0; i < 3 && listIdx < msgIds.length; ++i, ++listIdx, ++msgNo) {
	if (common.numberToBN(msgIds[listIdx]).isZero())
	    break;
	console.log('makeMsgListEntries: msgId = ' + msgIds[listIdx] + ', msgNo = ' + msgNo + ' goes to listIdx = ' + listIdx);
	const msgCookie = { idx: listIdx, no: msgNo };
	const msgId = msgIds[listIdx];
	threeMsgIds.push(msgId);
	msgCookies[msgId] = msgCookie;
    }
    //gets up to 3 log entries; second cb when all done
    let msgsToDisplay = 4;
    let noMsgsDisplayed = 0;
    mtUtil.getAndParseIdMsgs(threeMsgIds, msgCookies, function(err, msgCookie, msgId, fromAddr, toAddr, txCount, rxCount, attachmentIdxBN, ref, msgHex, blockNumber, date) {
	if (!!err || !fromAddr) {
	    err = 'Message data not found';
	    addToMsgList(msgCookie.idx, msgCookie.no, '', '', msgIds[msgCookie.idx], '', err, null);
	    if (++noMsgsDisplayed >= msgsToDisplay) {
		console.log('makeMsgListEntries: got msgCb. err = ' + err + ', msgsToDisplay = ' + msgsToDisplay + ', noMsgsDisplayed = ' + noMsgsDisplayed);
		(listIdx <= 9) ? makeMsgListEntries(msgIds, listIdx, msgNo, cb) : cb();
	    }
	    return;
	}
	const otherAddr = (index.listMode == 'sent') ? toAddr : fromAddr;
	mtUtil.decryptMsg(otherAddr, fromAddr, toAddr, txCount, msgHex, (err, decrypted) => {
	    if (!!err) {
		addToMsgList(msgCookie.idx, msgCookie.no, '', '', '', '', 'message decryption error', null);
	    } else {
		let text = decrypted;
		let attachment = null;
		console.log('makeMsgListEntries: msgId = ' + msgId + ', attachmentIdxBN = 0x' + attachmentIdxBN.toString(16));
		if (!!attachmentIdxBN && !attachmentIdxBN.isZero()) {
		    const idx = attachmentIdxBN.maskn(248).toNumber();
		    console.log('makeMsgListEntries: idx = ' + idx);
		    if (idx > 1) { //temporary
			text = decrypted.substring(0, idx);
			const nameLen = attachmentIdxBN.iushrn(248).toNumber();
			attachment = { name: decrypted.substring(idx, idx + nameLen), blob: decrypted.substring(idx + nameLen) };
		    }
		}
		console.log('makeMsgListEntries: adding msgId = ' + msgId + ', msgNo = ' + msgCookie.no + ' at listIdx = ' + msgCookie.idx);
		console.log('makeMsgListEntries: text = ' + text + ', attachment = ' + attachment);
		addToMsgList(msgCookie.idx, msgCookie.no, otherAddr, date, msgId, ref, text, attachment);
	    }
	    if (++noMsgsDisplayed >= msgsToDisplay) {
		console.log('makeMsgListEntries: got msgCb. msgsToDisplay = ' + msgsToDisplay + ', noMsgsDisplayed = ' + noMsgsDisplayed);
		(listIdx <= 9) ? makeMsgListEntries(msgIds, listIdx, msgNo, cb) : cb();
	    }
	});
    }, function(noMsgsProcessed) {
	console.log('makeMsgListEntries: got doneCb. listIdx = ' + listIdx + ', noMsgsProcessed = ' + noMsgsProcessed + ', noMsgsDisplayed = ' + noMsgsDisplayed);
	msgsToDisplay = noMsgsProcessed;
	if (noMsgsDisplayed >= msgsToDisplay)
	    (listIdx <= 9) ? makeMsgListEntries(msgIds, listIdx, msgNo, cb) : cb();
    });
}


function addToMsgList(listIdx, msgNo, addr, date, msgId, ref, text, attachment) {
    const newPrefix = (index.listIdx == listIdx) ? 'msgListItemDivSelected' : 'msgListItemDiv';
    const newSuffix = (index.listMode == 'sent' || common.chkIndexedFlag(index.localStoragePrefix + 'beenRead', msgNo)) ? '' : 'New';
    let div = index.msgListElems[listIdx].div;
    div.className = newPrefix + newSuffix;
    index.listEntries[listIdx] = new ListEntry(listIdx, div, msgId, msgNo, addr, date, ref, text, attachment);
    const subject = mtUtil.extractSubject(text, 80);
    index.msgListElems[listIdx].msgNoArea.value = msgNo.toString(10);
    index.msgListElems[listIdx].addrArea.value = addr;
    index.msgListElems[listIdx].dateArea.value = date;
    index.msgListElems[listIdx].msgIdArea.value = (!!msgId) ? mtUtil.abbreviateMsgId(msgId) : '';
    index.msgListElems[listIdx].subjectArea.value = subject;
    const viewRecvButton = document.getElementById('viewRecvButton');
    const viewSentButton = document.getElementById('viewSentButton');
    if ((msgNo != 0 && listIdx == index.listIdx                                                                                          ) &&
	(viewRecvButton.className.indexOf('menuBarButtonSelected') >= 0 || viewSentButton.className.indexOf('menuBarButtonSelected') >= 0) ) {
	console.log('addToMsgList: calling showMsgDetail(msgNo = ' + msgNo + ')');
	//in case msg wasn't ready when showMsgLoop was called
	if (!!index.listEntries[listIdx]) {
	    showMsgDetail(index.listEntries[listIdx].msgId, index.listEntries[listIdx].msgNo, index.listEntries[listIdx].addr,
			  index.listEntries[listIdx].date, index.listEntries[listIdx].ref, index.listEntries[listIdx].text, index.listEntries[listIdx].attachment);
	}
    }
}


//
// return the current msgNo
// note: separate msgNo's are maintained for View-Sent and View-Received modes. this fcn returns the correct
// msgNo depending on the current mode
//
function getCurMsgNo(acctInfo) {
    const msgNoCounter     = (index.listMode == 'recv') ? 'recvMessageNo'                 : 'sentMessageNo';
    const maxMsgNo = (index.listMode == 'recv') ? parseInt(acctInfo.recvMsgCount) : parseInt(acctInfo.sentMsgCount);
    if (index[msgNoCounter] == 0 && maxMsgNo > 0)
	index[msgNoCounter] = 1;
    if (index[msgNoCounter] > maxMsgNo)
	index[msgNoCounter] = maxMsgNo;
    //console.log('getCurMsgNo: curMsgNo = ' + index[msgNoCounter]);
    return(index[msgNoCounter]);
}


//
// handle traversing messages via prev, next buttons
// call this fcn anytime the current msgNo changes. it will validate the msgNo, and then re-display the message list if
// necessary, and calculate the current listIdx and hightlight the correct listEntry.
// also saves current msgNo to persistent storage.
//
// note: makeMsgList creates and displays the list; showMsgLoop performs any special processing for the currently selected
// list entry. when traversing the list showMsgLoop re-displays the current entry (index.listIdx), and highlights the new
// entry (index[msgNoCounter]). usually you call showMsgLoop in the callback from makeMsgList. however, showMsgLoop also checks
// to make sure that the current message is within the list. if it is not, then showMsgLoop internally calls makeMsgList, and
// then calls itself to display the new list.
//
function showMsgLoop(acctInfo) {
    const maxMsgNo = (index.listMode == 'recv') ? parseInt(acctInfo.recvMsgCount) : parseInt(acctInfo.sentMsgCount);
    const msgNo = getCurMsgNo(acctInfo);
    localStorage[index.localStoragePrefix + '-' + index.listMode + 'MessageNo'] = msgNo;
    const prevMsgButton = document.getElementById('prevMsgButton');
    const nextMsgButton = document.getElementById('nextMsgButton');
    const prevPageButton = document.getElementById('prevPageButton');
    const nextPageButton = document.getElementById('nextPageButton');
    prevMsgButton.disabled = (msgNo > 1)          ? false : true;
    nextMsgButton.disabled = (msgNo < maxMsgNo)   ? false : true;
    prevPageButton.disabled = (msgNo > 10)        ? false : true;
    nextPageButton.disabled = (msgNo < (Math.floor((maxMsgNo - 1) / 10) * 10) + 1) ? false : true;
    //check msgNo outside of listEntries.... if yes, regenerate listEntries, and call us again; in this case we disable the navButtons and other view-list
    //mode until after the list is regenerated.
    const minListMsgNo = index.msgListElems[0].msgNo;
    if (msgNo != 0 && (msgNo < minListMsgNo || msgNo >= minListMsgNo + 10)) {
	console.log('showMsgLoop: regenerating msg list!');
	setMenuButtonState('viewRecvButton', 'Disabled');
	setMenuButtonState('viewSentButton', 'Disabled');
	replaceElemClassFromTo('navButtonsSpan', 'visibleIB', 'hidden',    true);
	makeMsgList(msgNo, function() {
	    showMsgLoop(acctInfo);
	    console.log('showMsgLoop: index.listMode = ' + index.listMode);
	    setMenuButtonState('viewRecvButton', (index.listMode == 'recv') ? 'Selected' : 'Enabled');
	    setMenuButtonState('viewSentButton', (index.listMode == 'sent') ? 'Selected' : 'Enabled');
	    replaceElemClassFromTo('navButtonsSpan', 'hidden', 'visibleIB', true);
	});
	return;
    }
    const listIdx = (msgNo > 0) ? (msgNo - 1) % 10 : -1;
    console.log('showMsgLoop: listIdx = ' + listIdx + ', index.listIdx = ' + index.listIdx);
    if (listIdx != index.listIdx) {
	if (index.listIdx >= 0) {
	    const oldMsgNo = index.msgListElems[index.listIdx].msgNo;
	    const newSuffix = (index.listMode == 'sent' || common.chkIndexedFlag(index.localStoragePrefix + 'beenRead', oldMsgNo)) ? '' : 'New';
	    (index.msgListElems[index.listIdx].div).className = 'msgListItemDiv' + newSuffix;
	}
	index.listIdx = listIdx;
	if (index.listIdx >= 0) {
	    const newSuffix = (index.listMode == 'sent' || common.chkIndexedFlag(index.localStoragePrefix + 'beenRead', msgNo)) ? '' : 'New';
	    console.log('showMsgLoop: changing index.msgListElems[' + index.listIdx + '].div).className from ' + index.msgListElems[index.listIdx].div.className);
	    console.log('showMsgLoop: to msgListItemDivSelected' + newSuffix);
	    (index.msgListElems[index.listIdx].div).className = 'msgListItemDivSelected' + newSuffix;
	    const markReadButton = document.getElementById('markReadButton');
	    markReadButton.textContent = (!!newSuffix) ? 'Mark as Read' : 'Mark as Unread';
	}
    }
    console.log('showMsgLoop: index[msgNoCounter] = ' + msgNo + ', maxMsgNo = ' + maxMsgNo);
    const viewRecvButton = document.getElementById('viewRecvButton');
    const viewSentButton = document.getElementById('viewSentButton');
    if (viewRecvButton.className.indexOf('menuBarButtonSelected') >= 0 || viewSentButton.className.indexOf('menuBarButtonSelected') >= 0) {
	if (msgNo != 0) {
	    const listIdx = (msgNo - 1) % 10;
	    //if the msg hasn't been addded to the list yet then it will be displayed after being added
	    if (!!index.listEntries[listIdx]) {
		console.log('showMsgLoop: calling showMsgDetail(msgNo = ' + msgNo + ')');
		showMsgDetail(index.listEntries[listIdx].msgId, index.listEntries[listIdx].msgNo, index.listEntries[listIdx].addr,
			      index.listEntries[listIdx].date, index.listEntries[listIdx].ref, index.listEntries[listIdx].text, index.listEntries[listIdx].attachment);
	    } else {
		console.log('showMsgLoop: msg detail is not available yet for msgNo = ' + msgNo);
	    }
	}
    }
}


//
//cb(err)
//decrypt and display the message in the msgTextArea. also displays the msgId, ref, date & msgNo
//msgNo is either txCount or rxCount depending on whether the message was sent or received
//
function showMsgDetail(msgId, msgNo, otherAddr, date, ref, msgTextContent, attachment) {
    console.log('showMsg: enter');
    const msgAddrArea = document.getElementById('msgAddrArea');
    const msgTextArea = document.getElementById('msgTextArea');
    const msgNoNotButton = document.getElementById('msgNoNotButton');
    msgAddrArea.disabled = true;
    msgTextArea.disabled = true;
    msgAddrArea.value = otherAddr;
    showIdAndRef(msgId, ref, true);
    msgDateArea.value = date;
    msgNoNotButton.textContent = parseInt(msgNo).toString(10);
    msgTextArea.value = msgTextContent;
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    if (!!attachment) {
	attachmentSaveA.href = attachment.blob;
	attachmentSaveA.download = attachment.name;
	const attachmentSaveSpan = document.getElementById('attachmentSaveSpan');
	attachmentSaveSpan.textContent = attachment.name;
	attachmentSaveA.style.display = 'inline-block';
    } else {
	attachmentSaveA.style.display = 'none';
    }
    const replyButton = document.getElementById('replyButton');
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
    const replyButton = document.getElementById('replyButton');
    replyButton.disabled = true;
    //
    //status div starts out hidden
    console.log('show status div');
    statusDiv.style.display = "block";
    const leftDiv = document.createElement("div");
    leftDiv.className = 'visibleIB';
    statusDiv.appendChild(leftDiv);
    const rightDiv = document.createElement("div");
    rightDiv.className = 'visibleIB';
    statusDiv.appendChild(rightDiv);
    let statusCtr = 0;
    const statusText = document.createTextNode('No status yet...');
    leftDiv.appendChild(statusText);
    if (!!err || !txid) {
	if (!err)
	    err = 'No transaction hash was generated.';
	statusText.textContent = 'Error in ' + desc + ' transaction: ' + err;
	const reloadLink = document.createElement('a');
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
    const viewTxLink = document.createElement('a');
    viewTxLink.href = 'https://' + ether.etherscanioTxStatusHost + '/tx/' + txid;
    viewTxLink.innerHTML = "<h2>View transaction</h2>";
    viewTxLink.target = '_blank';
    viewTxLink.disabled = false;
    leftDiv.appendChild(viewTxLink);
    //
    //cleared in handleUnlockedMetaMask, after the user clicks 'continue'
    index.waitingForTxid = true;
    const timer = setInterval(function() {
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
		    const reloadLink = document.createElement('a');
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


function clearMsgList(table) {
    /*
    while (table.hasChildNodes()) {
	const child = table.lastChild;
	if (!!child.id && child.id.startsWith("msgListHeader"))
	    break;
	table.removeChild(child);
    }
    */
    for (let i = 0; i < index.msgListElems.length; ++i) {
	index.msgListElems[i].msgNo = -1;
	index.msgListElems[i].msgNoArea.value = '';
	index.msgListElems[i].addrArea.value = '';
	index.msgListElems[i].dateArea.value = '';
	index.msgListElems[i].msgIdArea.value = '';
	index.msgListElems[i].subjectArea.value = '';
    }
    index.listIdx = -1;
}


function makeMsgListElems(table, firstMsgNo) {
    if (index.msgListElems.length > 0) {
	for (let i = 0, msgNo = firstMsgNo; i < 10; ++i, ++msgNo) {
	    index.msgListElems[i].msgNo = msgNo;
	    /*
	    index.msgListElems[i].msgNoArea.value = '';
	    index.msgListElems[i].addrArea.value = '';
	    index.msgListElems[i].dateArea.value = '';
	    index.msgListElems[i].msgIdArea.value = '';
	    index.msgListElems[i].subjectArea.value = '';
	    */
	}
	return;
    }
    index.msgListElems = [];
    for (let i = 0, msgNo = firstMsgNo; i < 10; ++i, ++msgNo) {
	let div, msgNoArea, addrArea, subjectArea, dateArea, msgIdArea;
	(div = document.createElement("div")).id = 'msgListDivIdx-' + i.toString(10);
	div.className = 'msgListItemDiv';
	(msgNoArea = document.createElement("textarea")).id = 'msgList-' + i.toString(10) + 'msgNoArea';
	msgNoArea.className = 'msgListMsgNoArea';
	msgNoArea.rows = 1;
	msgNoArea.readonly = 'readonly';
	msgNoArea.disabled = 'disabled';
	msgNoArea.value = '';
	(addrArea = document.createElement("textarea")).id = 'msgList-' + i.toString(10) + 'addrArea';
	addrArea.className = 'msgListAddrArea';
	addrArea.rows = 1;
	addrArea.readonly = 'readonly';
	addrArea.disabled = 'disabled';
	addrArea.value = '';
	(dateArea = document.createElement("textarea")).id = 'msgList-' + i.toString(10) + 'dateArea';
	dateArea.className = 'msgListDateArea';
	dateArea.rows = 1;
	dateArea.readonly = 'readonly';
	dateArea.disabled = 'disabled';
	dateArea.value = '';
	(msgIdArea = document.createElement("textarea")).id = 'msgList-' + i.toString(10) + 'msgIdArea';
	msgIdArea.className = 'msgListMsgIdArea';
	msgIdArea.rows = 1;
	msgIdArea.readonly = 'readonly';
	msgIdArea.disabled = 'disabled';
	msgIdArea.value = '';
	(subjectArea = document.createElement("textarea")).id = 'msgList-' + i.toString(10) + 'subjectArea';
	subjectArea.className = 'msgListSubjectArea';
	subjectArea.rows = 1;
	subjectArea.readonly = 'readonly';
	subjectArea.disabled = 'disabled';
	subjectArea.value = '';
	index.msgListElems.push({ div: div, msgNoArea: msgNoArea, addrArea: addrArea, dateArea: dateArea, msgIdArea: msgIdArea, subjectArea: subjectArea, msgNo: msgNo });
	div.appendChild(msgNoArea);
	div.appendChild(addrArea);
	div.appendChild(dateArea);
	div.appendChild(msgIdArea);
	div.appendChild(subjectArea);
	table.appendChild(div);
	div.addEventListener('click', function() {
	    const msgNo = index.msgListElems[i].msgNo;
	    if (msgNo > 0) {
		//re-establish View-Sent or View-Recv mode as appropriate, but no need to refresh the msg list since
		//by definition we are selecting a message from the current list
		const msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
		const viewSentButton = document.getElementById('viewSentButton');
		const viewRecvButton = document.getElementById('viewRecvButton');
		index[msgNoCounter] = msgNo;
		if (index.listMode == 'recv' && viewRecvButton.className != 'menuBarButtonSelected')
		    handleViewRecv(index.acctInfo, false);
		else if (index.listMode == 'sent' && viewSentButton.className != 'menuBarButtonSelected')
		    handleViewSent(index.acctInfo, false);
		showMsgLoop(index.acctInfo);
	    }
	});
    }
}



//state = 'Disabled' | 'Enabled' | 'Selected'
function setMenuButtonState(buttonID, state) {
    const button = document.getElementById(buttonID);
    button.disabled = (state == 'Enabled') ? false : true;
    button.className = 'menuBarButton' + state;
}

function replaceElemClassFromTo(elemId, from, to, disabled) {
    const elem = document.getElementById(elemId);
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
	const msgIdArea = document.getElementById('msgIdArea');
	msgIdArea.value = 'Msg ID: ' + mtUtil.abbreviateMsgId(msgId);
	msgIdArea.msgId = msgId;
    }
    const msgRefButton = document.getElementById('msgRefButton');
    const refShortBN = common.numberToBN(ref);
    if (refShortBN.isZero()) {
	msgRefButton.textContent = 'Ref: none';
	msgRefButton.ref = '';
	msgRefButton.disabled = true;
    } else {
	msgRefButton.textContent = 'Ref: ' + mtUtil.abbreviateMsgId(ref);
	msgRefButton.ref = ref;
	msgRefButton.disabled = (enable) ? false : true;
    }
}
