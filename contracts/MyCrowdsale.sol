pragma solidity ^0.5.0;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/distribution/RefundablePostDeliveryCrowdsale.sol";

contract MyCrowdsale is
    MintedCrowdsale,
    CappedCrowdsale,
    TimedCrowdsale,
    WhitelistCrowdsale,
    RefundableCrowdsale,
    Ownable
{

    // Minimum contribution accepted by individual investor.
    uint256 public investorMinCap = 0.002 ether;
    // Maximum contribution accepted by individual investor.
    uint256 public investorMaxCap = 50 ether;

    // Tracks total contributions from individual investors.
    mapping(address => uint256) private _contributions;

    /**
     * @dev Constructor, sets initial values for crowdsale. See {Crowdsale-constructor} in OpenZeppelin library.
     * @param _rate Number of tokens per wei.
     * @param _wallet Address to receive all collected funds from crowdsale.
     * @param _token Address of the token to be sold.
     * @param _cap The total amount the crowdsale can receive.
     * @param _openingTime Time the crowdsale is set to start accepting funds.
     * @param _closingTime Time the crowdsale is set to stop accepting funds.
     * @param _goal Funcding goal.

    */
    constructor(
        uint256 _rate,
        address payable _wallet,
        IERC20 _token,
        uint256 _cap,
        uint256 _openingTime,
        uint256 _closingTime,
        uint256 _goal
    )
        public
        Crowdsale(_rate, _wallet, _token)
        CappedCrowdsale(_cap)
        TimedCrowdsale(_openingTime, _closingTime)
        RefundableCrowdsale(_goal)
    {
        require(
            _goal <= _cap,
            "The crowdsale goal must be less than the cap."
        );
    }

    /**
     * @dev Returns the amount contributed so far by the caller.
     * @notice This can be called by anyone to check their own total contribution.
     * @return Caller's contribution so far.
     */
    function getContribution() public view returns (uint256) {
        return _contributions[msg.sender];
    }

    /**
     * @dev Returns the amount contributed so far by any contributor. Modified for privacy
     * so only the owner of the crowdsale contract can track contributions by user.
     * @param _user Address of user who has contributed.
     * @return User's contribution so far.
     */
    function getUserContribution(address _user)
        public
        view
        onlyOwner
        returns (uint256)
    {
        return _contributions[_user];
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
            _newContribution >= investorMinCap &&
            _newContribution <= investorMaxCap,
            "Investor cap reached: Min amount is 0.002 Ether. Max amount is 50 Ether."
        );
    }

    /**
     * @dev Extends the parent behavior to update the beneficiary's contribution in the _contributions mapping.
     * @param beneficiary Address to be updated.
     * @param weiAmount Value in wei added to _contributions.
     */
    function _updatePurchasingState(address beneficiary, uint256 weiAmount)
        internal
    {
        super._updatePurchasingState(beneficiary, weiAmount);
        _contributions[beneficiary] = _contributions[beneficiary].add(
            weiAmount
        );
    }

    /**
     * @dev Extend crowdsale.
     * @param newClosingTime Crowdsale closing time
     */
    function extendTime(uint256 newClosingTime)
        public
        onlyOwner
    {
        super._extendTime(newClosingTime);
    }
}
