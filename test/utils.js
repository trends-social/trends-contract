const {BN} = require("@openzeppelin/test-helpers");
const {toWei} = require("web3-utils");
const TrendsSharesV1 = artifacts.require("TrendsSharesV1");
const TrendsToken = artifacts.require("TrendsToken");

const eth_1 = new BN(toWei('1', 'ether'));
const share1Price = new BN("1").pow(new BN("2")).mul(new BN(toWei(1, 'ether'))).divn(16000);
const share2Price = new BN("2").pow(new BN("2")).mul(new BN(toWei(1, 'ether'))).divn(16000);
const share3Price = new BN("3").pow(new BN("2")).mul(new BN(toWei(1, 'ether'))).divn(16000);
const subject0 = "0x0000000000000000000000000000000000000000000000000000000000000000";
const subject1 = "0x0100000000000000000000000000000000000000000000000000000000000000";
const maxInAmount = new BN(toWei('100', 'ether'));
const minOutAmount = new BN(0);
const initBalance = new BN(toWei('1', 'ether'));

async function newToken(account) {
    return await TrendsToken.new({from: account});
}

async function newSharesV1(token, account) {
    return await TrendsSharesV1.new(token, {from: account});
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


module.exports = {
    newSharesV1,
    newToken,
    expectRevert,
    expectRevertCustomError,
    eth_1,
    share1Price,
    share2Price,
    share3Price,
    subject0,
    subject1,
    maxInAmount,
    minOutAmount,
    initBalance
};