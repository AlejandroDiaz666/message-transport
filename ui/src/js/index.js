
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
    accountEnsName: null,
    acctCheckTimer: null,
    etherPrice: 100,
    elemIdx: -1,
    listMode: null,
    msgListElems: [],
    rxMessages: [],
    txMessages: [],
    localStoragePrefix: '',
    introCompletePromise: null,

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

function Message(isRx, msgId, msgNo, addr, viaAddr, date, ref, text, attachment) {
    this.isRx = isRx;
    this.msgId = msgId;
    this.msgNo = msgNo;
    this.addr = addr;
    this.viaAddr = viaAddr;
    this.date = date;
    this.ref = ref;
    this.text = text;
    this.attachment = attachment;
    this.ensName = null;
}

function MsgElem(div, msgNoArea, viaDiv, addrArea, dateArea, msgIdArea, subjectArea, msgNo) {
    this.div = div;
    this.msgNoArea = msgNoArea;
    this.viaDiv = viaDiv;
    this.addrArea = addrArea;
    this.dateArea = dateArea;
    this.msgIdArea = msgIdArea;
    this.subjectArea = subjectArea;
    this.msgNo = msgNo;
    this.elemIdx = -1;
    this.message = null;
}


function setOptionsButtonHandlers() {
    const versionArea = document.getElementById('versionArea');
    versionArea.textContent = 'Build: ' + autoVersion.version();
    const optionsButton = document.getElementById('optionsButton');
    optionsButton.addEventListener('click', () => { common.replaceElemClassFromTo('optionsPanel', 'hidden', 'visibleB', null); });
    const closeOptionsButton = document.getElementById('closeOptionsButton');
    closeOptionsButton.addEventListener('click', () => {
	common.replaceElemClassFromTo('optionsPanel', 'visibleB', 'hidden', null);
	if (localStorage['logsNodeType'] != ether.nodeType)
	    ether.nodeType = localStorage['logsNodeType'];
	if (localStorage['logsCustomNode'] != ether.node)
	    ether.node = localStorage['logsCustomNode'];
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
    if (!!localStorage['theme'] && localStorage['theme'].indexOf('relax') >= 0) {
	relaxThemeButton.checked = true;
	updateThemeFcn('relax-style');
    } else if (!!localStorage['theme'] && localStorage['theme'].indexOf('mary') >= 0) {
	marysThemeButton.checked = true;
	updateThemeFcn('marys-style');
    } else {
	wandasThemeButton.checked = true;
	updateThemeFcn('wandas-style');
    }
    marysThemeButton.addEventListener('click', () => {	updateThemeFcn('marys-style'); });
    wandasThemeButton.addEventListener('click', () => { updateThemeFcn('wandas-style'); });
    relaxThemeButton.addEventListener('click', () => { updateThemeFcn('relax-style'); });
    // display/update log server
    const logServerSelect = document.getElementById('logServerSelect');
    const logServerSelectFcn = () => {
	localStorage['logsNodeType'] = logServerSelect.value;
	common.replaceElemClassFromTo('customViewButton', 'visibleB', 'hidden', true);
	if (logServerSelect.value == 'custom')
	    common.replaceElemClassFromTo('customNodeDiv', 'hidden', 'visibleB', true);
	else
	    common.replaceElemClassFromTo('customNodeDiv', 'visibleB', 'hidden', true);
    };
    if (!localStorage['logsNodeType'])
	localStorage['logsNodeType'] = ether.nodeType;
    logServerSelect.value = ether.nodeType = localStorage['logsNodeType'];
    if (logServerSelect.value == 'custom')
	common.replaceElemClassFromTo('customViewButton', 'hidden', 'visibleB', false);
    const customNodeDoFcn = () => {
	common.replaceElemClassFromTo('customNodeDiv', 'visibleB', 'hidden', true);
	common.replaceElemClassFromTo('customViewButton', 'hidden', 'visibleB', false);
	localStorage['logsCustomNode'] = document.getElementById('customNodeArea').value;
    };
    if (!localStorage['logsCustomNode'])
	localStorage['logsCustomNode'] = ether.node;
    document.getElementById('customNodeArea').value = ether.node = localStorage['logsCustomNode'];
    logServerSelect.addEventListener('change', logServerSelectFcn);
    document.getElementById('customNodeDoButton').addEventListener('click', customNodeDoFcn);
    document.getElementById('customViewButton').addEventListener('click', logServerSelectFcn);
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
	if (!!mtUtil.acctInfo)
	    handleRegister();
    });
    const viewRecvButton = document.getElementById('viewRecvButton');
    viewRecvButton.addEventListener('click', function() {
	if (!!mtUtil.acctInfo)
	    handleViewRecv(true);
    });
    const composeButton = document.getElementById('composeButton');
    composeButton.addEventListener('click', function() {
	if (!!mtUtil.acctInfo)
	    handleCompose(mtUtil.acctInfo, '');
    });
    const viewSentButton = document.getElementById('viewSentButton');
    viewSentButton.addEventListener('click', function() {
	console.log('viewSentButton: got click');
	if (!!mtUtil.acctInfo)
	    handleViewSent(true);
    });
    const registerSubmitButton = document.getElementById('registerSubmitButton');
    registerSubmitButton.addEventListener('click', function() {
	if (!!mtUtil.acctInfo)
	    handleRegisterSubmit();
    });
    const withdrawButton = document.getElementById('withdrawButton');
    withdrawButton.addEventListener('click', function() {
	if (!!mtUtil.acctInfo)
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
	    console.log('replyButton: attachmentSaveA.href = ' + attachmentSaveA.href + ', attachmentSaveA.download = ' + attachmentSaveA.download);
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
	    let toAddr = msgAddrArea.value;
	    if (toAddr.indexOf('(') >= 0) {
		//for ens names, actual, complete addr is beween parens
		toAddr = msgAddrArea.value.replace(/[^\(]*\(([^]*)\).*/, "$1");
		console.log('replyButton: toAddr = ' + toAddr);
	    }
	    //the toAddr has already been validated. really.
	    mtUtil.encryptMsg(toAddr, message, function(err, msgFee, encrypted, msgNoBN) {
		if (!!err) {
		    alert(err);
		    handleUnlockedMetaMask(null);
		    return;
		}
		const msgFeeArea = document.getElementById('msgFeeArea');
		msgFeeArea.value = 'Fee: ' + ether.convertWeiBNToComfort(common.numberToBN(msgFee));
		disableAllButtons();
		common.showWaitingForMetaMask(true);
		const msgRefButton = document.getElementById('msgRefButton');
		const ref = msgRefButton.ref;
		mtEther.sendMessage(toAddr, attachmentIdxBN, ref, encrypted, msgFee, function(err, txid) {
		    console.log('txid = ' + txid);
		    common.showWaitingForMetaMask(false);
		    const continueFcn = (err, receipt) => {
			if (!err) {
			    mtUtil.acctInfo.sentMsgCount = msgNoBN.toString(10);
			    index.sentMessageNo = msgNoBN.toNumber();
			}
			common.waitingForTxid = false;
			common.clearStatusDiv();
			handleViewSent(true);
		    };
		    common.waitForTXID(err, txid, 'Send-Message', continueFcn, ether.etherscanioTxStatusHost, null);
		});
	    });
	} else if ((viewRecvButton.className == 'menuBarButtonSelected') ||
		   (viewSentButton.className == 'menuBarButtonSelected') ) {
	    // handle reply
	    // fromAddr can be either complete addr or ens name followed by complete addr in parens
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
	    handleReplyCompose(mtUtil.acctInfo, fromAddr, subject, ref);
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
	mtEther.accountQuery(toAddr, function(err, toAcctInfo) {
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
		mtEther.getPeerMessageCount(toAddr, common.web3.eth.accounts[0], function(err, msgCount) {
		    console.log(msgCount.toString(10) + ' messages have been sent from ' + toAddr + ' to me');
		    const fee = (msgCount > 0) ? toAcctInfo.msgFee : toAcctInfo.spamFee;
		    msgFeeArea.value = 'Fee: ' + ether.convertWeiBNToComfort(common.numberToBN(fee));
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
	    ether.ensReverseLookup(toAddrIn, function(err, name) {
		console.log('validateAddrButton: reverse ENS results: err = ' + err + ', name = ' + name);
		if (!err && !!name)
		    msgAddrArea.value = name + ' (' + toAddrIn + ')';
		validatedAddress(toAddrIn);
	    });
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
    const deleteImg = document.getElementById('deleteImg');
    deleteImg.addEventListener('click', function() {
	attachmentSaveA.href = '';
	attachmentSaveA.download = '';
	attachmentInput.value = attachmentInput.files = null;
	attachmentSaveA.style.display = 'none';
	common.replaceElemClassFromTo('attachmentInput', 'visibleIB', 'hidden', true);
	common.replaceElemClassFromTo('attachmentButton', 'hidden', 'visibleIB', false);
	deleteImg.style.display = 'none';
    });
    attachmentButton.addEventListener('click', function() {
	if (composeButton.className == 'menuBarButtonSelected') {
	    attachmentInput.value = attachmentInput.files = null;
	    common.replaceElemClassFromTo('attachmentButton', 'visibleIB', 'hidden', true);
	    common.replaceElemClassFromTo('attachmentInput', 'hidden', 'visibleIB', false);
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
		deleteImg.style.display = 'inline-block';
		common.replaceElemClassFromTo('attachmentInput', 'visibleIB', 'hidden', true);
            };
            reader.readAsDataURL(attachmentInput.files[0]);
        } else {
	    attachmentSaveA.href = '';
	    attachmentSaveA.download = '';
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
		    handleViewSent(true);
		} else if (toAddr == common.web3.eth.accounts[0]) {
		    index.recvMessageNo = rxCount;
		    handleViewRecv(true);
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
	const msgElem = index.msgListElems[index.elemIdx];
	const message = !!msgElem && msgElem.message;
	if (!!message) {
	    const div = msgElem.div;
	    const msgNo = message.msgNo;
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
	if (index.elemIdx > 0) {
	    const newIdx = index.elemIdx - 1;
	    selectMsgListEntry(newIdx, function() {
		const msgElem = index.msgListElems[index.elemIdx];
		msgElem.div.scrollIntoView({ block: "nearest" });
	    });
	}
    });
    index.nextMsgButtonFcn = () => {
	const maxMsgNo = (index.listMode == 'recv') ? parseInt(mtUtil.acctInfo.recvMsgCount) : parseInt(mtUtil.acctInfo.sentMsgCount);
	if (index.elemIdx < maxMsgNo - 1) {
	    const newIdx = index.elemIdx + 1;
	    selectMsgListEntry(newIdx, function() {
		const msgElem = index.msgListElems[index.elemIdx];
		msgElem.div.scrollIntoView({ block: "nearest" });
	    });
	}
    };
    nextMsgButton.addEventListener('click', index.nextMsgButtonFcn);
    firstButton.addEventListener('click', function() {
	if (index.msgListElems.length > 0) {
	    selectMsgListEntry(0, function() {
		const msgElem = index.msgListElems[index.elemIdx];
		msgElem.div.scrollIntoView({ block: "nearest" });
	    });
	}
    });
    lastButton.addEventListener('click', function() {
	const maxMsgNo = (index.listMode == 'recv') ? parseInt(mtUtil.acctInfo.recvMsgCount) : parseInt(mtUtil.acctInfo.sentMsgCount);
	if (maxMsgNo > 0) {
	    selectMsgListEntry(maxMsgNo - 1, function() {
		const msgElem = index.msgListElems[index.elemIdx];
		console.log('lastButton.click: scrollin to elem idx ' + index.elemIdx);
		msgElem.div.scrollIntoView({ block: "nearest" });
	    });
	}
    });
    prevPageButton.addEventListener('click', function() {
	let pageIdx = Math.floor(index.elemIdx / 10);
	console.log('pageIdx = ' + pageIdx);
	const newIdx = Math.max(0, (pageIdx - 1) * 10);
	selectMsgListEntry(newIdx, function() {
	    const msgElem = index.msgListElems[index.elemIdx];
	    msgElem.div.scrollIntoView({ block: "start" });
	});

    });
    nextPageButton.addEventListener('click', function() {
	const maxMsgNo = (index.listMode == 'recv') ? parseInt(mtUtil.acctInfo.recvMsgCount) : parseInt(mtUtil.acctInfo.sentMsgCount);
	let pageIdx = Math.floor(index.elemIdx / 10);
	console.log('pageIdx = ' + pageIdx);
	const newIdx = Math.min(maxMsgNo - 1, (pageIdx + 1) * 10);
	selectMsgListEntry(newIdx, function() {
	    const msgElem = index.msgListElems[index.elemIdx];
	    msgElem.div.scrollIntoView({ block: "start" });
	});
    });
    nextUnreadButton.addEventListener('click', function() {
	const maxMsgNo = (index.listMode == 'recv') ? parseInt(mtUtil.acctInfo.recvMsgCount) : parseInt(mtUtil.acctInfo.sentMsgCount);
	const msgElem = index.msgListElems[index.elemIdx];
	const msgNo = !!msgElem && msgElem.msgNo;
	//next really means lower msg no; ie. older
	const unreadMsgNo = common.findIndexedFlag(index.localStoragePrefix + 'beenRead', msgNo - 1, 1, false);
	if (unreadMsgNo > 0) {
	    const newIdx = maxMsgNo - unreadMsgNo;
	    selectMsgListEntry(newIdx, function() {
		const msgElem = index.msgListElems[index.elemIdx];
		msgElem.div.scrollIntoView({ block: "nearest" });
	    });
	}
    });
    prevUnreadButton.addEventListener('click', function() {
	const maxMsgNo = (index.listMode == 'recv') ? parseInt(mtUtil.acctInfo.recvMsgCount) : parseInt(mtUtil.acctInfo.sentMsgCount);
	const msgElem = index.msgListElems[index.elemIdx];
	const msgNo = !!msgElem && msgElem.msgNo;
	//prev really means higher msg no; ie. more recent
	const unreadMsgNo = common.findIndexedFlag(index.localStoragePrefix + 'beenRead', msgNo + 1, maxMsgNo, false);
	console.log('nextUnreadButton.click: msgNo = ' + msgNo + ', unreadMsgNo = ' + unreadMsgNo);
	if (unreadMsgNo > 0) {
	    const newIdx = maxMsgNo - unreadMsgNo;
	    console.log('nextUnreadButton.click: msgListElems.length = ' + index.msgListElems.length + ', newIdx = ' + newIdx);
	    selectMsgListEntry(newIdx, function() {
		const msgElem = index.msgListElems[index.elemIdx];
		msgElem.div.scrollIntoView({ block: "nearest" });
	    });
	}
    });
    const msgListDiv = document.getElementById('msgListDiv');
    msgListDiv.addEventListener('scroll', function() {
	const maxMsgNo = (index.listMode == 'recv') ? parseInt(mtUtil.acctInfo.recvMsgCount) : parseInt(mtUtil.acctInfo.sentMsgCount);
	//console.log('got scroll: maxMsgNo = ' + maxMsgNo + ', index.msgListElems.length = ' + index.msgListElems.length);
        if (index.msgListElems.length < maxMsgNo)
	    populateMsgList(null, function() { });
    });
}



async function doFirstIntro(ignoreFirstIntroCompleteFlag) {
    if (!ignoreFirstIntroCompleteFlag && !!localStorage['FirstIntroCompleteFlag']) {
	return(new Promise((resolve, reject) => {
	    resolve(1);
	}));
    }
    common.replaceElemClassFromTo('intro0Div', 'hidden', 'visibleB', null);
    if (!index.introCompletePromise) {
	index.introCompletePromise = new Promise((resolve, reject) => {
	    const intro0Next = document.getElementById('intro0Next');
	    intro0Next.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro0Div', 'visibleB', 'hidden', null);
		common.replaceElemClassFromTo('intro1Div', 'hidden', 'visibleB', null);
	    });
	    const intro1Prev = document.getElementById('intro1Prev');
	    intro1Prev.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro1Div', 'visibleB', 'hidden', null);
		common.replaceElemClassFromTo('intro0Div', 'hidden', 'visibleB', null);
	    });
	    const intro1Next = document.getElementById('intro1Next');
	    intro1Next.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro1Div', 'visibleB', 'hidden', null);
		common.replaceElemClassFromTo('intro2Div', 'hidden', 'visibleB', null);
	    });
	    const intro2Prev = document.getElementById('intro2Prev');
	    intro2Prev.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro2Div', 'visibleB', 'hidden', null);
		common.replaceElemClassFromTo('intro1Div', 'hidden', 'visibleB', null);
	    });
	    const intro2Next = document.getElementById('intro2Next');
	    intro2Next.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro2Div', 'visibleB', 'hidden', null);
		common.replaceElemClassFromTo('intro3Div', 'hidden', 'visibleB', null);
	    });
	    const intro3Prev = document.getElementById('intro3Prev');
	    intro3Prev.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro3Div', 'visibleB', 'hidden', null);
		common.replaceElemClassFromTo('intro2Div', 'hidden', 'visibleB', null);
	    });
	    const intro3Next = document.getElementById('intro3Next');
	    intro3Next.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro3Div', 'visibleB', 'hidden', null);
		common.replaceElemClassFromTo('intro4Div', 'hidden', 'visibleB', null);
	    });
	    const intro4Prev = document.getElementById('intro4Prev');
	    intro4Prev.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro4Div', 'visibleB', 'hidden', null);
		common.replaceElemClassFromTo('intro3Div', 'hidden', 'visibleB', null);
	    });
	    const intro4Next = document.getElementById('intro4Next');
	    intro4Next.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro4Div', 'visibleB', 'hidden', null);
		//if we wanted to stop displaying the intro once the user had clicked through
		//to the end at least one time...
		//localStorage['FirstIntroCompleteFlag'] = true;
		resolve(null);
	    });
	    const intro0Close = document.getElementById('intro0Close');
	    intro0Close.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro0Div', 'visibleB', 'hidden', null);
		resolve(null);
	    });
	    const intro1Close = document.getElementById('intro1Close');
	    intro1Close.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro1Div', 'visibleB', 'hidden', null);
		resolve(null);
	    });
	    const intro2Close = document.getElementById('intro2Close');
	    intro2Close.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro2Div', 'visibleB', 'hidden', null);
		resolve(null);
	    });
	    const intro3Close = document.getElementById('intro3Close');
	    intro3Close.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro3Div', 'visibleB', 'hidden', null);
		resolve(null);
	    });
	    const intro4Close = document.getElementById('intro4Close');
	    intro4Close.addEventListener('click', function() {
		common.replaceElemClassFromTo('intro4Div', 'visibleB', 'hidden', null);
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
    if (common.waitingForTxid)
	return(true);
    const viewRecvButton = document.getElementById('viewRecvButton');
    const viewSentButton = document.getElementById('viewSentButton');
    return((viewRecvButton.className.indexOf('Selected') >= 0 || viewSentButton.className.indexOf('Selected') >= 0 ) ? false : true);
}
//
function periodicCheckForAccountChanges() {
    //console.log('periodicCheckForAccountChanges: enter');
    if (timerIsPaused()) {
	console.log('periodicCheckForAccountChanges: timerIsPaused!');
	setTimeout(periodicCheckForAccountChanges, 20000);
	return;
    }
    common.checkForMetaMask(true, function(err, w3, netId) {
	const acct = (!err && !!w3) ? w3.eth.accounts[0] : null;
	//ether.getNetwork was called in handleUnlockedMetaMask
	if (!!err || !w3 || !acct || acct != index.account || netId != ether.chainId) {
	    //do not reschedule; user must reload page
	    handleLockedMetaMask(!!err ? ('Cannot access MetaMask/account: ' + err) : 'Cannot access MetaMask/account: reload page');
	    return;
	}
	console.log('periodicCheckForAccountChanges: MetaMask account unchanged...');
	mtEther.accountQuery(common.web3.eth.accounts[0], function(err, _acctInfo) {
	    //acctInfo will always be an object. could be empty {}
	    if (JSON.stringify(_acctInfo).length != 2 && JSON.stringify(mtUtil.acctInfo).length != 2) {
		const recvCntNew = parseInt(_acctInfo.recvMsgCount);
		const sentCntNew = parseInt(_acctInfo.sentMsgCount);
		const recvCntOld = parseInt(mtUtil.acctInfo.recvMsgCount);
		const sentCntOld = parseInt(mtUtil.acctInfo.sentMsgCount);
		if (recvCntNew != recvCntOld) {
		    console.log('periodicCheckForAccountChanges: recvCnt ' + recvCntOld + ' => ' + recvCntNew);
		    beginTheBeguine('recv');
		} else if (sentCntNew != sentCntOld) {
		    console.log('periodicCheckForAccountChanges: sentCnt ' + sentCntOld + ' => ' + sentCntNew);
		    const viewSentButton = document.getElementById('viewSentButton');
		    if (viewSentButton.className.indexOf('Selected') < 0 ) {
			//if he's not in view-sent mode then we'll update the sent list anyhow next time he switches
			//to the view-sent mode. but if he's already viewing sent messages then we can update the list now.
			beginTheBeguine('send');
		    }
		}
	    }
	    setTimeout(periodicCheckForAccountChanges, 20000);
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
    if (!!localStorage['etherPrice'])
	index.etherPrice = localStorage['etherPrice'];
    ether.getEtherPrice(function(err, price) {
	console.log('err = ' + err + ', price = '  + price);
	if (!err && !!price)
	    index.etherPrice = localStorage['etherPrice'] = price;
    });
    common.checkForMetaMask(true, function(err, w3) {
	const acct = (!err && !!w3) ? w3.eth.accounts[0] : null;
	index.account = acct;
	index.accountEnsName = null;
	if (!!err || !acct) {
	    console.log('beginTheBeguine: checkForMetaMask err = ' + err);
	    handleLockedMetaMask(err);
	} else {
	    console.log('beginTheBeguine: checkForMetaMask acct = ' + acct);
	    common.setMenuButtonState('importantInfoButton', 'Disabled');
	    common.setMenuButtonState('registerButton',      'Disabled');
	    common.setMenuButtonState('viewRecvButton',      'Disabled');
	    common.setMenuButtonState('composeButton',       'Disabled');
	    common.setMenuButtonState('viewSentButton',      'Disabled');
	    common.setMenuButtonState('withdrawButton',      'Disabled');
	    //in case we have data from a different acct
	    index.msgListElems = [];
	    index.rxMessages = [];
	    index.txMessages = [];
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
    common.setMenuButtonState('importantInfoButton', 'Enabled');
    common.setMenuButtonState('registerButton',      'Disabled');
    common.setMenuButtonState('viewRecvButton',      'Disabled');
    common.setMenuButtonState('composeButton',       'Disabled');
    common.setMenuButtonState('viewSentButton',      'Disabled');
    common.setMenuButtonState('withdrawButton',      'Disabled');
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
    common.replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgRefButton',       'visibleTC', 'hidden',    true).textContent = '';
    common.replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgFeeArea',         'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('replyButton',        'visibleTC', 'hidden',    true).textContent = 'Reply';
    common.replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('attachmentButton',   'visibleIB', 'hidden',    true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    //
    index.msgListElems = [];
    index.rxMessages = [];
    index.txMessages = [];
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    const msgListDiv = document.getElementById('msgListDiv');
    initMsgElemList(msgListDiv, null, null);
    const statusDiv = document.getElementById('statusDiv');
    common.clearStatusDiv(statusDiv);
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
    common.waitingForTxid = false;
    index.localStoragePrefix = (index.account).substring(2, 10) + '-';
    //
    ether.ensReverseLookup(index.account, function(err, name) {
	let addrStr = index.account;
	if (!err && !!name)
	    addrStr = abbreviateAddrForEns(index.account, name);
	document.getElementById('accountArea').value = 'Account: ' + addrStr;
	document.getElementById('accountAreaFull').textContent = index.account;
    });
    ether.getBalance(index.account, 'ether', function(err, balance) {
	const balanceArea = document.getElementById('balanceArea');
	console.log('balance (eth) = ' + balance);
	const balanceETH = parseFloat(balance).toFixed(6);
	balanceArea.value = 'Balance: ' + balanceETH.toString(10) + ' Eth';
    });
    ether.getNetwork(function(err, network) {
	const networkArea = document.getElementById('networkArea');
	if (!!err) {
	    networkArea.value = 'Error: ' + err;
	    return;
	}
	networkArea.value = 'Network: ' + network;
	err = mtEther.setNetwork(network);
	if (network.startsWith('Mainnet'))
	    networkArea.className = (networkArea.className).replace('attention', '');
	else if (networkArea.className.indexOf(' attention' < 0))
	    networkArea.className += ' attention';
	if (!!err) {
	    alert(err)
	    return;
	}
	mtEther.accountQuery(common.web3.eth.accounts[0], function(err, _acctInfo) {
	    mtUtil.acctInfo = _acctInfo;
	    console.log('handleUnlockedMetaMask: mtUtil.acctInfo.msgFee = ' + mtUtil.acctInfo.msgFee);
	    mtUtil.publicKey = (!!mtUtil.acctInfo) ? mtUtil.acctInfo.publicKey : null;
	    //console.log('handleUnlockedMetaMask: acctInfo: ' + JSON.stringify(mtUtil.acctInfo));
	    //console.log('handleUnlockedMetaMask: publicKey: ' + mtUtil.publicKey);
	    if (!mtUtil.publicKey || mtUtil.publicKey == '0x') {
		handleUnregisteredAcct();
		return;
	    }
	    if (mode == 'startup') {
		let recvMsgNoFromURL = null;
		let sentMsgNoFromURL = null;
		recvMsgNoFromURL = common.getUrlParameterByName(window.location.href, 'recvMsgNo')
		sentMsgNoFromURL = common.getUrlParameterByName(window.location.href, 'sentMsgNo')
		if (!!sentMsgNoFromURL)
		    index.sentMessageNo = parseInt(sentMsgNoFromURL);
		else if (!!localStorage[index.localStoragePrefix + '-sentMessageNo'])
		    index.sentMessageNo = localStorage[index.localStoragePrefix + '-sentMessageNo'];
		else
		    index.sentMessageNo = parseInt(mtUtil.acctInfo.sentMsgCount);
		if (!!recvMsgNoFromURL)
		    index.recvMessageNo = parseInt(recvMsgNoFromURL);
		else if (!!localStorage[index.localStoragePrefix + '-recvMessageNo'] && localStorage['onStartGoto'] == 'last-viewed')
		    index.recvMessageNo = localStorage[index.localStoragePrefix + '-recvMessageNo'];
		else if (localStorage['onStartGoto'] == 'first-unread' && !recvMsgNoFromURL) {
		    const maxMsgNo = parseInt(mtUtil.acctInfo.recvMsgCount);
		    const unreadMsgNo = common.findIndexedFlag(index.localStoragePrefix + 'beenRead', maxMsgNo, 1, false);
		    console.log('handleUnlockedMetaMask: unreadMsgNo = ' + unreadMsgNo);
		    index.recvMessageNo = (unreadMsgNo < 0) ? maxMsgNo : unreadMsgNo;
		} else {
		    index.recvMessageNo = parseInt(mtUtil.acctInfo.recvMsgCount);
		}
		console.log('handleUnlockedMetaMask: recvMessageNo = ' + index.recvMessageNo);
		mode = 'recv';
	    }
	    handleRegisteredAcct(mode);
	});
    });
}


//
// handle unregistered account
//
function handleUnregisteredAcct() {
    const registerButton = document.getElementById('registerButton');
    registerButton.textContent = 'Register Account';
    common.setMenuButtonState('importantInfoButton', 'Enabled');
    common.setMenuButtonState('registerButton',      'Disabled');
    common.setMenuButtonState('viewRecvButton',      'Disabled');
    common.setMenuButtonState('composeButton',       'Disabled');
    common.setMenuButtonState('viewSentButton',      'Disabled');
    common.setMenuButtonState('withdrawButton',      'Disabled');
    common.showWaitingForMetaMask(true);
    dhcrypt.initDH(null, function(err) {
	common.showWaitingForMetaMask(false);
	if (!err) {
	    common.setMenuButtonState('registerButton',   'Enabled');
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
    common.replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgRefButton',       'visibleTC', 'hidden',    true).textContent = '';
    common.replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgFeeArea',         'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('replyButton',        'visibleTC', 'hidden',    true).textContent = 'Reply';
    common.replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('attachmentButton',   'visibleIB', 'hidden',    true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    //
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    const msgListDiv = document.getElementById('msgListDiv');
    initMsgElemList(msgListDiv, null, null);
    const statusDiv = document.getElementById('statusDiv');
    common.clearStatusDiv(statusDiv);
}


//
// handle registered account
// mode = [ 'send' | 'recv' | null ]
//
function handleRegisteredAcct(mode) {
    console.log('handleRegisteredAcct: mode = ' + mode);
    //once an account has been registered we don't force the intro to run each time the dapp is loaded
    localStorage['FirstIntroCompleteFlag'] = true;
    const registerButton = document.getElementById('registerButton');
    registerButton.textContent = 'Modify Account';
    if (!!mode && !!dhcrypt.dh && mtUtil.publicKey == dhcrypt.publicKey()) {
	displayFeesAndMsgCnt();
	if (mode == 'recv')
	    handleViewRecv(true);
	else
	    handleViewSent(true);
    } else {
	const msgListDiv = document.getElementById('msgListDiv');
	initMsgElemList(msgListDiv, null, null);
	disableAllButtons();
	//prevent reloading while we're waiting for signature
	common.waitingForTxid = true;
	common.showWaitingForMetaMask(true);
	const encryptedPrivateKey = mtUtil.acctInfo.encryptedPrivateKey;
	dhcrypt.initDH(encryptedPrivateKey, function(err) {
	    common.waitingForTxid = false;
	    common.showWaitingForMetaMask(false);
	    if (!err) {
		displayFeesAndMsgCnt();
		handleViewRecv(true);
	    }
	});
    }
}


function displayFeesAndMsgCnt() {
    const totalReceivedArea = document.getElementById('totalReceivedArea');
    const feeBalanceArea = document.getElementById('feeBalanceArea');
    totalReceivedArea.value = 'Messages sent: ' + mtUtil.acctInfo.sentMsgCount + '; Messages received: ' + mtUtil.acctInfo.recvMsgCount;
    const feebalanceWei = mtUtil.acctInfo.feeBalance;
    feeBalanceArea.value = 'Unclaimed message fees: ' + ether.convertWeiBNToComfort(common.numberToBN(feebalanceWei));
    //see if new messages have been received. if yes, display new message modal until user clicks anywhere outside
    const savedNoRxMsgs = localStorage[index.localStoragePrefix + 'noRxMsgs'];
    console.log('displayFeesAndMsgCnt: savedNoRxMsgs = ' + savedNoRxMsgs);
    const currentNoRxMsgs = parseInt(mtUtil.acctInfo.recvMsgCount);
    console.log('displayFeesAndMsgCnt: currentNoRxMsgs = ' + currentNoRxMsgs);
    const deltaRxMsgCount = (!!savedNoRxMsgs) ? currentNoRxMsgs - savedNoRxMsgs : currentNoRxMsgs;
    console.log('displayFeesAndMsgCnt: deltaRxMsgCount = ' + deltaRxMsgCount);
    if (currentNoRxMsgs > 0 && deltaRxMsgCount > 0) {
	const newMsgCountNotButton = document.getElementById('newMsgCountNotButton');
	newMsgCountNotButton.textContent = deltaRxMsgCount.toString(10);
	localStorage[index.localStoragePrefix + 'noRxMsgs'] = currentNoRxMsgs.toString(10);
	const newMsgModal = document.getElementById('newMsgModal');
	newMsgModal.style.display = 'block';
    }
}


//
// handle Compose button
//
function handleCompose(acctInfo, toAddr) {
    common.setMenuButtonState('importantInfoButton', 'Enabled');
    common.setMenuButtonState('registerButton',      'Enabled');
    common.setMenuButtonState('viewRecvButton',      'Enabled');
    common.setMenuButtonState('composeButton',       'Selected');
    common.setMenuButtonState('viewSentButton',      'Enabled');
    common.setMenuButtonState('withdrawButton',      'Enabled');
    //
    if (index.elemIdx >= 0) {
	//unselect any currently selected message
	const msgElem = index.msgListElems[index.elemIdx];
	const message = !!msgElem && msgElem.message;
	if (!!message) {
	    const newSuffix = (index.listMode == 'sent' || common.chkIndexedFlag(index.localStoragePrefix + 'beenRead', message.msgNo)) ? '' : 'New';
	    msgElem.div.className = 'msgListItemDiv' + newSuffix;
	}
    }
    index.elemIdx = -1;
    //
    const msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'To: ';
    const msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = false;
    msgAddrArea.readonly = '';
    msgAddrArea.value = toAddr;
    //
    common.replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgRefButton',       'visibleTC', 'hidden',    true).textContent = '';
    common.replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('validateAddrButton', 'hidden',    'visibleTC', false);
    common.replaceElemClassFromTo('msgFeeArea',         'hidden',    'visibleTC', true).value = 'Fee: ';
    common.replaceElemClassFromTo('replyButton',        'hidden',    'visibleTC', true).textContent = 'Send';
    common.replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    //attach button will be enabled after addr is validated
    common.replaceElemClassFromTo('attachmentButton',   'hidden',    'visibleIB', true);
    common.replaceElemClassFromTo('attachmentInput',    'visibleIB', 'hidden', true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    attachmentSaveA.href = '';
    attachmentSaveA.download = '';
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
    common.clearStatusDiv(statusDiv);
}


//
// handle reply button -- this is a special compose mode
// addr should already be valid. it can be either complete addr or ens name followed by complete addr in parens
// if somehow it isn't valid, then we shunt over to handleCompose.
//
function handleReplyCompose(acctInfo, toAddr, subject, ref) {
    common.setMenuButtonState('importantInfoButton', 'Enabled');
    common.setMenuButtonState('registerButton',      'Enabled');
    common.setMenuButtonState('viewRecvButton',      'Enabled');
    common.setMenuButtonState('composeButton',       'Selected');
    common.setMenuButtonState('viewSentButton',      'Enabled');
    common.setMenuButtonState('withdrawButton',      'Enabled');
    //
    let exatractedAddr = toAddr;
    if (toAddr.indexOf('(') >= 0) {
	//for ens names, actual addr is beween parens
	exatractedAddr = toAddr.replace(/[^\(]*\(([^]*)\).*/, "$1");
	console.log('handleReplyCompose: exatractedAddr = ' + exatractedAddr);
    }
    if (!ether.validateAddr(exatractedAddr)) {
	msgTextArea.value = 'Error: invalid Ethereum address.';
	replyButton.disabled = true;
	handleCompose(mtUtil.acctInfo, exatractedAddr);
	return;
    }
    //replying to a message implies that it has been read
    if (index.elemIdx >= 0) {
	const msgElem = index.msgListElems[index.elemIdx];
	const message = !!msgElem && msgElem.message;
	if (!!message) {
	    console.log('handleReplyCompose: listmode = ' + index.listMode + ', msgId = ' + message.msgId + ', ref = ' + ref);
	    if (index.listMode.indexOf('recv') >= 0 && message.msgId == ref) {
		common.setIndexedFlag(index.localStoragePrefix + 'beenRead', message.msgNo, true);
	    }
	    msgElem.div.className = 'msgListItemDiv';
	}
    }
    index.elemIdx = -1;
    //
    mtEther.accountQuery(exatractedAddr, function(err, toAcctInfo) {
	const toPublicKey = (!!toAcctInfo) ? toAcctInfo.publicKey : null;
	if (!toPublicKey || toPublicKey == '0x') {
	    msgTextArea.value = 'Error: no account was found for this address.';
	    replyButton.disabled = true;
	    handleCompose(mtUtil.acctInfo, exatractedAddr);
	    return;
	}
	const msgPromptArea = document.getElementById('msgPromptArea');
	msgPromptArea.value = 'To: ';
	const msgAddrArea = document.getElementById('msgAddrArea');
	msgAddrArea.disabled = true;
	msgAddrArea.readonly = 'readonly';
	msgAddrArea.value = toAddr;
	//
	common.replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
	common.replaceElemClassFromTo('msgRefButton',       'hidden',    'visibleTC', true);
	common.replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
	common.replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
	common.replaceElemClassFromTo('msgFeeArea',         'hidden',    'visibleTC', true).value = 'Fee: ';
	common.replaceElemClassFromTo('replyButton',        'hidden',    'visibleTC', false).textContent = 'Send';
	common.replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
	common.replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
	common.replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
	//attach button can be enabled, since addr is already validated
	common.replaceElemClassFromTo('attachmentButton',   'hidden',    'visibleIB', false);
	common.replaceElemClassFromTo('attachmentInput',    'visibleIB', 'hidden', true);
	const attachmentSaveA = document.getElementById('attachmentSaveA');
	attachmentSaveA.style.display = 'none';
	attachmentSaveA.href = '';
	attachmentSaveA.download = '';
	//
	showIdAndRef('', ref, false);
	const msgTextArea = document.getElementById('msgTextArea');
	msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
	msgTextArea.value = (!!subject) ? subject : '';
	msgTextArea.disabled = false;
	msgTextArea.readonly = '';
	msgTextArea.placeholder='Type your message here...';
	const statusDiv = document.getElementById('statusDiv');
	common.clearStatusDiv(statusDiv);
	//fees: see how many messages have been sent from the proposed recipient to me
	mtEther.getPeerMessageCount(exatractedAddr, common.web3.eth.accounts[0], function(err, msgCount) {
	    console.log('handleReplyCompose: ' + msgCount.toString(10) + ' messages have been sent from ' + exatractedAddr + ' to me');
	    const fee = (msgCount > 0) ? toAcctInfo.msgFee : toAcctInfo.spamFee;
	    msgFeeArea.value = 'Fee: ' + ether.convertWeiBNToComfort(common.numberToBN(fee));
	});
    });
}


function handleRegister() {
    const halfFinneyBN = (new BN(ether.finneyHex, 16)).divn(2);
    const hundredSzaboBN = (new BN(ether.szaboHex, 16)).muln(100);
    const hundreds = (index.etherPrice > 50) ? Math.floor(parseInt(index.etherPrice) / 100) : 1;
    let suggestedMsgFeeBN = halfFinneyBN.divn(hundreds);
    suggestedMsgFeeBN = suggestedMsgFeeBN.div(hundredSzaboBN);
    suggestedMsgFeeBN.imul(hundredSzaboBN);
    let suggestedSpamFeeBN = suggestedMsgFeeBN.muln(10);
    console.log('suggestedMsgFeeBN = ' + ether.convertWeiBNToComfort(suggestedMsgFeeBN) + ', suggestedSpamFeeBN = ' + ether.convertWeiBNToComfort(suggestedSpamFeeBN));
    let msgFeeBN = suggestedMsgFeeBN;
    let spamFeeBN = suggestedSpamFeeBN;
    //
    common.setMenuButtonState('importantInfoButton', 'Enabled');
    common.setMenuButtonState('registerButton',      'Selected');
    if (!!mtUtil.acctInfo.isValid) {
	common.setMenuButtonState('viewRecvButton',      'Enabled');
	common.setMenuButtonState('composeButton',       'Enabled');
	common.setMenuButtonState('viewSentButton',      'Enabled');
	common.setMenuButtonState('withdrawButton',      'Enabled');
	msgFeeBN = common.numberToBN(mtUtil.acctInfo.msgFee);
	spamFeeBN = common.numberToBN(mtUtil.acctInfo.spamFee);
    } else {
	common.setMenuButtonState('viewRecvButton',      'Disabled');
	common.setMenuButtonState('composeButton',       'Disabled');
	common.setMenuButtonState('viewSentButton',      'Disabled');
	common.setMenuButtonState('withdrawButton',      'Disabled');
    }
    //
    if (index.elemIdx >= 0) {
	const msgElem = index.msgListElems[index.elemIdx];
	const message = !!msgElem && msgElem.message;
	if (!!message)
	    msgElem.div.className = 'msgListItemDiv';
    }
    index.elemIdx = -1;
    //
    document.getElementById('suggestedMsgFee').textContent = ether.convertWeiBNToComfort(suggestedMsgFeeBN);
    document.getElementById('suggestedSpamFee').textContent = ether.convertWeiBNToComfort(suggestedSpamFeeBN);
    const msgFeeNumberAndUnits = ether.convertWeiBNToNumberAndUnits(msgFeeBN);
    const spamFeeNumberAndUnits = ether.convertWeiBNToNumberAndUnits(spamFeeBN);
    document.getElementById('messageFeeInput').value = msgFeeNumberAndUnits.number;
    document.getElementById('spamFeeInput').value = spamFeeNumberAndUnits.number;
    document.getElementById('messageFeeUnits').selectedIndex = msgFeeNumberAndUnits.index;
    document.getElementById('spamFeeUnits').selectedIndex = spamFeeNumberAndUnits.index;
    //
    const msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'Addr: ';
    const msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly = "readonly"
    msgAddrArea.value = (!!index.accountEnsName) ? index.accountEnsName + ' (' +  index.account + ')' : index.account;
    //
    common.replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgRefButton',       'visibleTC', 'hidden',    true).textContent = '';
    common.replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgFeeArea',         'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('replyButton',        'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('registerDiv',        'hidden',    'visibleIB', true);
    common.replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('attachmentButton',   'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('attachmentInput',    'visibleIB', 'hidden',    true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    //
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('visibleIB', 'hidden');
    msgTextArea.disabled = true;
    const statusDiv = document.getElementById('statusDiv');
    common.clearStatusDiv(statusDiv);
}


function handleRegisterSubmit() {
    console.log('handleRegisterSubmit');
    const registerDiv = document.getElementById('registerDiv');
    const messageFeeInput = document.getElementById('messageFeeInput');
    const messageFee = common.stripNonNumber(messageFeeInput.value, true);
    messageFeeInput.value = messageFee;
    const spamFeeInput = document.getElementById('spamFeeInput');
    const spamFee = common.stripNonNumber(spamFeeInput.value, true);
    spamFeeInput.value = spamFee;
    const messageFeeUnits = document.getElementById('messageFeeUnits');
    const spamFeeUnits = document.getElementById('spamFeeUnits');
    console.log('message fee = ' + messageFee + ' X ' + messageFeeUnits.value + ', spam fee = ' + spamFee + ' X ' + spamFeeUnits.value);
    const messageFeeBN = common.decimalAndUnitsToBN(messageFee, messageFeeUnits.value);
    const spamFeeBN = common.decimalAndUnitsToBN(spamFee, spamFeeUnits.value);
    disableAllButtons();
    common.showWaitingForMetaMask(true);
    const continueFcn = () => {
	common.waitingForTxid = false;
	common.clearStatusDiv();
	handleUnlockedMetaMask('recv');
    };
    if (!!mtUtil.acctInfo.isValid) {
	mtEther.modifyAccount(messageFeeBN, spamFeeBN, function(err, txid) {
	    console.log('handleRegisterSubmit: err = ' + err);
	    console.log('handleRegisterSubmit: txid = ' + txid);
	    common.showWaitingForMetaMask(false);
	    common.waitForTXID(err, txid, 'Modify-Account', continueFcn, ether.etherscanioTxStatusHost, null);
	});
    } else {
	const publicKey = dhcrypt.publicKey();
	const encryptedPrivateKey = dhcrypt.encryptedPrivateKey();
	mtEther.register(messageFeeBN, spamFeeBN, publicKey, encryptedPrivateKey, function(err, txid) {
	    console.log('handleRegisterSubmit: err = ' + err);
	    console.log('handleRegisterSubmit: txid = ' + txid);
	    common.showWaitingForMetaMask(false);
	    common.waitForTXID(err, txid, 'Register', continueFcn, ether.etherscanioTxStatusHost, function() {
		//once he has registered we stop showing the intro automatically each time the page is loaded
		//note: we get the cb from waitForTXID as soon as the tx completes.
		localStorage['FirstIntroCompleteFlag'] = true;
	    });
	});
    }
}


function handleWithdraw() {
    common.setMenuButtonState('importantInfoButton', 'Enabled');
    common.setMenuButtonState('registerButton',      'Enabled');
    common.setMenuButtonState('viewRecvButton',      'Enabled');
    common.setMenuButtonState('composeButton',       'Enabled');
    common.setMenuButtonState('viewSentButton',      'Enabled');
    common.setMenuButtonState('withdrawButton',      'Selected');
    //
    if (index.elemIdx >= 0) {
	const msgElem = index.msgListElems[index.elemIdx];
	const message = !!msgElem && msgElem.message;
	if (!!message)
	    msgElem.div.className = 'msgListItemDiv';
    }
    index.elemIdx = -1;
    //
    const msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'Addr: ';
    const msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly = "readonly"
    msgAddrArea.value = (!!index.accountEnsName) ? index.accountEnsName + ' (' +  index.account + ')' : index.account;
    //
    common.replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgRefButton',       'visibleTC', 'hidden',    true).textContent = '';
    common.replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgFeeArea',         'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('replyButton',        'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('navButtonsSpan',     'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('attachmentButton',   'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('attachmentInput',    'visibleIB', 'hidden',    true);
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
    disableAllButtons();
    common.showWaitingForMetaMask(true);
    mtEther.withdraw(function(err, txid) {
	console.log('txid = ' + txid);
	common.showWaitingForMetaMask(false);
	const continueFcn = () => {
	    common.waitingForTxid = false;
	    common.clearStatusDiv();
	    handleUnlockedMetaMask('recv');
	};
	common.waitForTXID(err, txid, 'Withdraw', continueFcn, ether.etherscanioTxStatusHost, null);
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
function handleViewRecv(refreshMsgList) {
    console.log('handleViewRecv: refreshMsgList = ' + refreshMsgList + ', recvMessageNo = ' + index.recvMessageNo);
    common.setMenuButtonState('importantInfoButton', 'Enabled');
    common.setMenuButtonState('registerButton',      'Enabled');
    common.setMenuButtonState('viewRecvButton',      'Selected');
    common.setMenuButtonState('composeButton',       'Enabled');
    common.setMenuButtonState('viewSentButton',      refreshMsgList ? 'Disabled' : 'Enabled');
    common.setMenuButtonState('withdrawButton',      'Enabled');
    //
    const msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'From: ';
    const msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly = "readonly"
    msgAddrArea.value = '';
    //
    common.replaceElemClassFromTo('msgIdArea',          'hidden',    'visibleTC', true).value = 'Msg ID: N/A';
    common.replaceElemClassFromTo('msgRefButton',       'hidden',    'visibleTC', true).textContent = 'Ref: N/A';
    common.replaceElemClassFromTo('msgDateArea',        'hidden',    'visibleTC', true).value = '';
    common.replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgFeeArea',         'visibleTC', 'hidden',    true);
    //we'll set this to enabled after we have a valid message displayed
    common.replaceElemClassFromTo('replyButton',        'hidden',    'visibleTC', true).textContent = 'Reply';
    common.replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('markReadButton',     'hidden',    'visibleIB', false);
    if (refreshMsgList)
	common.replaceElemClassFromTo('navButtonsSpan', 'visibleIB', 'hidden',    true);
    else
	common.replaceElemClassFromTo('navButtonsSpan', 'hidden',    'visibleIB', true);
    common.replaceElemClassFromTo('attachmentButton',   'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('attachmentInput',    'visibleIB', 'hidden',    true);
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
    common.clearStatusDiv(statusDiv);
    //
    const msgListHeaderAddr = document.getElementById('msgListHeaderAddr');
    msgListHeaderAddr.value = 'From';
    if (!!refreshMsgList) {
	index.listMode = 'recv';
	refreshMessages(true, function(clearMsgElems) {
	    const maxMsgNo = parseInt(mtUtil.acctInfo.recvMsgCount);
	    const newIdx = maxMsgNo - index.recvMessageNo;
	    const msgListDiv = document.getElementById('msgListDiv');
	    initMsgElemList(msgListDiv, index.rxMessages, true);
	    populateMsgList(newIdx, function() {
		selectMsgListEntry(newIdx, function() {
		    const msgElem = index.msgListElems[newIdx];
		    (!!msgElem) && msgElem.div.scrollIntoView({ block: "nearest" });
		    console.log('handleViewRecv: enabling mav buttons...');
		    common.setMenuButtonState('viewRecvButton', 'Selected');
		    common.setMenuButtonState('viewSentButton', 'Enabled');
		    common.replaceElemClassFromTo('nextUnreadButton', 'hidden', 'visibleIB', false);
		    common.replaceElemClassFromTo('prevUnreadButton', 'hidden', 'visibleIB', false);
		    common.replaceElemClassFromTo('navButtonsSpan', 'hidden', 'visibleIB', true);
		});
	    });
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
function handleViewSent(refreshMsgList) {
    common.setMenuButtonState('importantInfoButton', 'Enabled');
    common.setMenuButtonState('registerButton',      'Enabled');
    common.setMenuButtonState('viewRecvButton',      refreshMsgList ? 'Disabled' : 'Enabled');
    common.setMenuButtonState('composeButton',       'Enabled');
    common.setMenuButtonState('viewSentButton',      'Selected');
    common.setMenuButtonState('withdrawButton',      'Enabled');
    //
    const msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'To: ';
    const msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly = "readonly"
    msgAddrArea.value = '';
    //
    common.replaceElemClassFromTo('msgIdArea',          'hidden',    'visibleTC', true).value = 'Msg ID: N/A';
    common.replaceElemClassFromTo('msgRefButton',       'hidden',    'visibleTC', true).textContent = 'Ref: N/A';
    common.replaceElemClassFromTo('msgDateArea',        'hidden',    'visibleTC', true).value = '';
    common.replaceElemClassFromTo('validateAddrButton', 'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgFeeArea',         'visibleTC', 'hidden',    true);
    //we'll set this to enabled after we have a valid message displayed
    common.replaceElemClassFromTo('replyButton',        'hidden',    'visibleTC', true).textContent = 'Send again';
    common.replaceElemClassFromTo('registerDiv',        'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('markReadButton',     'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('nextUnreadButton',   'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('prevUnreadButton',   'visibleIB', 'hidden',    true);
    if (refreshMsgList)
	common.replaceElemClassFromTo('navButtonsSpan', 'visibleIB', 'hidden',    true);
    else
	common.replaceElemClassFromTo('navButtonsSpan', 'hidden',    'visibleIB', true);
    common.replaceElemClassFromTo('attachmentButton',   'visibleIB', 'hidden',    true);
    common.replaceElemClassFromTo('attachmentInput',    'visibleIB', 'hidden',    true);
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
    common.clearStatusDiv(statusDiv);
    //
    const msgListHeaderAddr = document.getElementById('msgListHeaderAddr');
    msgListHeaderAddr.value = 'To: ';
    if (!!refreshMsgList) {
	index.listMode = 'sent';
	refreshMessages(false, function(clearMsgElems) {
	    const maxMsgNo = parseInt(mtUtil.acctInfo.sentMsgCount);
	    const newIdx = Math.max(maxMsgNo - index.sentMessageNo, 0);
	    const msgListDiv = document.getElementById('msgListDiv');
	    initMsgElemList(msgListDiv, index.txMessages, false);
	    populateMsgList(newIdx, function() {
		selectMsgListEntry(newIdx, function() {
		    const msgElem = index.msgListElems[newIdx];
		    (!!msgElem) && msgElem.div.scrollIntoView({ block: "nearest" });
		    common.setMenuButtonState('viewRecvButton', 'Enabled');
		    common.setMenuButtonState('viewSentButton', 'Selected');
		    common.replaceElemClassFromTo('navButtonsSpan', 'hidden', 'visibleIB', true);
		});
	    });
	});
    }
}


//
// cb(clearElemsFlag)
//
function refreshMessages(isRx, cb) {
    mtEther.accountQuery(common.web3.eth.accounts[0], function(err, _acctInfo) {
	//TODO: verify that acct has not changed!
	if (!!err || !_acctInfo) {
	    alert('Error refreshing account info: err');
	    beginTheBeguine('null');
	    return;
	}
	if (isRx) {
	    const recvCntNew = parseInt(_acctInfo.recvMsgCount);
	    const recvCntOld = parseInt(mtUtil.acctInfo.recvMsgCount);
	    console.log('refreshMessages: recvCntNew = ' + recvCntNew + ', recvCntOld = ' + recvCntOld);
	    if (recvCntNew == recvCntOld) {
		cb(false);
	    } else {
		mtUtil.acctInfo.recvMsgCount = recvCntNew;
		displayFeesAndMsgCnt();
		getNewMessages(isRx, recvCntOld, recvCntNew, () => cb(true));
	    }
	} else {
	    const sentCntNew = parseInt(_acctInfo.sentMsgCount);
	    const sentCntOld = parseInt(mtUtil.acctInfo.sentMsgCount);
	    if (sentCntNew == sentCntOld) {
		cb(false);
	    } else {
		mtUtil.acctInfo.sentMsgCount = sentCntNew;
		displayFeesAndMsgCnt();
		getNewMessages(isRx, sentCntOld, sentCntNew, () => cb(true));
	    }
	}
    });
}


//
// create sufficient message list elements to accomodate the current scroll position
// the elements will be populated (ie. filled-in) asyncrhonously via makeMsgListEntries
//
// if minElemIdx is set, then we continue populating at least until we have retreived that idx
//
function populateMsgList(minElemIdx, cb) {
    console.log('populateMsgList');
    const isRx = (index.listMode == 'recv') ? true : false;
    const msgListDiv = document.getElementById('msgListDiv');
    const getMsgIdsFcn = (isRx) ? mtUtil.getRecvMsgIds : mtUtil.getSentMsgIds;
    const maxMsgNo = (isRx) ? parseInt(mtUtil.acctInfo.recvMsgCount) : parseInt(mtUtil.acctInfo.sentMsgCount);
    let callDepth = 0;
    let callCount = 0;
    const retrievingMsgsModal = document.getElementById('retrievingMsgsModal');
    for (let j = 0; j < 100; ++j) {
	//scrollHeight is the entire height, including the part of the elem that is now viewable because it is scrolled
	//scrollTop is a measurement of the distance from the element's top to its topmost visible content
        console.log('scroll: scrollHeight = ' + msgListDiv.scrollHeight + ', scrollTop = ' + msgListDiv.scrollTop + ', clientHeight = ' + msgListDiv.clientHeight);
	if (index.msgListElems.length >= maxMsgNo)
            break;
	else if (!!minElemIdx && index.msgListElems.length < minElemIdx + 1)
	    ;
        else if (msgListDiv.scrollHeight > msgListDiv.scrollTop + msgListDiv.clientHeight + 50)
            break;
	if (callDepth == 0) {
	    retrievingMsgsModal.style.display = 'block';
	    common.setLoadingIcon('start');
	}
	++callCount;
	++callDepth;
	const firstElemIdx = index.msgListElems.length;
	const fastStartLimit = (index.msgListElems.length > 12) ? 9 : 6;
	const noElems = Math.min(fastStartLimit, maxMsgNo - index.msgListElems.length);
	const lastElemIdx = firstElemIdx + noElems - 1;
	const startMsgNo = elemIdxToMsgNo(isRx, lastElemIdx);
        console.log('populateMsgList: msgListElems.length = ' + index.msgListElems.length + ', noElems = ' + noElems);
	for (let elemIdx = firstElemIdx; elemIdx <= lastElemIdx; ++elemIdx) {
	    const msgNo = elemIdxToMsgNo(isRx, elemIdx);
	    const msgElem = makeMsgListElem(msgNo);
	    msgElem.elemIdx = elemIdx;
	    index.msgListElems.push(msgElem);
	    msgListDiv.appendChild(msgElem.div);
	}
	getMsgIdsFcn(common.web3.eth.accounts[0], startMsgNo - 1, noElems, function(err, msgIds) {
	    console.log('populateMsgList: got ids, startMsgNo = ' + startMsgNo + ', firstElemIdx = ' + firstElemIdx + ', lastElemIdx = ' + lastElemIdx);
	    if (!!err || !msgIds || msgIds.length < noElems) {
		console.log('populateMsgList: err = ' + err);
		alert('error retrieving message ids: ' + err);
		retrievingMsgsModal.style.display = 'none';
		common.setLoadingIcon(null);
		cb();
		return;
	    }
	    const t = [];
	    console.log('populateMsgList: calling getMessages(0, ' + startMsgNo + ', ' + t + ')');
	    getMessages(msgIds, 0, startMsgNo, t, function(tempMessages) {
		console.log('populateMsgList: got ' + Object.keys(tempMessages).length + ' messages');
		for (let elemIdx = firstElemIdx; elemIdx <= lastElemIdx; ++elemIdx) {
		    const msgElem = index.msgListElems[elemIdx];
		    const message = tempMessages[msgElem.msgNo];
		    if (!!message)
			fillInMsgListEntry(elemIdx, message)
		}
		if (--callDepth <= 0) {
		    retrievingMsgsModal.style.display = 'none';
		    common.setLoadingIcon(null);
		    cb();
		}
	    });
	});
    }
    if (callCount == 0)
	cb();
}


//
// add new entries to rxMessages or txMessages. the messages are not displayed
//
function getNewMessages(isRx, oldMaxMsgNo, newMaxMsgNo, cb) {
    let callDepth = 0;
    let callCount = 0;
    let newMsgCount = 0;
    const messages = isRx ? index.rxMessages : index.txMessages;
    const getMsgIdsFcn = isRx ? mtUtil.getRecvMsgIds : mtUtil.getSentMsgIds;
    const retrievingMsgsModal = document.getElementById('retrievingMsgsModal');
    console.log('getNewMessages: isRx = ' + isRx + ', oldMaxMsgNo = ' + oldMaxMsgNo + ', newMaxMsgNo = ' + newMaxMsgNo);
    while (oldMaxMsgNo + newMsgCount < newMaxMsgNo) {
	if (callDepth == 0) {
	    retrievingMsgsModal.style.display = 'block';
	    common.setLoadingIcon('start');
	}
	++callCount;
	++callDepth;
	console.log('getNewMessages: callCount = ' + callCount + ', callDepth = ' + callDepth);
	const noElems = Math.min(9, newMaxMsgNo - (oldMaxMsgNo + newMsgCount));
	console.log('getNewMessages: noElems = ' + noElems);
	const startMsgNo = oldMaxMsgNo + newMsgCount + 1;
	console.log('getNewMessages: startMsgNo = ' + startMsgNo);
	newMsgCount += noElems;
	getMsgIdsFcn(common.web3.eth.accounts[0], startMsgNo - 1, noElems, function(err, msgIds) {
	    console.log('getNewMessages: got ids, startMsgNo = ' + startMsgNo);
	    if (!!err || !msgIds || msgIds.length < noElems) {
		console.log('populateMsgList: err = ' + err);
		alert('error retrieving message ids: ' + err);
		retrievingMsgsModal.style.display = 'none';
		common.setLoadingIcon(null);
		cb();
		return;
	    }
	    getMessages(msgIds, 0, startMsgNo, [], function(tempMessages) {
		if (--callDepth <= 0) {
		    retrievingMsgsModal.style.display = 'none';
		    common.setLoadingIcon(null);
		    cb();
		}
	    });
	});
    }
    if (callCount == 0)
	cb();
}


//
// get messages corresponding to the passed msgIds[], which are numbered sequentially from msgNo
// each recursive call retrieves up to three messages
//
// msgIds: array of message ID's
// idIdx: current index into msgIds[]
// msgNo: message number of msgIds[idIdx]
// messages are placed to tempMessages[msgNo]
// messages that are sucessfully decrypted are also placed to {tx,rx}Messages
// cb(tempMessages): callback when all done
//
function getMessages(msgIds, idIdx, msgNo, tempMessages, cb) {
    console.log('getMessages: msgIds = ' + msgIds.toString() + ', msgIds.length = ' + msgIds.length + ', idIdx = ' + idIdx + ', msgNo = ' + msgNo);
    const isRx = (index.listMode == 'recv') ? true : false;
    if (idIdx >= msgIds.length || common.numberToBN(msgIds[idIdx]).isZero()) {
	const maxMsgNo = (isRx) ? parseInt(mtUtil.acctInfo.recvMsgCount) : parseInt(mtUtil.acctInfo.sentMsgCount);
	for (; idIdx < msgIds.length && msgNo <= maxMsgNo; ++idIdx, ++msgNo) {
	    const addr = (msgNo <= maxMsgNo) ? 'Message data unavailable...' : '';
	    const message = new Message(isRx, '', msgNo, addr, '', '', '', '', '', null);
	    tempMessages[msgNo] = message;
	}
	cb(tempMessages);
	return;
    }
    const threeMsgIds = [];
    const msgCookies = {};
    for (let i = 0; i < 3 && idIdx < msgIds.length; ++i, ++idIdx, ++msgNo) {
	if (common.numberToBN(msgIds[idIdx]).isZero())
	    break;
	console.log('getMessages: msgId = ' + msgIds[idIdx]);
	const msgCookie = { idIdx: idIdx, msgNo: msgNo };
	const msgId = msgIds[idIdx];
	threeMsgIds.push(msgId);
	msgCookies[msgId] = msgCookie;
    }
    //gets up to 3 log entries; second cb when all done
    let msgsToDisplay = 4;
    let noMsgsDisplayed = 0;
    const messages = isRx ? index.rxMessages : index.txMessages;
    const msgCompleteFcn = (source, err) => {
	if (++noMsgsDisplayed >= msgsToDisplay) {
	    console.log('getMessages: got msgCb, ' + source + ', err = ' + err + ', msgsToDisplay = ' + msgsToDisplay + ', noMsgsDisplayed = ' + noMsgsDisplayed);
	    (idIdx < msgIds.length) ? getMessages(msgIds, idIdx, msgNo, tempMessages, cb) : cb(tempMessages);
	}
    };
    mtUtil.getAndParseIdMsgs(threeMsgIds, msgCookies, function(err, msgCookie, msgId, fromAddr, toAddr, viaAddr, txCount, rxCount, attachmentIdxBN, ref, msgHex, blockNumber, date) {
	console.log('getMessages: getAndParseIdMsgs returns, err = ' + err);
	if (!!err || !fromAddr) {
	    err = 'Message data not found';
	    if (!!msgCookie) {
		const message = new Message(isRx, msgIds[msgCookie.idIdx], '', '', '', '', '', err, null);
		tempMessages[msgCookie.msgNo] = message;
	    }
	    msgCompleteFcn('getAndParseIdMsgs', err);
	    return;
	}
	console.log('getMessages: got msgId = ' + msgId + ', msgNo = ' + msgCookie.msgNo + ', attachmentIdxBN = ' + attachmentIdxBN.toString(16));
	const otherAddr = (isRx) ? fromAddr : toAddr;
	mtUtil.decryptMsg(otherAddr, fromAddr, toAddr, txCount, msgHex, attachmentIdxBN, (err, messageText, attachment) => {
	    if (!!err) {
		const message = new Message(isRx, msgId, '', '', '', '', '', 'message decryption error' + err, null);
		tempMessages[msgCookie.msgNo] = message;
		msgCompleteFcn('decryptMsg', err);
		return;
	    }
	    console.log('getMessages: msgId = ' + msgId + ', text = ' + messageText + ', attachment = ' + attachment);
	    const message = new Message(isRx, msgId, msgCookie.msgNo, otherAddr, viaAddr, date, ref, messageText, attachment);
	    messages[msgCookie.msgNo] = message;
	    tempMessages[msgCookie.msgNo] = message;
	    ether.ensReverseLookup(otherAddr, function(err, name) {
		if (!err && !!name)
		    message.ensName = name;
		msgCompleteFcn('ensReverseLookup', null);
	    });
	});
    }, function(noMsgsProcessed) {
	console.log('getMessages: got doneCb. idIdx = ' + idIdx + ', noMsgsProcessed = ' + noMsgsProcessed + ', noMsgsDisplayed = ' + noMsgsDisplayed);
	msgsToDisplay = noMsgsProcessed;
	if (noMsgsDisplayed >= msgsToDisplay)
	    (idIdx < msgIds.length) ? getMessages(msgIds, idIdx, msgNo, tempMessages, cb) : cb(tempMessages);
    });
}


function fillInMsgListEntry(elemIdx, message) {
    console.log('fillInMsgListEntry: elemIdx = ' + elemIdx + ', msgNo = ' + message.msgNo);
    const msgElem = index.msgListElems[elemIdx];
    fillMsgListElem(msgElem, message);
    const viewRecvButton = document.getElementById('viewRecvButton');
    const viewSentButton = document.getElementById('viewSentButton');
    if ((message.msgNo != 0 && elemIdx == index.elemIdx                                                                                          ) &&
	(viewRecvButton.className.indexOf('menuBarButtonSelected') >= 0 || viewSentButton.className.indexOf('menuBarButtonSelected') >= 0) ) {
	console.log('fillInMsgListEntry: calling showMsgDetail(msgNo = ' + message.msgNo + ')');
	showMsgDetail(message);
    }
}


function selectMsgListEntry(newIdx, cb) {
    console.log('selectMsgListEntry: newIdx = ' + newIdx + ', index.elemIdx = ' + index.elemIdx + ', msgListElems.length = ' + index.msgListElems.length);
    if (newIdx != index.elemIdx) {
	if (index.elemIdx >= 0) {
	    const oldMsgNo = index.msgListElems[index.elemIdx].msgNo;
	    const newSuffix = (index.listMode == 'sent' || common.chkIndexedFlag(index.localStoragePrefix + 'beenRead', oldMsgNo)) ? '' : 'New';
	    console.log('selectMsgListEntry: changing index.msgListElems[' + index.elemIdx + '].div).className from ' + index.msgListElems[index.elemIdx].div.className);
	    console.log('selectMsgListEntry: to msgListItemDivSelected' + newSuffix);
	    (index.msgListElems[index.elemIdx].div).className = 'msgListItemDiv' + newSuffix;
	}
	if (newIdx >= index.msgListElems.length) {
	    index.elemIdx = -1;
	    const maxMsgNo = (index.listMode == 'recv') ? parseInt(mtUtil.acctInfo.recvMsgCount) : parseInt(mtUtil.acctInfo.sentMsgCount);
	    if (maxMsgNo == 0) {
		cb();
		return;
	    }
	    if (newIdx >= maxMsgNo)
		alert('attempted to access a non-existant message');
	    else
		populateMsgList(newIdx, function() {
		    console.log('selectMsgListEntry: recursive call newIdx = ' + newIdx + ', index.elemIdx = ' + index.elemIdx + ', msgListElems.length = ' + index.msgListElems.length);
		    selectMsgListEntry(newIdx, cb);
		});
	    return;
	}
	index.elemIdx = newIdx;
	if (index.elemIdx >= 0) {
	    const msgNo = index.msgListElems[index.elemIdx].msgNo;
	    const newSuffix = (index.listMode == 'sent' || common.chkIndexedFlag(index.localStoragePrefix + 'beenRead', msgNo)) ? '' : 'New';
	    console.log('selectMsgListEntry: changing index.msgListElems[' + index.elemIdx + '].div).className from ' + index.msgListElems[index.elemIdx].div.className);
	    console.log('selectMsgListEntry: to msgListItemDivSelected' + newSuffix);
	    (index.msgListElems[index.elemIdx].div).className = 'msgListItemDivSelected' + newSuffix;
	    const markReadButton = document.getElementById('markReadButton');
	    markReadButton.textContent = (!!newSuffix) ? 'Mark as Read' : 'Mark as Unread';
	    const msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
	    index[msgNoCounter] = msgNo;
	    localStorage[index.localStoragePrefix + '-' + index.listMode + 'MessageNo'] = msgNo;
	}
	enablePrevNextButtons();
    }
    const viewRecvButton = document.getElementById('viewRecvButton');
    const viewSentButton = document.getElementById('viewSentButton');
    if (viewRecvButton.className.indexOf('menuBarButtonSelected') >= 0 || viewSentButton.className.indexOf('menuBarButtonSelected') >= 0) {
	if (index.elemIdx >= 0 && index.elemIdx < index.msgListElems.length) {
	    const msgElem = index.msgListElems[index.elemIdx];
	    const message = !!msgElem && msgElem.message;
	    const msgNo = !!msgElem && msgElem.msgNo;
	    //if the message hasn't been retreived yet then it will be displayed in fillInMsgListEntry
	    if (!!message) {
		console.log('selectMsgListEntry: calling showMsgDetail(msgNo = ' + msgNo + ')');
		showMsgDetail(message);
	    } else {
		console.log('selectMsgListEntry: msg detail is not available yet for msgNo = ' + message.msgNo);
	    }
	}
    }
    if (!!cb)
	cb();
}

//
// enable/disable prev and next buttons depending on the currently select msgElem
//
function enablePrevNextButtons() {
    const maxMsgNo = (index.listMode == 'recv') ? parseInt(mtUtil.acctInfo.recvMsgCount) : parseInt(mtUtil.acctInfo.sentMsgCount);
    const prevMsgButton = document.getElementById('prevMsgButton');
    const nextMsgButton = document.getElementById('nextMsgButton');
    const prevPageButton = document.getElementById('prevPageButton');
    const nextPageButton = document.getElementById('nextPageButton');
    prevMsgButton.disabled = (index.elemIdx > 0)        ? false : true;
    nextMsgButton.disabled = (index.elemIdx < maxMsgNo) ? false : true;
    prevPageButton.disabled = (index.elemIdx > 10)      ? false : true;
    nextPageButton.disabled = (index.elemIdx < (Math.floor((maxMsgNo - 1) / 10) * 10) + 1) ? false : true;
}


//
// cb(err)
// display the message in the msgTextArea. also displays the msgId, ref, date & msgNo
// msgNo is either txCount or rxCount depending on whether the message was sent or received
//
function showMsgDetail(message) {
    console.log('showMsg: enter');
    const msgAddrArea = document.getElementById('msgAddrArea');
    const msgTextArea = document.getElementById('msgTextArea');
    const msgNoNotButton = document.getElementById('msgNoNotButton');
    msgAddrArea.disabled = true;
    msgTextArea.disabled = true;
    msgAddrArea.value = (!!message.ensName) ? message.ensName + ' (' +  message.addr + ')' : message.addr;
    showIdAndRef(message.msgId, message.ref, true);
    msgDateArea.value = message.date;
    msgNoNotButton.textContent = parseInt(message.msgNo).toString(10);
    msgTextArea.value = message.text;
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    if (!!message.attachment) {
	attachmentSaveA.href = message.attachment.blob;
	attachmentSaveA.download = message.attachment.name;
	const attachmentSaveSpan = document.getElementById('attachmentSaveSpan');
	attachmentSaveSpan.textContent = message.attachment.name;
	attachmentSaveA.style.display = 'inline-block';
    } else {
	attachmentSaveA.style.display = 'none';
    }
    const replyButton = document.getElementById('replyButton');
    replyButton.disabled = false;
}


//
// (re)initialize the message elements list
// clears all msgElems from the passed listDiv.
// if messages[] is non-null, then create a new set of elems from the passed messages
//
function initMsgElemList(listDiv, messages, isRx) {
    console.log('initMsgElemList');
    while (listDiv.hasChildNodes()) {
	const child = listDiv.lastChild;
	if (!!child.id && child.id.startsWith("msgListHeader"))
	    break;
	listDiv.removeChild(child);
    }
    index.msgListElems = [];
    index.elemIdx = -1;
    if (!!messages && messages.length > 0) {
	const maxMsgNo = (!!isRx) ? parseInt(mtUtil.acctInfo.recvMsgCount) : parseInt(mtUtil.acctInfo.sentMsgCount);
	for (let i = 0; i < messages.length; ++i) {
	    const elemIdx = index.msgListElems.length;
	    const msgNo = maxMsgNo - elemIdx;
	    if (!!messages[msgNo]) {
		const msgElem = makeMsgListElem(msgNo);
		msgElem.elemIdx = elemIdx;
		index.msgListElems.push(msgElem);
		fillMsgListElem(msgElem, messages[msgNo]);
		listDiv.appendChild(msgElem.div);
	    }
	}
    }
}


//
// create an empty message list element
// the element is empty. it needs to be filled in... it is not added to any list
//
function makeMsgListElem(msgNo) {
    console.log('makeMsgListElem');
    let div, msgNoArea, addrArea, subjectArea, dateArea, msgIdArea;
    div = document.createElement("div");
    div.className = 'msgListItemDiv';
    msgNoArea = document.createElement("textarea");
    msgNoArea.className = 'msgListMsgNoArea';
    msgNoArea.rows = 1;
    msgNoArea.readonly = 'readonly';
    msgNoArea.disabled = 'disabled';
    msgNoArea.value = '';
    addrArea = document.createElement("textarea");
    addrArea.className = 'msgListAddrArea';
    addrArea.rows = 1;
    addrArea.readonly = 'readonly';
    addrArea.disabled = 'disabled';
    addrArea.value = '';
    viaDiv = document.createElement("div");
    viaDiv.className = 'msgListViaDiv tooltip';
    dateArea = document.createElement("textarea");
    dateArea.className = 'msgListDateArea';
    dateArea.rows = 1;
    dateArea.readonly = 'readonly';
    dateArea.disabled = 'disabled';
    dateArea.value = '';
    msgIdArea = document.createElement("textarea");
    msgIdArea.className = 'msgListMsgIdArea';
    msgIdArea.rows = 1;
    msgIdArea.readonly = 'readonly';
    msgIdArea.disabled = 'disabled';
    msgIdArea.value = '';
    subjectArea = document.createElement("textarea");
    subjectArea.className = 'msgListSubjectArea';
    subjectArea.rows = 1;
    subjectArea.readonly = 'readonly';
    subjectArea.disabled = 'disabled';
    subjectArea.value = 'loading...';
    div.appendChild(msgNoArea);
    div.appendChild(viaDiv);
    div.appendChild(addrArea);
    div.appendChild(dateArea);
    div.appendChild(msgIdArea);
    div.appendChild(subjectArea);
    const msgElem = new MsgElem(div, msgNoArea, viaDiv, addrArea, dateArea, msgIdArea, subjectArea, msgNo);
    div.addEventListener('click', function() {
	const message = msgElem.message;
	if (!!message && message.msgNo > 0) {
	    //re-establish View-Sent or View-Recv mode as appropriate, but no need to refresh the msg list since
	    //by definition we are selecting a message from the current list
	    const msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
	    const viewSentButton = document.getElementById('viewSentButton');
	    const viewRecvButton = document.getElementById('viewRecvButton');
	    index[msgNoCounter] = message.msgNo;
	    if (index.listMode == 'recv' && viewRecvButton.className != 'menuBarButtonSelected')
		handleViewRecv(false);
	    else if (index.listMode == 'sent' && viewSentButton.className != 'menuBarButtonSelected')
		handleViewSent(false);
	    selectMsgListEntry(msgElem.elemIdx, null);
	}
    });
    return(msgElem);
}


//
// fill-in a msgElem with the particulars of a message
//
function fillMsgListElem(msgElem, message) {
    console.log('fillMsgListElem: elemIdx = ' + msgElem.elemIdx + ', msgNo = ' + message.msgNo);
    const newPrefix = 'msgListItemDiv';
    const newSuffix = (!message.isRx || common.chkIndexedFlag(index.localStoragePrefix + 'beenRead', message.msgNo)) ? '' : 'New';
    msgElem.div.className = newPrefix + newSuffix;
    msgElem.msgNoArea.value = message.msgNo.toString(10);

    const viaTooltip = document.createElement("span");
    viaTooltip.className = 'tooltipText';
    if (message.viaAddr.length > 0) {
	const viaAddrBN = common.numberToBN(message.viaAddr);
	if (!viaAddrBN.isZero()) {
	    msgElem.viaDiv.style.backgroundImage = "url('images/cart_icon.png')";
	    viaTooltip.textContent = 'Message via MadStores';
	} else if (!!message.attachment) {
	    msgElem.viaDiv.style.backgroundImage = "url('images/download_icon.png')";
	    viaTooltip.textContent = 'Message w/ attachment';
	} else {
	    msgElem.viaDiv.style.backgroundImage = "url('images/env_closed_icon.png')";
	    viaTooltip.textContent = 'Direct message';
	}
    }
    msgElem.viaDiv.appendChild(viaTooltip);

    if (!!message.ensName)
	msgElem.addrArea.value = abbreviateAddrForEns(message.addr, message.ensName);
    else
	msgElem.addrArea.value = message.addr;
    msgElem.dateArea.value = message.date;
    msgElem.msgIdArea.value = (!!message.msgId) ? mtUtil.abbreviateMsgId(message.msgId) : '';
    msgElem.subjectArea.value = mtUtil.extractSubject(message.text, 80);
    msgElem.message = message;
}

function elemIdxToMsgNo(isRx, elemIdx) {
    const maxMsgNo = (isRx) ? parseInt(mtUtil.acctInfo.recvMsgCount) : parseInt(mtUtil.acctInfo.sentMsgCount);
    const msgNo = maxMsgNo - elemIdx;
    return(msgNo);
}


function abbreviateAddrForEns(addr, ensName) {
    let addrNumericStr = addr;
    if (ensName.length >= 15) {
	console.log('abbreviateAddrForEns: ensName = ' + ensName);
	// normal length of addr is '0x' + 40 chars. field can fit 40 + 16 ens. or
	// replace addr chars with XXXX...XXXX
	const noAddrChars = Math.max( 40 - (((ensName.length - 15) + 8 + 1) & 0xfffe), 6);
	const cut = 40 - noAddrChars;
	console.log('abbreviateAddrForEns: ensName.length = ' + ensName.length + ', cut = ' + cut);
	const remain2 = (40 - cut) / 2;
	console.log('abbreviateAddrForEns: remain2 = ' + remain2);
	addrNumericStr = addr.substring(0, 2 + remain2) + '...' + addr.substring(2 + 40 - remain2);
    }
    return(ensName + ' (' + addrNumericStr + ')');
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

function disableAllButtons() {
    common.setMenuButtonState('registerButton',      'Disabled');
    common.setMenuButtonState('viewRecvButton',      'Disabled');
    common.setMenuButtonState('composeButton',       'Disabled');
    common.setMenuButtonState('viewSentButton',      'Disabled');
    common.setMenuButtonState('withdrawButton',      'Disabled');
    document.getElementById('replyButton').disabled = true;
    document.getElementById('attachmentButton').disabled = true;
}
