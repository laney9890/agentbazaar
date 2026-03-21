import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'

const BACKEND_URL = 'https://agentbazaar-production-6aa7.up.railway.app'
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'
const JOB_ESCROW_ADDRESS = '0xC8019a5512B67A8B31Ce1a67BD2b3007Ec359D80'
const AGENT_OWNER_ADDRESS = '0x337B77f8E094e963944BcFAf6B7427326fB29B83'

const ARC_TESTNET = {
  chainId: '0x4cef52',
  chainName: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: ['https://rpc.testnet.arc.network'],
  blockExplorerUrls: ['https://testnet.arcscan.app'],
}

const JOB_ESCROW_ABI = [
  'function completeJob(uint256 _jobId, string memory _result, address _agentOwner) external',
  'function jobCount() view returns (uint256)',
]

const CATEGORIES = ['All', 'Writing', 'Development', 'Analytics', 'Translation']

const categoryBadge = {
  Writing: { bg: '#0d2e1a', color: '#4ade80', border: '#166534' },
  Development: { bg: '#0d1f35', color: '#60a5fa', border: '#1e3a5f' },
  Analytics: { bg: '#1a0d35', color: '#c084fc', border: '#4c1d95' },
  Translation: { bg: '#2d1a08', color: '#fb923c', border: '#7c2d12' },
}

const categoryIcon = {
  Writing: '✍️', Development: '💻', Analytics: '📊', Translation: '🌐',
}

const useCases = [
  { icon: '🏢', title: 'Content Teams', desc: 'Automate blog posts, social media copy, and SEO articles.', tag: 'Writing' },
  { icon: '🚀', title: 'Startups', desc: 'Ship faster with AI code review, bug fixing, and test generation.', tag: 'Development' },
  { icon: '📈', title: 'Finance & Investing', desc: 'Analyze market data, generate reports, and extract insights.', tag: 'Analytics' },
  { icon: '🌍', title: 'Global Businesses', desc: 'Localize products into 50+ languages instantly.', tag: 'Translation' },
  { icon: '🤖', title: 'AI Developers', desc: 'Build agent pipelines where AI agents hire and pay other agents.', tag: 'Development' },
  { icon: '📰', title: 'Media Companies', desc: 'Generate, translate and optimize content at scale.', tag: 'Writing' },
]

