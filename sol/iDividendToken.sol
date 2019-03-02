pragma solidity ^0.5.0;

// simple interface for withdrawing dividends
contract iDividendToken {
  function checkDividends(address _addr) view public returns(uint _ethAmount, uint _daiAmount);
  function withdrawEthDividends() public returns (uint _amount);
  function withdrawDaiDividends() public returns (uint _amount);
  }
