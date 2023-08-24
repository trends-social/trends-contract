const {BN} = require("@openzeppelin/test-helpers");
const TrendsSharesV1 = artifacts.require("TrendsSharesV1");
const TrendsToken = artifacts.require("TrendsToken");

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
        expect(error.data.result).to.eq(encoded);
        return;
    }
    expect.fail('Expected an exception but none was received');
}


module.exports = {
    newSharesV1,
    newToken,
    expectRevert,
    expectRevertCustomError
};