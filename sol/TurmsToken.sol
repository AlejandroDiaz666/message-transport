pragma solidity ^0.5.0;

/**
 *
 * Version E
 * @author Alejandro Diaz <Alejandro.Diaz.666@protonmail.com>
 *
 * Overview:
 * This is an implimentation of a multi-dividend-paying token. the token supports income/dividends
 * of Eth and also Dai. A fixed number of tokens are minted in the constructor, and initially owned
 * by the contract owner. Dividends are awarded token holders thusly:
 *
 *   previous_due + [ p(x) * t(x)/N ] + [ p(x+1) * t(x+1)/N ] + ...
 *   where p(x) is the x'th income payment received by the contract
 *         t(x) is the number of tokens held by the token-holder at the time of p(x)
 *         N    is the total number of tokens, which never changes
 *
 * assume that t(x) takes on 3 values, t(a), t(b) and t(c), at times a, b, and c. then:
 * factoring:
 *
 *   current_due = { (t(a) * [p(x) + p(x+1)]) ... + (t(a) * [p(x) + p(y-1)]) ... +
 *                   (t(b) * [p(y) + p(y+1)]) ... + (t(b) * [p(y) + p(z-1)]) ... +
 *                   (t(c) * [p(z) + p(z+1)]) ... + (t(c) * [p(z) + p(now)]) } / N
 *
 * or
 *
 *   current_due = { (t(a) * period_a_income) +
 *                   (t(b) * period_b_income) +
 *                   (t(c) * period_c_income) } / N
 *
 * if we designate current_due * N as current-points, then
 *
 *   currentPoints = {  (t(a) * period_a_income) +
 *                      (t(b) * period_b_income) +
 *                      (t(c) * period_c_income) }
 *
 * or more succictly, if we recompute current points before a token-holder's number of
 * tokens, T, is about to change:
 *
 *   currentPoints = previous_points + (T * current-period-income)
 *
 * when we want to do a payout, we'll calculate:
 *  current_due = current-points / N
 *
 * we'll keep track of a token-holder's current-period-points, which is:
 *   T * current-period-income
 * by taking a snapshot of income collected exactly when the current period began; that is, the when the
 * number of tokens last changed. that is, we keep a running count of total income received
 *
 *   totalIncomeReceived = p(x) + p(x+1) + p(x+2)
 *
 * (which happily is the same for all token holders) then, before any token holder changes their number of
 * tokens we compute (for that token holder):
 *
 *  function calcCurPointsForAcct(acct) {
 *    currentPoints[acct] += (totalIncomeReceived - lastSnapshot[acct]) * T[acct]
 *    lastSnapshot[acct] = totalIncomeReceived
 *  }
 *
 * in the withdraw fcn, all we need is:
 *
 *  function withdraw(acct) {
 *    calcCurPointsForAcct(acct);
 *    current_amount_due = currentPoints[acct] / N
 *    currentPoints[acct] = 0;
 *    send(current_amount_due);
 *  }
 *
 */
import './SafeMath.sol';
import './iERC20Token.sol';
import './iDividendToken.sol';


