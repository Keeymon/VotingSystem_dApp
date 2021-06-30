const { BN, ether, expectRevert } = require('@openzeppelin/test-helpers');
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent');
const { expect } = require('chai');
const Voting = artifacts.require("Voting");

contract('Voting', function (accounts) {
    const owner = accounts[0];
    const voter1 = accounts[1];
    const voter2 = accounts[2];
    const voter3 = accounts[3];
    const proposal1 = "Proposition numéro 1";
    const proposal2 = "Proposition numéro 2";
    const proposal3 = "Proposition numéro 3";
    const choice1 = new BN(0);
    const choice2 = new BN(1);
    const RegisteringVoters = new BN(0);
    const ProposalsRegistrationStarted = new BN(1);
    const ProposalsRegistrationEnded = new BN(2);
    const VotingSessionStarted = new BN(3);
    const VotingSessionEnded = new BN(4);
    const VotesTallied = new BN(5);

    describe("Système de vote", function() {
        beforeEach(async function () {
            this.VotingInstance = await Voting.new();
        });

        describe("Init", function() {
            it("Owner est bien l'admin", async function () {
                expect(await this.VotingInstance.owner()).to.equal(owner);
            });

            it("La première étape est bien celle de l'enregistrement des participants", async function() {
                expect(await this.VotingInstance.getStatus()).to.be.bignumber.equal(RegisteringVoters);
            });
        });

        describe("Enregistrement des participants", function() {
            it("Revert: voterRegister() est onlyOwner", async function() {
                await expectRevert(this.VotingInstance.voterRegister(voter1, {from:voter1}),
                "Ownable: caller is not the owner");
            })

            it("L'admin peut ajouter une adresse à la liste des votants", async function() {
                await this.VotingInstance.voterRegister(voter1, {from:owner});
                expect(await this.VotingInstance.isRegistered(voter1)).to.be.true;
            });

            it("Event: VoterRegistered", async function() {
                expectEvent(await this.VotingInstance.voterRegister(voter1, {from:owner}),
                "VoterRegistered",
                {voterAddress: voter1});
            });

            it("Revert: impossible d'ajouter une adresse déjà existante", async function() {
                await this.VotingInstance.voterRegister(voter1, {from:owner});
                await expectRevert(this.VotingInstance.voterRegister(voter1, {from:owner}),
                "Already Registered");
            });
        });

        describe("Faites vos propositions", function() {
            it("Revert: proposalsRegistrationStart() est onlyOwner", async function() {
                await expectRevert(this.VotingInstance.proposalsRegistrationStart({from:voter1}),
                "Ownable: caller is not the owner");
            });

            it("L'admin peut passer à l'étape d'enregistrement des propositions", async function() {
                await this.VotingInstance.proposalsRegistrationStart({from:owner});
                expect(await this.VotingInstance.getStatus()).to.be.bignumber.equal(ProposalsRegistrationStarted);
            });

            it("Event: ProposalsRegistrationStarted", async function() {
                expectEvent(await this.VotingInstance.proposalsRegistrationStart({from:owner}),
                "ProposalsRegistrationStarted");
            });

            it("Event: WorkflowStatusChange", async function() {
                expectEvent(await this.VotingInstance.proposalsRegistrationStart({from:owner}),
                "WorkflowStatusChange",
                {previousStatus: new BN(0), newStatus: new BN(1)});
            });

            it("Revert: Une adresse non enregistré ne pas pas faire de propositions", async function() {
                await this.VotingInstance.voterRegister(voter1, {from:owner});
                await this.VotingInstance.voterRegister(voter2, {from:owner});
                await this.VotingInstance.voterRegister(voter3, {from:owner});
                await this.VotingInstance.proposalsRegistrationStart({from:owner});
                await expectRevert(this.VotingInstance.proposalRegister(proposal1, {from:owner}),
                "Voter not Registered");
            })

            it("Les adresses enregistrés peuvent faire des propositions", async function() {
                await this.VotingInstance.voterRegister(voter1, {from:owner});
                await this.VotingInstance.voterRegister(voter2, {from:owner});
                await this.VotingInstance.voterRegister(voter3, {from:owner});
                await this.VotingInstance.proposalsRegistrationStart({from:owner});
                await this.VotingInstance.proposalRegister(proposal1, {from:voter1});
                await this.VotingInstance.proposalRegister(proposal2, {from:voter2});
                await this.VotingInstance.proposalRegister(proposal3, {from:voter3});
                let proposals = await this.VotingInstance.getAllDescription(); //change
                expect(proposals[0]).to.equal(proposal1);
                expect(proposals[1]).to.equal(proposal2);
                expect(proposals[2]).to.equal(proposal3);
            });

            it("Event: ProposalRegistered", async function() {
                await this.VotingInstance.voterRegister(voter1, {from:owner});
                await this.VotingInstance.voterRegister(voter2, {from:owner});
                await this.VotingInstance.voterRegister(voter3, {from:owner});
                await this.VotingInstance.proposalsRegistrationStart({from:owner});
                expectEvent(await this.VotingInstance.proposalRegister(proposal1, {from:voter1}),
                "ProposalRegistered",
                {proposalId: new BN(0)});
            });

            it("Revert: On ne peut proposer 2 fois une même idées", async function() {
                await this.VotingInstance.voterRegister(voter1, {from:owner});
                await this.VotingInstance.voterRegister(voter2, {from:owner});
                await this.VotingInstance.voterRegister(voter3, {from:owner});
                await this.VotingInstance.proposalsRegistrationStart({from:owner});
                await this.VotingInstance.proposalRegister(proposal1, {from:voter1});
                await expectRevert(this.VotingInstance.proposalRegister(proposal1, {from:voter2}),
                "Proposal Already Registered");
            });
        });

        describe("Fin des propositions, en attente du début du vote", function() {
            beforeEach(async function () {
                await this.VotingInstance.voterRegister(voter1, {from:owner});
                await this.VotingInstance.voterRegister(voter2, {from:owner});
                await this.VotingInstance.voterRegister(voter3, {from:owner});
                await this.VotingInstance.proposalsRegistrationStart({from:owner});
                await this.VotingInstance.proposalRegister(proposal1, {from:voter1});
                await this.VotingInstance.proposalRegister(proposal2, {from:voter2});
                await this.VotingInstance.proposalRegister(proposal3, {from:voter3});
            });

            it("Revert: proposalsRegistrationEnd() est onlyOwner", async function() {
                await expectRevert(this.VotingInstance.proposalsRegistrationEnd({from:voter1}),
                "Ownable: caller is not the owner");
            });

            it("L'admin peut passer à l'étape de fin d'enregistrement des propositions", async function() {
                await this.VotingInstance.proposalsRegistrationEnd({from:owner});
                expect(await this.VotingInstance.getStatus()).to.be.bignumber.equal(ProposalsRegistrationEnded);
            });

            it("Event: ProposalsRegistrationEnded", async function() {
                expectEvent(await this.VotingInstance.proposalsRegistrationEnd({from:owner}),
                "ProposalsRegistrationEnded");
            });

            it("Revert: votingSessionStart() est onlyOwner", async function() {
                await this.VotingInstance.proposalsRegistrationEnd({from:owner});
                await expectRevert(this.VotingInstance.votingSessionStart({from:voter1}),
                "Ownable: caller is not the owner");
            });

            it("L'admin peut passer à l'étape de début des votes des adresses enregistrés", async function() {
                await this.VotingInstance.proposalsRegistrationEnd({from:owner});
                await this.VotingInstance.votingSessionStart({from:owner});
                expect(await this.VotingInstance.getStatus()).to.be.bignumber.equal(VotingSessionStarted);
            });


            it("Event: VotingSessionStarted", async function() {
                await this.VotingInstance.proposalsRegistrationEnd({from:owner});
                expectEvent(await this.VotingInstance.votingSessionStart({from:owner}),
                "VotingSessionStarted");
            });
        });

        describe("Vote en cours", function() {
            beforeEach(async function () {
                await this.VotingInstance.voterRegister(voter1, {from:owner});
                await this.VotingInstance.voterRegister(voter2, {from:owner});
                await this.VotingInstance.voterRegister(voter3, {from:owner});
                await this.VotingInstance.proposalsRegistrationStart({from:owner});
                await this.VotingInstance.proposalRegister(proposal1, {from:voter1});
                await this.VotingInstance.proposalRegister(proposal2, {from:voter2});
                await this.VotingInstance.proposalRegister(proposal3, {from:voter3});
                await this.VotingInstance.proposalsRegistrationEnd({from:owner});
                await this.VotingInstance.votingSessionStart({from:owner});
            });

            it("Revert: Voter not Registered", async function() {
                await expectRevert(this.VotingInstance.vote(choice1, {from:owner}),
                "Voter not Registered");
            });

            it("On peut éffectuer des votes si on est enregistré", async function() {
                await this.VotingInstance.vote(choice1, {from:voter1});
                await this.VotingInstance.vote(choice2, {from:voter2});
                await this.VotingInstance.vote(choice2, {from:voter3});
                expect(await this.VotingInstance.whoDidYouVoteFor(voter1)).to.be.bignumber.equal(choice1);
                expect(await this.VotingInstance.whoDidYouVoteFor(voter2)).to.be.bignumber.equal(choice2);
                expect(await this.VotingInstance.whoDidYouVoteFor(voter3)).to.be.bignumber.equal(choice2);
            });

            it("Event: Voted", async function() {
                expectEvent(await this.VotingInstance.vote(choice1, {from:voter1}),
                "Voted",
                {voter: voter1, proposalId: new BN(0)});
            });

            it("Revert: Invalid proposal", async function() {
                await expectRevert(this.VotingInstance.vote(new BN(100), {from:voter1}),
                "Invalid proposal");
            });

            it("Revert: Vote already taken", async function() {
                await this.VotingInstance.vote(choice1, {from:voter1});
                await expectRevert(this.VotingInstance.vote(choice2, {from:voter1}),
                "Vote already taken");
            });
        });

        describe("Fin du vote, en attente des résultats", function() {
            beforeEach(async function () {
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
            });

            it("Revert: votingSessionEnd() est onlyOwner", async function() {
                await expectRevert(this.VotingInstance.votingSessionEnd({from:voter1}),
                "Ownable: caller is not the owner");
            });

            it("L'admin peut passer à l'étape de fin des votes", async function() {
                await this.VotingInstance.votingSessionEnd({from:owner});
                expect(await this.VotingInstance.getStatus()).to.be.bignumber.equal(VotingSessionEnded);
            });

            it("Event: VotingSessionEnded", async function() {
                expectEvent(await this.VotingInstance.votingSessionEnd({from:owner}),
                "VotingSessionEnded");
            });
        });

        describe("Résultats", function() {
            beforeEach(async function () {
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
            });

            it("Revert: defineWinner() est onlyOwner", async function() {
                await expectRevert(this.VotingInstance.defineWinner({from:voter1}),
                "Ownable: caller is not the owner");
            });

            it("L'admin peut lancer la vue des résultats", async function() {
                await this.VotingInstance.defineWinner({from:owner});
                expect(await this.VotingInstance.getWinner()).to.equal(proposal2);
            });

            it("Event: VotesTallied", async function() {
                expectEvent(await this.VotingInstance.defineWinner({from:owner}),
                "VotesTallied");
            });
        });
    });
});