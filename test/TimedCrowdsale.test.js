const { accounts, contract } = require('@openzeppelin/test-environment');

const { 
    BN, 
    ether, 
    expectEvent, 
    expectRevert, 
    time 
} = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const OZToken = contract.fromArtifact("OZToken");
const MyCrowdsale = contract.fromArtifact("MyCrowdsale");

describe('TimedCrowdsale', function () {
	// Prevents 2000ms timeout error
	this.timeout(0); 
	
	// Reusable test accounts
	const [ investor, wallet, purchaser, owner ] = accounts;

	// Token config
	const name = "OZToken";
	const symbol = "OZT";
	const decimals = 18;
	const tokenSupply = new BN('10').pow(new BN('22'));

	// Reusable test value
	const value = ether('1');


    beforeEach(async function () {

		// Deploy Token
		this.token = await OZToken.new(
			name,
			symbol,
			decimals,
			tokenSupply,
			{ from: owner }
		);

		// Crowdsale config
		this.rate = new BN('1');
		this.wallet = wallet;
		this.cap = ether('100');
		this.openingTime = (await time.latest()).add(time.duration.weeks(1));
		this.closingTime = this.openingTime.add(time.duration.weeks(1));
        
        // Used to test before openingTime and after closingTime.
        this.afterClosingTime = await this.closingTime.add(time.duration.seconds(1));
        this.beforeOpeningTime = await this.openingTime.sub(time.duration.seconds(1));
    });
    
    it('reverts if the opening time is in the past', async function () {
        await expectRevert(MyCrowdsale.new(
            this.rate, this.wallet, this.token.address, this.cap, (await time.latest()).sub(time.duration.days(1)), this.closingTime
        ), 'TimedCrowdsale: opening time is before current time')
	});
	
	it('reverts if the closing time is before the opening time', async function () {
		await expectRevert(MyCrowdsale.new(
			this.rate, this.wallet, this.token.address, this.cap, this.openingTime, this.beforeOpeningTime
		), 'TimedCrowdsale: opening time is not before closing time'); 
	});

	it('reverts if the closing time equals the opening time', async function () {
		await expectRevert(MyCrowdsale.new(
			this.rate, this.wallet, this.token.address, this.cap, this.openingTime, this.openingTime
		), 'TimedCrowdsale: opening time is not before closing time')
	});
	
	context('with crowdsale', function () {
		beforeEach(async function () {
			// Deploy Crowdsale
			this.crowdsale = await MyCrowdsale.new(
				this.rate,
				this.wallet,
				this.token.address,
				this.cap,
				this.openingTime,
				this.closingTime,
				{ from: owner }
			);

			// Gives crowdsale contract MinterRole access
			await this.token.addMinter(this.crowdsale.address, { from: owner });

			// Whitelists test accounts
			await this.crowdsale.addWhitelisted(investor, { from: owner });
			await this.crowdsale.addWhitelisted(purchaser, { from: owner });
			
			// Transfers total token supply to crowdsale
			await this.token.transfer(this.crowdsale.address, tokenSupply, { from: owner });
		});

		it('is open', async function () {
			await time.increaseTo(this.openingTime.add(time.duration.seconds(1)));
			expect(await this.crowdsale.isOpen()).to.equal(true);
		});
		
		it('holds the total token supply', async function () {
			const balance = await this.token.balanceOf(this.crowdsale.address);
			balance.should.be.bignumber.equal(tokenSupply);
		});

		it('should only close after the closing time', async function () {
			expect(await this.crowdsale.hasClosed()).to.equal(false);
			await time.increaseTo(this.afterClosingTime);
			expect(await this.crowdsale.isOpen()).to.equal(false);
			expect(await this.crowdsale.hasClosed()).to.equal(true);
		});

		describe('accepting payments', function () {
			it('should reject payments before opening time', async function () {
				expect(await this.crowdsale.isOpen()).to.equal(false);
				await expectRevert(this.crowdsale.send(value, { from: investor }), 'TimedCrowdsale: not open');
				await expectRevert(this.crowdsale.buyTokens(investor, { from: purchaser, value: value }),
					'TimedCrowdsale: not open'
				);
			});

			it('should accept payments after opening time', async function () {
				await time.increaseTo(this.openingTime);
				expect(await this.crowdsale.isOpen()).to.equal(true);
				await this.crowdsale.send(value, { from: purchaser });
				await this.crowdsale.buyTokens(investor, { from: purchaser, value: value });
			});

			it('should reject payments after closing time', async function () {
				await time.increaseTo(this.afterClosingTime);
				await expectRevert(this.crowdsale.send(value, { from: investor }), 'TimedCrowdsale: not open');
				await expectRevert(this.crowdsale.buyTokens(investor, { from: purchaser, value: value }), 
					'TimedCrowdsale: not open'
				);
			});
		});

		describe('extending closing time', function () {
			it('should not reduce duration', async function () {
				// Same closing time previously declared
				await expectRevert(this.crowdsale.extendTime(this.closingTime, { from: owner }),
					'TimedCrowdsale: new closing time is before current closing time'
				);

				// Before closing time previously declared
				const newClosingTime = this.closingTime.sub(time.duration.seconds(1));
				await expectRevert(this.crowdsale.extendTime(newClosingTime, { from: owner }), 
					'TimedCrowdsale: new closing time is before current closing time');
			});

			context('before crowdsale opening time', function () {
				beforeEach(async function () {
					expect(await this.crowdsale.isOpen()).to.equal(false);
					await expectRevert(this.crowdsale.send(value, { from: purchaser }), 'TimedCrowdsale: not open');
				});

				it('extends end time', async function () {
					const newClosingTime = this.closingTime.add(time.duration.days(1));
					const logs = await this.crowdsale.extendTime(newClosingTime, { from: owner });
					expectEvent(logs, 'TimedCrowdsaleExtended', {
						prevClosingTime: this.closingTime,
						newClosingTime: newClosingTime,
					});
					expect(await this.crowdsale.closingTime()).to.be.bignumber.equal(newClosingTime);
				});				
			});

			context('after crowdsale opening time & before closing time', function () {
				beforeEach(async function () {
					await time.increaseTo(this.openingTime);
					expect(await this.crowdsale.isOpen()).to.equal(true);
					await this.crowdsale.send(value, { from: purchaser });
				});

				it('extends the closing time', async function () {
					const newClosingTime = this.closingTime.add(time.duration.days(1));
					const logs = await this.crowdsale.extendTime(newClosingTime, { from: owner });
					expectEvent(logs, 'TimedCrowdsaleExtended', {
						prevClosingTime: this.closingTime,
						newClosingTime: newClosingTime,
					});
					expect(await this.crowdsale.closingTime()).to.be.bignumber.equal(newClosingTime);
				});
			});

			context('after crowdsale closing time', function () {
				beforeEach(async function () {
					await time.increaseTo(this.afterClosingTime);
				});

				it('reverts time extension', async function () {
					const newClosingTime = await time.latest();
					await expectRevert(this.crowdsale.extendTime(newClosingTime, { from: owner }),
						'TimedCrowdsale: already closed'
					);
				});
			});
		});
	});
});