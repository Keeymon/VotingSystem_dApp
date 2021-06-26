import React, { Component } from "react";

import VotingContract from "./contracts/Voting.json";
//import "react-notifications/lib/notifications.css";
//import {NotificationContainer, NotificationManager} from 'react-notifications';
import getWeb3 from "./getWeb3";

import "./App.css";
import { divCeil } from "@ethereumjs/vm/dist/evm/opcodes";

class App extends Component {
  state = { web3: null, accounts: null, contract: null,
    votingState: null, votingStateVerbose: null,
    owner: null, addressRegister: null, proposalRegister: null, listProposals: null, idVote: "",
    winningDescription: "" };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = VotingContract.networks[networkId];
      const instance = new web3.eth.Contract(
        VotingContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      const owner = web3.utils.toChecksumAddress(await instance.methods.owner().call());

      const votingStateVerbose = [
        "Enregistrement des participants",
        "Faites vos propositions",
        "Fin des propositions, en attente du début du vote",
        "Vote en cours",
        "Fin du vote, en attente des résultats",
        "Résultats"
      ];

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance, votingStateVerbose, owner }, this.runInit);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  runInit = async () => {
    const { contract } = this.state;
    const { ethereum } = window;

    ethereum.on("accountsChanged", this.handleAccounts);

    const vState = await contract.methods.getStatus().call();
    this.setState({ votingState: vState });
    if(vState >= 3 )
      this.setState({ listProposals: await contract.methods.getAllDescription().call() });
    if(vState >= 5 )
      this.setState({ winningDescription: await contract.methods.getWinner().call() });
    contract.events.WorkflowStatusChange().on('data', (event) => this.handleVotingState(event)).on('error', console.error);
    contract.events.VotingSessionStarted().on('data', (event) => this.handleVotingStart(event)).on('error', console.error);
    contract.events.VotesTallied().on('data', (event) => this.handleVoteTallied(event)).on('error', console.error);
    contract.events.VoterRegistered().on('data', (event) => this.handleVoterRegistered(event)).on('error', console.error);
  };

  handleAccounts = (accounts) => {
    const { web3 } = this.state;
    if (web3 != null && accounts.length > 0)
      this.setState({ accounts });
    console.log(accounts[0]);
  }

  /*
  * @dev: à compléter
  */
  handleVoterRegistered = async (event) => {
    console.log("OK");
  }

  handleVotingState = async (event) => {
    this.setState({ votingState: event.returnValues[1] });
  }

  handleVotingStart = async (event) => {
    const { contract } = this.state;
    const list = await contract.methods.getAllDescription().call();
    this.setState({ listProposals: list });
  }

  handleVoteTallied = async (event) => {
    const { contract } = this.state;
    const description = await contract.methods.getWinner().call();
    this.setState({winningDescription: description});
  }

  getStateVerbose(vState) {
    const { votingStateVerbose } = this.state;
    return votingStateVerbose[vState];
  }

  /* Voter Register */
  handleChangeVoterRegister = (event) => {
    this.setState({addressRegister: event.target.value});
  }

  handleSubmitVoterRegister = async (event) => {
    const { accounts, contract } = this.state;
    event.preventDefault();
    await contract.methods.voterRegister(event.target.adressInput.value).send({ from: accounts[0] });
  }

  proposalsRegistrationStart = async () => {
    const { accounts, contract } = this.state;
    await contract.methods.proposalsRegistrationStart().send({ from: accounts[0] });
  }

  /* Proposal Register */
  handleChangeProposalsRegister = (event) => {
    this.setState({ proposalRegister: event.target.value });
  }

  handleSubmitProposalsRegister = async (event) => {
    const { accounts, contract} = this.state;
    event.preventDefault();
    await contract.methods.proposalRegister(event.target.proposal.value).send({ from: accounts[0] });
  }

  proposalsRegistrationEnd = async () => {
    const { accounts, contract } = this.state;
    await contract.methods.proposalsRegistrationEnd().send({ from: accounts[0] });
  }

  /* Voting Session Start */
  votingSessionStart = async () => {
    const { accounts, contract } = this.state;
    await contract.methods.votingSessionStart().send({ from: accounts[0] });
  }

  /* Voting Session */
  handleChangeVote = (event) => {
    this.setState({ idVote: event.target.value })
  }

  handleSubmitVote = async (event) => {
    const { accounts, contract } = this.state;
    event.preventDefault();
    await contract.methods.vote(event.target.vote.value).send({ from: accounts[0] });
  }

  votingSessionEnd = async () => {
    const { accounts, contract } = this.state;
    await contract.methods.votingSessionEnd().send({ from: accounts[0] });
  }

  /* Result */
  defineWinner = async () => {
    const { accounts, contract } = this.state;
    await contract.methods.defineWinner().send({ from: accounts[0] });
  }

  render() {
    const { web3 } = this.state;
    if (!web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    let display;
    if (web3.utils.toChecksumAddress(this.state.owner) === web3.utils.toChecksumAddress(this.state.accounts[0]))
      display = <div>Je suis admin</div>;
    else
      display = <div>Je suis pas admin</div>;
      
    return (
      <div className="App">
        <div>
            <h2 className="text-center">Système de Vote</h2>
            <hr></hr>
        </div>
        <div>
            <h3 className="text-center"> Status : {this.getStateVerbose(this.state.votingState)} </h3>
        </div>

      {display}

        {/* Enregistrement des participants */}
        <div className={this.state.votingState == 0 ? "contenu contenu-active" : "contenu"}>
          <form onSubmit={this.handleSubmitVoterRegister}>
            <label>
              Adresse :
              <input name="adressInput" type="text" value={this.state.value} onChange={this.handleChangeVoterRegister} />
            </label>
          <input type="submit" value="Envoyer" />
          </form>
          <div className={web3.utils.toChecksumAddress(this.state.owner) == web3.utils.toChecksumAddress(this.state.accounts[0]) ? "contenu contenu-active" : "contenu"}>
            <button onClick={this.proposalsRegistrationStart}>Lancer le début des propositions</button>
          </div>
        </div>

        {/* Faites vos propositions */}
        <div className={this.state.votingState == 1 ? "contenu contenu-active" : "contenu"}>
          <form onSubmit={this.handleSubmitProposalsRegister}>
            <label>
              Proposition :
              <input name="proposal" type="textarea" value={this.state.value} onChange={this.handleChangeProposalsRegister} />
           </label>
            <input type="submit" value="Envoyer" />
         </form>
         <div className={web3.utils.toChecksumAddress(this.state.owner) == web3.utils.toChecksumAddress(this.state.accounts[0]) ? "contenu contenu-active" : "contenu"}>
          <button onClick={this.proposalsRegistrationEnd}>Fin des propositions</button>
         </div>
        </div>

        {/* Fin des propositions, en attente du début du vote */}
        <div className={this.state.votingState == 2 ? "contenu contenu-active" : "contenu"}>
          <div className={web3.utils.toChecksumAddress(this.state.owner) == web3.utils.toChecksumAddress(this.state.accounts[0]) ? "contenu contenu-active" : "contenu"}>
            <button onClick={this.votingSessionStart}>Lancer le vote</button>
          </div>
        </div>

        {/* Vote en cours */}
        <div className={this.state.votingState == 3 ? "contenu contenu-active" : "contenu"}>
          <form onSubmit={this.handleSubmitVote}>
            <label>
              Choisir une proposition :
              <select name="vote" value={this.state.idVote} onChange={this.handleChangeVote}>
                {this.state.listProposals !== null && 
                  this.state.listProposals.map((a, i) => <option value={i}>{a.description}</option>)
                }
              </select>
            </label>
          <input type="submit" value="Envoyer" />
          </form>
          <div className={web3.utils.toChecksumAddress(this.state.owner) == web3.utils.toChecksumAddress(this.state.accounts[0]) ? "contenu contenu-active" : "contenu"}>
            <button onClick={this.votingSessionEnd}>Mettre fin au vote</button>
          </div>
        </div>

        {/* Fin du vote, en attente des résultats */}
        <div className={this.state.votingState == 4 ? "contenu contenu-active" : "contenu"}>
          <div className={web3.utils.toChecksumAddress(this.state.owner) == web3.utils.toChecksumAddress(this.state.accounts[0]) ? "contenu contenu-active" : "contenu"}>
            <button onClick={this.defineWinner}>Comptabiliser les votes</button>
          </div>
        </div>

        {/* Résultats */}
        <div className={this.state.votingState == 5 ? "contenu contenu-active" : "contenu"}>
          <div>
            {this.state.winningDescription}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
