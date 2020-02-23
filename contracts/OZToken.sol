pragma solidity >=0.4.21 <0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract OZToken is ERC20, ERC20Detailed {

    constructor(string memory _name, string memory _symbol, uint8 _decimals)
        ERC20Detailed(_name, _symbol, _decimals)
        public
    {

    }
}
