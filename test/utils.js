const {BN} = require("@openzeppelin/test-helpers");
const {toWei} = require("web3-utils");
const TrendsSharesV1 = artifacts.require("TrendsSharesV1");
const TrendsSharesHelper = artifacts.require("TrendsSharesHelper");
const TrendsToken = artifacts.require("TrendsOFT");
const crypto = require('crypto');
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {web3} = require("hardhat");

const eth_1 = new BN(toWei('1', 'ether'));
const declineRatio = 16000;
const share1Price = new BN("1").pow(new BN("2")).mul(new BN(toWei(1, 'ether'))).divn(declineRatio);
const share2Price = new BN("2").pow(new BN("2")).mul(new BN(toWei(1, 'ether'))).divn(declineRatio);
const share3Price = new BN("3").pow(new BN("2")).mul(new BN(toWei(1, 'ether'))).divn(declineRatio);

const subject0 = "0x0000000000000000000000000000000000000000000000000000000000000000";
const subject1 = "0x0100000000000000000000000000000000000000000000000000000000000000";
const maxInAmount = new BN(toWei('100', 'ether'));
const minOutAmount = new BN(0);
const initBalance = new BN(toWei('1', 'ether'));
const createSharesEthFee = eth_1.divn(1500);

async function newToken(account) {
    return await TrendsToken.new('TRENDS', 'TRENDS', ZERO_ADDRESS, toWei(10000000, 'ether'), {from: account});
}

async function newSharesV1(token, account) {
    return await TrendsSharesV1.new(token, {from: account});
}

async function newSharesHelper(trendsSharesV1, account) {
    return await TrendsSharesHelper.new(trendsSharesV1, {from: account});
}


async function expectRevert(promise, errorMsg) {
    await promise.then(
        () => expect.fail("Expected promise to throw but it didn't"),
        ({message}) => {
            expect(message).to.contains(errorMsg)
        },
    );
}

async function expectRevertCustomError(promise, expectedErrorName) {
    try {
        await promise;
    } catch (error) {
        const encoded = web3.eth.abi.encodeFunctionSignature(expectedErrorName + '()');
        if (error.data !== undefined) {
            expect(error.data.result).to.eq(encoded);
        } else {
            expect(error.message).to.contains(expectedErrorName);
        }
        return;
    }
    expect.fail('Expected an exception but none was received');
}


// Function to hash data
function hash(data) {
    return crypto.createHash('sha256').update(data).digest();
}

// Recursively hash leaf nodes to create Merkle tree
const merkleize = (nodes) => {
    if (nodes.length === 1) return nodes[0];
    const newNodes = [];
    for (let i = 0; i < nodes.length; i += 2) {
        newNodes.push(hash(Buffer.concat([nodes[i], nodes[i + 1] || nodes[i]])));
    }
    return merkleize(newNodes);
};

module.exports = {
    newSharesV1,
    newToken,
    expectRevert,
    expectRevertCustomError,
    declineRatio,
    eth_1,
    share1Price,
    share2Price,
    share3Price,
    subject0,
    subject1,
    maxInAmount,
    minOutAmount,
    initBalance,
    merkleize,
    hash,
    createSharesEthFee,
    newSharesHelper
};