const {
    newToken,
    newSharesV1,
    newSharesHelper,
    initBalance,
    maxInAmount,
    declineRatio,
    createSharesEthFee
} = require("./utils");

const { expect } = require("chai");
const { BN } = require("@openzeppelin/test-helpers");
const {toWei} = require("web3-utils");
const {web3} = require("hardhat");
contract("TrendsSharesHelper", function (accounts) {
    let trendsToken;
    let trendsSharesV1;
    let trendsSharesHelper;
    let developer = accounts[0];
    let creator1 = accounts[1];
    let buyer1 = accounts[3];
    let buyer2 = accounts[4];
    let subject0 = web3.utils.sha3("chatroom1");
    let subject1 = web3.utils.sha3("chatroom2");
    let subject2 = web3.utils.sha3("chatroom3");

    beforeEach(async () => {
        trendsToken = await newToken(developer);
        trendsSharesV1 = await newSharesV1(trendsToken.address, developer);
        trendsSharesHelper = await newSharesHelper(trendsSharesV1.address);

        // Other initialization code as in your TrendsSharesV1 tests
        // ... (e.g., setHolderFeePercent, createShares, etc.)
    });

    describe("getSharesAndEarnings", function () {
        it("should correctly fetch shares and earnings for multiple subjects with varying numbers of shares", async function () {
            // Create Shares for multiple subjects and simulate some activity
            for (const [index, subject] of [subject0, subject1, subject2].entries()) {
                await trendsSharesV1.createShares(subject, declineRatio, { from: creator1, value: createSharesEthFee });

                const buyer1Shares = 1 + index;  // 1, 2, 3 shares
                const buyer2Shares = 2 + index;  // 2, 3, 4 shares

                await trendsToken.transfer(buyer1, initBalance, { from: developer });
                await trendsToken.approve(trendsSharesV1.address, initBalance, { from: buyer1 });
                await trendsSharesV1.buyShares(buyer1, subject, buyer1Shares, maxInAmount, { from: buyer1 });

                await trendsToken.transfer(buyer2, initBalance, { from: developer });
                await trendsToken.approve(trendsSharesV1.address, initBalance, { from: buyer2 });
                await trendsSharesV1.buyShares(buyer2, subject, buyer2Shares, maxInAmount, { from: buyer2 });
            }

            // Fetch data using the helper contract
            const subjects = [subject0, subject1, subject2];
            const subjectInfos = await trendsSharesHelper.getSharesAndEarnings(buyer1, subjects);

            // Validate the data
            for (let i = 0; i < subjects.length; i++) {
                const subject = subjects[i];
                const expectedShares = new BN(1 + i);  // 1, 2, 3 shares
                const info = subjectInfos[i];

                expect(info.shares).to.be.bignumber.equal(expectedShares);
                expect(info.earnings).to.be.bignumber.equal(await trendsSharesV1.getReward(subject, buyer1));
            }
        });
    });
});
