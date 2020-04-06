const { accounts, contract } = require('@openzeppelin/test-environment');

const {
	BN,
	time,
	ether,
	balance,
	expectRevert
} = require('@openzeppelin/test-helpers');

const { expect } = require('chai');
const chai = require('chai');
chai.use(require('chai-as-promised'))
	.should();

const OZToken = contract.fromArtifact("OZToken");
const MyCrowdsale = contract.fromArtifact("MyCrowdsale");
 
describe('MyCrowdsale', function () {
	// Prevents 2000ms timeout error
	this.timeout(0); 

    // Reusable test accounts
	const [ deployer, wallet, investor, purchaser, other ] = accounts;

	// Presale and public sale settings
	const value = ether('10');
	const preIcoStage = new BN('0');
	const icoStage = new BN('1');
	const preIcoRate = new BN('500');
	const icoRate = new BN('250');
	const preICOTokenAmount = preIcoRate.mul(value);
	const icoTokenAmount = icoRate.mul(value);

	beforeEach(async function () {

		// Token config
		this.name = "OZToken";
		this.symbol = "OZT";
		this.decimals = 18;
		this.tokenSupply = new BN('10').pow(new BN('22'));

		// Deploy Token
		this.token = await OZToken.new(
			this.name,
			this.symbol,
			this.decimals,
			this.tokenSupply,
			{ from: deployer }
		);

		// Crowdsale config
		this.rate = new BN('500');
		this.wallet = wallet;
		this.cap = ether('100');
		this.openingTime = (await time.latest()).add(time.duration.weeks(1));
		this.closingTime = this.openingTime.add(time.duration.weeks(2));
		this.afterClosingTime = await this.closingTime.add(time.duration.seconds(1));
		this.goal = ether('10');

		// Deploy Crowdsale
		this.crowdsale = await MyCrowdsale.new(
			this.rate,
			this.wallet,
			this.token.address,
			this.cap,
			this.openingTime,
			this.closingTime,
			this.goal,
			{ from: deployer }
		);

		// Gives crowdsale contract MinterRole access
		await this.token.addMinter(this.crowdsale.address, { from: deployer });

		// Whitelists investor accounts
		await this.crowdsale.addWhitelisted(investor, { from: deployer });
		await this.crowdsale.addWhitelisted(purchaser, { from: deployer });

		// Advances time in tests to crowdsale openingTime
		await time.increaseTo(this.openingTime);

        // Transfers total token supply to crowdsale
        await this.token.transfer(this.crowdsale.address, this.tokenSupply, { from: deployer });
	});

	describe('crowdsale', function () {

		// Move to separate token test file
		it('tracks the token name', async function () {
			const name = await this.token.name();
			name.should.equal(this.name);
		});

		it('tracks the wallet', async function () {
			const wallet = await this.crowdsale.wallet();
			wallet.should.equal(this.wallet);
		});

		it('tracks the token', async function () {
			const token = await this.crowdsale.token();
			token.should.equal(this.token.address);
		}); 
	});

	describe('crowdsale stages', function () {
		it('allows the admin to update the stage', async function () {
			await this.crowdsale.setCrowdsaleStage(icoStage, { from: deployer });
			const stage = await this.crowdsale.stage();
			stage.should.be.bignumber.equal(icoStage);
		});

		it('prevents non-admin from updating the stage', async function () {
			await expectRevert(
				this.crowdsale.setCrowdsaleStage(icoStage, { from: investor }),
				'Ownable: caller is not the owner'
			);
		});

		context('presale phase', function () {
			it('starts in presale stage', async function () {
				const stage = await this.crowdsale.stage();
				stage.should.be.bignumber.equal(preIcoStage);
			});
	
			it('starts with the presale rate', async function () {
				const rate = await this.crowdsale.rate();
				rate.should.be.bignumber.equal(preIcoRate);
				rate.should.be.bignumber.equal(this.rate);
			});

			describe('transfers', function () {
				beforeEach(async function () {
					this.preWalletBalance = await balance.current(wallet);
					await this.crowdsale.buyTokens(investor, { value });
					await time.increaseTo(this.afterClosingTime);
					await this.crowdsale.finalize({ from: other });		
				});

				it('sends the token amount for the presale rate', async function () {
					expect(await this.token.balanceOf(investor)).to.be.bignumber.equal(preICOTokenAmount);
				});

				it('forwards funds to wallet', async function () {
					const postWalletBalance = await balance.current(wallet);
					expect(postWalletBalance.sub(this.preWalletBalance)).to.be.bignumber.equal(this.goal);
				});
			});			
		});

		context('public sale phase', function () {
			beforeEach(async function () {
				await this.crowdsale.setCrowdsaleStage(icoStage, { from: deployer });
				await this.crowdsale.buyTokens(investor, { value, from: investor });
			});

			it('sends the token amount for the public sale rate', async function () {
				expect(await this.token.balanceOf(investor)).to.be.bignumber.equal(icoTokenAmount);
			});
		});
	});

	describe('accepting payments', function () {

		it('accepts payments', async function () {
			await this.crowdsale.sendTransaction({ value: value, from: investor }).should.be.fulfilled;
			await this.crowdsale.buyTokens(investor, { value: value, from: purchaser }).should.be.fulfilled;
		});
	});
});