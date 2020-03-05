pragma solidity >=0.4.21 <0.7.0;

import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/CappedCrowdsale.sol";

contract MyCrowdsale is MintedCrowdsale, CappedCrowdsale {
    uint256 public investorMinCap = 0.002 ether;
    uint256 public investorMaxCap = 50 ether;

    mapping(address => uint256) private _contributions;

    constructor(
        uint256 _rate,
        address payable _wallet,
        IERC20 _token,
        uint256 _cap
    ) public
	Crowdsale(_rate, _wallet, _token)
	CappedCrowdsale(_cap) {

	}

    /**
     * @dev Returns the amount contributed so far by the caller.
     * @return Caller's contribution so far.
     */
	function getContributionAmount() public view returns (uint256) {
		return _contributions[msg.sender];
	}

	/**
     * @dev Extends the parent behavior requiring contributions to be within min/max funding cap.
     * @param beneficiary Address performing the token purchase.
     * @param weiAmount Amount to contribute in wei.
     */
    function _preValidatePurchase(address beneficiary, uint256 weiAmount)
        internal
		view
    {
        super._preValidatePurchase(beneficiary, weiAmount);
		uint256 _existingContribution = _contributions[beneficiary];
		uint256 _newContribution = _existingContribution.add(weiAmount);
        require(
            _newContribution >= investorMinCap && _newContribution <= investorMaxCap,
            "Investor cap reached: Min amount is 0.002 Ether. Max amount is 50 Ether."
        );
    }

	/**
     * @dev Extends the parent behavior to update the beneficiary's contribution in the _contributions mapping.
     * @param beneficiary Address to be updated.
     * @param weiAmount Value in wei added to _contributions.
     */
	function _updatePurchasingState(address beneficiary, uint256 weiAmount) internal {
		super._updatePurchasingState(beneficiary, weiAmount);
		_contributions[beneficiary] = _contributions[beneficiary].add(weiAmount);
	}

}
