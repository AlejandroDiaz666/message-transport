pragma solidity ^0.5.0;

// ---------------------------------------------------------------------------
//  Message_Transport
// ---------------------------------------------------------------------------
import './SafeMath.sol';
contract MessageTransport is SafeMath {

  // -------------------------------------------------------------------------
  // events
  // -------------------------------------------------------------------------
  event InviteEvent(address indexed _toAddr, address indexed _fromAddr);
  event MessageEvent(uint indexed _id1, uint indexed _id2, uint indexed _id3,
		     address _fromAddr, address _toAddr, uint _txCount, uint _rxCount, uint _mimeType, uint _ref, bytes message);
  event MessageTxEvent(address indexed _fromAddr, uint indexed _txCount, uint _id);
  event MessageRxEvent(address indexed _toAddr, uint indexed _rxCount, uint _id);


  // -------------------------------------------------------------------------
  // defines
  // -------------------------------------------------------------------------
  uint constant MIME_TYPE_TEXT_PLAIN = 0;
  uint constant MIME_TYPE_TEXT_HTML  = 1;
  uint constant MIME_TYPE_IMAGE_JPEG = 2;
  uint constant MIME_TYPE_IMAGE_PNG  = 3;


  // -------------------------------------------------------------------------
  // Account structure
  // there is a single account structure for all account types
  // -------------------------------------------------------------------------
  struct Account {
    uint messageFee;           // pay this much for every non-spam message sent to this account
    uint spamFee;              // pay this much for every spam message sent to this account
    uint feeBalance;           // includes spam and non-spam fees
    uint recvMessageCount;     // total messages received
    uint sentMessageCount;     // total messages sent
    bytes publicKey;           // encryption parameter
    bytes encryptedPrivateKey; // encryption parameter
    mapping (address => uint256) peerRecvMessageCount;
    mapping (uint256 => uint256) recvIds;
    mapping (uint256 => uint256) sentIds;
  }


  // -------------------------------------------------------------------------
  // data storage
  // -------------------------------------------------------------------------
  bool public isLocked;
  address payable public owner;
  address public tokenAddr;
  uint messageCount;
  uint retainedFeesBalance;
  uint contractSendGas = 100000;
  mapping (address => bool) public trusted;
  mapping (address => Account) public accounts;


  // -------------------------------------------------------------------------
  // modifiers
  // -------------------------------------------------------------------------
  modifier ownerOnly {
    require(msg.sender == owner, "owner only");
    _;
  }
  modifier unlockedOnly {
    require(!isLocked, "unlocked only");
    _;
  }
  modifier trustedOnly {
    require(trusted[msg.sender] == true, "trusted only");
    _;
  }


  // -------------------------------------------------------------------------
  //  EMS constructor
  // -------------------------------------------------------------------------
  constructor(address _tokenAddr) public {
    owner = msg.sender;
    tokenAddr = _tokenAddr;
  }
  function setTrust(address _trustedAddr, bool _trust) public ownerOnly {
    trusted[_trustedAddr] = _trust;
  }
  function tune(uint _contractSendGas) public ownerOnly {
    contractSendGas = _contractSendGas;
  }
  function lock() public ownerOnly {
    isLocked = true;
  }


  // -------------------------------------------------------------------------
  // register a simple message account
  // -------------------------------------------------------------------------
  function register(uint256 _messageFee, uint256 _spamFee, bytes memory _publicKey, bytes memory _encryptedPrivateKey) public {
    Account storage _account = accounts[msg.sender];
    _account.messageFee = _messageFee;
    _account.spamFee = _spamFee;
    _account.publicKey = _publicKey;
    _account.encryptedPrivateKey = _encryptedPrivateKey;
  }


  // -------------------------------------------------------------------------
  // get the number of messages that have been sent from one peer to another
  // -------------------------------------------------------------------------
  function getPeerMessageCount(address _from, address _to) public view returns(uint256 _messageCount) {
    Account storage _account = accounts[_to];
    _messageCount = _account.peerRecvMessageCount[_from];
  }


  //
  // note that array will always have _maxResults entries. ignore messageID = 0
  //
  function getRecvMsgs(address _to, uint256 _startIdx, uint256 _maxResults) public view returns(uint256 _idx, uint256[] memory _messageIds) {
    uint _count = 0;
    Account storage _recvAccount = accounts[_to];
    uint256 _recvMessageCount = _recvAccount.recvMessageCount;
    _messageIds = new uint256[](_maxResults);
    mapping(uint256 => uint256) storage _recvIds = _recvAccount.recvIds;
    //note first messageID is at recvIds[0];
    for (_idx = _startIdx; _idx < _recvMessageCount; ++_idx) {
      _messageIds[_count] = _recvIds[_idx];
      if (++_count >= _maxResults)
	break;
    }
  }

  //
  // note that array will always have _maxResults entries. ignore messageID = 0
  //
  function getSentMsgs(address _from, uint256 _startIdx, uint256 _maxResults) public view returns(uint256 _idx, uint256[] memory _messageIds) {
    uint _count = 0;
    Account storage _sentAccount = accounts[_from];
    uint256 _sentMessageCount = _sentAccount.sentMessageCount;
    _messageIds = new uint256[](_maxResults);
    mapping(uint256 => uint256) storage _sentIds = _sentAccount.sentIds;
    //note first messageID is at recvIds[0];
    for (_idx = _startIdx; _idx < _sentMessageCount; ++_idx) {
      _messageIds[_count] = _sentIds[_idx];
      if (++_count >= _maxResults)
	break;
    }
  }


  // -------------------------------------------------------------------------
  // get the required fee in order to send a message (or spam message)
  // this is handy for contract calls
  // -------------------------------------------------------------------------
  function getFee(address _toAddr) public view returns(uint256 _fee) {
    Account storage _sendAccount = accounts[msg.sender];
    Account storage _recvAccount = accounts[_toAddr];
    if (_sendAccount.peerRecvMessageCount[_toAddr] == 0)
      _fee = _recvAccount.spamFee;
    else
      _fee = _recvAccount.messageFee;
  }
  function getFee(address _fromAddr, address _toAddr) public view trustedOnly returns(uint256 _fee) {
    Account storage _sendAccount = accounts[_fromAddr];
    Account storage _recvAccount = accounts[_toAddr];
    if (_sendAccount.peerRecvMessageCount[_toAddr] == 0)
      _fee = _recvAccount.spamFee;
    else
      _fee = _recvAccount.messageFee;
  }


  // -------------------------------------------------------------------------
  // send message
  // -------------------------------------------------------------------------
  function sendMessage(address _toAddr, uint mimeType, uint _ref, bytes memory _message) public payable returns (uint _messageId) {
    uint256 _noDataLength = 4 + 20 + 32 + 32;
    _messageId = doSendMessage(_noDataLength, msg.sender, _toAddr, mimeType, _ref, _message);
  }
  function sendMessage(address _fromAddr, address _toAddr, uint mimeType, uint _ref, bytes memory _message) public payable trustedOnly returns (uint _messageId) {
    uint256 _noDataLength = 4 + 20 + 20 + 32 + 32;
    _messageId = doSendMessage(_noDataLength, _fromAddr, _toAddr, mimeType, _ref, _message);
  }
  function doSendMessage(uint256 _noDataLength, address _fromAddr, address _toAddr, uint mimeType, uint _ref, bytes memory _message) internal returns (uint _messageId) {
    Account storage _sendAccount = accounts[_fromAddr];
    Account storage _recvAccount = accounts[_toAddr];
    //if message text is empty then no fees are necessary, and we don't create a log entry.
    //after you introduce yourself to someone this way their subsequent message to you won't
    //incur your spamFee.
    if (msg.data.length > _noDataLength) {
      require(msg.value >= _recvAccount.messageFee, "fee is insufficient");
      if (_sendAccount.peerRecvMessageCount[_toAddr] == 0)
	require(msg.value >= _recvAccount.spamFee, "spam fee is insufficient");
      messageCount = safeAdd(messageCount, 1);
      _recvAccount.recvIds[_recvAccount.recvMessageCount] = messageCount;
      _sendAccount.sentIds[_sendAccount.sentMessageCount] = messageCount;
      _recvAccount.recvMessageCount = safeAdd(_recvAccount.recvMessageCount, 1);
      _sendAccount.sentMessageCount = safeAdd(_sendAccount.sentMessageCount, 1);
      emit MessageEvent(messageCount, messageCount, messageCount, _fromAddr, _toAddr, _sendAccount.sentMessageCount, _recvAccount.recvMessageCount, mimeType, _ref, _message);
      emit MessageTxEvent(_fromAddr, _sendAccount.sentMessageCount, messageCount);
      emit MessageRxEvent(_toAddr, _recvAccount.recvMessageCount, messageCount);
      //return message id, which a calling function might want to log
      _messageId = messageCount;
    } else {
      emit InviteEvent(_toAddr, msg.sender);
      _messageId = 0;
    }
    uint _retainAmount = safeMul(msg.value, 30) / 100;
    retainedFeesBalance = safeAdd(retainedFeesBalance, _retainAmount);
    _recvAccount.feeBalance = safeAdd(_recvAccount.feeBalance, safeSub(msg.value, _retainAmount));
    _recvAccount.peerRecvMessageCount[msg.sender] = safeAdd(_recvAccount.peerRecvMessageCount[msg.sender], 1);
  }


  // -------------------------------------------------------------------------
  // withdraw accumulated message & spam fees
  // -------------------------------------------------------------------------
  function withdraw() public {
    Account storage _account = accounts[msg.sender];
    uint _amount = _account.feeBalance;
    _account.feeBalance = 0;
    msg.sender.transfer(_amount);
  }


  // -------------------------------------------------------------------------
  // pay retained fees funds to token contract; burn half.
  // make sure contractSendGas is sufficient
  // -------------------------------------------------------------------------
  function withdrawRetainedFees() public {
    uint _amount = retainedFeesBalance / 2;
    address(0).transfer(_amount);
    _amount = safeSub(retainedFeesBalance, _amount);
    retainedFeesBalance = 0;
    (bool paySuccess, ) = tokenAddr.call.gas(contractSendGas).value(_amount)("");
    if (!paySuccess)
      revert();
  }


  // -------------------------------------------------------------------------
  // for debug
  // only available before the contract is locked
  // -------------------------------------------------------------------------
  function killContract() public ownerOnly unlockedOnly {
    selfdestruct(owner);
  }
}
