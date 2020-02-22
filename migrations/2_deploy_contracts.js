const DevToken = artifacts.require("DevToken");
const MyCrowdsale = artifacts.require("MyCrowdsale");


module.exports = function (deployer) {
    const totalSupply = 100000000;
    deployer.deploy(DevToken, totalSupply);

    deployer.deploy(MyCrowdsale);
};
