const { accounts, contract } = require('@openzeppelin/test-environment');

const { BN, ether, time, expectRevert } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const OZToken = contract.fromArtifact('OZToken');
const MyCrowdsale = contract.fromArtifact('MyCrowdsale');

describe('CappedCrowdsale', function () {
    // Prevents 2000ms timeout error
    this.timeout(0); 
        
    // Reusable test accounts
    const [ deployer, investor, wallet, purchaser, newBalance1, newBalance2 ] = accounts;

    // Crowdsale config
    const rate = new BN('1');
    const cap = ether('100');

    // Token config
    const name = "OZToken";
    const symbol = "OZT";
    const decimals = 18;
    const tokenSupply = new BN('10').pow(new BN('22'));

    // Reusable test variables
    const value = ether('15');
    const minCap = ether('0.002');
    const maxContribution = ether('50');
    const smallestContribution = 1; // 1 wei


    beforeEach(async function () {

        // Timed Crowdsale config
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

        // Deploy crowdsale
        this.crowdsale = await MyCrowdsale.new(
            rate,
            wallet,
            this.token.address,
            cap,
            this.openingTime,
            this.closingTime,
            { from: deployer }
        );

		// Gives crowdsale contract MinterRole access
		await this.token.addMinter(this.crowdsale.address, { from: deployer });

        // Gives crowdsale contract WhitelistAdminRole access
        await this.crowdsale.addWhitelistAdmin(this.crowdsale.address, { from: deployer });

        // Whitelists investor accounts
        await this.crowdsale.addWhitelisted(wallet, { from: deployer });
        await this.crowdsale.addWhitelisted(investor, { from: deployer }); 
        await this.crowdsale.addWhitelisted(purchaser, { from: deployer }); 
        await this.crowdsale.addWhitelisted(newBalance1, { from: deployer }); 
        await this.crowdsale.addWhitelisted(newBalance2, { from: deployer });

        // Advances time in tests to crowdsale openingTime
        await time.increaseTo(this.openingTime.add(time.duration.seconds(1)));

        // Transfers total token supply to crowdsale
        await this.token.transfer(this.crowdsale.address, tokenSupply, { from: deployer });
    });

    it('rejects a cap of zero', async function () {
        await expectRevert(
            MyCrowdsale.new(
                rate, 
                wallet, 
                this.token.address, 
                0, 
                this.openingTime, 
                this.closingTime, 
                { from: deployer }
            ), 
            'CappedCrowdsale: cap is 0'
        );
    });

    it('does not exceed the hard cap', async function () {
        expect(await this.crowdsale.cap()).to.be.bignumber.equal(cap);
    });

    it('rejects payments below the investor minimum cap', async function () {
        await expectRevert(
            this.crowdsale.buyTokens(investor, { value: ether('0.001'), from: purchaser }),
            'Investor cap reached: Min amount is 0.002 Ether. Max amount is 50 Ether.'
        );
    });

    it('rejects payments above the investor maximum cap', async function () {
        await expectRevert(
            this.crowdsale.buyTokens(investor, { value: ether('51'), from: purchaser }),
            'Investor cap reached: Min amount is 0.002 Ether. Max amount is 50 Ether.'
        );
    });

    describe('token purchases', function () {

        context('when the investor has already met the minimum cap', function () {

            it('allows the investor to contribute below the minimum cap', async function () {
				await this.crowdsale.buyTokens(investor, { value: minCap, from: investor });
				await this.crowdsale.buyTokens(investor, { value: smallestContribution, from: investor });
			});
        });

        context('when the investor has already met the maximum cap', function () {

            it('rejects the transaction', async function () {
				await this.crowdsale.buyTokens(investor, { value: maxContribution, from: investor });
                await expectRevert(
                    this.crowdsale.buyTokens(investor, { value: smallestContribution, from: investor }),
                    'Investor cap reached: Min amount is 0.002 Ether. Max amount is 50 Ether.'
                );				
			});
        });

        context('when the contribution is within the valid range', function () {

            it('accepts the contribution amount', async function () {
                await this.crowdsale.buyTokens(investor, { value, from: investor });
                expect(await this.crowdsale.getContribution({ from: investor })).to.be.bignumber.equal(value);
			});
        });
    });

    describe('ending', function () {

        it('should not reach cap if sent amount is under cap', async function () {
            await this.crowdsale.send(value, { from: purchaser });
            expect(await this.crowdsale.capReached()).to.equal(false);
        });

        it('should not reach cap if sent amount is just under cap', async function () {
            await this.crowdsale.send(maxContribution, { from: newBalance1 });
            await this.crowdsale.send(maxContribution.subn(1), { from: newBalance2 });
            expect(await this.crowdsale.capReached()).to.equal(false);
        });

        it('should reach cap if cap amount is sent', async function () {
            await this.crowdsale.send(maxContribution, { from: purchaser });
            await this.crowdsale.send(maxContribution, { from: wallet });
            expect(await this.crowdsale.capReached()).to.equal(true);
          });

    });


});