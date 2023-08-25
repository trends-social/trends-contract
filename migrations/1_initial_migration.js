const TrendsOFT = artifacts.require("TrendsOFT");
const utils = require("./util");


module.exports = async function (deployer, network, accounts) {

  console.log("Deploying in network =", network);

  await deployer.deploy(TrendsOFT, utils.tokenName(network), utils.tokenSymbol(network), utils.lzEndpoints(network), toWei(utils.totalSupply(network)));

};

function toWei(bn) {
  return web3.utils.toBN(bn).mul(web3.utils.toBN(1e18));
}