import { useState } from 'react'
import * as backend from './build/index.main.mjs';
import { loadStdlib } from '@reach-sh/stdlib';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form'
import './App.css'

const { REACT_APP_NETWORK_PROVIDER, REACT_APP_NETWORK } = process.env

const stdlib = loadStdlib(REACT_APP_NETWORK)

if (REACT_APP_NETWORK_PROVIDER !== 'LocalHost') {
  stdlib.setProviderByName(REACT_APP_NETWORK_PROVIDER)
}

if (REACT_APP_NETWORK === 'ALGO') {
  stdlib.setSignStrategy('mnemonic')
}

const hasFaucet = (acc) => true
  && REACT_APP_NETWORK === 'ETH'
  && REACT_APP_NETWORK_PROVIDER === 'LocalHost'
  && acc

function App() {

  const title = 'relay'

  const [state, setState] = useState({
    acc: null,
    relay: {}
  })

  const [query, setQuery] = useState({})

  const handleChange = ({ target }) => {
    let { name, value } = target
    switch (name) {
      case 'AMT':
      case 'INFO':
        value = parseInt(value)
        break
      case 'SK':
      case 'ADDR':
      case 'MNE':
      default:
        break
    }
    setQuery({ ...query, [name]: value })
  }

  const handleConnect = async () => {
    console.log("Connecting ...")
    const acc = await stdlib.getDefaultAccount()
    if (stdlib.connector === 'ETH') {
      acc.setGasLimit(5000000);
    }
    const addr = await acc.getAddress();
    const balAtomic = await stdlib.balanceOf(acc);
    const bal = stdlib.formatCurrency(balAtomic, 4);
    setState({
      ...state,
      acc,
      addr,
      balAtomic,
      bal
    })
  }

  const handleFaucet = async () => {
    console.log("Faucet ...")
    const faucet = await stdlib.getFaucet()
    await stdlib.transfer(
      faucet,
      state.acc,
      stdlib.parseCurrency('100')
    )
    const balAtomic = await stdlib.balanceOf(state.acc);
    const bal = stdlib.formatCurrency(balAtomic, 4);
    setState({
      ...state,
      bal,
      balAtomic
    })
  }

  const handleAlice = async () => {
    console.log("Handling alice ...")
    const ctc = state.acc.deploy(backend)
    //const accRelay = await stdlib.newTestAccount(0);
    const accRelay = await stdlib.createAccount();
    stdlib.transfer(state.acc, accRelay, stdlib.minimumBalance);
    console.log({ accRelay })
    console.log(accRelay.networkAccount.addr)
    console.log(accRelay.networkAccount.sk)
    setTimeout(async () =>
      setState({
        ...state,
        ctc,
        ctcInfo: await ctc.getInfo(),
        relay: {
          acc: accRelay,
        },
      }), 5000)
    await backend.Alice(ctc, {
      amt: stdlib.parseCurrency(query.AMT),
      getRelay: async () => {
        console.log('Alice creates a Relay account.');
        console.log('Alice shares it with Bob outside of the network.');
        return accRelay.networkAccount;
      }
    })
  }

  const handleBob = async () => {
    console.log("Handling bob ...")
    let { INFO, ADDR, SK, MNE } = query
    const accRelay = REACT_APP_NETWORK === 'ETH'
      ? await stdlib.newAccountFromMnemonic(MNE)
      : await stdlib.newAccountFromSecret(Uint8Array.from(SK.split(',').map(el => +el)))
    stdlib.transfer(state.acc, accRelay, stdlib.parseCurrency(1))
    const ctcRelay = accRelay.attach(backend, REACT_APP_NETWORK === 'ETH' ? ADDR : INFO);
    return backend.Relay(ctcRelay, {
      getBob: async () => {
        console.log('Bob, acting as the Relay gives his information.');
        return state.acc.networkAccount;
      }
    })
  }

  return (
    <Container>
      <Row className="mt-5">
        <Col>
          <h1 className="text-center">{title.toUpperCase()}</h1>
        </Col>
      </Row>
      <Row className="mt-5 role role-participant">
        <ButtonGroup as={Col} xs={2} size="lg">
          {!state.acc && <Button onClick={handleConnect}>Connect</Button>}
          {hasFaucet(state.acc) && <Button variant="secondary" onClick={handleFaucet}>Faucet</Button>}
        </ButtonGroup>
      </Row>
      {state.acc && <Row>
        {[
          'addr',
          'bal'
        ].map(name =>
          <Col xs={12}>{name}: {state[name]}</Col>
        )}
      </Row>}
      <Row className="mt-5 role role-alice">
        <Col xs={12} className="mb-3">
          <h2>
            Send funds
          </h2>
        </Col>
        <Col xs={3}>
          <Form.Control name="AMT" size="lg" type="text" placeholder="Amount" onChange={handleChange} />
        </Col>
        <Col xs={3}>
          <Button size="lg" onClick={handleAlice} disabled={!state.acc}>Send</Button>
        </Col>
        {state.ctcInfo &&
          <Col xs={12}>
            info: <br />
            {state.ctcInfo}
          </Col>}
        {state.relay.acc &&
          REACT_APP_NETWORK === 'ETH' ? (
          <Col xs={12}>
            mnemonic phrase: <br />
            {state.relay.acc?.networkAccount?.mnemonic?.phrase}
          </Col>) : ( state.relay.acc?.networkAccount &&
            <Col xs={12}>
            secret: <br />
            {state.relay.acc.networkAccount.sk.toString()}
          </Col>
        )}
      </Row>
      <Row className="mt-5 role role-bob">
        <Col xs={12} className="mb-3">
          <h2>Receive funds</h2>
        </Col>
        <Col xs={3}>
          <Form.Control name={REACT_APP_NETWORK === 'ETH' ? "ADDR" : "INFO"} size="lg" type="text" placeholder="Info" onChange={handleChange} />
        </Col>

        {REACT_APP_NETWORK === 'ETH' ? (
          <Col xs={6}>
            <Form.Control name="MNE" size="lg" type="text" placeholder="Mnemonic" onChange={handleChange} />
          </Col>
        ) : (
          <Col xs={6}>
            <Form.Control name="SK" size="lg" type="text" placeholder="Secret" onChange={handleChange} />
          </Col>
        )}
        <Col xs={3}>
          <Button size="lg" onClick={handleBob} disabled={!state.acc}>Receive</Button>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
