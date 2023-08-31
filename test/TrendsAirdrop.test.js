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
    let developer = accounts[0];
    let user = airdrop[1].address;
    let ineligibleUser = accounts[7];
    let subject = web3.utils.sha3("chatroom1");
    let vestingPeriod = 20;
    let blockPerPeriod = 20;

    beforeEach(async () => {
        trendsToken = await newToken(developer);

        for (const [, recipient] of airdrop.entries()) {
            await trendsToken.transfer(recipient.address, _18dc(10000), {from: developer});
        }
        await trendsToken.transfer(ineligibleUser, _18dc(10000), {from: developer});
        trendsSharesV1 = await TrendsSharesV1.new(trendsToken.address);
        trendsAirdrop = await TrendsAirdrop.new(
            trendsSharesV1.address,
            trendsToken.address,
            merkleRoot,
            _18dc(9000),
            vestingPeriod,
            blockPerPeriod);
        await trendsToken.transfer(trendsAirdrop.address, _18dc(1000000), {from: developer});
    });

    it("should not allow users to claim airdrop without creating a subject", async () => {
        const proof = merkleTree.getHexProof(allLeaves[1]);

        // Do not create subject
        // await trendsSharesV1.createShares(subject, declineRatio, {from: user});

        await expectRevertCustomError(trendsAirdrop.claim(proof, airdrop[1].amount, subject, {from: user}), "NotCreator");
    });

    it("should allow eligible users to claim, but can't claim twice", async () => {
        // Call the create room and buy shares
        await trendsSharesV1.createShares(subject, declineRatio);

        let proof = merkleTree.getHexProof(allLeaves[1]);
        await trendsAirdrop.claim(proof, airdrop[1].amount, subject, {from: user});
        const vesting = await trendsAirdrop.vesting(user);
        assert.equal(vesting.amount.toString(), airdrop[1].amount.toString(), "Vesting airdropAmount incorrect");
        assert.equal(vesting.claimedAmount.toString(), "0", "Claimed airdropAmount should be 0");

        await timeMachine.advanceBlock();
        const claimable = await trendsAirdrop.claimable(user);
        assert.equal(claimable.toString(), _18dc(5).toString(), "Should have claimable");

        await expectRevertCustomError(trendsAirdrop.claim(proof, airdrop[1].amount, subject, {from: user}), "OnlyClaimOnceAllowed");

    });

    it("should allow users to claim vested airdrop", async () => {
        // Call the create room and buy shares
        await trendsSharesV1.createShares(subject, declineRatio);

        let proof = merkleTree.getHexProof(allLeaves[1]);
        await trendsAirdrop.claim(proof, airdrop[1].amount, subject, {from: user});
        // Assuming the user is eligible to claim some vested tokens at this point
        let balanceBeforeVesting = await trendsToken.balanceOf(user);
        await trendsAirdrop.claimVestedAirdrop({from: user});
        let balanceAfterVesting = await trendsToken.balanceOf(user);
        assert.isTrue(balanceAfterVesting.gt(balanceBeforeVesting), "User should have claimed some vested tokens");
    });

    it("should not allow ineligible users to claim", async () => {
        const proof = merkleTree.getHexProof(allLeaves[1]);
        await trendsSharesV1.createShares(subject, declineRatio);

        await expectRevertCustomError(trendsAirdrop.claim(proof, airdrop[1].amount, subject, {from: ineligibleUser}), "InvalidProof");
    });


    it("should handle reaching max claimable amount", async () => {
        // Simulate reaching the max claimable addresses by claiming for all eligible users
        await trendsSharesV1.createShares(subject, declineRatio);

        for (const [index, recipient] of airdrop.entries()) {
            const proof = merkleTree.getHexProof(allLeaves[index]);
            if (index < 3) {
                await trendsAirdrop.claim(proof, recipient.amount, subject, {from: recipient.address});
            } else if (index === 3) {
                await trendsAirdrop.claim(proof, recipient.amount, subject, {from: recipient.address});
                const vestingDetails = await trendsAirdrop.vesting(recipient.address);
                assert.equal(vestingDetails.amount.toString(), _18dc(3000).toString(), "Should have only been vesting the rest");
            } else {
                await expectRevertCustomError(trendsAirdrop.claim(proof, recipient.amount, subject, {from: recipient.address}), "ClaimEnded")
                break;
            }
        }
    });

    it("should revert if there is no vested amount for the user", async () => {
        await expectRevertCustomError(trendsAirdrop.claimVestedAirdrop({from: user}), "NoVestedAmount");
    });

    it("should allow users to claim the entire vested amount, but no more than airdrop amount, after VESTING_PERIOD has ended", async () => {
        // Claim the airdrop to set the vesting
        let proof = merkleTree.getHexProof(allLeaves[1]);
        await trendsSharesV1.createShares(subject, declineRatio);

        await trendsAirdrop.claim(proof, airdrop[1].amount, subject, { from: user });

        // Get the vested amount
        const airdropAmount = (await trendsAirdrop.vesting(user)).amount;

        // Fast forward to the end of the vesting period
        for (let i = 0; i < blockPerPeriod * vestingPeriod + 1; i++) {
            await timeMachine.advanceBlock();
        }

        let balanceBeforeClaim = await trendsToken.balanceOf(user);
        // Claim the vested tokens
        await trendsAirdrop.claimVestedAirdrop({ from: user });
        let balanceAfterClaim = await trendsToken.balanceOf(user);

        // Verify the entire vested amount was claimed
        const vestingDetails = await trendsAirdrop.vesting(user);
        assert.equal(vestingDetails.claimedAmount.toString(), airdropAmount.toString(), "Entire vested amount should have been claimed");
    });


});
