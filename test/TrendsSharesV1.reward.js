const {newToken, newSharesV1, expectRevert} = require("./utils");
const {expect} = require('chai');
contract('TrendsSharesV1', function (accounts) {

    let trendsToken;
    let trendsSharesV1;
    let developer = accounts[0];
    let acc1 = accounts[1];
    beforeEach(async () => {
        trendsToken = await newToken(developer);
        trendsSharesV1 = await newSharesV1(trendsToken.address, developer);
    });
    describe('get reward', function () {

        it('reward is 0 after buy shares', async function () {

        });

        it('reward increases after other user buy shares', async function () {

        });

        it('reward is 0 after withdraw', async function () {

        });

        it('reward is correct after sell shares', async function () {

        });

        it('reward is correct after 3 users buy shares', async function () {

        });

        it('reward is correct after buy more shares', async function () {

        });

    });

    describe('withdraw reward', function () {
        it('withdraw reward emit event', async function () {

        });

        it('user token increases after withdraw reward', async function () {

        });

        it('withdraw reward more times', async function () {

        });

        it('fails if reward is 0', async function () {

        });

    });


});