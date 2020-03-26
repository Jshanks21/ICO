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
	this.timeout(0); // Prevents 2000ms timeout error
	const [ deployer, wallet, investor1, investor2 ] = accounts;

	beforeEach(async function () {
		// Token config
		this.name = "OZToken";
		this.symbol = "OZT";
		this.decimals = 18;
		this.initialSupply = new BN('10').pow(new BN('22'));

		// Deploy Token
		this.token = await OZToken.new(
			this.name,
			this.symbol,
			this.decimals,
			this.initialSupply
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

		// Gives crowdsale contract WhitelistAdminRole access
		await this.crowdsale.addWhitelistAdmin(this.crowdsale.address);

		// Whitelists investor accounts
		await this.crowdsale.addWhitelisted(investor1);
		await this.crowdsale.addWhitelisted(investor2);

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

	describe('whitelisted crowdsale', function () {

		it('rejects contributions from non-whitelisted investors', async function () {
			await expectRevert(
				this.crowdsale.buyTokens(deployer, { value: ether('1'), from: deployer }),
				"WhitelistCrowdsale: beneficiary doesn't have the Whitelisted role"
			)
		});
	});

	describe('accepting payments', function () {

		it('accepts payments', async function () {
			const value = ether('1');
			const purchaser = investor2;
			await this.crowdsale.sendTransaction({ value: value, from: investor1 }).should.be.fulfilled;
			await this.crowdsale.buyTokens(investor1, { value: value, from: purchaser }).should.be.fulfilled;
		});
	});
});