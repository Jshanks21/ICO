const { accounts, contract } = require('@openzeppelin/test-environment');
const {
	BN,
	time,
	ether,
	constants, 
	expectEvent,
	expectRevert,
} = require('@openzeppelin/test-helpers');

const chai = require('chai');
const assert = chai.assert;
chai.use(require('chai-as-promised'))
	.should();

const OZToken = contract.fromArtifact("OZToken");
const MyCrowdsale = contract.fromArtifact("MyCrowdsale");
 
describe('MyCrowdsale', function () {
	// Prevents 2000ms timeout error
	this.timeout(0); 

    // Reusable test accounts
	const [ wallet, investor, purchaser ] = accounts;

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
			this.tokenSupply
		);

		// Crowdsale config
		this.rate = new BN('1');
		this.wallet = wallet;
		this.cap = ether('100');
		this.openingTime = (await time.latest()).add(time.duration.weeks(1));
		this.closingTime = this.openingTime.add(time.duration.weeks(2));

		// Deploy Crowdsale
		this.crowdsale = await MyCrowdsale.new(
			this.rate,
			this.wallet,
			this.token.address,
			this.cap,
			this.openingTime,
			this.closingTime
		);

		// Gives crowdsale contract MinterRole access
		await this.token.addMinter(this.crowdsale.address);

		// Whitelists investor accounts
		await this.crowdsale.addWhitelisted(investor);
		await this.crowdsale.addWhitelisted(purchaser);

		// Advances time in tests to crowdsale openingTime
		await time.increaseTo(this.openingTime.add(time.duration.seconds(1)));
	});

	describe('crowdsale', function () {

		// Move to separate token test file
		it('tracks the token name', async function () {
			const name = await this.token.name();
			name.should.equal(this.name);
		});

		it('tracks the rate', async function () {
			const rate = await this.crowdsale.rate();
			rate.should.be.bignumber.equal(this.rate);
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

	describe('accepting payments', function () {

		it('accepts payments', async function () {
			const value = ether('1');
			await this.crowdsale.sendTransaction({ value: value, from: investor }).should.be.fulfilled;
			await this.crowdsale.buyTokens(investor, { value: value, from: purchaser }).should.be.fulfilled;
		});
	});
});