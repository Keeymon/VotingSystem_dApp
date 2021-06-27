// erc20.test.js

const { BN, ether } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Voting = artifacts.require("Voting");

contract('Voting', function (accounts) {
    const owner = accounts[0];
    const voter1 = accounts[1];
    const voter2 = accounts[2];
    const voter3 = accounts[3];
    const voter4 = accounts[4];
    const voter5 = accounts[5];

    beforeEach(async function () {
        this.VotingInstance = await Voting.new();
    });

    it("owner est bien l'admin", async function () {
        expect(await this.VotingInstance.owner()).to.equal(owner);
    });
});