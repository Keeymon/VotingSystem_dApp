import "./App.css";
import React, { Component } from "react";
import VotingContract from "./contracts/Voting.json";
import { Button, Card, ListGroup, Table, Form, Badge } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
//import "react-notifications/lib/notifications.css";
//import {NotificationContainer, NotificationManager} from 'react-notifications';
import getWeb3 from "./getWeb3";

import { divCeil } from "@ethereumjs/vm/dist/evm/opcodes";

class App extends Component {
  state = { web3: null, accounts: null, contract: null, formError: null, formVote: null,
    votingState: null, votingStateVerbose: null, listAddress: [],
    owner: null, addressRegister: null, proposalRegister: null, listProposals: [], idVote: "",
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
    const { contract, listAddress } = this.state;
    const { ethereum } = window;

    ethereum.on("accountsChanged", this.handleAccounts);

    const vState = await contract.methods.getStatus().call();
    this.setState({ votingState: parseInt(vState) });
    if(this.state.votingState >= 3 )
      this.setState({ listProposals: await contract.methods.getAllDescription().call() });
    if(this.state.votingState >= 5 )
      this.setState({ winningDescription: await contract.methods.getWinner().call() });
    let addresses = await contract.methods.getAddresses().call();
    console.log(addresses);
    this.setState({ listAddress: addresses });
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
    const { listAddress } = this.state;
    const updateListAddress = Array.from(listAddress);
    console.log(event);
    console.log(updateListAddress);
    console.log(typeof updateListAddress);
    updateListAddress.push(event.returnValues["voterAddress"]);
    this.setState({ listAddress: updateListAddress });
  }

  handleVotingState = async (event) => {
    this.setState({ votingState: event.returnValues[1] });
  }

  handleVotingStart = async (event) => {
    const { contract } = this.state;
    const list = await contract.methods.getAllDescription().call(); // a changer
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

    try {
      this.setState({ formError: null });
      await contract.methods.voterRegister(this.state.addressRegister).send({from: accounts[0]});
    } catch (error) {
      console.error(error.message);
      this.setState({ formError: error.message });
    }
    //await contract.methods.voterRegister(event.target.value).send({ from: accounts[0] });
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
    const { web3, accounts, listAddress, listProposals, winningDescription, formError, votingState, addressRegister } = this.state;
    if (!web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
      
    return (
      <div className="App">
        <div>
            <h2 className="text-center">Système de Vote</h2>
            <hr></hr>
        </div>
        <div>
          <h3 className="text-center"> Status : {this.getStateVerbose(votingState)} <Badge variant="secondary">{this.state.accounts[0]}</Badge></h3>
        </div>
        
        {(() => {
          switch (votingState) {
            case 0:
              return (
                <div>
                  <h2>Registering Voters</h2>
                  <div style={{display: 'flex', justifyContent: 'center'}}>
                    <Card style={{ width: '50rem' }}>
                      <Card.Header><strong>Registered voters</strong></Card.Header>
                      <Card.Body>
                        <ListGroup variant="flush">
                          <ListGroup.Item>
                            <Table striped bordered hover>
                              <tbody>
                                { listAddress !== null && listAddress.map((a) => <tr><td>{a}</td></tr>) }
                              </tbody>
                            </Table>
                          </ListGroup.Item>
                        </ListGroup>
                      </Card.Body>
                    </Card>
                  </div>
                  <br></br>
                  <div style={{display: 'flex', justifyContent: 'center'}}>
                    <Card style={{ width: '50rem' }}>
                      <Card.Header><strong>Authorize new voters</strong></Card.Header>
                      <Card.Body>
                        <Form>
                          <Form.Group>
                            <Form.Control placeholder="Enter Address" isInvalid={Boolean(formError)} onChange={e => this.setState({ addressRegister: e.target.value, formError: null })} type="text" />
                            <Form.Control.Feedback type="invalid">{formError}</Form.Control.Feedback>
                            <Form.Label style={{float: 'left'}}>Or</Form.Label>
                            <Form.Control defaultValue={'Default'} as="select" isInvalid={Boolean(formError)} onChange={e => this.setState({ addressRegister: e.target.value, formError: null })}>
                              <option value="Default" disabled hidden>Select Address</option>
                              {/* get all connected accounts ? */}
                              { accounts !== null && accounts.map((a) => <option value={a}>{a}</option>) }
                            </Form.Control>
                            <br/>
                            <Button name="adressInput" onClick={this.handleSubmitVoterRegister}>Authorize</Button>
                          </Form.Group>
                        </Form>
                      </Card.Body>
                    </Card>
                    </div>
                  <br></br>
                  <Button onClick={this.proposalsRegistrationStart}>Start Proposals Registration</Button>
                </div>
              )
              default :
              return (
                <div>
                  <h2>404: Nothing to do here</h2>
                </div>
              )
            }
          })()}
      </div>
    );
  }
}

export default App;
