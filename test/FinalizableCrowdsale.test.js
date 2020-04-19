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
const MyCrowdsale = contract.fromArtifact("MyCrowdsale");

describe('FinalizableCrowdsale', function () {
    // Prevents 2000ms timeout error
    this.timeout(0); 
    
    // Reusable test accounts
    const [ deployer, investor, wallet, purchaser, other ] = accounts;

    // Reusable test variables
    const lessThanGoal = ether('9');
    const value = ether('1')

    // Token config
    const name = "OZToken";
    const symbol = "OZT";
    const decimals = 18;
    const totalSupply = new BN('10').pow(new BN('22'));

    // Crowdsale config
    const rate = new BN('1');
    const cap = ether('50');
    const goal = ether('10');
    const icoStage = new BN('1');


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
        
        // Gives the crowdsale the pauser role
        await this.token.addPauser(this.crowdsale.address, { from: deployer });

        // Advances time to crowdsale opening time
        await time.increaseTo(this.openingTime);

		// Whitelists investor accounts
		await this.crowdsale.addWhitelisted(investor, { from: deployer });
        await this.crowdsale.addWhitelisted(purchaser, { from: deployer });
        
        // Allows crowdsale to mint tokens upon purchase
        await this.token.addMinter(this.crowdsale.address, { from: deployer });

        // Renounces minter role for the contract deployer so only crowdsale can mint tokens
        await this.token.renounceMinter({ from: deployer });

        // Transfers total token supply to crowdsale
        await this.token.transfer(this.crowdsale.address, totalSupply, { from: deployer });
    });

    it('has deployer as the pauser', async function () {
        expect(await this.token.isPauser(deployer)).to.equal(true);
    })

    it('cannot be finalized before ending', async function () {
        await expectRevert(this.crowdsale.finalize({ from: other }),
            'FinalizableCrowdsale: not closed'
        );
    });

    it('can be finalized by anyone after ending', async function () {
        await time.increaseTo(this.afterClosingTime);
        await this.crowdsale.finalize({ from: other });
    });

    it('cannot be finalized twice', async function () {
        await time.increaseTo(this.afterClosingTime);
        await this.crowdsale.finalize({ from: other });
        await expectRevert(this.crowdsale.finalize({ from: other }),
            'FinalizableCrowdsale: already finalized'
        );
    });

    it('logs finalized', async function () {
        await time.increaseTo(this.afterClosingTime);
        const logs = await this.crowdsale.finalize({ from: other });
        expectEvent(logs, 'CrowdsaleFinalized');
    });

    context('token transfers during crowdsale', function () {
        beforeEach(async function () {
            await this.token.pause({ from: deployer });
            await this.crowdsale.setCrowdsaleStage(icoStage, { from: deployer });
        })

        it('does not allow token transfers during crowdsale', async function () {
            await this.crowdsale.buyTokens(purchaser, { value, from: purchaser });
            await expectRevert(this.token.transfer(investor, value, { from: purchaser }),
                'Pausable: paused'
            );
        });
    });

    context('with unreached goal', function () {
        beforeEach(async function () { 
            await this.crowdsale.setCrowdsaleStage(icoStage, { from: deployer });
            await this.crowdsale.sendTransaction({ value: lessThanGoal, from: investor });            
        });

        context('after closing time and finalization', function () {
            beforeEach(async function () {
                await time.increaseTo(this.afterClosingTime);
                await this.crowdsale.finalize({ from: deployer });
            });

            it('refunds investors', async function () {
                const balanceTracker = await balance.tracker(investor);
                await this.crowdsale.claimRefund(investor, { gasPrice: 0 });
                expect(await balanceTracker.delta()).to.be.bignumber.equal(lessThanGoal);
            });
        });

    });

    context('with reached goal', function () {
        beforeEach(async function () {
            await this.token.pause({ from: deployer });
            await this.crowdsale.setCrowdsaleStage(icoStage, { from: deployer });
            await this.crowdsale.buyTokens(investor, { value: goal, from: investor });
        });

        context('after closing time and finalization', function () {
            beforeEach(async function () {
                await time.increaseTo(this.afterClosingTime);
                await this.crowdsale.finalize({ from: deployer });
            });

            it('confirms the goal is reached', async function () {
                const goalReached = await this.crowdsale.goalReached();
                expect(goalReached).to.equal(true);
            });

            it('renounces minter roles', async function () {
                expect(await this.token.isMinter(this.crowdsale.address)).to.equal(false);
            });

            it('should unpause the tokens for transfer', async function () {
                expect(await this.token.paused()).to.equal(false);
            })

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