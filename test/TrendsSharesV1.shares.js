const {
    newToken, newSharesV1, expectRevert, expectRevertCustomError, subject0, share1Price, maxInAmount, eth_1,
    initBalance, share2Price, share3Price, subject1, minOutAmount, declineRatio, createSharesEthFee
} = require("./utils");
const {expect} = require('chai');

const {
    constants,    // Common constants, like the zero address and largest integers
    expectEvent, BN,  // Assertions for emitted events
} = require('@openzeppelin/test-helpers');
const {toWei} = require("web3-utils");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {web3} = require("hardhat");


const protocolFeePercent = new BN(toWei('1', 'ether')).divn(100);
const holderFeePercent = new BN(toWei('4', 'ether')).divn(100);
const creatorFeePercent = new BN(toWei('8', 'ether')).divn(100);
const protocolFee = share1Price.mul(protocolFeePercent).div(eth_1);
const creatorFee = share1Price.mul(creatorFeePercent).div(eth_1);
const holderFee = share1Price.mul(holderFeePercent).div(eth_1);
const totalFees = protocolFee.add(creatorFee).add(holderFee);

let trendsToken;
let trendsSharesV1;
let protocolFeeDestination;
let devFund;
let developer;
contract('TrendsSharesV1', function (accounts) {
    developer = accounts[0];
    let creator1 = accounts[1];
    let buyer1 = accounts[3];
    let buyer2 = accounts[4];
    let buyer3 = accounts[7];
    protocolFeeDestination = accounts[5];
    devFund = accounts[6];
    beforeEach(async () => {
        trendsToken = await newToken(developer);
        trendsSharesV1 = await newSharesV1(trendsToken.address, developer);
    });
    describe('create shares', function () {
        let createTxReceipt;
        beforeEach(async () => {
            createTxReceipt = await trendsSharesV1.createShares(subject0, declineRatio, {
                from: creator1,
                value: createSharesEthFee
            });
        });
        it('create shares emit event', async function () {
            expectEvent(createTxReceipt, 'Create', {
                creator: creator1, subject: subject0, ethFee: createSharesEthFee
            });
            expectEvent(createTxReceipt, 'Trade', {
                trader: creator1,
                subject: subject0,
                isBuy: true,
                shares: new BN(1),
                price: new BN(0),
                protocolFee: new BN(0),
                creatorFee: new BN(0),
                holderFee: new BN(0),
                supply: new BN(1)
            });
        });

        it('create shares fees to dev fund', async function () {
            await trendsSharesV1.setDevFundDestination(devFund, {from: developer});
            let devFundBalance = await web3.eth.getBalance(devFund);
            await trendsSharesV1.createShares(subject1, declineRatio, {
                from: creator1,
                value: createSharesEthFee
            });
            expect(await web3.eth.getBalance(devFund)).to.be.bignumber.equal(createSharesEthFee.add(new BN(devFundBalance)));
        });

        it('shares supply and holder will change after create shares', async function () {
            expect(await trendsSharesV1.sharesSupply(subject0)).to.be.bignumber.equal(new BN(1));
            expect(await trendsSharesV1.sharesBalance(subject0, creator1)).to.be.bignumber.equal(new BN(1));
        });

        it('creator can create several shares', async function () {
            await trendsSharesV1.createShares(subject1, declineRatio, {from: creator1, value: createSharesEthFee});
        });


        it('fails if shares exists', async function () {
            await expectRevertCustomError(trendsSharesV1.createShares(subject0, declineRatio, {
                from: creator1,
                value: createSharesEthFee
            }), "ShareCreated");
        });

        it('fails if with insufficient eth', async function () {
            await expectRevertCustomError(trendsSharesV1.createShares(subject1, declineRatio, {
                from: creator1,
                value: createSharesEthFee.subn(1)
            }), "InsufficientEth");
        });

        it('fails if dev fund destination incorrect', async function () {
            await trendsSharesV1.setDevFundDestination(trendsSharesV1.address, {from: developer});
            await expectRevertCustomError(trendsSharesV1.createShares(subject1, declineRatio, {
                from: creator1,
                value: createSharesEthFee
            }), "UnableSendDevFund");
        });

        it('fails if decline ratio is 0', async function () {
            await expectRevert(trendsSharesV1.createShares(subject1, 0, {
                from: creator1,
                value: createSharesEthFee
            }), "by zero");
        });

        it('fails if decline ratio is not divisible', async function () {
            await expectRevertCustomError(trendsSharesV1.createShares(subject1, 3, {
                from: creator1,
                value: createSharesEthFee
            }), "InvalidDeclineRatio");
        });
    });

    describe('buy shares', function () {
        beforeEach(async () => {
            await trendsSharesV1.createShares(subject0, declineRatio, {from: creator1, value: createSharesEthFee});
            await trendsToken.transfer(buyer1, initBalance, {from: developer});
            await trendsToken.approve(trendsSharesV1.address, initBalance, {from: buyer1});
            await trendsToken.transfer(buyer2, initBalance, {from: developer});
            await trendsToken.approve(trendsSharesV1.address, initBalance, {from: buyer2});
        });

        it('buy shares emit event', async function () {
            let receipt = await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            expectEvent(receipt, 'Trade', {
                trader: buyer1,
                subject: subject0,
                isBuy: true,
                shares: new BN(1),
                price: share1Price,
                protocolFee: new BN(0),
                creatorFee: new BN(0),
                holderFee: new BN(0),
                supply: new BN(2)
            });

        });

        it('buyer can buy 0 share', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 0, maxInAmount, {from: buyer1});
            expect(await trendsSharesV1.sharesSupply(subject0)).to.be.bignumber.equal(new BN(1));
            expect(await trendsSharesV1.sharesBalance(subject0, buyer1)).to.be.bignumber.equal(new BN(0));
        });

        it('buyer balance change after buy 1 share', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            expect(await trendsSharesV1.sharesSupply(subject0)).to.be.bignumber.equal(new BN(2));
            expect(await trendsSharesV1.sharesBalance(subject0, buyer1)).to.be.bignumber.equal(new BN(1));
            expect(await trendsToken.balanceOf(trendsSharesV1.address)).to.be.bignumber.equal(share1Price);
            expect(await trendsToken.balanceOf(buyer1)).to.be.bignumber.equal(initBalance.sub(share1Price));
        });

        it('buyer balance change after buy 2 shares', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 2, maxInAmount, {from: buyer1});
            expect(await trendsSharesV1.sharesSupply(subject0)).to.be.bignumber.equal(new BN(3));
            expect(await trendsSharesV1.sharesBalance(subject0, buyer1)).to.be.bignumber.equal(new BN(2));
            expect(await trendsToken.balanceOf(trendsSharesV1.address)).to.be.bignumber.equal(share1Price.add(share2Price));
            expect(await trendsToken.balanceOf(buyer1)).to.be.bignumber.equal(initBalance.sub(share1Price.add(share2Price)));
        });

        it('buyer can buy shares more times', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            expect(await trendsSharesV1.sharesSupply(subject0)).to.be.bignumber.equal(new BN(3));
            expect(await trendsSharesV1.sharesBalance(subject0, buyer1)).to.be.bignumber.equal(new BN(2));
        });

        it('buyer1,2 can buy shares', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            await trendsSharesV1.buyShares(buyer2, subject0, 2, maxInAmount, {from: buyer2});
            expect(await trendsSharesV1.sharesSupply(subject0)).to.be.bignumber.equal(new BN(4));
            expect(await trendsSharesV1.sharesBalance(subject0, buyer1)).to.be.bignumber.equal(new BN(1));
            expect(await trendsSharesV1.sharesBalance(subject0, buyer2)).to.be.bignumber.equal(new BN(2));
        });

        it('buyer1 can buy shares to buyer2', async function () {
            await trendsSharesV1.buyShares(buyer2, subject0, 1, maxInAmount, {from: buyer1});
            expect(await trendsSharesV1.sharesBalance(subject0, buyer1)).to.be.bignumber.equal(new BN(0));
            expect(await trendsSharesV1.sharesBalance(subject0, buyer2)).to.be.bignumber.equal(new BN(1));
        });

        it('fails if recipient is zero address ', async function () {
            await expectRevertCustomError(trendsSharesV1.buyShares(ZERO_ADDRESS, subject0, 1, share1Price.subn(1), {from: buyer1}), "Address0");
        });

        it('fails if max in amount not enough', async function () {
            await expectRevertCustomError(trendsSharesV1.buyShares(buyer1, subject0, 1, share1Price.subn(1), {from: buyer1}), "InAmountNotEnough");
        });

        it('fails if shares not existing', async function () {
            await expectRevertCustomError(trendsSharesV1.buyShares(buyer1, subject1, 1, maxInAmount, {from: buyer1}), "ShareNotExists");
        });

        it('fails if spend insufficient token', async function () {
            await expectRevert(trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer3}), "insufficient allowance");
        });

    });

    describe('sell shares', function () {
        beforeEach(async () => {
            await trendsSharesV1.createShares(subject0, declineRatio, {from: creator1, value: createSharesEthFee});
            await trendsToken.transfer(buyer1, initBalance, {from: developer});
            await trendsToken.approve(trendsSharesV1.address, initBalance, {from: buyer1});
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
        });

        it('sell shares emit event', async function () {
            let receipt = await trendsSharesV1.sellShares(buyer1, subject0, 1, minOutAmount, {from: buyer1});
            expectEvent(receipt, 'Trade', {
                trader: buyer1,
                subject: subject0,
                isBuy: false,
                shares: new BN(1),
                price: share1Price,
                protocolFee: new BN(0),
                creatorFee: new BN(0),
                holderFee: new BN(0),
                supply: new BN(1)
            });
        });

        it('buyer can sell 0 share', async function () {
            await trendsSharesV1.sellShares(buyer1, subject0, 0, minOutAmount, {from: buyer1});
            expect(await trendsSharesV1.sharesSupply(subject0)).to.be.bignumber.equal(new BN(2));
            expect(await trendsSharesV1.sharesBalance(subject0, buyer1)).to.be.bignumber.equal(new BN(1));
        });

        it('balance correct after sell 1 share and hold 0 share', async function () {
            await trendsSharesV1.sellShares(buyer1, subject0, 1, minOutAmount, {from: buyer1});
            expect(await trendsSharesV1.sharesSupply(subject0)).to.be.bignumber.equal(new BN(1));
            expect(await trendsSharesV1.sharesBalance(subject0, buyer1)).to.be.bignumber.equal(new BN(0));
            expect(await trendsToken.balanceOf(trendsSharesV1.address)).to.be.bignumber.equal(new BN(0));
            expect(await trendsToken.balanceOf(buyer1)).to.be.bignumber.equal(initBalance);
        });

        it('balance correct after sell 2 share and hold 0 share', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            await trendsSharesV1.sellShares(buyer1, subject0, 2, minOutAmount, {from: buyer1});
            expect(await trendsSharesV1.sharesSupply(subject0)).to.be.bignumber.equal(new BN(1));
            expect(await trendsSharesV1.sharesBalance(subject0, buyer1)).to.be.bignumber.equal(new BN(0));
            expect(await trendsToken.balanceOf(trendsSharesV1.address)).to.be.bignumber.equal(new BN(0));
            expect(await trendsToken.balanceOf(buyer1)).to.be.bignumber.equal(initBalance);
        });

        it('balance correct after sell 1 share and hold 1 share', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            await trendsSharesV1.sellShares(buyer1, subject0, 1, minOutAmount, {from: buyer1});
            expect(await trendsSharesV1.sharesSupply(subject0)).to.be.bignumber.equal(new BN(2));
            expect(await trendsSharesV1.sharesBalance(subject0, buyer1)).to.be.bignumber.equal(new BN(1));
        });

        it('buyer1 can sell 1 share and recipient is buyer2', async function () {
            await trendsSharesV1.sellShares(buyer2, subject0, 1, minOutAmount, {from: buyer1});
            expect(await trendsSharesV1.sharesBalance(subject0, buyer1)).to.be.bignumber.equal(new BN(0));
            expect(await trendsToken.balanceOf(buyer2)).to.be.bignumber.equal(share1Price);
        });

        it('fails if min out amount not enough', async function () {
            await expectRevertCustomError(trendsSharesV1.sellShares(buyer1, subject0, 1, share1Price.addn(1), {from: buyer1}), "OutAmountNotEnough");
        });

        it('fails if sell amount exceeds balance', async function () {
            await trendsToken.transfer(buyer2, initBalance, {from: developer});
            await trendsToken.approve(trendsSharesV1.address, initBalance, {from: buyer2});
            await trendsSharesV1.buyShares(buyer2, subject0, 1, maxInAmount, {from: buyer2});
            await expectRevertCustomError(trendsSharesV1.sellShares(buyer1, subject0, 2, minOutAmount, {from: buyer1}), "InsufficientShares");
        });

        it('fails if sell the last share', async function () {
            await trendsSharesV1.sellShares(creator1, subject0, 1, minOutAmount, {from: creator1});
            await expectRevertCustomError(trendsSharesV1.sellShares(buyer1, subject0, 1, minOutAmount, {from: buyer1}), "CannotSellLastShare");
        });

    });

    describe('collect fees', function () {
        beforeEach(async () => {
            await trendsSharesV1.createShares(subject0, declineRatio, {from: creator1, value: createSharesEthFee});
            await trendsToken.transfer(buyer1, initBalance, {from: developer});
            await trendsToken.approve(trendsSharesV1.address, initBalance, {from: buyer1});
            await initFee();
        });

        it('collect buy fees emit event', async function () {
            let receipt = await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            expectEvent(receipt, 'Trade', {
                trader: buyer1,
                subject: subject0,
                isBuy: true,
                shares: new BN(1),
                price: share1Price,
                protocolFee: share1Price.mul(protocolFeePercent).div(eth_1),
                creatorFee: share1Price.mul(creatorFeePercent).div(eth_1),
                holderFee: share1Price.mul(holderFeePercent).div(eth_1),
                supply: new BN(2)
            });
        });

        it('distribute fees correct after buy shares', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            expect(await trendsToken.balanceOf(protocolFeeDestination)).to.be.bignumber.equal(protocolFee);
            expect(await trendsToken.balanceOf(trendsSharesV1.address)).to.be.bignumber.equal(share1Price.add(holderFee));
            expect(await trendsToken.balanceOf(creator1)).to.be.bignumber.equal(creatorFee);
        });

        it('distribute fees correct when creator buy shares', async function () {
            await trendsToken.transfer(creator1, initBalance, {from: developer});
            await trendsToken.approve(trendsSharesV1.address, initBalance, {from: creator1});
            await trendsSharesV1.buyShares(creator1, subject0, 1, maxInAmount, {from: creator1});
            expect(await trendsToken.balanceOf(creator1)).to.be.bignumber.equal(creatorFee.add(initBalance.sub(share1Price.add(totalFees))));
        });

        it('collect sell fees emit event', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            let receipt = await trendsSharesV1.sellShares(creator1, subject0, 1, minOutAmount, {from: creator1});
            expectEvent(receipt, 'Trade', {
                trader: creator1,
                subject: subject0,
                isBuy: false,
                shares: new BN(1),
                price: share1Price,
                protocolFee: share1Price.mul(protocolFeePercent).div(eth_1),
                creatorFee: share1Price.mul(creatorFeePercent).div(eth_1),
                holderFee: share1Price.mul(holderFeePercent).div(eth_1),
                supply: new BN(1)
            });
        });

        it('distribute fees correct after sell shares', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            await trendsSharesV1.sellShares(buyer1, subject0, 1, minOutAmount, {from: buyer1});
            expect(await trendsToken.balanceOf(protocolFeeDestination)).to.be.bignumber.equal(protocolFee.muln(2));
            expect(await trendsToken.balanceOf(trendsSharesV1.address)).to.be.bignumber.equal((holderFee).muln(2));
            expect(await trendsToken.balanceOf(buyer1)).to.be.bignumber.equal(initBalance.sub(totalFees.muln(2)));
        });

        it('distribute fees correct when creator sell shares', async function () {
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            await trendsSharesV1.sellShares(creator1, subject0, 1, minOutAmount, {from: creator1});
            expect(await trendsToken.balanceOf(creator1)).to.be.bignumber.equal(share1Price.add(creatorFee.muln(2)).sub(totalFees));
        });
    });

    describe('get price', function () {
        it('the first share price is 0', async function () {
            let price = await trendsSharesV1.getPrice(0, 1, declineRatio);
            expect(price).to.be.bignumber.equal(new BN(0));
        });

        it('get 1-2 shares price', async function () {
            let price = await trendsSharesV1.getPrice(1, 2, declineRatio);
            expect(price).to.be.bignumber.equal(share1Price.add(share2Price));
        });

        it('get 3-1 shares price', async function () {
            let price = await trendsSharesV1.getPrice(3, 1, declineRatio);
            expect(price).to.be.bignumber.equal(share3Price);
        });

        it('fails if get 0-2 shares price', async function () {
            await expectRevert(trendsSharesV1.getPrice(0, 2, declineRatio), "revert");
        });

        it('get buy price', async function () {
            await trendsSharesV1.createShares(subject0, declineRatio, {from: creator1, value: createSharesEthFee});
            let price = await trendsSharesV1.getBuyPrice(subject0, 2);
            expect(price).to.be.bignumber.equal(share1Price.add(share2Price));
        });

        it('get sell price', async function () {
            await trendsSharesV1.createShares(subject0, declineRatio, {from: creator1, value: createSharesEthFee});
            await trendsToken.transfer(buyer1, initBalance, {from: developer});
            await trendsToken.approve(trendsSharesV1.address, initBalance, {from: buyer1});
            await trendsSharesV1.buyShares(buyer1, subject0, 2, maxInAmount, {from: buyer1});
            let price = await trendsSharesV1.getSellPrice(subject0, 2);
            expect(price).to.be.bignumber.equal(share1Price.add(share2Price));
        });

        it('get buy price after fees', async function () {
            await trendsSharesV1.createShares(subject0, declineRatio, {from: creator1, value: createSharesEthFee});
            await initFee();
            let price = await trendsSharesV1.getBuyPriceWithFees(subject0, 1);
            expect(price).to.be.bignumber.equal(share1Price.add(totalFees));
        });

        it('get sell price after fees', async function () {
            await trendsSharesV1.createShares(subject0, declineRatio, {from: creator1, value: createSharesEthFee});
            await trendsToken.transfer(buyer1, initBalance, {from: developer});
            await trendsToken.approve(trendsSharesV1.address, initBalance, {from: buyer1});
            await trendsSharesV1.buyShares(buyer1, subject0, 1, maxInAmount, {from: buyer1});
            await initFee();
            let price = await trendsSharesV1.getSellPriceWithFees(subject0, 1);
            expect(price).to.be.bignumber.equal(share1Price.sub(totalFees));
        });

        it('get last share sell price after fees', async function () {
            await trendsSharesV1.createShares(subject0, declineRatio, {from: creator1, value: createSharesEthFee});
            let price = await trendsSharesV1.getSellPriceWithFees(subject0, 1);
            expect(price).to.be.bignumber.equal(new BN(0));
        });
    });


});

async function initFee() {
    await trendsSharesV1.setProtocolFeeDestination(protocolFeeDestination, {from: developer});
    await trendsSharesV1.setProtocolFeePercent(protocolFeePercent, {from: developer});
    await trendsSharesV1.setHolderFeePercent(holderFeePercent, {from: developer});
    await trendsSharesV1.setCreatorFeePercent(creatorFeePercent, {from: developer});
}