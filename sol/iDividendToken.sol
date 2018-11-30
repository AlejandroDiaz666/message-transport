pragma solidity ^0.5.0;

// simple interface for withdrawing dividends
contract iDividendToken {
  function checkDividends(address _addr) view public returns(uint _amount);
  function withdrawDividends() public returns (uint _amount);
}
