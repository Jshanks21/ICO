const OZToken = artifacts.require("OZToken");

module.exports = function (deployer) {
    let _name = "OZToken";
    let _symbol = "OZT";
    let _decimals = 18;
    deployer.deploy(OZToken, _name, _symbol, _decimals);
};
