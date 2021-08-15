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
stdlib.setProviderByName(REACT_APP_NETWORK_PROVIDER)
if (REACT_APP_NETWORK === 'ALGO') {
  stdlib.setSignStrategy('mnemonic')
}

const hasFaucet = true
  && REACT_APP_NETWORK === 'ETH'
  && REACT_APP_NETWORK_PROVIDER === 'LocalHost'

function App() {
  const [state, setState] = useState({
    acc: null
  })
  const [query, setQuery] = useState({})
  const handleChange = ({ target }) => {
    let { name, value } = target
    switch (name) {
      case 'INFO':
      case 'PASS':
      case 'AMT':
        value = parseInt(value)
        break
      default:
        break
    }
    setQuery({ ...query, [name]: value })
  }

  const handleConnect = async () => {
    console.log("Connecting ...")
    const acc = await stdlib.getDefaultAccount()
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
      await stdlib.getDefaultAccount(),
      stdlib.parseCurrency('100')
    )
  }

  const handleAlice = async () => {
    console.log("Handling alice ...")
    const ctc = state.acc.deploy(backend)
    setState({ ...state, ctc })
    await backend.Alice(ctc, {
      amt: stdlib.parseCurrency(query.AMT),
      pass: query.PASS
    })
  }

  const handleBob = async () => {
    console.log("Handling bob ...")
    let { INFO, PASS } = query
    const ctc = state.acc.attach(backend, INFO)
    await backend.Bob(ctc, {
      getPass: () => {
        console.log(`Bob asked to give the preimage`);
        console.log(`Returning: ${PASS}`);
        return PASS
      }
    })
  }

  return (
    <Container>
      <Row className="mt-5">
        <Col>
          <h1 className="text-center">HashLock</h1>
        </Col>
      </Row>
      <Row className="mt-5 role role-participant">
        <ButtonGroup as={Col} xs={2} size="lg">
          {!state.acc && <Button onClick={handleConnect}>Connect</Button>}
          {hasFaucet && <Button variant="secondary" onClick={handleFaucet}>Faucet</Button>}
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
        <Col xs={6}>
          <Form.Control name="PASS" size="lg" type="password" placeholder="Password" onChange={handleChange} />
        </Col>
        <Col xs={3}>
          <Button size="lg" onClick={handleAlice} disabled={!state.acc}>Send</Button>
        </Col>
      </Row>
      <Row className="mt-5 role role-bob">
        <Col xs={12} className="mb-3">
          <h2>Receive funds</h2>
        </Col>
        <Col xs={3}>
          <Form.Control name="INFO" size="lg" type="text" placeholder="Info" onChange={handleChange} />
        </Col>
        <Col xs={6}>
          <Form.Control name="PASS" size="lg" type="password" placeholder="Password" onChange={handleChange} />
        </Col>
        <Col xs={3}>
          <Button size="lg" onClick={handleBob} disabled={!state.acc}>Receive</Button>
        </Col>
      </Row>
      <Row className="mt-5 role role-faucet">
        <Col>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
