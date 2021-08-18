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

  const title = 'trustfund'

  const [state, setState] = useState({
    acc: null,
    relay: {}
  })

  const [query, setQuery] = useState({})

  const common = (who, delay = 0) => ({
    funded: async () => {
      try {
        console.log(`${who} sees that the account is funded.`)
        if (delay !== 0) {
          console.log(`${who} begins to wait ...`)
          await stdlib.wait(delay);
        }
      } catch (e) {
        console.error(e)
      }
    },
    ready: async () => {
      console.log(`${who} is ready to receive the funds.`)
    },
    recvd: async () => {
      console.log(`${who} received the funds.`)
    }
  })

  const handleChange = ({ target }) => {
    let { name, value } = target
    switch (name) {
      case 'INFO':
      case 'MAT':
      case 'REF':
      case 'DOR':
        value = parseInt(value)
        break
      case 'AMT':
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

    setTimeout(async () => {
      if (!state.ctcInfo) {
        setState({
          ...state,
          ctc,
          ctcInfo: await ctc.getInfo(),
        })
      }
    }, 5000)

    await Promise.all([
      backend.Funder(ctc, {
        ...common('Funder'),
        getParams: async () => ({
          receiverAddr: query.ADDR,
          payment: stdlib.parseCurrency(query.AMT),
          maturity: query.MAT,
          refund: query.REF,
          dormant: query.DOR
        })
      }),
    ])
  }

  const handleBob = async () => {
    console.log("Handling bob ...")
    let { ADDR, INFO } = query
    const ctc = state.acc.attach(backend, REACT_APP_NETWORK === 'ETH' ? ADDR : INFO);
    return Promise.all([
      'Receiver',
      'Bystander'
    ].map(part => backend[part](ctc, common(part))))
  }

  return (
    <Container>
      <Row className="mt-5">
        <Col>
          <h1 className="text-center">{title.toUpperCase()}</h1>
        </Col>
        <Col className="text-center" xs={12}>
          This runs on the <a href="https://testnet.algoexplorer.io/">Algorand Test Net</a>. Need funds? Try <a href="https://bank.testnet.algorand.network/">Algorand dispenser.</a>
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
            Setup a trust fund
          </h2>
        </Col>
        {[
          { col: { xs: 9 }, control: { name: "ADDR", placeholder: "Receiver address" } },
          { col: {}, control: { name: "AMT", placeholder: "Amount" } },
          { col: {}, control: { name: "MAT", placeholder: "Maturity", type: "number" } },
          { col: {}, control: { name: "REF", placeholder: "Refund", type: "number" } },
          { col: {}, control: { name: "DOR", placeholder: "Dormant", type: "number" } },
        ].map(el =>
          <Col xs={3} {...el.col}>
            <Form.Control className="mb-3" size="lg" type="text" onChange={handleChange} {...el.control} />
          </Col>
        )}
        <Col xs={3}>
          <Button size="lg" onClick={handleAlice} disabled={!state.acc}>Setup</Button>
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
          </Col>) : (state.relay.acc?.networkAccount &&
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
        {[
          {
            col: {},
            control: {
              name: REACT_APP_NETWORK === 'ETH' ? "ADDR" : "INFO",
              type: REACT_APP_NETWORK === 'ETH' ? "text" : "number",
              placeholder: "Info",
            }
          },
        ].map(el =>
          <Col xs={3} {...el.col}>
            <Form.Control className="mb-3" size="lg" type="text" onChange={handleChange} {...el.control} />
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
