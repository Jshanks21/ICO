const OZToken = artifacts.require("OZToken");
const MyCrowdsale = artifacts.require("MyCrowdsale");

module.exports = function (deployer) {
    let _name = "OZToken";
    let _symbol = "OZT";
    let _decimals = 18;
    deployer.deploy(OZToken, _name, _symbol, _decimals);
    
    // let _rate = '500';
    // let _wallet = '*';
    // let _token = OZToken.address;
    // deployer.deploy(MyCrowdsale, _rate, _wallet, _token);
};
