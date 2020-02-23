const chai = require('chai');
const BN = require('bn.js');
chai.use(require('chai-bn')(BN))
	.should();

const OZToken = artifacts.require("OZToken");
const MyCrowdsale = artifacts.require("MyCrowdsale");

contract('MyCrowdsale', ([deployer, wallet]) => {

	beforeEach(async () => {
		// Token configuration
		this.name = "OZToken";
		this.symbol = "OZT";
		this.decimals = 18;

		// Deploy token
		this.token = await OZToken.new(
			this.name,
			this.symbol,
			this.decimals
		);

		// Crowdsale configuration
		this.rate = '500';
		this.wallet = wallet;

		// Deploy crowdsale contract
		this.crowdsale = await MyCrowdsale.new(
			this.rate,
			this.wallet,
			this.token.address
		);
	});

	describe('crowdsale', () => {
		it('tracks the token', async () => {
			const token = await this.crowdsale.token();
			token.should.equal(this.token.address);
		});

		it('tracks the token name', async () => {
			const name = await this.token.name();
			name.should.equal(this.name);
		});

		it('tracks the rate', async () => {
			const rate = await this.crowdsale.rate();
			rate.should.be.bignumber.equal(this.rate);
		});

		it('tracks the wallet', async () => {
			const wallet = await this.crowdsale.wallet();
			wallet.should.equal(this.wallet);
		});

	});

});