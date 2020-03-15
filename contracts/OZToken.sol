pragma solidity >=0.4.21 <0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

/**
 * @title OZToken
 * @notice This token was created for use in MyCrowdsale.sol
 * @dev This is a basic ERC-20 implementation using the OpenZeppelin library for base and extended functions
 */
contract OZToken is ERC20Mintable, ERC20Detailed {

	/**
     * @dev Sets the values for `name`, `symbol`, and `decimals`. All three of
     * these values are immutable: they can only be set once during
     * construction. See {ERC20Detailed-construcotor}.
     */
	constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _initialSupply)
		ERC20Detailed(_name, _symbol, _decimals)
		public
	{
		_mint(msg.sender, _initialSupply);
	}
}