import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'

const BACKEND_URL = 'https://agentbazaar-production-6aa7.up.railway.app'
const JOB_ESCROW_ADDRESS = '0xC8019a5512B67A8B31Ce1a67BD2b3007Ec359D80'
const STREAM_PAYMENT_ADDRESS = '0x4d7Bb6AB9A6Ac161300eE29124ff5F474058c4eE'

const STREAM_ABI = [
  'function createStream(address _agent, uint256 _durationSeconds) external payable returns (uint256)',
  'function settleStream(uint256 _streamId) external',
  'function cancelStream(uint256 _streamId) external',
  'function getEarned(uint256 _streamId) external view returns (uint256)',
  'function getStream(uint256 _streamId) external view returns (tuple(uint256 id, address client, address agent, uint256 totalAmount, uint256 amountPerSecond, uint256 startTime, uint256 endTime, bool active, bool settled))',
  'function streamCount() view returns (uint256)',
]

const ARC_TESTNET = {
  chainId: '0x4cef52',
  chainName: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: ['https://rpc.testnet.arc.network'],
  blockExplorerUrls: ['https://testnet.arcscan.app'],
}

const ESCROW_ABI = [
  'function createJob(uint256 _agentId, string memory _title, string memory _description) external payable returns (uint256)',
  'function completeJob(uint256 _jobId, string memory _result, address _agentOwner) external',
  'function cancelJob(uint256 _jobId) external',
  'function jobCount() view returns (uint256)',
]

const CATEGORIES = ['All', 'Writing', 'Development', 'Analytics', 'Translation']

const CAT = {
  Writing: { bg: '#0d2e1a', color: '#4ade80', border: '#166534', icon: '✍️' },
  Development: { bg: '#0d1f35', color: '#60a5fa', border: '#1e3a5f', icon: '💻' },
  Analytics: { bg: '#1a0d35', color: '#c084fc', border: '#4c1d95', icon: '📊' },
  Translation: { bg: '#2d1a08', color: '#fb923c', border: '#7c2d12', icon: '🌐' },
}

const st = {
  page: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  nav: { background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #21262d', padding: '0 40px', height: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 },
  card: { background: '#161b22', border: '1px solid #21262d', borderRadius: '14px', padding: '24px', cursor: 'pointer', transition: 'border-color 0.15s' },
  btn: (color = '#238636') => ({ background: color, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }),
  input: { width: '100%', minHeight: '130px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '10px', padding: '14px', color: '#e6edf3', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
}

function useWallet() {
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!window.ethereum) return
    window.ethereum.request({ method: 'eth_accounts' }).then(async accounts => {
      if (accounts.length > 0) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const network = await provider.getNetwork()
          if (network.chainId === BigInt(5042002)) {
            const signer = await provider.getSigner()
            setWallet({ address: accounts[0], signer, provider })
          }
        } catch (e) {}
      }
    })
    window.ethereum.on('accountsChanged', () => setWallet(null))
    window.ethereum.on('chainChanged', () => window.location.reload())
  }, [])

  const connect = async () => {
    if (!window.ethereum) return alert('Please install MetaMask!')
    setLoading(true)
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_TESTNET.chainId }] })
      } catch (e) {
        if (e.code === 4902) await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [ARC_TESTNET] })
      }
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setWallet({ address, signer, provider })
    } catch (e) {
      alert('Connection failed: ' + e.message)
    }
    setLoading(false)
  }

  const disconnect = () => setWallet(null)
  const short = (a) => a ? a.slice(0, 6) + '...' + a.slice(-4) : ''
  return { wallet, loading, connect, disconnect, short }
}

function useJobs() {
  const [jobs, setJobs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('agentbazaar_jobs') || '[]') } catch { return [] }
  })

  const addJob = (job) => {
    const updated = [...jobs, job]
    localStorage.setItem('agentbazaar_jobs', JSON.stringify(updated))
    setJobs(updated)
  }

  const updateJob = (id, changes) => {
    const updated = jobs.map(j => j.id === id ? { ...j, ...changes } : j)
    localStorage.setItem('agentbazaar_jobs', JSON.stringify(updated))
    setJobs(updated)
  }

  return { jobs, addJob, updateJob }
}