contract ETT is iERC20Token, iDividendToken, SafeMath {

  event PaymentEvent(address indexed from, uint amount);
  event TransferEvent(address indexed from, address indexed to, uint amount);
  event ApprovalEvent(address indexed from, address indexed to, uint amount);

  struct tokenHolder {
    uint tokens;           // num tokens currently held in this acct, aka balance
    uint currentEthPoints; // updated before token balance changes, or before a withdrawal. credit for owning tokens
    uint lastEthSnapshot;  // snapshot of global TotalPoints (Eth), last time we updated this acct's currentEthPoints
    uint currentDaiPoints; // updated before token balance changes, or before a withdrawal. credit for owning tokens
    uint lastDaiSnapshot;  // snapshot of global TotalPoints (Dai), last time we updated this acct's currentDaiPoints
  }

  bool    public isLocked;
  address public daiToken;
  address payable public owner;
  string  public symbol;
  string  public name;
  uint    public decimals;
  uint           tokenSupply;
  uint public    holdoverEthBalance;                            // funds received, but not yet distributed
  uint public    totalEthReceived;
  uint public    holdoverDaiBalance;                            // funds received, but not yet distributed
  uint public    totalDaiReceived;

  mapping (address => mapping (address => uint)) approvals;  //transfer approvals, from -> to
  mapping (address => tokenHolder) public tokenHolders;

  modifier ownerOnly {
    require(msg.sender == owner, "owner only");
    _;
  }

  modifier unlockedOnly {
    require(!isLocked, "unlocked only");
    _;
  }


  //this is to protect from short-address attack. use this to verify size of args, especially when an address arg preceeds
  //a value arg. see: https://www.reddit.com/r/ethereum/comments/63s917/worrysome_bug_exploit_with_erc20_token/dfwmhc3/
  modifier onlyPayloadSize(uint256 size) {
    assert(msg.data.length >= size + 4);
    _;
  }

  //
  //constructor
  //
  constructor(address _daiToken, uint256 _tokenSupplysupply, uint256 _decimals, string memory _name, string memory _symbol) public {
    daiToken = _daiToken;
    tokenSupply = _tokenSupplysupply;
    decimals = _decimals;
    name = _name;
    symbol = _symbol;
    owner = msg.sender;
  }

  function lock() public ownerOnly {
    isLocked = true;
  }


  //
  // ERC-20
  //
  function totalSupply() public view returns (uint supply) {
    supply = tokenSupply;
  }

  function transfer(address _to, uint _value) public onlyPayloadSize(2*32) returns (bool success) {
    //prevent wrap
    if (tokenHolders[msg.sender].tokens >= _value && tokenHolders[_to].tokens + _value >= tokenHolders[_to].tokens) {
      //first credit sender with points accrued so far.. must do this before number of held tokens changes
      calcCurPointsForAcct(msg.sender);
      tokenHolders[msg.sender].tokens -= _value;
      //if destination is a new tokenholder then we are setting his "last" snapshot to the current totalPoints
      if (tokenHolders[_to].lastEthSnapshot == 0)
	tokenHolders[_to].lastEthSnapshot = totalEthReceived;
      if (tokenHolders[_to].lastDaiSnapshot == 0)
	tokenHolders[_to].lastDaiSnapshot = totalDaiReceived;
      //credit destination acct with points accrued so far.. must do this before number of held tokens changes
      calcCurPointsForAcct(_to);
      tokenHolders[_to].tokens += _value;
      emit TransferEvent(msg.sender, _to, _value);
      return true;
    } else {
      return false;
    }
  }


  function transferFrom(address _from, address _to, uint _value) onlyPayloadSize(3*32) public returns (bool success) {
    //prevent wrap:
    if (tokenHolders[_from].tokens >= _value && approvals[_from][msg.sender] >= _value && tokenHolders[_to].tokens + _value >= tokenHolders[_to].tokens) {
      //first credit source acct with points accrued so far.. must do this before number of held tokens changes
      calcCurPointsForAcct(_from);
      tokenHolders[_from].tokens -= _value;
      //if destination is a new tokenholder then we are setting his "last" snapshot to the current totalPoints
      if (tokenHolders[_to].lastEthSnapshot == 0)
	tokenHolders[_to].lastEthSnapshot = totalEthReceived;
      if (tokenHolders[_to].lastDaiSnapshot == 0)
	tokenHolders[_to].lastDaiSnapshot = totalDaiReceived;
      //credit destination acct with points accrued so far.. must do this before number of held tokens changes
      calcCurPointsForAcct(_to);
      tokenHolders[_to].tokens += _value;
      approvals[_from][msg.sender] -= _value;
      emit TransferEvent(_from, _to, _value);
      return true;
    } else {
      return false;
    }
  }


  function balanceOf(address _owner) public view returns (uint balance) {
    balance = tokenHolders[_owner].tokens;
  }


  function approve(address _spender, uint _value) public onlyPayloadSize(2*32) returns (bool success) {
    approvals[msg.sender][_spender] = _value;
    emit ApprovalEvent(msg.sender, _spender, _value);
    return true;
  }


  function allowance(address _owner, address _spender) public view returns (uint remaining) {
    return approvals[_owner][_spender];
  }

  //
  // END ERC20
  //

  //
  // calc current points for a token holder; that is, points that are due to this token holder for all dividends
  // received by the contract during the current "period". the period began the last time this fcn was called, at which
  // time we updated the account's snapshot of the running point count, totalEthReceived. during the period the account's
  // number of tokens must not have changed. so always call this fcn before changing the number of tokens.
  //
  function calcCurPointsForAcct(address _acct) internal {
    tokenHolders[_acct].currentEthPoints += (totalEthReceived - tokenHolders[_acct].lastEthSnapshot) * tokenHolders[_acct].tokens;
    tokenHolders[_acct].lastEthSnapshot = totalEthReceived;
    tokenHolders[_acct].currentDaiPoints += (totalDaiReceived - tokenHolders[_acct].lastDaiSnapshot) * tokenHolders[_acct].tokens;
    tokenHolders[_acct].lastDaiSnapshot = totalDaiReceived;
  }


  //
  // default payable function. funds receieved here become dividends.
  //
  function () external payable {
    holdoverEthBalance += msg.value;
    totalEthReceived += msg.value;
  }


  //
  // this payable function is for payment in Dai and optionally also Eth
  // caller must have already approved the Dai transfer
  //
  function payDai(uint256 _daiAmount) external payable {
    holdoverEthBalance += msg.value;
    totalEthReceived += msg.value;
    require(transferFrom(msg.sender, address(this), _daiAmount), "failed to transfer dai");
    holdoverDaiBalance += _daiAmount;
    totalDaiReceived += _daiAmount;
  }


  //
  // check my dividends
  //
  function checkDividends(address _addr) view public returns(uint _ethAmount, uint _daiAmount) {
    if (tokenHolders[_addr].lastEthSnapshot == 0) {
      _ethAmount = _daiAmount = 0;
    } else {
      //don't call calcCurPointsForAcct here, cuz this is a constant fcn
      uint _currentEthPoints = tokenHolders[_addr].currentEthPoints +
	((totalEthReceived - tokenHolders[_addr].lastEthSnapshot) * tokenHolders[_addr].tokens);
      _ethAmount = _currentEthPoints / tokenSupply;
      uint _currentDaiPoints = tokenHolders[_addr].currentDaiPoints +
	((totalDaiReceived - tokenHolders[_addr].lastDaiSnapshot) * tokenHolders[_addr].tokens);
      _daiAmount = _currentDaiPoints / tokenSupply;
    }
  }


  //
  // withdraw my dividends
  //
  function withdrawEthDividends() public returns (uint _amount) {
    calcCurPointsForAcct(msg.sender);
    _amount = tokenHolders[msg.sender].currentEthPoints / tokenSupply;
    uint _pointsUsed = _amount * tokenSupply;
    tokenHolders[msg.sender].currentEthPoints -= _pointsUsed;
    holdoverEthBalance -= _amount;
    msg.sender.transfer(_amount);
  }

  function withdrawDaiDividends() public returns (uint _amount) {
    calcCurPointsForAcct(msg.sender);
    _amount = tokenHolders[msg.sender].currentDaiPoints / tokenSupply;
    uint _pointsUsed = _amount * tokenSupply;
    tokenHolders[msg.sender].currentDaiPoints -= _pointsUsed;
    holdoverDaiBalance -= _amount;
    require(iERC20Token(daiToken).transfer(msg.sender, _amount), "failed to transfer dai");
  }


  //only available before the contract is locked
  function haraKiri() public ownerOnly unlockedOnly {
    selfdestruct(owner);
  }

}
