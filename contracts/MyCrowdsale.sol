pragma solidity >=0.4.21 <0.7.0;

import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";

contract MyCrowdsale is Crowdsale {

    constructor(
      uint256 _rate,
      address payable _wallet,
      IERC20 _token
    )
      Crowdsale(_rate, _wallet, _token)
      public
    {

    }

}
