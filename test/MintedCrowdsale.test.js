const { accounts, contract } = require('@openzeppelin/test-environment');

const { 
    BN, 
    time,
    ether, 
    expectEvent, 
    expectRevert
} = require('@openzeppelin/test-helpers');
// const { shouldBehaveLikeMintedCrowdsale } = require('./MintedCrowdsale.behavior');

const { expect } = require('chai');

const OZToken = contract.fromArtifact("OZToken");
const MyCrowdsale = contract.fromArtifact("MyCrowdsale");

describe('MintedCrowdsale', function () {
    // Prevents 2000ms timeout error
    this.timeout(0); 
    
    // Reusable test accounts
    const [ deployer, investor, wallet, purchaser ] = accounts;

    beforeEach(async function () {

        // Token config
        const name = "OZToken";
        const symbol = "OZT";
        const decimals = 18;
        const tokenSupply = new BN('10').pow(new BN('22'));

        // Crowdsale config
        const rate = new BN('1000');
        const cap = ether('100');
        this.openingTime = (await time.latest()).add(time.duration.weeks(1));
        this.closingTime = this.openingTime.add(time.duration.weeks(1));

        // Deploy token
        this.token = await OZToken.new(
            name,
            symbol,
            decimals,
            tokenSupply,
            { from: deployer }
        );

        this.crowdsale = await MyCrowdsale.new(
            rate,
            wallet,
            this.token.address,
            cap,
            this.openingTime,
            this.closingTime
        );

        // Reusable test value
        const value = ether('5');

    });

    describe('using ERC20Mintable', function () {
       
    });

});