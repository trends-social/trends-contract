const {newToken, maxInAmount, initBalance, expectRevertCustomError} = require("./utils");
const TrendsAirdrop = artifacts.require("TrendsAirdrop");
const TrendsSharesV1 = artifacts.require("TrendsSharesV1");
const {keccak256} = require('ethereumjs-util');
const {utils} = require("ethers");
const {MerkleTree} = require("merkletreejs");
const timeMachine = require('ganache-time-traveler');
contract("TrendsAirdrop", (accounts) => {

    const declineRatio = 16000;
    
    function _18dc(_amount) {
        return (BigInt(_amount) * BigInt(10) ** BigInt(18)).toString();
    }

// Given test data
    const airdrop = [
        {address: accounts[1], amount: _18dc(1000)},
        {address: accounts[2], amount: _18dc(2000)},
        {address: accounts[3], amount: _18dc(3000)},
        {address: accounts[4], amount: _18dc(4000)},
        {address: accounts[5], amount: _18dc(5000)},
        {address: accounts[6], amount: _18dc(6000)},
    ];

    const allLeaves = airdrop.map((x) =>
        utils.solidityKeccak256(["address", "uint256"], [x.address, x.amount])
    );

    // Create the Merkle tree
    const merkleTree = new MerkleTree(allLeaves, keccak256, {sort: true});

    // Get the Merkle root
    const merkleRoot = merkleTree.getHexRoot();

    let trendsAirdrop;
    let trendsSharesV1;
    let trendsToken;
    let deadline;
    let developer = accounts[0];
    let user = airdrop[1].address;
    let ineligibleUser = accounts[7];

    beforeEach(async () => {
        trendsToken = await newToken(developer);
        for (const [, recipient] of airdrop.entries()) {
            await trendsToken.transfer(recipient.address, _18dc(10000), {from: developer});
        }
        await trendsToken.transfer(ineligibleUser, _18dc(10000), {from: developer});
        trendsSharesV1 = await TrendsSharesV1.new(trendsToken.address);
        deadline = (await web3.eth.getBlock("latest")).timestamp + 60 * 60 * 24; // 24 hours from now
        trendsAirdrop = await TrendsAirdrop.new(trendsSharesV1.address, trendsToken.address, merkleRoot, deadline, airdrop.length / 2);
        await trendsToken.transfer(trendsAirdrop.address, _18dc(1000000), {from: developer});
    });

    it("should not allow users to claim airdrop without holding a share", async () => {
        const subject = web3.utils.sha3("chatroom1");
        const proof = merkleTree.getHexProof(allLeaves[1]);

        // Do not buy shares for the user
        // await trendsSharesV1.buyShares(user, subject, 10, maxInAmount, {from: user});
        await expectRevertCustomError(trendsAirdrop.claim(proof, subject, airdrop[1].amount, {from: user}), "NotShareHolder");
    });

    it("should allow eligible users to start vesting", async () => {
        // Call the create room and buy shares
        const subject = web3.utils.sha3("chatroom1");
        await trendsSharesV1.createShares(subject, declineRatio);
        await trendsToken.approve(trendsSharesV1.address, initBalance, {from: user});
        await trendsSharesV1.buyShares(user, subject, 10, maxInAmount, {from: user});

        let proof = merkleTree.getHexProof(allLeaves[1]);
        await trendsAirdrop.claim(proof, subject, airdrop[1].amount, {from: user});
        const vesting = await trendsAirdrop.vesting(user);
        assert.equal(vesting.amount.toString(), airdrop[1].amount.toString(), "Vesting airdropAmount incorrect");
        assert.equal(vesting.claimedAmount.toString(), "0", "Claimed airdropAmount should be 0");
    });

    it("should allow users to claim vested airdrop", async () => {
        // Call the create room and buy shares
        const subject = web3.utils.sha3("chatroom1");
        await trendsSharesV1.createShares(subject, declineRatio);
        await trendsToken.approve(trendsSharesV1.address, initBalance, {from: user});
        await trendsSharesV1.buyShares(user, subject, 10, maxInAmount, {from: user});

        let proof = merkleTree.getHexProof(allLeaves[1]);
        await trendsAirdrop.claim(proof, subject, airdrop[1].amount, {from: user});
        // Assuming the user is eligible to claim some vested tokens at this point
        let balanceBeforeVesting = await trendsToken.balanceOf(user);
        await trendsAirdrop.claimVestedAirdrop({from: user});
        let balanceAfterVesting = await trendsToken.balanceOf(user);
        assert.isTrue(balanceAfterVesting.gt(balanceBeforeVesting), "User should have claimed some vested tokens");
    });

    it("should not allow ineligible users to claim", async () => {
        const proof = merkleTree.getHexProof(allLeaves[1]);
        const subject = web3.utils.sha3("chatroom1");
        await trendsSharesV1.createShares(subject, declineRatio);
        await trendsToken.approve(trendsSharesV1.address, initBalance, {from: ineligibleUser});
        await trendsSharesV1.buyShares(ineligibleUser, subject, 10, maxInAmount, {from: ineligibleUser});

        await expectRevertCustomError(trendsAirdrop.claim(proof, subject, airdrop[1].amount, {from: ineligibleUser}), "InvalidProof");
    });

    it("should not allow eligible users to claim after deadline", async () => {
        const subject = web3.utils.sha3("chatroom1");
        await trendsSharesV1.createShares(subject, declineRatio);
        await trendsToken.approve(trendsSharesV1.address, initBalance, {from: user});
        await trendsSharesV1.buyShares(user, subject, 10, maxInAmount, {from: user});
        let proof = merkleTree.getHexProof(allLeaves[1]);
        await timeMachine.advanceTime(60 * 60 * 24 + 1); // Move time forward by 24 hours and 1 second
        await expectRevertCustomError(trendsAirdrop.claim(proof, subject, airdrop[1].amount, {from: user}), "ClaimEnded");
    });

    it("should handle reaching max claimable addresses", async () => {
        // Simulate reaching the max claimable addresses by claiming for all eligible users
        const subject = web3.utils.sha3("chatroom1");
        await trendsSharesV1.createShares(subject, declineRatio);

        for (const [index, recipient] of airdrop.entries()) {
            // buy share
            await trendsToken.approve(trendsSharesV1.address, initBalance, {from: recipient.address});
            await trendsSharesV1.buyShares(recipient.address, subject, 1, maxInAmount, {from: recipient.address});

            const proof = merkleTree.getHexProof(allLeaves[index]);
            await trendsToken.approve(trendsSharesV1.address, initBalance, {from: recipient.address});
            await trendsSharesV1.buyShares(recipient.address, subject, 10, maxInAmount, {from: recipient.address});
            if (index <= airdrop.length / 2 - 1) {
                await trendsAirdrop.claim(proof, subject, recipient.amount, {from: recipient.address});
            } else {
                await expectRevertCustomError(trendsAirdrop.claim(proof, subject, recipient.amount, {from: recipient.address}), "MaxClaimsReached")
                break;
            }
        }
    });

    it("should revert if there is no vested amount for the user", async () => {
        await expectRevertCustomError(trendsAirdrop.claimVestedAirdrop({from: user}), "NoVestedAmount");
    });

});
