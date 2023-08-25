const {newToken, merkleize, hash, maxInAmount, initBalance, declineRatio} = require("./utils");
const TrendsAirdrop = artifacts.require("TrendsAirdrop");
const TrendsSharesV1 = artifacts.require("TrendsSharesV1");

contract("TrendsAirdrop", (accounts) => {

    const airDropAddresses = [
        accounts[0],
        accounts[1],
    ];

    const airdropAmounts = [
        BigInt(1000) * BigInt(10) ** BigInt(18), // 1000 in 18 decimals
        BigInt(2000) * BigInt(10) ** BigInt(18), // 2000 in 18 decimals
    ];

    let trendsAirdrop;
    let trendsSharesV1;
    let trendsToken;
    let merkleRoot = merkleize(airDropAddresses.map((address, index) => {
        return hash(Buffer.from(address.slice(2) + airdropAmounts[index].toString(16, 64), 'hex'));
    }));
    let deadline;
    let developer = accounts[0];
    let user1 = accounts[1];

    beforeEach(async () => {
        trendsToken = await newToken(developer);
        await trendsToken.transfer(user1, initBalance, {from: developer});
        trendsSharesV1 = await TrendsSharesV1.new(trendsToken.address);
        deadline = (await web3.eth.getBlock("latest")).timestamp + 60 * 60 * 24; // 24 hours from now
        trendsAirdrop = await TrendsAirdrop.new(trendsSharesV1.address, trendsToken.address, merkleRoot, deadline);

        // Set up mock data for chatroom shares, airdrop eligibility, etc.
    });

    it("should allow eligible users to start vesting", async () => {
        // Call the createShares function
        const chatroomId = web3.utils.sha3("chatroom1");
        await trendsSharesV1.createShares(chatroomId,declineRatio);
        await trendsToken.approve(trendsSharesV1.address, initBalance, {from: user1});
        await trendsSharesV1.buyShares(user1, chatroomId, 10, maxInAmount, {from: user1});

        // const proof = []; // Compute the merkle proof for the first account
        // const airdropAmount = BigInt(2000) * BigInt(10) ** BigInt(18);
        //
        // await trendsAirdrop.claim(proof, chatroomId, airdropAmount, { from: user1 });
        // const vesting = await trendsAirdrop.vesting(accounts[0]);
        //
        // assert.equal(vesting.amount.toString(), airdropAmount.toString(), "Vesting airdropAmount incorrect");
        // assert.equal(vesting.claimedAmount.toString(), "0", "Claimed airdropAmount should be 0");
    });

    // it("should allow users to claim vested airdrop", async () => {
    //     const chatroomId = web3.utils.sha3("chatroom1");
    //     const proof = []; // Compute the merkle proof for the first account
    //     const amount = 1000;
    //
    //     await trendsAirdrop.claim(proof, chatroomId, amount, { from: accounts[0] });
    //     // Assuming the user is eligible to claim some vested tokens at this point
    //     await trendsAirdrop.claimVestedAirdrop({ from: accounts[0] });
    //
    //     const userBalance = await trendsToken.balanceOf(accounts[0]);
    //     assert.isTrue(userBalance.gt(0), "User should have claimed some vested tokens");
    // });

    // Additional tests for edge cases, such as ineligible addresses, claiming after deadline, reaching the max claimable addresses, etc., should also be written.
});