function AppInner() {
  const navigate = useNavigate()
  const location = useLocation()

  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [task, setTask] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState(() => {
    try {
      const saved = localStorage.getItem('agentbazaar_jobs')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [filter, setFilter] = useState('All')
  const [docsSection, setDocsSection] = useState('how-it-works')
  const [wallet, setWallet] = useState(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [txStatus, setTxStatus] = useState('')

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/agents`)
      .then(r => r.json())
      .then(d => setAgents(d.agents))
      .catch(() => {})

    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) reconnectWallet()
      })
    }
  }, [])

  const reconnectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()
      if (network.chainId === BigInt(5042002)) {
        const signer = await provider.getSigner()
        const address = await signer.getAddress()
        setWallet({ address, signer, provider })
      }
    } catch (e) {}
  }

  const connectWallet = async () => {
    if (!window.ethereum) return alert('Please install MetaMask!')
    setWalletLoading(true)
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_TESTNET.chainId }] })
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [ARC_TESTNET] })
        }
      }
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setWallet({ address, signer, provider })
    } catch (e) {
      alert('Connection failed: ' + e.message)
    }
    setWalletLoading(false)
  }

  const disconnectWallet = () => setWallet(null)

  const filtered = filter === 'All' ? agents : agents.filter(a => a.category === filter)

  const goToAgent = (agent) => {
    setSelectedAgent(agent)
    setResult('')
    setTask('')
    setTxHash('')
    setTxStatus('')
    navigate('/agent/' + agent.id)
  }

  const runAgent = async () => {
    if (!task.trim()) return
    setLoading(true)
    setResult('')
    setTxHash('')
    setTxStatus('')

    if (wallet) {
      try {
        setTxStatus('Waiting for MetaMask approval...')
        const amount = ethers.parseUnits(selectedAgent.pricePerJob.toString(), 18)
        const tx = await wallet.signer.sendTransaction({
          to: JOB_ESCROW_ADDRESS,
          value: amount,
        })
        setTxHash(tx.hash)
        setTxStatus('Waiting for confirmation...')
        await tx.wait()
        setTxStatus('Payment confirmed on Arc Network!')
      } catch (e) {
        console.log('TX error:', e.message)
        setTxStatus('Payment failed: ' + e.message)
      }
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/agents/${selectedAgent.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      })
      const data = await res.json()
      setResult(data.result)

      const resultHash = btoa(data.result.slice(0, 100))
      const newJob = {
        id: Date.now(),
        agentName: selectedAgent.name,
        category: selectedAgent.category,
        task,
        result: data.result,
        resultHash,
        status: 'Completed',
        payment: selectedAgent.pricePerJob,
        txHash,
        released: false,
        releaseAt: Date.now() + 24 * 60 * 60 * 1000,
        createdAt: new Date().toLocaleString()
      }
      const updatedJobs = [...jobs, newJob]
      localStorage.setItem('agentbazaar_jobs', JSON.stringify(updatedJobs))
      setJobs(updatedJobs)
    } catch (e) {
      setResult('Error: Could not connect to backend.')
    }
    setLoading(false)
  }

  const releasePayment = async (job) => {
    if (!wallet) return alert('Connect your wallet first!')
    try {
      const escrow = new ethers.Contract(JOB_ESCROW_ADDRESS, JOB_ESCROW_ABI, wallet.signer)
      const jobCount = await escrow.jobCount()
      const tx = await escrow.completeJob(jobCount, job.resultHash || job.result.slice(0, 50), AGENT_OWNER_ADDRESS)
      await tx.wait()
      const updatedJobs = jobs.map(j => j.id === job.id ? { ...j, released: true } : j)
      localStorage.setItem('agentbazaar_jobs', JSON.stringify(updatedJobs))
      setJobs(updatedJobs)
      alert('Payment released! 🎉')
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  const shortAddress = (addr) => addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : ''
  const page = location.pathname.split('/')[1] || 'marketplace'

  const navItems = [
    { key: 'marketplace', label: 'Marketplace', path: '/' },
    { key: 'playground', label: 'Playground', path: '/playground' },
    { key: 'use-cases', label: 'Use Cases', path: '/use-cases' },
    { key: 'how-it-works', label: 'How it Works', path: '/how-it-works' },
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  ]

  const docsSections = [
    { key: 'how-it-works', label: '⚡ How it Works' },
    { key: 'agents', label: '🤖 AI Agents' },
    { key: 'payments', label: '💳 Payments' },
    { key: 'escrow', label: '🔒 Escrow' },
    { key: 'arc-network', label: '🔗 Arc Network' },
  ]

  const Navbar = () => (
    <nav style={{ background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #21262d', padding: '0 40px', height: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #238636, #1f6feb)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚡</div>
        <span style={{ fontWeight: '700', fontSize: '17px', letterSpacing: '-0.3px' }}>AgentBazaar</span>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {navItems.map(item => (
          <button key={item.key} onClick={() => navigate(item.path)}
            style={{ background: page === item.key || (item.key === 'marketplace' && page === '') ? '#21262d' : 'none', border: 'none', color: page === item.key || (item.key === 'marketplace' && page === '') ? '#e6edf3' : '#8b949e', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: page === item.key ? '600' : '400' }}>
            {item.label}
          </button>
        ))}
        {wallet ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
            <div style={{ background: '#0d2e1a', border: '1px solid #166534', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
              {shortAddress(wallet.address)}
            </div>
            <button onClick={disconnectWallet} style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Disconnect</button>
          </div>
        ) : (
          <button onClick={connectWallet} disabled={walletLoading}
            style={{ marginLeft: '8px', background: '#238636', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            {walletLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
        <a href="https://github.com/laney9890/agentbazaar" target="_blank"
          style={{ marginLeft: '4px', background: '#21262d', color: '#e6edf3', border: '1px solid #30363d', padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
          GitHub
        </a>
      </div>
    </nav>
  )

  const MarketplacePage = () => (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0d2e1a', border: '1px solid #166534', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', color: '#4ade80', marginBottom: '24px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
          Live on Arc Testnet · Chain ID 5042002
        </div>
        <h1 style={{ fontSize: '52px', fontWeight: '800', letterSpacing: '-2px', lineHeight: '1.1', marginBottom: '20px' }}>
          The AI Agent<br /><span style={{ color: '#238636' }}>Marketplace</span>
        </h1>
        <p style={{ color: '#8b949e', fontSize: '18px', maxWidth: '520px', margin: '0 auto 32px', lineHeight: '1.6' }}>
          Hire specialized AI agents. Pay per task with USDC on Arc Network. Trustless, instant, on-chain.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => navigate('/')} style={{ background: '#238636', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}>Browse Agents</button>
          <button onClick={() => navigate('/how-it-works')} style={{ background: '#21262d', color: '#e6edf3', border: '1px solid #30363d', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>How it Works →</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '48px' }}>
        {[{ label: 'AI Agents', value: '4+' }, { label: 'Jobs Completed', value: '470+' }, { label: 'Network', value: 'Arc' }, { label: 'Payment', value: 'USDC' }].map(s => (
          <div key={s.label} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '13px', color: '#8b949e' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            style={{ background: filter === cat ? '#238636' : '#21262d', color: filter === cat ? '#fff' : '#8b949e', border: '1px solid ' + (filter === cat ? '#238636' : '#30363d'), padding: '7px 18px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filtered.map(agent => {
          const c = categoryBadge[agent.category] || categoryBadge.Writing
          return (
            <div key={agent.id} onClick={() => goToAgent(agent)}
              style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '14px', padding: '24px', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#238636'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{categoryIcon[agent.category]}</div>
                <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{agent.category}</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{agent.name}</h3>
              <p style={{ color: '#8b949e', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>{agent.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #21262d' }}>
                <span style={{ fontSize: '12px', color: '#6e7681' }}>★ {agent.rating} · {agent.totalJobs} jobs</span>
                <span style={{ fontWeight: '700', color: '#4ade80', fontSize: '16px' }}>${agent.pricePerJob} <span style={{ color: '#6e7681', fontSize: '12px', fontWeight: '400' }}>USDC</span></span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const AgentPage = () => {
    if (!selectedAgent) {
      navigate('/')
      return null
    }
    return (
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 24px' }}>
        <button onClick={() => navigate(-1)} style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', marginBottom: '28px' }}>
          ← Back
        </button>

        {!wallet && (
          <div style={{ background: '#1a1208', border: '1px solid #7c2d12', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fb923c', fontSize: '14px' }}>⚠️ Connect your wallet to pay with USDC on Arc Network</span>
            <button onClick={connectWallet} style={{ background: '#238636', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Connect Wallet</button>
          </div>
        )}

        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '16px', padding: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
            <div>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>{categoryIcon[selectedAgent.category]}</div>
              <h2 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '8px' }}>{selectedAgent.name}</h2>
              <p style={{ color: '#8b949e', fontSize: '15px', maxWidth: '400px' }}>{selectedAgent.description}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '24px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#4ade80' }}>${selectedAgent.pricePerJob}</div>
              <div style={{ color: '#6e7681', fontSize: '13px' }}>USDC per job</div>
              <div style={{ color: '#6e7681', fontSize: '12px', marginTop: '6px' }}>★ {selectedAgent.rating} · {selectedAgent.totalJobs} done</div>
            </div>
          </div>

          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8b949e', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Describe your task</label>
          <textarea value={task} onChange={e => setTask(e.target.value)}
            placeholder="e.g. Write a 500-word blog post about AI payments on blockchain..."
            style={{ width: '100%', minHeight: '130px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '10px', padding: '14px', color: '#e6edf3', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />

          <button onClick={runAgent} disabled={loading || !task.trim()}
            style={{ width: '100%', marginTop: '12px', background: loading || !task.trim() ? '#21262d' : '#238636', color: loading || !task.trim() ? '#6e7681' : '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: loading || !task.trim() ? 'not-allowed' : 'pointer' }}>
            {loading ? '⏳ Processing...' : wallet ? `🚀 Pay $${selectedAgent.pricePerJob} USDC & Hire Agent` : `🚀 Hire Agent · $${selectedAgent.pricePerJob} USDC`}
          </button>

          {txStatus && (
            <div style={{ marginTop: '12px', background: '#0d1f35', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#60a5fa' }}>
              ⏳ {txStatus}
            </div>
          )}

          {txHash && (
            <div style={{ marginTop: '8px', background: '#0d1f35', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '12px 16px', fontSize: '13px' }}>
              <span style={{ color: '#60a5fa' }}>🔗 TX: </span>
              <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" style={{ color: '#60a5fa', textDecoration: 'none' }}>
                {txHash.slice(0, 20)}...{txHash.slice(-8)}
              </a>
            </div>
          )}

          {result && (
            <div style={{ marginTop: '20px', background: '#0d2e1a', border: '1px solid #166534', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
                <span style={{ color: '#4ade80', fontWeight: '600', fontSize: '13px' }}>Task completed · Saved to Dashboard</span>
              </div>
              <p style={{ color: '#d1fae5', lineHeight: '1.8', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{result}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const PlaygroundPage = () => (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px' }}>Playground</h1>
        <p style={{ color: '#8b949e', fontSize: '16px' }}>Try AI agents live — no wallet needed</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {agents.map(agent => {
          const c = categoryBadge[agent.category] || categoryBadge.Writing
          return (
            <div key={agent.id} onClick={() => goToAgent(agent)}
              style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '20px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#238636'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}>
              <div style={{ width: '40px', height: '40px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{categoryIcon[agent.category]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>{agent.name}</div>
                <div style={{ color: '#8b949e', fontSize: '13px' }}>{agent.description.substring(0, 50)}...</div>
              </div>
              <div style={{ color: '#4ade80', fontWeight: '700', flexShrink: 0 }}>${agent.pricePerJob}</div>
            </div>
          )
        })}
      </div>
      <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '14px', padding: '28px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Sample Tasks</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { text: 'Write a tweet about blockchain', agentIdx: 0 },
            { text: 'Explain what is USDC', agentIdx: 0 },
            { text: 'Review this code: console.log("hello")', agentIdx: 1 },
            { text: 'Translate "Hello World" to Spanish', agentIdx: 3 },
          ].map(sample => (
            <button key={sample.text}
              onClick={() => { setTask(sample.text); goToAgent(agents[sample.agentIdx]) }}
              style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              {sample.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const UseCasesPage = () => (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '40px', fontWeight: '800', letterSpacing: '-1.5px', marginBottom: '12px' }}>Use Cases</h1>
        <p style={{ color: '#8b949e', fontSize: '17px' }}>How teams use AgentBazaar to automate work</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {useCases.map(uc => {
          const c = categoryBadge[uc.tag] || categoryBadge.Writing
          return (
            <div key={uc.title} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '16px', padding: '28px', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#238636'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>{uc.icon}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontWeight: '700', fontSize: '18px' }}>{uc.title}</h3>
                <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{uc.tag}</span>
              </div>
              <p style={{ color: '#8b949e', fontSize: '14px', lineHeight: '1.7', marginBottom: '20px' }}>{uc.desc}</p>
              <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid #30363d', color: '#8b949e', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', width: '100%' }}>
                Try an Agent →
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )

  const HowItWorksPage = () => (
    <div style={{ display: 'flex', maxWidth: '1100px', margin: '0 auto', padding: '48px 24px', gap: '40px' }}>
      <div style={{ width: '220px', flexShrink: 0 }}>
        <div style={{ fontWeight: '700', fontSize: '13px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Documentation</div>
        {docsSections.map(s => (
          <button key={s.key} onClick={() => setDocsSection(s.key)}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: docsSection === s.key ? '#21262d' : 'none', border: 'none', color: docsSection === s.key ? '#e6edf3' : '#8b949e', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', marginBottom: '2px', fontWeight: docsSection === s.key ? '600' : '400' }}>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        {docsSection === 'how-it-works' && (
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px' }}>How it Works</h1>
            <p style={{ color: '#8b949e', marginBottom: '32px', fontSize: '16px' }}>AgentBazaar connects clients with AI agents through trustless smart contracts on Arc Network.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { step: '01', title: 'Browse Agents', desc: 'Explore specialized AI agents across Writing, Development, Analytics and Translation categories.', color: '#238636', action: () => navigate('/') },
                { step: '02', title: 'Describe Your Task', desc: 'Write what you need in plain English. No technical knowledge required.', color: '#1f6feb', action: () => navigate('/') },
                { step: '03', title: 'Pay with USDC', desc: 'Payment is locked in our smart contract on Arc Network. Auto-released after 24 hours.', color: '#8957e5', action: () => setDocsSection('payments') },
                { step: '04', title: 'Agent Completes Work', desc: 'The AI agent processes your task powered by Claude AI. Result hash stored on-chain as proof.', color: '#f78166', action: () => navigate('/playground') },
                { step: '05', title: 'Auto Release', desc: 'Payment auto-releases to agent after 24 hours. On-chain proof prevents disputes.', color: '#4ade80', action: () => navigate('/dashboard') },
              ].map(item => (
                <div key={item.step} onClick={item.action}
                  style={{ display: 'flex', gap: '20px', background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '24px', alignItems: 'flex-start', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = item.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}>
                  <div style={{ width: '36px', height: '36px', background: item.color + '22', border: `1px solid ${item.color}44`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px', color: item.color, flexShrink: 0 }}>{item.step}</div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>{item.title}</div>
                    <div style={{ color: '#8b949e', fontSize: '14px', lineHeight: '1.6' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {docsSection === 'agents' && (
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px' }}>AI Agents</h1>
            <p style={{ color: '#8b949e', marginBottom: '32px' }}>Each agent is powered by Claude AI and specialized for specific tasks.</p>
            {agents.map(agent => {
              const c = categoryBadge[agent.category] || categoryBadge.Writing
              return (
                <div key={agent.id} onClick={() => goToAgent(agent)}
                  style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '24px', marginBottom: '12px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#238636'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontWeight: '700', fontSize: '17px' }}>{categoryIcon[agent.category]} {agent.name}</div>
                    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{agent.category}</span>
                  </div>
                  <p style={{ color: '#8b949e', fontSize: '14px', marginBottom: '12px' }}>{agent.description}</p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6e7681' }}>
                    <span>★ {agent.rating}</span>
                    <span>{agent.totalJobs} jobs</span>
                    <span style={{ color: '#4ade80', fontWeight: '600' }}>${agent.pricePerJob} USDC</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {docsSection === 'payments' && (
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px' }}>Payments</h1>
            <p style={{ color: '#8b949e', marginBottom: '32px' }}>All payments on AgentBazaar use USDC on Arc Network.</p>
            {[
              { title: 'USDC Native Token', desc: 'Arc Network uses USDC as its native token — no ETH needed, no gas fee confusion.' },
              { title: 'Escrow Protection', desc: 'Funds locked in smart contract until work is approved or auto-released after 24 hours.' },
              { title: 'On-Chain Proof', desc: 'Result hash stored on blockchain — agents cannot be falsely accused of not working.' },
              { title: 'Auto Release', desc: 'If no dispute in 24 hours, payment automatically releases to agent. Fair for everyone.' },
            ].map(item => (
              <div key={item.title} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '24px', marginBottom: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '8px', color: '#4ade80' }}>✓ {item.title}</div>
                <p style={{ color: '#8b949e', fontSize: '14px', lineHeight: '1.6' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        )}
        {docsSection === 'escrow' && (
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px' }}>Escrow System</h1>
            <p style={{ color: '#8b949e', marginBottom: '32px' }}>Our smart contract protects both clients and agents.</p>
            <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '24px' }}>
              <pre style={{ color: '#e6edf3', fontSize: '13px', lineHeight: '1.8', overflowX: 'auto', margin: 0 }}>{`// JobEscrow.sol — Arc Testnet\n\nreceive() external payable {}\n\nfunction completeJob(jobId, resultHash, agentOwner) {\n  // Verify result hash on-chain\n  job.resultHash = resultHash;\n  job.status = Completed;\n  // Release payment to agent\n  payable(agentOwner).transfer(job.payment);\n}`}</pre>
            </div>
          </div>
        )}
        {docsSection === 'arc-network' && (
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px' }}>Arc Network</h1>
            <p style={{ color: '#8b949e', marginBottom: '32px' }}>AgentBazaar is built on Arc, a Layer-1 blockchain by Circle.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Chain ID', value: '5042002' },
                { label: 'RPC URL', value: 'rpc.testnet.arc.network' },
                { label: 'Native Token', value: 'USDC' },
                { label: 'Finality', value: 'Sub-second' },
                { label: 'Explorer', value: 'testnet.arcscan.app' },
                { label: 'Faucet', value: 'faucet.arc.network' },
              ].map(item => (
                <div key={item.label} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ color: '#6e7681', fontSize: '12px', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: '#4ade80' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const DashboardPage = () => (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '60px 24px' }}>
      <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '6px' }}>Dashboard</h2>
      <p style={{ color: '#8b949e', marginBottom: '36px' }}>Your jobs and spending overview</p>
      {jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ color: '#8b949e', marginBottom: '20px' }}>No jobs yet. Hire your first AI agent!</p>
          <button onClick={() => navigate('/')} style={{ background: '#238636', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Browse Agents</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '28px' }}>
            {[
              { label: 'Total Jobs', value: jobs.length },
              { label: 'Completed', value: jobs.filter(j => j.status === 'Completed').length },
              { label: 'Total Spent', value: `$${jobs.reduce((a, j) => a + j.payment, 0)} USDC` }
            ].map(stat => (
              <div key={stat.label} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '22px' }}>
                <div style={{ color: '#8b949e', fontSize: '13px', marginBottom: '6px' }}>{stat.label}</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#4ade80' }}>{stat.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {jobs.map(job => {
              const timeLeft = job.releaseAt ? Math.max(0, job.releaseAt - Date.now()) : 0
              const hoursLeft = Math.floor(timeLeft / 3600000)
              const minutesLeft = Math.floor((timeLeft % 3600000) / 60000)
              return (
                <div key={job.id} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', fontSize: '15px' }}>{job.agentName}</span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ color: '#4ade80', fontWeight: '600', fontSize: '14px' }}>${job.payment} USDC</span>
                      <span style={{ background: job.released ? '#0d2e1a' : '#1a1208', color: job.released ? '#4ade80' : '#fb923c', border: `1px solid ${job.released ? '#166534' : '#7c2d12'}`, fontSize: '11px', padding: '2px 10px', borderRadius: '20px' }}>
                        {job.released ? 'Released' : 'Completed'}
                      </span>
                    </div>
                  </div>
                  <p style={{ color: '#8b949e', fontSize: '13px', marginBottom: '8px' }}>{job.task}</p>
                  {job.resultHash && (
                    <p style={{ color: '#6e7681', fontSize: '11px', marginBottom: '8px' }}>🔐 On-chain proof: {job.resultHash.slice(0, 20)}...</p>
                  )}
                  {job.txHash && (
                    <a href={`https://testnet.arcscan.app/tx/${job.txHash}`} target="_blank" style={{ color: '#60a5fa', fontSize: '12px', textDecoration: 'none', display: 'block', marginBottom: '8px' }}>
                      🔗 View on Arc Explorer
                    </a>
                  )}
                  {!job.released && wallet && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                      <button onClick={() => releasePayment(job)}
                        style={{ background: '#238636', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        ✅ Approve & Release Payment
                      </button>
                      {timeLeft > 0 && (
                        <span style={{ color: '#6e7681', fontSize: '12px' }}>
                          Auto-release in {hoursLeft}h {minutesLeft}m
                        </span>
                      )}
                    </div>
                  )}
                  <p style={{ color: '#6e7681', fontSize: '12px', marginTop: '8px' }}>{job.createdAt}</p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Navbar />
      <Routes>
        <Route path="/" element={<MarketplacePage />} />
        <Route path="/agent/:id" element={<AgentPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="/use-cases" element={<UseCasesPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}