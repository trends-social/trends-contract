const {
    expectRevert, subject1, createSharesEthFee, newToken, expectRevertCustomError, eth_1,
    subject0,
    share1Price,
    share2Price
} = require("./utils");
const {web3} = require("hardhat");
const {expect} = require("chai");
const TrendsLock = artifacts.require("TrendsLock");
const {time, takeSnapshot} = require("@nomicfoundation/hardhat-network-helpers");
const {BN} = require("@openzeppelin/test-helpers");

contract('TrendsLock', function (accounts) {
    let trendsToken;
    let developer = accounts[0];
    let team = accounts[1];
    let user2 = accounts[2];
    let lockAmount = eth_1.muln(1000000);
    let snapshot;
    let startTime;
    let endTime;
    let trendsLock;
    beforeEach(async () => {
        snapshot = await takeSnapshot();
        trendsToken = await newToken(developer);
    });
    afterEach(async () => {
        await snapshot.restore();
    });

    describe('constructor initializes', function () {
        it('fails if start time ge end time', async function () {
            let startTime = parseInt(new Date().getTime() / 1000);
            await expectRevertCustomError(TrendsLock.new(trendsToken.address, team, lockAmount, startTime, startTime, {from: developer}), "InvalidTime");
        });
    });

    describe('claim', function () {
        let period = 60;
        beforeEach(async () => {
            let lastblock = await web3.eth.getBlockNumber();
            startTime = (await web3.eth.getBlock(lastblock)).timestamp;
            endTime = startTime + period;
            trendsLock = await TrendsLock.new(trendsToken.address, team, lockAmount, startTime, endTime, {from: developer});
            await trendsToken.transfer(trendsLock.address, lockAmount, {from: developer});
        });

        it('fails if msg.sender no vested amount', async function () {
            await expectRevertCustomError(trendsLock.claim({from: user2}), "NoVestedAmount");
        });

        it('fails if start time gt block timestamp', async function () {
            trendsLock = await TrendsLock.new(trendsToken.address, team, lockAmount, startTime + 20, endTime, {from: developer});
            await expectRevert(trendsLock.claim({from: team}), "underflowed or overflowed");
        });

        it('claim first times successful', async function () {
            let receipt = await trendsLock.claim({from: team});
            let block = await web3.eth.getBlock(receipt.receipt.blockNumber);
            expect(await trendsToken.balanceOf(team)).to.be.bignumber.equal(lockAmount.muln(block.timestamp - startTime).divn(endTime - startTime));
            expect(await trendsToken.balanceOf(team)).to.be.bignumber.equal((await trendsLock.locks(team)).claimedAmount);
        });

        it('claim second times successful', async function () {
            await trendsLock.claim({from: team});
            let balance = await trendsToken.balanceOf(team);
            let receipt = await trendsLock.claim({from: team});
            let block = await web3.eth.getBlock(receipt.receipt.blockNumber);
            expect(await trendsToken.balanceOf(team)).to.be.bignumber.equal(lockAmount.muln(block.timestamp - startTime).divn(endTime - startTime));
            expect(await trendsToken.balanceOf(team)).to.be.bignumber.equal((await trendsLock.locks(team)).claimedAmount);
            expect(await trendsToken.balanceOf(team)).to.be.bignumber.gt(balance);
        });

        it('claim successful when block timestamp gt end time', async function () {
            await trendsLock.claim({from: team});
            await time.increase(endTime - startTime + 1000);
            await trendsLock.claim({from: team});
            expect(await trendsToken.balanceOf(team)).to.be.bignumber.eq(lockAmount);
        });

        it('claim successful when claimed amount is 0', async function () {
            await time.increase(endTime - startTime + 1000);
            await trendsLock.claim({from: team});
            await trendsLock.claim({from: team});
            expect(await trendsToken.balanceOf(team)).to.be.bignumber.eq(lockAmount);
        });


    });

    describe('transfer', function () {
        let period = 6000;
        beforeEach(async () => {
            let lastblock = await web3.eth.getBlockNumber();
            startTime = (await web3.eth.getBlock(lastblock)).timestamp;
            endTime = startTime + period;
            trendsLock = await TrendsLock.new(trendsToken.address, team, lockAmount, startTime, endTime, {from: developer});
            await trendsToken.transfer(trendsLock.address, lockAmount, {from: developer});
        });

        it('fails if was ended', async function () {
            await time.increase(endTime - startTime + period + 1000);
            await expectRevertCustomError(trendsLock.transfer(user2, 1, {from: team}), "Ended");
        });

        it('fails if transfer to a exists account', async function () {
            await trendsLock.transfer(user2, 1, {from: team});
            await expectRevertCustomError(trendsLock.transfer(user2, 1, {from: team}), "TransferAccExists");
        });

        it('fails if transfer amount is 0', async function () {
            await expectRevertCustomError(trendsLock.transfer(user2, 0, {from: team}), "TransferAmountGt0");
        });

        it('transfer successful when start time gt block timestamp', async function () {
            startTime = startTime + 10;
            trendsLock = await TrendsLock.new(trendsToken.address, team, lockAmount, startTime, startTime + period, {from: developer});
            await trendsLock.transfer(user2, lockAmount.divn(2), {from: team});
            expect(lockAmount.divn(2)).to.be.bignumber.equal((await trendsLock.locks(team)).amount);
            expect(lockAmount.divn(2)).to.be.bignumber.equal((await trendsLock.locks(user2)).amount);
            expect((await trendsLock.locks(user2)).startTime).to.be.bignumber.equal(new BN(startTime));
        });

        it('transfer successful when start time lt block timestamp', async function () {
            let receipt = await trendsLock.transfer(user2, lockAmount.divn(2), {from: team});
            let block = await web3.eth.getBlock(receipt.receipt.blockNumber);
            let claimableAmount = lockAmount.muln(block.timestamp - startTime).divn(period);
            expect(await trendsToken.balanceOf(team)).to.be.bignumber.eq(claimableAmount);
            expect(lockAmount.divn(2).sub(claimableAmount)).to.be.bignumber.equal((await trendsLock.locks(team)).amount);
            expect(lockAmount.divn(2)).to.be.bignumber.equal((await trendsLock.locks(user2)).amount);
            expect((await trendsLock.locks(team)).startTime).to.be.bignumber.equal(new BN(block.timestamp));
            expect((await trendsLock.locks(user2)).startTime).to.be.bignumber.equal(new BN(block.timestamp));
            expect((await trendsLock.locks(team)).claimedAmount).to.be.bignumber.equal(new BN(0));
            expect((await trendsLock.locks(user2)).claimedAmount).to.be.bignumber.equal(new BN(0));
        });

        it('team claim half successful after transfer', async function () {
            let transferAmount = lockAmount.divn(10);
            let receipt = await trendsLock.transfer(user2, transferAmount, {from: team});
            let block1 = await web3.eth.getBlock(receipt.receipt.blockNumber);
            let elapse = block1.timestamp - startTime;
            let claimableAmount1 = lockAmount.muln(elapse).divn(period);
            expect(await trendsToken.balanceOf(team)).to.be.bignumber.eq(claimableAmount1);
            await time.increase(period / 2 - (elapse));
            receipt = await trendsLock.claim({from: team});
            let block2 = await web3.eth.getBlock(receipt.receipt.blockNumber);
            let claimableAmount2 = lockAmount.sub(transferAmount.add(claimableAmount1)).muln(block2.timestamp - block1.timestamp).divn(endTime - block1.timestamp);
            expect(await trendsToken.balanceOf(team)).to.be.bignumber.eq(claimableAmount1.add(claimableAmount2));
        });
        it('team claim all successful after transfer', async function () {
            let transferAmount = lockAmount.divn(10);
            await trendsLock.transfer(user2, transferAmount, {from: team});
            await time.increase(period + 1);
            await trendsLock.claim({from: team});
            expect(await trendsToken.balanceOf(team)).to.be.bignumber.eq(lockAmount.sub(transferAmount));
        });

        it('user2 claim half successful after transfer', async function () {
            let transferAmount = lockAmount.divn(10);
            let receipt = await trendsLock.transfer(user2, transferAmount, {from: team});
            let block1 = await web3.eth.getBlock(receipt.receipt.blockNumber);
            await time.increase(period / 2);
            receipt = await trendsLock.claim({from: user2});
            let block2 = await web3.eth.getBlock(receipt.receipt.blockNumber);
            let claimableAmount = transferAmount.muln(block2.timestamp - block1.timestamp).divn(endTime - block1.timestamp);
            expect(await trendsToken.balanceOf(user2)).to.be.bignumber.eq(claimableAmount);
        });

        it('user2 claim all successful after transfer', async function () {
            let transferAmount = lockAmount.divn(10);
            await trendsLock.transfer(user2, transferAmount, {from: team});
            await time.increase(period / 2);
            await trendsLock.claim({from: user2});
            await time.increase(period / 2);
            await trendsLock.claim({from: user2});
            expect(await trendsToken.balanceOf(user2)).to.be.bignumber.eq(transferAmount);
        });
    });
    describe('get claimable amount', function () {
        let period = 60;
        beforeEach(async () => {
            let lastblock = await web3.eth.getBlockNumber();
            startTime = (await web3.eth.getBlock(lastblock)).timestamp;
            endTime = startTime + period;
            trendsLock = await TrendsLock.new(trendsToken.address, team, lockAmount, startTime, endTime, {from: developer});
            await trendsToken.transfer(trendsLock.address, lockAmount, {from: developer});
        });

        it('fails if account no vested', async function () {
            await expectRevertCustomError(trendsLock.getClaimableAmount(user2), "NoVestedAmount");
        });

        it('correct when time elapse half', async function () {
            let lastblock = await web3.eth.getBlockNumber();
            let now = (await web3.eth.getBlock(lastblock)).timestamp;
            await time.increase(period / 2 - (now - startTime));
            expect(await trendsLock.getClaimableAmount(team)).to.be.bignumber.eq(lockAmount.divn(2));
        });

        it('correct when block time gt end time', async function () {
            await time.increase(period);
            expect(await trendsLock.getClaimableAmount(team)).to.be.bignumber.eq(lockAmount);
        });

        it('correct after claim and time elapse 0s', async function () {
            await time.increase(period / 2);
            await trendsLock.claim({from: team});
            expect(await trendsLock.getClaimableAmount(team)).to.be.bignumber.eq(new BN(0));
        });

        it('correct after claim and time elapse 1s', async function () {
            await time.increase(period / 2);
            let receipt = await trendsLock.claim({from: team});
            let newStartTime = (await web3.eth.getBlock(receipt.receipt.blockNumber)).timestamp;
            await time.increase(1);
            expect(await trendsLock.getClaimableAmount(team)).to.be.bignumber.eq(
                lockAmount.sub(await trendsToken.balanceOf(team)).divn(endTime - newStartTime));
        });

        it('correct after transfer and time elapse 0s', async function () {
            let transferAmount = lockAmount.divn(10);
            await trendsLock.transfer(user2, transferAmount, {from: team});
            expect(await trendsLock.getClaimableAmount(team)).to.be.bignumber.eq(new BN(0));
        });

        it('team correct after transfer and time elapse 1s', async function () {
            let transferAmount = lockAmount.divn(10);
            await trendsLock.transfer(user2, transferAmount, {from: team});
            let lastblock = await web3.eth.getBlockNumber();
            let newStartTime = (await web3.eth.getBlock(lastblock)).timestamp;
            await time.increase(1);
            let claimedAmount = await trendsToken.balanceOf(team);
            expect(await trendsLock.getClaimableAmount(team)).to.be.bignumber.eq(
                lockAmount.sub(transferAmount).sub(claimedAmount).divn(endTime - newStartTime));
        });

        it('user2 correct after transfer and time elapse 1s', async function () {
            let transferAmount = lockAmount.divn(10);
            await trendsLock.transfer(user2, transferAmount, {from: team});
            let lastblock = await web3.eth.getBlockNumber();
            let newStartTime = (await web3.eth.getBlock(lastblock)).timestamp;
            await time.increase(1);
            expect(await trendsLock.getClaimableAmount(user2)).to.be.bignumber.eq(
                transferAmount.divn(endTime - newStartTime));
        });
    });
});