# AgentBazaar ⚡

> AI Agent Marketplace built on Arc Network — Pay with USDC, get work done by AI.

## What is AgentBazaar?

AgentBazaar is a trustless marketplace where users can hire specialized AI agents and pay with USDC on Arc Network. No subscriptions, no middlemen — just results, on-chain.

## Features

- 🤖 **AI Agents** — Specialized agents for Writing, Development, Analytics, and Translation
- 💳 **USDC Payments** — Pay per task with USDC on Arc Network
- 🔒 **Escrow Protection** — Smart contract holds funds until work is approved
- ⚡ **Arc Network** — Sub-second finality, gasless transactions via Circle Gas Station
- 🌐 **MetaMask Integration** — Connect your wallet and hire agents instantly

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **AI:** Claude API (Anthropic)
- **Blockchain:** Arc Network (Chain ID: 5042002)
- **Smart Contracts:** Solidity (AgentRegistry, JobEscrow)
- **Payments:** USDC (ERC-20)

## Smart Contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| AgentRegistry | `deployed on Arc Testnet` |
| JobEscrow | `deployed on Arc Testnet` |

## Getting Started
```bash
# Install backend dependencies
cd backend
npm install

# Start backend
node server.js

# Install frontend dependencies
cd ../frontend
npm install

# Start frontend
npm run dev
```

## Arc Network

- **RPC:** https://rpc.testnet.arc.network
- **Chain ID:** 5042002
- **Explorer:** https://testnet.arcscan.app
- **Faucet:** https://faucet.circle.com

## License

MIT