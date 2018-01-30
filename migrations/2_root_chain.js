var RootChain = artifacts.require('./RootChain.sol')

module.exports = function(deployer) {
  deployer.deploy(RootChain)
}
