const { accounts, contract } = require('@openzeppelin/test-environment');

const { BN, ether, time, expectRevert } = require('@openzeppelin/test-helpers');

const OZToken = contract.fromArtifact('OZToken');
const MyCrowdsale = contract.fromArtifact('MyCrowdsale');

describe('WhitelistCrowdsale', function () {
    // Prevents 2000ms timeout error
    this.timeout(0);

    // Reusable test accounts
    const [ wallet, whitelister, whitelisted, otherWhitelisted, other ] = accounts;

    // Token config
    const name = "OZToken";
    const symbol = "OZT";
    const decimals = 18;
    const tokenSupply = new BN('10').pow(new BN('22'));

    // Reusable test variables
    const value = ether('15');

    beforeEach(async function () {

		// Crowdsale config
		this.rate = new BN('1');
		this.wallet = wallet;
		this.cap = ether('100');
        this.openingTime = (await time.latest()).add(time.duration.weeks(1));
        this.closingTime = this.openingTime.add(time.duration.weeks(1));
        this.goal = ether('80');

        // Deploy token
        this.token = await OZToken.new(
            name,
            symbol,
            decimals,
            tokenSupply,
            { from: whitelister }
        );

        // Deploy crowdsale
        this.crowdsale = await MyCrowdsale.new(
            this.rate,
            this.wallet,
            this.token.address,
            this.cap,
            this.openingTime,
            this.closingTime,
            this.goal,
            { from: whitelister }
        );

        // // Gives crowdsale contract MinterRole access
        await this.token.addMinter(this.crowdsale.address, { from: whitelister });

        // Advances time in tests to crowdsale openingTime
        await time.increaseTo(this.openingTime.add(time.duration.seconds(1)));

        // Transfers total token supply to crowdsale
        await this.token.transfer(this.crowdsale.address, tokenSupply, { from: whitelister });
    })

    async function purchaseShouldSucceed (crowdsale, beneficiary, value) {
        await crowdsale.buyTokens(beneficiary, { from: beneficiary, value });
        await crowdsale.sendTransaction({ from: beneficiary, value });
    }

    async function purchaseExpectRevert (crowdsale, beneficiary, value) {
        await expectRevert(crowdsale.buyTokens(beneficiary, { from: beneficiary, value }),
            `WhitelistCrowdsale: beneficiary doesn't have the Whitelisted role`
        );
        await expectRevert(crowdsale.sendTransaction({ from: beneficiary, value }),
            `WhitelistCrowdsale: beneficiary doesn't have the Whitelisted role`
        );
    }

    context('with no whitelisted addresses', function () {
        it('rejects all purchases', async function () {
            await purchaseExpectRevert(this.crowdsale, other, value);
            await purchaseExpectRevert(this.crowdsale, whitelisted, value);
        });
    });

    context('with whitelisted addresses', function () {
        beforeEach(async function () {
            await this.crowdsale.addWhitelisted(whitelisted, { from: whitelister });
            await this.crowdsale.addWhitelisted(otherWhitelisted, { from: whitelister });
        });

        it('accepts purchases with whitelisted beneficiaries', async function () {
            await purchaseShouldSucceed(this.crowdsale, whitelisted, value);
            await purchaseShouldSucceed(this.crowdsale, otherWhitelisted, value);
        });

        it('rejects purchases from whitelisted addresses with non-whitelisted beneficiaries', async function () {
            await expectRevert.unspecified(this.crowdsale.buyTokens(other, { from: whitelisted, value }));
        });

        it('rejects purchases with non-whitelisted beneficiaries', async function () {
            await purchaseExpectRevert(this.crowdsale, other, value);
        });
    });
});