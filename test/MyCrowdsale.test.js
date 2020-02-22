const MyCrowdsale = artifacts.require("MyCrowdsale");

contract('MyCrowdsale', (accounts) => {
    let tokenSaleInstance;

    it('initializes the contract with the correct values', async () => {
        tokenSaleInstance = await MyCrowdsale.deployed();
        assert.notEqual(tokenSaleInstance.address, 0x0, 'has contract address');
    });
});