const { BN, ether } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Voting = artifacts.require("Voting");

contract('Voting', function (accounts) {
    const owner = accounts[0];
    const voter1 = accounts[1];
    const voter2 = accounts[2];
    const voter3 = accounts[3];
    const RegisteringVoters = new BN(0);
    const ProposalsRegistrationStarted = new BN(1);
    const ProposalsRegistrationEnded = new BN(2);
    const VotingSessionStarted = new BN(3);
    const VotingSessionEnded = new BN(4);
    const VotesTallied = new BN(5);

    beforeEach(async function () {
        this.VotingInstance = await Voting.new();
    });

    it("la première étape est bien celle de l'enregistrement des participants", async function() {
        expect(await this.VotingInstance.getStatus()).to.be.bignumber.equal(RegisteringVoters);
    });

    it("owner est bien l'admin", async function () {
        expect(await this.VotingInstance.owner()).to.equal(owner);
    });

    it("l'admin peut ajouter une adresse à la liste des votants", async function() {
        await this.VotingInstance.voterRegister(voter1, {from:owner});
        expect(await this.VotingInstance.isRegistered(voter1)).to.be.true;
    });

    it("l'admin peut passer à l'étape d'enregistrement des propositions", async function() {
        await this.VotingInstance.proposalsRegistrationStart({from:owner});
        expect(await this.VotingInstance.getStatus()).to.be.bignumber.equal(ProposalsRegistrationStarted);
    });

    it("l'admin peut passer à l'étape de fin d'enregistrement des propositions", async function() {
        let proposal1 = "Proposition numéro 1";
        let proposal2 = "Proposition numéro 2";
        let proposal3 = "Proposition numéro 3";
        await this.VotingInstance.voterRegister(voter1, {from:owner});
        await this.VotingInstance.voterRegister(voter2, {from:owner});
        await this.VotingInstance.voterRegister(voter3, {from:owner});
        await this.VotingInstance.proposalsRegistrationStart({from:owner});
        await this.VotingInstance.proposalRegister(proposal1, {from:voter1});
        await this.VotingInstance.proposalRegister(proposal2, {from:voter2});
        await this.VotingInstance.proposalRegister(proposal3, {from:voter3});
        await this.VotingInstance.proposalsRegistrationEnd({from:owner});
        expect(await this.VotingInstance.getStatus()).to.be.bignumber.equal(ProposalsRegistrationEnded);
    });

    it("les adresses enregistré peuvent faire des propositions", async function() {
        let proposal1 = "Proposition numéro 1";
        let proposal2 = "Proposition numéro 2";
        let proposal3 = "Proposition numéro 3";
        await this.VotingInstance.voterRegister(voter1, {from:owner});
        await this.VotingInstance.voterRegister(voter2, {from:owner});
        await this.VotingInstance.voterRegister(voter3, {from:owner});
        await this.VotingInstance.proposalsRegistrationStart({from:owner});
        await this.VotingInstance.proposalRegister(proposal1, {from:voter1});
        await this.VotingInstance.proposalRegister(proposal2, {from:voter2});
        await this.VotingInstance.proposalRegister(proposal3, {from:voter3});
        await this.VotingInstance.proposalsRegistrationEnd({from:owner});
        let proposals = await this.VotingInstance.getAllDescription();
        expect(proposals[0]).to.equal(proposal1);
        expect(proposals[1]).to.equal(proposal2);
        expect(proposals[2]).to.equal(proposal3);
    });

    it("l'admin peut passer à l'étape de début des votes des adresses enregistrés", async function() {
        let proposal1 = "Proposition numéro 1";
        let proposal2 = "Proposition numéro 2";
        let proposal3 = "Proposition numéro 3";
        await this.VotingInstance.voterRegister(voter1, {from:owner});
        await this.VotingInstance.voterRegister(voter2, {from:owner});
        await this.VotingInstance.voterRegister(voter3, {from:owner});
        await this.VotingInstance.proposalsRegistrationStart({from:owner});
        await this.VotingInstance.proposalRegister(proposal1, {from:voter1});
        await this.VotingInstance.proposalRegister(proposal2, {from:voter2});
        await this.VotingInstance.proposalRegister(proposal3, {from:voter3});
        await this.VotingInstance.proposalsRegistrationEnd({from:owner});
        await this.VotingInstance.votingSessionStart({from:owner});
        expect(await this.VotingInstance.getStatus()).to.be.bignumber.equal(VotingSessionStarted);
    });

    it("on peut éffectuer des votes si on est enregistré", async function() {
        let proposal1 = "Proposition numéro 1";
        let proposal2 = "Proposition numéro 2";
        let proposal3 = "Proposition numéro 3";
        let choice1 = new BN(0);
        let choice2 = new BN(1);
        await this.VotingInstance.voterRegister(voter1, {from:owner});
        await this.VotingInstance.voterRegister(voter2, {from:owner});
        await this.VotingInstance.voterRegister(voter3, {from:owner});
        await this.VotingInstance.proposalsRegistrationStart({from:owner});
        await this.VotingInstance.proposalRegister(proposal1, {from:voter1});
        await this.VotingInstance.proposalRegister(proposal2, {from:voter2});
        await this.VotingInstance.proposalRegister(proposal3, {from:voter3});
        await this.VotingInstance.proposalsRegistrationEnd({from:owner});
        await this.VotingInstance.votingSessionStart({from:owner});
        await this.VotingInstance.vote(choice1, {from:voter1});
        await this.VotingInstance.vote(choice2, {from:voter2});
        await this.VotingInstance.vote(choice2, {from:voter3});
        expect(await this.VotingInstance.whoDidYouVoteFor(voter1)).to.be.bignumber.equal(choice1);
        expect(await this.VotingInstance.whoDidYouVoteFor(voter2)).to.be.bignumber.equal(choice2);
        expect(await this.VotingInstance.whoDidYouVoteFor(voter3)).to.be.bignumber.equal(choice2);
    });

    it("l'admin peut passer à l'étape de fin des votes", async function() {
        let proposal1 = "Proposition numéro 1";
        let proposal2 = "Proposition numéro 2";
        let proposal3 = "Proposition numéro 3";
        let choice1 = new BN(0);
        let choice2 = new BN(1);
        await this.VotingInstance.voterRegister(voter1, {from:owner});
        await this.VotingInstance.voterRegister(voter2, {from:owner});
        await this.VotingInstance.voterRegister(voter3, {from:owner});
        await this.VotingInstance.proposalsRegistrationStart({from:owner});
        await this.VotingInstance.proposalRegister(proposal1, {from:voter1});
        await this.VotingInstance.proposalRegister(proposal2, {from:voter2});
        await this.VotingInstance.proposalRegister(proposal3, {from:voter3});
        await this.VotingInstance.proposalsRegistrationEnd({from:owner});
        await this.VotingInstance.votingSessionStart({from:owner});
        await this.VotingInstance.vote(choice1, {from:voter1});
        await this.VotingInstance.vote(choice2, {from:voter2});
        await this.VotingInstance.vote(choice2, {from:voter3});
        await this.VotingInstance.votingSessionEnd({from:owner});
        expect(await this.VotingInstance.getStatus()).to.be.bignumber.equal(VotingSessionEnded);
    });

    it("l'admin peut lancer la vue des résultats", async function() {
        let proposal1 = "Proposition numéro 1";
        let proposal2 = "Proposition numéro 2";
        let proposal3 = "Proposition numéro 3";
        let choice1 = new BN(0);
        let choice2 = new BN(1);
        await this.VotingInstance.voterRegister(voter1, {from:owner});
        await this.VotingInstance.voterRegister(voter2, {from:owner});
        await this.VotingInstance.voterRegister(voter3, {from:owner});
        await this.VotingInstance.proposalsRegistrationStart({from:owner});
        await this.VotingInstance.proposalRegister(proposal1, {from:voter1});
        await this.VotingInstance.proposalRegister(proposal2, {from:voter2});
        await this.VotingInstance.proposalRegister(proposal3, {from:voter3});
        await this.VotingInstance.proposalsRegistrationEnd({from:owner});
        await this.VotingInstance.votingSessionStart({from:owner});
        await this.VotingInstance.vote(choice1, {from:voter1});
        await this.VotingInstance.vote(choice2, {from:voter2});
        await this.VotingInstance.vote(choice2, {from:voter3});
        await this.VotingInstance.votingSessionEnd({from:owner});
        await this.VotingInstance.defineWinner({from:owner});
        expect(await this.VotingInstance.getWinner()).to.equal(proposal2);
    });
});