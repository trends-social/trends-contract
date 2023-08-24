const {
    newToken,
    newSharesV1,
    expectRevert,
    subject0,
    initBalance,
    maxInAmount,
    share1Price,
    eth_1, share2Price, minOutAmount, expectRevertCustomError, subject1, share3Price
} = require("./utils");
const {expect} = require('chai');
const {BN, expectEvent} = require("@openzeppelin/test-helpers");
const {toWei} = require("web3-utils");

const holderFeePercent = new BN(toWei('10', 'ether')).divn(100);

contract('TrendsSharesV1', function (accounts) {
    let trendsToken;
    let trendsSharesV1;
    let developer = accounts[0];
    let creator1 = accounts[1];
    let buyer1 = accounts[3];
    let buyer2 = accounts[4];
    beforeEach(async () => {
        trendsToken = await newToken(developer);
        trendsSharesV1 = await newSharesV1(trendsToken.address, developer);
        await trendsSharesV1.setHolderFeePercent(holderFeePercent, {from: developer});
        await trendsSharesV1.createShares(subject0, {from: creator1});

        await trendsToken.transfer(buyer1, initBalance, {from: developer});
        await trendsToken.approve(trendsSharesV1.address, initBalance, {from: buyer1});

        await trendsToken.transfer(buyer2, initBalance, {from: developer});
        await trendsToken.approve(trendsSharesV1.address, initBalance, {from: buyer2});
    });
    describe('get reward', function () {
        it('reward perShareStored is correct after buy shares', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            expect(await trendsSharesV1.rewardPerShareStored(subject0)).to.be.bignumber.equal(share1Price.mul(holderFeePercent));
            await trendsSharesV1.buyShares(buyer2, subject0, 1, maxInAmount, {from: buyer2});
            expect(await trendsSharesV1.rewardPerShareStored(subject0)).to.be.bignumber.equal(
                share1Price.mul(holderFeePercent).add(
                    share2Price.mul(holderFeePercent).divn(2)
                ));
        });

        it('reward is 0 after buy shares', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            expect(await trendsSharesV1.getReward(subject0, buyer1)).to.be.bignumber.equal(new BN(0));
        });

        it('creator reward increases after buy shares', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            expect(await trendsSharesV1.getReward(subject0, creator1)).to.be.bignumber.equal(share1Price.mul(holderFeePercent).div(eth_1));
        });

        it('creator and buyer1 reward increases after buyer2 buy shares', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            await trendsSharesV1.buyShares(buyer2, subject0, 1, maxInAmount, {from: buyer2});
            expect(await trendsSharesV1.getReward(subject0, buyer1)).to.be.bignumber.equal(share2Price.mul(holderFeePercent).div(eth_1).divn(2));
            expect(await trendsSharesV1.getReward(subject0, creator1)).to.be.bignumber.equal(
                share1Price.mul(holderFeePercent).div(eth_1).add(
                    share2Price.mul(holderFeePercent).div(eth_1).divn(2)));
        });

        it('reward increases after sell shares', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            await trendsSharesV1.buyShares(buyer2, subject0, 1, maxInAmount, {from: buyer2});
            await trendsSharesV1.sellShares(buyer1, subject0, 1, minOutAmount, {from: buyer1});
            expect(await trendsSharesV1.rewardPerShareStored(subject0)).to.be.bignumber.equal(
                share1Price.mul(holderFeePercent).add(
                    share2Price.mul(holderFeePercent).divn(2)
                ).add(
                    share2Price.mul(holderFeePercent).divn(3)
                ));
            expect(await trendsSharesV1.getReward(subject0, buyer2)).to.be.bignumber.equal(share2Price.mul(holderFeePercent).div(eth_1).divn(3));
            expect(await trendsSharesV1.getReward(subject0, buyer1)).to.be.bignumber.equal(
                share2Price.mul(holderFeePercent).div(eth_1).divn(2).add(
                    share2Price.mul(holderFeePercent).div(eth_1).divn(3)));
            expect(await trendsSharesV1.getReward(subject0, creator1)).to.be.bignumber.equal(
                share1Price.mul(holderFeePercent).div(eth_1).add(
                    share2Price.mul(holderFeePercent).div(eth_1).divn(2)).add(
                    share2Price.mul(holderFeePercent).div(eth_1).divn(3)));
        });

    });

    describe('withdraw reward', function () {
        beforeEach(async () => {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
        });

        it('withdraw reward emit event', async function () {
            let receipt = await trendsSharesV1.withdrawReward(subject0, {from: creator1});
            expectEvent(receipt, 'WithdrawReward', {
                holder: creator1,
                subject: subject0,
                reward: share1Price.mul(holderFeePercent).div(eth_1)
            });
        });

        it('user token increases after withdraw reward', async function () {
            await trendsSharesV1.withdrawReward(subject0, {from: creator1});
            expect(await trendsToken.balanceOf(creator1)).to.be.bignumber.equal(share1Price.mul(holderFeePercent).div(eth_1));
        });

        it('reward is 0 after withdraw', async function () {
            await trendsSharesV1.withdrawReward(subject0, {from: creator1});
            expect(await trendsSharesV1.getReward(subject0, creator1)).to.be.bignumber.equal(new BN(0));
            let holderRewardStruct = await trendsSharesV1.holderSharesReward(subject0, creator1);
            expect(holderRewardStruct.reward).to.be.bignumber.equal(new BN(0));
            expect(holderRewardStruct.rewardPerSharePaid).to.be.bignumber.equal(await trendsSharesV1.rewardPerShareStored(subject0));
        });

        it('creator withdraw reward more times', async function () {
            await trendsSharesV1.withdrawReward(subject0, {from: creator1});
            await trendsSharesV1.buyShares(buyer2, subject0, 1, maxInAmount, {from: buyer2});
            await trendsSharesV1.withdrawReward(subject0, {from: creator1});
            let holderRewardStruct = await trendsSharesV1.holderSharesReward(subject0, creator1);
            expect(holderRewardStruct.reward).to.be.bignumber.equal(new BN(0));
            expect(holderRewardStruct.rewardPerSharePaid).to.be.bignumber.equal(await trendsSharesV1.rewardPerShareStored(subject0));
            expect(await trendsToken.balanceOf(creator1)).to.be.bignumber.equal(share1Price.mul(holderFeePercent).div(eth_1).add(
                share2Price.mul(holderFeePercent).div(eth_1).divn(2)
            ));
        });

        it('buyer withdraw reward more times', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            let buyer1Balance = await trendsToken.balanceOf(buyer1);
            await trendsSharesV1.withdrawReward(subject0, {from: buyer1});
            expect((await trendsToken.balanceOf(buyer1)).sub(buyer1Balance)).to.be.bignumber.equal(share2Price.mul(holderFeePercent).div(eth_1).divn(2));
            await trendsSharesV1.buyShares(buyer2, subject0, 1, maxInAmount, {from: buyer2});
            await trendsSharesV1.withdrawReward(subject0, {from: buyer1});
            let holderRewardStruct = await trendsSharesV1.holderSharesReward(subject0, buyer1);
            expect(holderRewardStruct.reward).to.be.bignumber.equal(new BN(0));
            expect(holderRewardStruct.rewardPerSharePaid).to.be.bignumber.equal(await trendsSharesV1.rewardPerShareStored(subject0));
            expect((await trendsToken.balanceOf(buyer1)).sub(buyer1Balance)).to.be.bignumber.equal(share2Price.mul(holderFeePercent).div(eth_1).divn(2).add(
                share3Price.mul(holderFeePercent).div(eth_1).muln(2).divn(3)
            ));
        });

        it('fails if reward is 0', async function () {
            await expectRevertCustomError(trendsSharesV1.withdrawReward(subject0, {from: buyer2}), "NoRewards");
        });

    });


});