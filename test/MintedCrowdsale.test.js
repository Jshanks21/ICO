const { accounts, contract } = require('@openzeppelin/test-environment');

const { 
    BN, 
    time,
    ether, 
    balance,
    expectEvent, 
    expectRevert
} = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const OZToken = contract.fromArtifact("OZToken");
const testToken = contract.fromArtifact("TestERC20");
const MyCrowdsale = contract.fromArtifact("MyCrowdsale");

describe('MintedCrowdsale', function () {
    // Prevents 2000ms timeout error
    this.timeout(0); 
    
    // Reusable test accounts
    const [ deployer, investor, wallet, purchaser ] = accounts;

    // Reusable test variables
    const value = ether('5');
    const rate = new BN('1');
    const expectedTokenAmount = rate.mul(value);

    beforeEach(async function () {

        // Token config
        const name = "OZToken";
        const symbol = "OZT";
        const decimals = 18;
        const totalSupply = new BN('10').pow(new BN('22'));

		// Crowdsale config
		this.wallet = wallet;
		this.cap = ether('100');
        this.openingTime = (await time.latest()).add(time.duration.weeks(1));
        this.closingTime = this.openingTime.add(time.duration.weeks(1));
        this.goal = ether('99');

        // Deploy token
        this.token = await OZToken.new(
            name,
            symbol,
            decimals,
            totalSupply,
            { from: deployer }
        );

        // Deploy crowdsale
        this.crowdsale = await MyCrowdsale.new(
            rate,
            this.wallet,
            this.token.address,
            this.cap,
            this.openingTime,
            this.closingTime,
            this.goal,
            { from: deployer }
        );

		// Whitelists investor accounts
		await this.crowdsale.addWhitelisted(investor, { from: deployer });
		await this.crowdsale.addWhitelisted(purchaser, { from: deployer });

		// Advances time in tests to crowdsale openingTime
        await time.increaseTo(this.openingTime.add(time.duration.seconds(1)));

        // Transfers total token supply to crowdsale
        await this.token.transfer(this.crowdsale.address, totalSupply, { from: deployer });
    });

    describe('minted crowdsale', function () {
       beforeEach(async function () {
            await this.token.addMinter(this.crowdsale.address, { from: deployer });
            await this.token.renounceMinter({ from: deployer });
       });

       it('crowdsale should be minter', async function () {
           expect(await this.token.isMinter(this.crowdsale.address)).to.equal(true);
       });

        describe('accepting payments', function () {
            it('should accept payments', async function () {
                await this.crowdsale.send(value, { from: purchaser });
                await this.crowdsale.buyTokens(investor, { value, from: purchaser });
            });      
            
            it('mints tokens after purchase', async function () {
                const originalTotalSupply = await this.token.totalSupply();
                await this.crowdsale.sendTransaction({ value, from: purchaser });
                const newTotalSupply = await this.token.totalSupply();
                expect(originalTotalSupply < newTotalSupply).to.equal(true);
            });
        });

        describe('high-level purchase', function  () {
            it('should log purchases', async function () {
                const logs = await this.crowdsale.sendTransaction({ value, from: investor });
                expectEvent(logs, 'TokensPurchased', {
                    purchaser: investor,
                    beneficiary: investor,
                    value,
                    amount: expectedTokenAmount,
                });
            });

            // Following tests fail while crowdsale is inheriting from RefundablePostDeliveryCrowdsale. Update or Remove.

            // it('should assign tokens to sender', async function () {
            //     await this.crowdsale.buyTokens(investor, { value });
            //     expect(await this.token.balanceOf(investor)).to.be.bignumber.equal(expectedTokenAmount);
            // });

            // it('should forward funds to wallet', async function () {
            //     const balanceTracker = await balance.tracker(wallet);
            //     await this.crowdsale.sendTransaction({ value, from: investor });
            //     expect(await balanceTracker.delta()).to.be.bignumber.equal(value);
            // });
        });

        describe('using non-mintable token', function () {
            beforeEach(async function () {

                // Timed Crowdsale config
                this.openingTime = (await time.latest()).add(time.duration.weeks(1));
                this.closingTime = this.openingTime.add(time.duration.weeks(1));

                // Deploy non-mintable token instance
                this.token = await testToken.new({ from: deployer });

                // Deploy crowdsale instance
                this.crowdsale = await MyCrowdsale.new(
                    rate,
                    this.wallet,
                    this.token.address,
                    this.cap,
                    this.openingTime,
                    this.closingTime,
                    this.goal,
                    { from: deployer }
                );

                // Gives crowdsale contract WhitelistAdminRole access
                await this.crowdsale.addWhitelistAdmin(this.crowdsale.address, { from: deployer });

                // Whitelists investor accounts
                await this.crowdsale.addWhitelisted(investor, { from: deployer });
                await this.crowdsale.addWhitelisted(purchaser, { from: deployer });

                // Advances time in tests to crowdsale openingTime
                await time.increaseTo(this.openingTime.add(time.duration.seconds(1)));
            });

            it('rejects bare payments', async function () {
                await expectRevert.unspecified(this.crowdsale.send(value));
            });

            it('rejects token purchases', async function () {
                await expectRevert.unspecified(this.crowdsale.buyTokens(investor, { value, from: purchaser }));
            });
        });
    });
});