const {newToken, newSharesV1, expectRevert} = require("./utils");
const {BN} = require("@openzeppelin/test-helpers");
const {expect} = require('chai');
const {toWei} = require("web3-utils");

contract('TrendsSharesV1', function (accounts) {
    const onlyOwnerError = "caller is not the owner";
    const invalidFeeError = "invalid";
    const eth_1 = new BN(toWei('1', 'ether'));
    let trendsToken;
    let trendsSharesV1;
    let developer = accounts[0];
    let acc1 = accounts[1];
    beforeEach(async () => {
        trendsToken = await newToken(developer);
        trendsSharesV1 = await newSharesV1(trendsToken.address, developer);
    });


    it('constructor initializes', async function () {
        expect(await trendsSharesV1.TRENDS()).to.eq(trendsToken.address);
        expect(await trendsSharesV1.owner()).to.eq(developer);
    });

    it('set protocol fee destination only owner', async function () {
        await trendsSharesV1.setProtocolFeeDestination(acc1, {from: developer});
        expect(await trendsSharesV1.protocolFeeDestination()).to.eq(acc1);
        await expectRevert(trendsSharesV1.setProtocolFeeDestination(acc1, {from: acc1}), onlyOwnerError);
    });

    it('set lpFarming address only owner', async function () {
        await trendsSharesV1.setLpFarmingAddress(acc1, {from: developer});
        expect(await trendsSharesV1.lpFarmingAddress()).to.eq(acc1);
        await expectRevert(trendsSharesV1.setLpFarmingAddress(acc1, {from: acc1}), onlyOwnerError);
    });

    it('set protocol fee percent only owner', async function () {
        await trendsSharesV1.setProtocolFeePercent(1, {from: developer});
        expect(await trendsSharesV1.protocolFeePercent()).to.be.bignumber.equal(new BN(1));
        await expectRevert(trendsSharesV1.setProtocolFeePercent(1, {from: acc1}), onlyOwnerError);
        await expectRevert(trendsSharesV1.setProtocolFeePercent(eth_1, {from: developer}), invalidFeeError);

    });

    it('set lpFarming fee percent only owner', async function () {
        await trendsSharesV1.setLpFarmingFeePercent(1, {from: developer});
        expect(await trendsSharesV1.lpFarmingFeePercent()).to.be.bignumber.equal(new BN(1));
        await expectRevert(trendsSharesV1.setLpFarmingFeePercent(1, {from: acc1}), onlyOwnerError);
        await expectRevert(trendsSharesV1.setLpFarmingFeePercent(eth_1, {from: developer}), invalidFeeError);

    });

    it('set holder fee percent only owner', async function () {
        await trendsSharesV1.setHolderFeePercent(1, {from: developer});
        expect(await trendsSharesV1.holderFeePercent()).to.be.bignumber.equal(new BN(1));
        await expectRevert(trendsSharesV1.setHolderFeePercent(1, {from: acc1}), onlyOwnerError);
        await expectRevert(trendsSharesV1.setHolderFeePercent(eth_1, {from: developer}), invalidFeeError);
    });

    it('set creator fee percent only owner', async function () {
        await trendsSharesV1.setCreatorFeePercent(1, {from: developer});
        expect(await trendsSharesV1.creatorFeePercent()).to.be.bignumber.equal(new BN(1));
        await expectRevert(trendsSharesV1.setCreatorFeePercent(1, {from: acc1}), onlyOwnerError);
        await expectRevert(trendsSharesV1.setCreatorFeePercent(eth_1, {from: developer}), invalidFeeError);
    });
});