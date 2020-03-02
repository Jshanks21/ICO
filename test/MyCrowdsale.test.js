const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const {
	BN,
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
	this.timeout(0);
	const [ deployer, wallet, investor1, investor2 ] = accounts;

	beforeEach(async function () {
		// Token config
		this.name = "OZToken";
		this.symbol = "OZT";
		this.decimals = 18;

		// Deploy Token
		this.token = await OZToken.new(
			this.name,
			this.symbol,
			this.decimals
		);

		// Crowdsale config
		this.rate = '500';
		this.wallet = wallet;

		// Deploy Crowdsale
		this.crowdsale = await MyCrowdsale.new(
			this.rate,
			this.wallet,
			this.token.address
		);

		// Gives crowdsale contract MinterRole access
		await this.token.addMinter(this.crowdsale.address);

	});

	describe('crowdsale', function () {

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

	describe('minted crowdsale', function () {

		it('mints tokens after purchase', async function () {
			const originalTotalSupply = await this.token.totalSupply();
			await this.crowdsale.sendTransaction({ value: ether('1'), from: investor1 });
			const newTotalSupply = await this.token.totalSupply();
			assert.isTrue(originalTotalSupply < newTotalSupply);
		});
	});

	describe('accepting payments', function () {

		it('accept payments', async function () {
			const value = ether('1');
			const purchaser = investor2;
			await this.crowdsale.sendTransaction({ value: value, from: investor1 }).should.be.fulfilled;
			await this.crowdsale.buyTokens(investor1, { value: value, from: purchaser }).should.be.fulfilled;
		});
	});

});