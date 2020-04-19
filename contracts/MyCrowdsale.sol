pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Pausable.sol";
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
    // Rate of tokens per wei during presale phase.
    uint256 public preIcoRate = 500;
    // Rate of tokens per wei during open ICO phase.
    uint256 public icoRate = 250;

    // Tracks total contributions from individual investors.
    mapping(address => uint256) private _contributions;

    // Crowdsale Stages
    enum CrowdsaleStage { PreICO, ICO }
    // Default to presale stage
    CrowdsaleStage public stage = CrowdsaleStage.PreICO;

    // Token distribution
    uint256 public foundersPercent   = 10;
    uint256 public foundationPercent = 10;
    uint256 public partnersPercent   = 10;
    uint256 public tokenSalePercent  = 70;

    /**
     * @dev Constructor, sets initial values for crowdsale. See {Crowdsale-constructor} in OpenZeppelin library.
     * @param rate Number of tokens per wei.
     * @param wallet Address to receive all collected funds from crowdsale.
     * @param token Address of the token to be sold.
     * @param cap The total amount the crowdsale can receive.
     * @param openingTime Time the crowdsale is set to start accepting funds.
     * @param closingTime Time the crowdsale is set to stop accepting funds.
     * @param goal Funding goal.

    */
    constructor(
        uint256 rate,
        address payable wallet,
        IERC20 token,
        uint256 cap,
        uint256 openingTime,
        uint256 closingTime,
        uint256 goal
    )
        public
        Crowdsale(rate, wallet, token)
        CappedCrowdsale(cap)
        TimedCrowdsale(openingTime, closingTime)
        RefundableCrowdsale(goal)
    {
        require(
            goal <= cap,
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
     * @dev Allows admin to update the crowdsale stage.
     * Corresponds to 0 for PreICO and 1 for ICO in enum.
     * @param currentStage Crowdsale stage.
     */
    function setCrowdsaleStage(uint256 currentStage) public onlyOwner {
        if(uint(CrowdsaleStage.PreICO) == currentStage) {
            stage = CrowdsaleStage.PreICO;
        } else if(uint(CrowdsaleStage.ICO) == currentStage) {
            stage = CrowdsaleStage.ICO;
        }
    }

    /**
     * @dev Overrides Crowdsale token conversion depending on current ICO stage.
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
        if(stage == CrowdsaleStage.PreICO) {
            return weiAmount.mul(preIcoRate);
        } else if (stage == CrowdsaleStage.ICO) {
            return weiAmount.mul(icoRate);
        }
    }

    /**
     * @dev Overrides Crowdsale fund forwarding, sending funds to wallet during preICO stage
     * and escrow during ICO stage.
     */
    function _forwardFunds() internal {
        address payable preICOWallet = wallet();
        if(stage == CrowdsaleStage.PreICO) {
            preICOWallet.transfer(msg.value);
        } else if (stage == CrowdsaleStage.ICO) {
            super._forwardFunds();
        }
    }

    /**
     * @dev Returns the amount contributed so far by any contributor. Modified for privacy
     * so only the owner of the crowdsale contract can track contributions by user.
     * @param user Address of user who has contributed.
     * @return User's contribution so far.
     */
    function getUserContribution(address user)
        public
        view
        onlyOwner
        returns (uint256)
    {
        return _contributions[user];
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
     * @dev Enables token transfers when called by the owner.
     */
    function _finalization() internal {
        if(goalReached()) {
            ERC20Mintable _mintableToken = ERC20Mintable(address(token()));
            _mintableToken.renounceMinter();
            ERC20Pausable _pausableToken = ERC20Pausable(address(token()));
            _pausableToken.unpause();
        }
        super._finalization();
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
