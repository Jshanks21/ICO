const DevToken = artifacts.require("DevToken");

module.exports = function (deployer) {
    const totalSupply = 100000000;

    deployer.deploy(DevToken, totalSupply);
};