function Navbar({ wallet, walletLoading, connect, disconnect, short }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const items = [
    { label: 'Marketplace', path: '/' },
    { label: 'Playground', path: '/playground' },
    { label: 'Use Cases', path: '/use-cases' },
    { label: 'How it Works', path: '/how-it-works' },
    { label: 'Dashboard', path: '/dashboard' },
  ]

  return (
    <nav style={st.nav}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #238636, #1f6feb)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚡</div>
        <span style={{ fontWeight: '700', fontSize: '17px' }}>AgentBazaar</span>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {items.map(item => (
          <button key={item.path} onClick={() => navigate(item.path)}
            style={{ background: pathname === item.path ? '#21262d' : 'none', border: 'none', color: pathname === item.path ? '#e6edf3' : '#8b949e', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: pathname === item.path ? '600' : '400' }}>
            {item.label}
          </button>
        ))}
        {wallet ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '8px' }}>
            <div style={{ background: '#0d2e1a', border: '1px solid #166534', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
              {short(wallet.address)}
            </div>
            <button onClick={disconnect} style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Disconnect</button>
          </div>
        ) : (
          <button onClick={connect} disabled={walletLoading} style={{ ...st.btn(), marginLeft: '8px', fontSize: '13px', padding: '7px 16px' }}>
            {walletLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
        <a href="https://github.com/laney9890/agentbazaar" target="_blank" style={{ marginLeft: '4px', background: '#21262d', color: '#e6edf3', border: '1px solid #30363d', padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>GitHub</a>
      </div>
    </nav>
  )
}

function Marketplace({ agents, filter, setFilter }) {
  const navigate = useNavigate()
  const filtered = filter === 'All' ? agents : agents.filter(a => a.category === filter)

  return (
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
          Hire specialized AI agents. Pay per task with USDC on Arc Network.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => navigate('/')} style={st.btn()}>Browse Agents</button>
          <button onClick={() => navigate('/how-it-works')} style={{ background: '#21262d', color: '#e6edf3', border: '1px solid #30363d', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>How it Works →</button>
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
            style={{ background: filter === cat ? '#238636' : '#21262d', color: filter === cat ? '#fff' : '#8b949e', border: '1px solid ' + (filter === cat ? '#238636' : '#30363d'), padding: '7px 18px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' }}>
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filtered.map(agent => {
          const c = CAT[agent.category] || CAT.Writing
          return (
            <div key={agent.id} onClick={() => navigate('/agent/' + agent.id)}
              style={st.card}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#238636'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{c.icon}</div>
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
}

function AgentPage({ agents, wallet, connect, addJob }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const agentId = parseInt(pathname.split('/').pop())
  const agent = agents.find(a => a.id === agentId)

  const [task, setTask] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [txStatus, setTxStatus] = useState('')

  if (!agent) return <Navigate to="/" />
  const c = CAT[agent.category] || CAT.Writing

  const run = async () => {
    if (!task.trim()) return
    setLoading(true)
    setResult('')
    setTxHash('')
    setTxStatus('')
    let onChainJobId = null

    if (wallet) {
      try {
        setTxStatus('Waiting for MetaMask approval...')
        const escrow = new ethers.Contract(JOB_ESCROW_ADDRESS, ESCROW_ABI, wallet.signer)
        const amount = ethers.parseUnits(agent.pricePerJob.toString(), 18)
        const tx = await escrow.createJob(agent.id, agent.name, task, { value: amount, gasLimit: 300000 })
        setTxHash(tx.hash)
        setTxStatus('Confirming payment...')
        await tx.wait()
        const escrow2 = new ethers.Contract(JOB_ESCROW_ADDRESS, ESCROW_ABI, wallet.signer)
        onChainJobId = Number(await escrow2.jobCount())
        setTxStatus('Payment confirmed on Arc Network!')
      } catch (e) {
        console.log('TX error:', e.message)
        setTxStatus('')
      }
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/agents/${agent.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      })
      const data = await res.json()
      const resultText = data.result || 'Error from agent'
      setResult(resultText)
      const resultHash = btoa(unescape(encodeURIComponent(resultText.slice(0, 100))))
      addJob({
        id: Date.now(),
        agentId: agent.id,
        agentName: agent.name,
        category: agent.category,
        task,
        result: resultText,
        resultHash,
        onChainJobId,
        status: 'Pending',
        payment: agent.pricePerJob,
        txHash,
        released: false,
        rejected: false,
        createdAt: new Date().toLocaleString()
      })
    } catch (e) {
      setResult('Error: Could not connect to backend.')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 24px' }}>
      <button onClick={() => navigate(-1)} style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', marginBottom: '28px' }}>← Back</button>

      {!wallet && (
        <div style={{ background: '#1a1208', border: '1px solid #7c2d12', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fb923c', fontSize: '14px' }}>⚠️ Connect your wallet to pay with USDC on Arc Network</span>
          <button onClick={connect} style={st.btn()}>Connect Wallet</button>
        </div>
      )}

      <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>{c.icon}</div>
            <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>{agent.name}</h2>
            <p style={{ color: '#8b949e', fontSize: '15px' }}>{agent.description}</p>
          </div>
          <div style={{ textAlign: 'right', marginLeft: '24px' }}>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#4ade80' }}>${agent.pricePerJob}</div>
            <div style={{ color: '#6e7681', fontSize: '13px' }}>USDC per job</div>
            <div style={{ color: '#6e7681', fontSize: '12px', marginTop: '6px' }}>★ {agent.rating} · {agent.totalJobs} done</div>
          </div>
        </div>

        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8b949e', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Describe your task</label>
        <textarea value={task} onChange={e => setTask(e.target.value)}
          placeholder="e.g. Write a 500-word blog post about AI payments..."
          style={st.input} />

        <button onClick={run} disabled={loading || !task.trim()}
          style={{ width: '100%', marginTop: '12px', background: loading || !task.trim() ? '#21262d' : '#238636', color: loading || !task.trim() ? '#6e7681' : '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: loading || !task.trim() ? 'not-allowed' : 'pointer' }}>
          {loading ? '⏳ Processing...' : wallet ? `🚀 Pay $${agent.pricePerJob} USDC & Hire Agent` : `🚀 Hire Agent · $${agent.pricePerJob} USDC`}
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

function Dashboard({ jobs, updateJob, wallet, connect }) {
  const navigate = useNavigate()
  const [streaming, setStreaming] = useState(false)
const [streamId, setStreamId] = useState(null)
const [earned, setEarned] = useState(0)

const startStream = async (job) => {
  if (!wallet) return alert('Connect your wallet first!')
  try {
    const stream = new ethers.Contract(STREAM_PAYMENT_ADDRESS, STREAM_ABI, wallet.signer)
    const amount = ethers.parseUnits(job.payment.toString(), 18)
    const duration = 60 // 60 saniye stream
    const tx = await stream.createStream(AGENT_OWNER_ADDRESS, duration, { value: amount, gasLimit: 300000 })
    await tx.wait()
    const id = Number(await stream.streamCount())
    setStreamId(id)
    setStreaming(true)
    // Her saniye kazanılanı güncelle
    const interval = setInterval(async () => {
      const e = await stream.getEarned(id)
      setEarned(Number(ethers.formatUnits(e, 18)).toFixed(4))
    }, 1000)
    setTimeout(() => {
      clearInterval(interval)
      setStreaming(false)
    }, 65000)
    updateJob(job.id, { streamId: id, status: 'Streaming' })
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

const settleStream = async (job) => {
  if (!wallet) return alert('Connect your wallet first!')
  try {
    const stream = new ethers.Contract(STREAM_PAYMENT_ADDRESS, STREAM_ABI, wallet.signer)
    const tx = await stream.settleStream(job.streamId)
    await tx.wait()
    updateJob(job.id, { status: 'Settled' })
    alert('✅ Stream settled! Agent paid.')
  } catch (e) {
    alert('Error: ' + e.message)
  }
}
  const approveJob = async (job) => {
    if (!wallet) return alert('Connect your wallet first!')
    try {
      const escrow = new ethers.Contract(JOB_ESCROW_ADDRESS, ESCROW_ABI, wallet.signer)
      const tx = await escrow.completeJob(job.onChainJobId, job.resultHash, AGENT_OWNER_ADDRESS)
      await tx.wait()
      updateJob(job.id, { released: true, status: 'Approved' })
      alert('✅ Payment released to agent!')
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  const rejectJob = async (job) => {
    if (!wallet) return alert('Connect your wallet first!')
    try {
      // Step 1: Ask Claude to evaluate
      const evalRes = await fetch(`${BACKEND_URL}/api/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: job.task, result: job.result })
      })
      const evalData = await evalRes.json()

      if (evalData.decision === 'approve') {
        // Claude says agent did good work — force pay agent
        alert(`🤖 AI Evaluation: Agent completed the task properly.\n\nReason: ${evalData.reason}\n\nPayment will be released to the agent automatically.`)
        const escrow = new ethers.Contract(JOB_ESCROW_ADDRESS, ESCROW_ABI, wallet.signer)
        const tx = await escrow.completeJob(job.onChainJobId, job.resultHash, AGENT_OWNER_ADDRESS)
        await tx.wait()
        updateJob(job.id, { released: true, status: 'Approved' })
      } else {
        // Claude says agent did poor work — refund user
        alert(`🤖 AI Evaluation: Agent did not complete the task properly.\n\nReason: ${evalData.reason}\n\nYour refund will be processed.`)
        const escrow = new ethers.Contract(JOB_ESCROW_ADDRESS, ESCROW_ABI, wallet.signer)
        const tx = await escrow.cancelJob(job.onChainJobId)
        await tx.wait()
        updateJob(job.id, { rejected: true, status: 'Rejected' })
        alert('❌ Job rejected. Payment refunded.')
      }
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '60px 24px' }}>
      <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '6px' }}>Dashboard</h2>
      <p style={{ color: '#8b949e', marginBottom: '36px' }}>Your jobs and spending overview</p>

      {jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ color: '#8b949e', marginBottom: '20px' }}>No jobs yet. Hire your first AI agent!</p>
          <button onClick={() => navigate('/')} style={st.btn()}>Browse Agents</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '28px' }}>
            {[
              { label: 'Total Jobs', value: jobs.length },
              { label: 'Approved', value: jobs.filter(j => j.status === 'Approved').length },
              { label: 'Total Spent', value: `$${jobs.reduce((a, j) => a + j.payment, 0)} USDC` }
            ].map(stat => (
              <div key={stat.label} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '22px' }}>
                <div style={{ color: '#8b949e', fontSize: '13px', marginBottom: '6px' }}>{stat.label}</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#4ade80' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jobs.map(job => (
              <div key={job.id} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>{job.agentName}</span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ color: '#4ade80', fontWeight: '600', fontSize: '14px' }}>${job.payment} USDC</span>
                    <span style={{
                      background: job.status === 'Approved' ? '#0d2e1a' : job.status === 'Rejected' ? '#2d0a0a' : '#1a1208',
                      color: job.status === 'Approved' ? '#4ade80' : job.status === 'Rejected' ? '#f87171' : '#fb923c',
                      border: `1px solid ${job.status === 'Approved' ? '#166534' : job.status === 'Rejected' ? '#7f1d1d' : '#7c2d12'}`,
                      fontSize: '11px', padding: '2px 10px', borderRadius: '20px'
                    }}>{job.status || 'Pending'}</span>
                  </div>
                </div>

                <p style={{ color: '#8b949e', fontSize: '13px', marginBottom: '8px' }}>Task: {job.task}</p>

                {job.resultHash && (
                  <p style={{ color: '#6e7681', fontSize: '11px', marginBottom: '8px', fontFamily: 'monospace' }}>
                    🔐 On-chain proof: {job.resultHash.slice(0, 32)}...
                  </p>
                )}

                {job.txHash && (
                  <a href={`https://testnet.arcscan.app/tx/${job.txHash}`} target="_blank"
                    style={{ color: '#60a5fa', fontSize: '12px', textDecoration: 'none', display: 'block', marginBottom: '8px' }}>
                    🔗 View payment on Arc Explorer
                  </a>
                )}
                {!job.released && !job.rejected && !job.streamId && wallet && (
  <div style={{ marginTop: '12px' }}>
    <button onClick={() => startStream(job)}
      style={{ background: '#1f6feb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', width: '100%' }}>
      ⚡ Pay with Nanopayments (Stream)
    </button>
  </div>
)}

{job.streamId && job.status === 'Streaming' && (
  <div style={{ marginTop: '12px', background: '#0d1f35', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '14px' }}>
    <div style={{ color: '#60a5fa', fontSize: '13px', marginBottom: '8px' }}>⚡ Stream aktif — Her saniye ödeme akıyor</div>
    <div style={{ color: '#4ade80', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>${earned} USDC kazanıldı</div>
    <button onClick={() => settleStream(job)}
      style={{ background: '#238636', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
      ✅ Settle Stream
    </button>
  </div>
)}

{job.streamId && job.status === 'Settled' && (
  <div style={{ marginTop: '8px', background: '#0d2e1a', border: '1px solid #166534', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#4ade80' }}>
    ✅ Nanopayment stream tamamlandı
  </div>
)}
                {!job.released && !job.rejected && job.onChainJobId && wallet && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => approveJob(job)}
                      style={{ background: '#238636', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      ✅ Approve & Release Payment
                    </button>
                    <button onClick={() => rejectJob(job)}
                      style={{ background: '#7f1d1d', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      ❌ Reject & AI Evaluation
                    </button>
                  </div>
                )}

                {!wallet && !job.released && !job.rejected && (
                  <button onClick={connect} style={{ ...st.btn(), marginTop: '8px', fontSize: '13px' }}>
                    Connect Wallet to Approve/Reject
                  </button>
                )}

                <p style={{ color: '#6e7681', fontSize: '12px', marginTop: '8px' }}>{job.createdAt}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Playground({ agents }) {
  const navigate = useNavigate()
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 24px' }}>
      <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '8px' }}>Playground</h1>
      <p style={{ color: '#8b949e', fontSize: '16px', marginBottom: '40px' }}>Try AI agents live</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {agents.map(agent => {
          const c = CAT[agent.category] || CAT.Writing
          return (
            <div key={agent.id} onClick={() => navigate('/agent/' + agent.id)}
              style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '20px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#238636'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}>
              <div style={{ width: '40px', height: '40px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{c.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>{agent.name}</div>
                <div style={{ color: '#8b949e', fontSize: '13px' }}>{agent.description.substring(0, 50)}...</div>
              </div>
              <div style={{ color: '#4ade80', fontWeight: '700' }}>${agent.pricePerJob}</div>
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
              onClick={() => navigate('/agent/' + (agents[sample.agentIdx]?.id || 1))}
              style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              {sample.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function UseCases() {
  const navigate = useNavigate()
  const cases = [
    { icon: '🏢', title: 'Content Teams', desc: 'Automate blog posts, social media copy, and SEO articles.', tag: 'Writing' },
    { icon: '🚀', title: 'Startups', desc: 'Ship faster with AI code review, bug fixing, and test generation.', tag: 'Development' },
    { icon: '📈', title: 'Finance & Investing', desc: 'Analyze market data, generate reports, and extract insights.', tag: 'Analytics' },
    { icon: '🌍', title: 'Global Businesses', desc: 'Localize products into 50+ languages instantly.', tag: 'Translation' },
    { icon: '🤖', title: 'AI Developers', desc: 'Build agent pipelines where AI agents hire and pay other agents.', tag: 'Development' },
    { icon: '📰', title: 'Media Companies', desc: 'Generate, translate and optimize content at scale.', tag: 'Writing' },
  ]
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 24px' }}>
      <h1 style={{ fontSize: '40px', fontWeight: '800', marginBottom: '12px' }}>Use Cases</h1>
      <p style={{ color: '#8b949e', fontSize: '17px', marginBottom: '48px' }}>How teams use AgentBazaar</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {cases.map(uc => {
          const c = CAT[uc.tag] || CAT.Writing
          return (
            <div key={uc.title} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '16px', padding: '28px' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#238636'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>{uc.icon}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontWeight: '700', fontSize: '18px' }}>{uc.title}</h3>
                <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: '3px 10px', borderRadius: '20px', fontSize: '11px' }}>{uc.tag}</span>
              </div>
              <p style={{ color: '#8b949e', fontSize: '14px', lineHeight: '1.7', marginBottom: '20px' }}>{uc.desc}</p>
              <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid #30363d', color: '#8b949e', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', width: '100%' }}>Try an Agent →</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HowItWorks() {
  const navigate = useNavigate()
  const [section, setSection] = useState('how-it-works')
  const sections = [
    { key: 'how-it-works', label: '⚡ How it Works' },
    { key: 'payments', label: '💳 Payments' },
    { key: 'escrow', label: '🔒 Escrow' },
    { key: 'arc-network', label: '🔗 Arc Network' },
  ]
  return (
    <div style={{ display: 'flex', maxWidth: '1100px', margin: '0 auto', padding: '48px 24px', gap: '40px' }}>
      <div style={{ width: '220px', flexShrink: 0 }}>
        <div style={{ fontWeight: '700', fontSize: '13px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Documentation</div>
        {sections.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: section === s.key ? '#21262d' : 'none', border: 'none', color: section === s.key ? '#e6edf3' : '#8b949e', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', marginBottom: '2px', fontWeight: section === s.key ? '600' : '400' }}>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        {section === 'how-it-works' && (
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '32px' }}>How it Works</h1>
            {[
              { step: '01', title: 'Browse Agents', desc: 'Explore AI agents across Writing, Development, Analytics and Translation.', color: '#238636', go: () => navigate('/') },
              { step: '02', title: 'Describe Task', desc: 'Write what you need in plain English. No technical knowledge required.', color: '#1f6feb', go: () => navigate('/') },
              { step: '03', title: 'Pay with USDC', desc: 'Payment locked in smart contract on Arc Network.', color: '#8957e5', go: () => setSection('payments') },
              { step: '04', title: 'Agent Works', desc: 'AI agent processes your task. Result hash stored on-chain as proof.', color: '#f78166', go: () => navigate('/playground') },
              { step: '05', title: 'Approve or AI Dispute', desc: 'Approve to pay agent. Reject triggers AI evaluation — if agent did good work, payment goes to agent anyway.', color: '#4ade80', go: () => navigate('/dashboard') },
            ].map(item => (
              <div key={item.step} onClick={item.go}
                style={{ display: 'flex', gap: '20px', background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '24px', marginBottom: '12px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = item.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}>
                <div style={{ width: '36px', height: '36px', background: item.color + '22', border: `1px solid ${item.color}44`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px', color: item.color, flexShrink: 0 }}>{item.step}</div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>{item.title}</div>
                  <div style={{ color: '#8b949e', fontSize: '14px' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {section === 'payments' && (
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '32px' }}>Payments</h1>
            {[
              { title: 'USDC Native Token', desc: 'Arc Network uses USDC as native token — no ETH needed.' },
              { title: 'Escrow Protection', desc: 'Funds locked until approved or AI evaluation completes.' },
              { title: 'On-Chain Proof', desc: 'Result hash stored on blockchain — cannot be disputed unfairly.' },
              { title: 'AI Dispute Resolution', desc: 'If you reject, Claude AI evaluates the work. If agent did good work, payment goes to agent regardless.' },
            ].map(item => (
              <div key={item.title} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '24px', marginBottom: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '8px', color: '#4ade80' }}>✓ {item.title}</div>
                <p style={{ color: '#8b949e', fontSize: '14px' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        )}
        {section === 'escrow' && (
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '32px' }}>Escrow System</h1>
            <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '24px' }}>
              <pre style={{ color: '#e6edf3', fontSize: '13px', lineHeight: '1.8', overflowX: 'auto', margin: 0 }}>{`// JobEscrow.sol — Arc Testnet\n// ${JOB_ESCROW_ADDRESS}\n\nfunction createJob(agentId, title, desc) payable {\n  jobs[++jobCount] = Job({client, payment: msg.value});\n}\n\nfunction completeJob(jobId, resultHash, agentOwner) {\n  payable(agentOwner).transfer(job.payment);\n}\n\nfunction cancelJob(jobId) {\n  payable(job.client).transfer(job.payment);\n}`}</pre>
            </div>
          </div>
        )}
        {section === 'arc-network' && (
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '32px' }}>Arc Network</h1>
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
}

export default function App() {
  const [agents, setAgents] = useState([])
  const [filter, setFilter] = useState('All')
  const { wallet, loading: walletLoading, connect, disconnect, short } = useWallet()
  const { jobs, addJob, updateJob } = useJobs()

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/agents`)
      .then(r => r.json())
      .then(d => setAgents(d.agents || []))
      .catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <div style={st.page}>
        <Navbar wallet={wallet} walletLoading={walletLoading} connect={connect} disconnect={disconnect} short={short} />
        <Routes>
          <Route path="/" element={<Marketplace agents={agents} filter={filter} setFilter={setFilter} />} />
          <Route path="/agent/:id" element={<AgentPage agents={agents} wallet={wallet} connect={connect} addJob={addJob} />} />
          <Route path="/playground" element={<Playground agents={agents} />} />
          <Route path="/use-cases" element={<UseCases />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/dashboard" element={<Dashboard jobs={jobs} updateJob={updateJob} wallet={wallet} connect={connect} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}