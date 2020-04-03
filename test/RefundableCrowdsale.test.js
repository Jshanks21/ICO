const { accounts, contract } = require('@openzeppelin/test-environment');

const { 
    BN, 
    time,
    ether, 
    balance,
    expectRevert
} = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const OZToken = contract.fromArtifact("OZToken");
const MyCrowdsale = contract.fromArtifact("MyCrowdsale");

describe('RefundableCrowdsale', function () {
    // Prevents 2000ms timeout error
    this.timeout(0); 
    
    // Reusable test accounts
    const [ deployer, wallet, investor, other ] = accounts;

    // Reusable test variables
    const lessThanGoal = ether('20');

    // Token config
    const name = "OZToken";
    const symbol = "OZT";
    const decimals = 18;
    const totalSupply = new BN('10').pow(new BN('22'));

    // Crowdsale config
    const rate = new BN('1');
    const cap = ether('100');
    const goal = ether('25');

    before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
        await time.advanceBlock();
    });


    beforeEach(async function () {

        this.openingTime = (await time.latest()).add(time.duration.weeks(1));
        this.closingTime = this.openingTime.add(time.duration.weeks(1));
        this.afterClosingTime = await this.closingTime.add(time.duration.seconds(1));
        this.preWalletBalance = await balance.current(wallet);

        // Deploy token
        this.token = await OZToken.new(
            name,
            symbol,
            decimals,
            totalSupply,
            { from: deployer }
        );

        
    });

    it('rejects a goal of zero', async function () {
        await expectRevert(
            MyCrowdsale.new(rate, wallet, this.token.address, cap, this.openingTime, this.closingTime, 0),
            'RefundableCrowdsale: goal is 0'
        );
    });

    context('with crowdsale', function () {
        beforeEach(async function () {

            // Deploy crowdsale
            this.crowdsale = await MyCrowdsale.new(
                rate,
                wallet,
                this.token.address,
                cap,
                this.openingTime,
                this.closingTime,
                goal,
                { from: deployer }
            );

			// Gives crowdsale contract MinterRole access
            await this.token.addMinter(this.crowdsale.address, { from: deployer });
            
            // Whitelists investor accounts
            await this.crowdsale.addWhitelisted(investor, { from: deployer });

            // Transfers total token supply to crowdsale
            await this.token.transfer(this.crowdsale.address, totalSupply, { from: deployer });
        });

        context('before opening time', function () {
            it('denies refunds', async function () {
                await expectRevert(this.crowdsale.claimRefund(investor),
                    'RefundableCrowdsale: not finalized'
                );
            });
        });

        context('after opening time', function () {
            beforeEach(async function () {
                await time.increaseTo(this.openingTime);
            });

            it('denies refunds', async function () {
                await expectRevert(this.crowdsale.claimRefund(investor),
                    'RefundableCrowdsale: not finalized'
                );            
            });

            context('with unreached goal', function () {
                beforeEach(async function () {
                    await this.crowdsale.sendTransaction({ value: lessThanGoal, from: investor });
                });

                context('after closing time and finalization', function () {
                    beforeEach(async function () {
                        await time.increaseTo(this.afterClosingTime);
                        await this.crowdsale.finalize({ from: other });
                    });

                    it('refunds', async function () {
                        const balanceTracker = await balance.tracker(investor);
                        await this.crowdsale.claimRefund(investor, { gasPrice: 0 });
                        expect(await balanceTracker.delta()).to.be.bignumber.equal(lessThanGoal);
                    });
                });
            });

            context('with reached goal', function () {
                beforeEach(async function () {
                    await this.crowdsale.sendTransaction({ value: goal, from: investor });
                });

                context('after closing time and finalization', function () {
                    beforeEach(async function () {
                        await time.increaseTo(this.afterClosingTime);
                        await this.crowdsale.finalize({ from: other });
                    });

                    it('denies refunds', async function () {
                        await expectRevert(this.crowdsale.claimRefund(investor),
                            'RefundableCrowdsale: goal reached'
                        );
                    });

                    it('forwards funds to wallet', async function () {
                        const postWalletBalance = await balance.current(wallet);
                        expect(postWalletBalance.sub(this.preWalletBalance)).to.be.bignumber.equal(goal);
                    });
                });
            });
        });
    });
});