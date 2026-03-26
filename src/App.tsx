import { useState, useEffect, useRef } from 'react'
import './App.css'

interface NetworkPacket {
  id: number
  progress: number
  lossChance: number
  status: 'active' | 'lost'
  lossTtl: number
  dropProgress: number
  lane: number
  speedVar: number
  type: 'voice' | 'video' | 'data'
}

interface NetworkProfile {
  name: string
  id: string
  lossRate: number
  congestion: number
  speed: number
  description: string
}

interface TrendPoint {
  throughput: number
  delay: number
  loss: number
}

type CommunicationMethod = 'parity-even' | 'parity-odd' | 'checksum' | 'crc' | 'hamming'

interface TxBit {
  id: number
  sent: '0' | '1'
  received: '0' | '1'
  progress: number
  lane: number
  flipped: boolean
}

interface CommHistoryPoint {
  errorRate: number
  noise: number
  detection: number
}

interface PreparedTransmission {
  original: string
  payload: string
  method: CommunicationMethod
  checksum?: number
  crcDivisor?: string
}

interface TransmissionOutcome {
  detected: boolean
  corrected: boolean
  summary: string
  normalized: string
}

const CRC_DIVISOR = '1101'

const sanitizeBits = (value: string) => {
  const sanitized = value.replace(/[^01]/g, '').slice(0, 32)
  return sanitized.length > 0 ? sanitized : '10110101'
}

const toNibbles = (bits: string) => {
  const neededPadding = (4 - (bits.length % 4)) % 4
  const padded = bits + '0'.repeat(neededPadding)
  return padded.match(/.{1,4}/g) ?? []
}

const checksumFromNibbles = (bits: string) => {
  const total = toNibbles(bits).reduce((sum, chunk) => sum + parseInt(chunk, 2), 0)
  const reduced = total % 16
  return (15 - reduced) & 0b1111
}

const verifyChecksum = (bits: string, checksum: number) => {
  const total = toNibbles(bits).reduce((sum, chunk) => sum + parseInt(chunk, 2), 0)
  return ((total + checksum) % 16) === 15
}

const xorLongDivision = (input: string, divisor: string) => {
  const buffer = input.split('').map(Number)
  const poly = divisor.split('').map(Number)

  for (let i = 0; i <= buffer.length - poly.length; i += 1) {
    if (buffer[i] === 0) continue
    for (let j = 0; j < poly.length; j += 1) {
      buffer[i + j] ^= poly[j]
    }
  }

  return buffer.slice(-(poly.length - 1)).join('')
}

const buildCrcPayload = (bits: string, divisor: string) => {
  const remainder = xorLongDivision(bits + '0'.repeat(divisor.length - 1), divisor)
  return `${bits}${remainder}`
}

const parityBit = (bits: string, mode: 'even' | 'odd') => {
  const ones = bits.split('').filter((bit) => bit === '1').length
  const isEven = ones % 2 === 0
  if (mode === 'even') return isEven ? '0' : '1'
  return isEven ? '1' : '0'
}

const encodeHammingNibble = (nibble: string) => {
  const [d1, d2, d3, d4] = nibble.padEnd(4, '0').split('').map(Number)
  const p1 = d1 ^ d2 ^ d4
  const p2 = d1 ^ d3 ^ d4
  const p4 = d2 ^ d3 ^ d4
  return `${p1}${p2}${d1}${p4}${d2}${d3}${d4}`
}

const encodeHamming = (bits: string) => toNibbles(bits).map(encodeHammingNibble).join('')

const decodeHamming = (encoded: string, originalLength: number) => {
  const chunks = encoded.match(/.{1,7}/g) ?? []
  let detected = false
  const correctedBits: string[] = []

  chunks.forEach((chunk) => {
    if (chunk.length < 7) return
    const arr = chunk.split('').map(Number)
    const s1 = arr[0] ^ arr[2] ^ arr[4] ^ arr[6]
    const s2 = arr[1] ^ arr[2] ^ arr[5] ^ arr[6]
    const s4 = arr[3] ^ arr[4] ^ arr[5] ^ arr[6]
    const errorPos = s1 + s2 * 2 + s4 * 4

    if (errorPos > 0) {
      detected = true
      arr[errorPos - 1] ^= 1
    }

    correctedBits.push(`${arr[2]}${arr[4]}${arr[5]}${arr[6]}`)
  })

  return {
    detected,
    corrected: detected,
    data: correctedBits.join('').slice(0, originalLength),
  }
}

const NETWORK_PROFILES: NetworkProfile[] = [
  { id: 'fiber', name: 'Fiber Optics', lossRate: 2, congestion: 10, speed: 1.5, description: 'Ultra-low latency, stable throughput.' },
  { id: 'starlink', name: 'Starlink', lossRate: 8, congestion: 40, speed: 1.0, description: 'Satellite relay with higher variance.' },
  { id: 'cellular', name: '5G Mobile', lossRate: 15, congestion: 60, speed: 1.2, description: 'High-speed but prone to interference.' },
  { id: 'mars', name: 'Deep Space', lossRate: 40, congestion: 95, speed: 0.4, description: 'Extreme distance, catastrophic loss.' },
]

const ProfileIcon = ({ id }: { id: string }) => {
  switch (id) {
    case 'fiber': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
    case 'starlink': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
    case 'cellular': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 20V4"/></svg>
    case 'mars': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M2 12h20"/><path d="M12 12l5.5-5.5"/></svg>
    default: return null
  }
}

// Inline SVG components
const ServerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
)


const PacketIcon = () => (
  <div className="packet-square-box"></div>
)


const LostIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
)

function App() {
  const [mode, setMode] = useState<'congestion' | 'communication'>('congestion')
  const [packets, setPackets] = useState<NetworkPacket[]>([])
  const [stats, setStats] = useState({ throughput: 0, delay: 5, lossRate: 10, congestion: 30, sent: 0, delivered: 0 })
  const [isRunning, setIsRunning] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [packetTarget, setPacketTarget] = useState(20)
  const [queuedPackets, setQueuedPackets] = useState(0)
  const [lostTotal, setLostTotal] = useState(0)
  const [cwnd, setCwnd] = useState(1)
  const [ssthresh, setSsthresh] = useState(64)
  const [activeProfile, setActiveProfile] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<'all' | 'voice' | 'video' | 'data'>('all')
  const [history, setHistory] = useState<TrendPoint[]>([{ throughput: 0, delay: 5, loss: 10 }])
  
  // Chaos Engine State
  const [activeTab, setActiveTab] = useState<'simulation' | 'chaos' | 'history'>('simulation')
  const [isChaosEnabled, setIsChaosEnabled] = useState(false)
  const [activeEvent, setActiveEvent] = useState<{ type: string, label: string, color: string } | null>(null)
  const [eventLog, setEventLog] = useState<{ time: string, msg: string }[]>([])

  const [bitInput, setBitInput] = useState('10110101')
  const [commMethod, setCommMethod] = useState<CommunicationMethod>('parity-even')
  const [noiseLevel, setNoiseLevel] = useState(12)
  const [txBits, setTxBits] = useState<TxBit[]>([])
  const [isTxRunning, setIsTxRunning] = useState(false)
  const [preparedTx, setPreparedTx] = useState<PreparedTransmission | null>(null)
  const [txSentView, setTxSentView] = useState('')
  const [txReceivedView, setTxReceivedView] = useState('')
  const [commOutcome, setCommOutcome] = useState<TransmissionOutcome | null>(null)
  const [commHistory, setCommHistory] = useState<CommHistoryPoint[]>([{ errorRate: 0, noise: 12, detection: 0 }])

  // Use refs for the simulation loop to prevent erratic interval resets
  const statsRef = useRef(stats)
  statsRef.current = stats
  const queuedRef = useRef(queuedPackets)
  queuedRef.current = queuedPackets
  const packetsRef = useRef(packets)
  packetsRef.current = packets
  const cwndRef = useRef(cwnd)
  cwndRef.current = cwnd
  const ssthreshRef = useRef(ssthresh)
  ssthreshRef.current = ssthresh

  const activePackets = packets.filter((p) => p.status === 'active').length
  const isTransferring = queuedPackets > 0 || packets.length > 0

  // Simulator animation loop
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      let newlyLost = 0
      let sentThisTick = 0
      let newlyDelivered = 0
      
      const currentStats = statsRef.current
      const currentEvent = activeEventRef.current

      // Chaos Overrides
      const effectiveLoss = currentEvent?.type === 'fiber-cut' ? 100 : currentStats.lossRate
      const effectiveCongestion = currentEvent?.type === 'ddos' ? 95 : currentStats.congestion
      const jitterMultiplier = currentEvent?.type === 'solar-flare' ? 5 : 1

      let currentPackets = packetsRef.current

      // TCP AIMD: Send packets if allowed by Congestion Window
      let activeCount = currentPackets.filter((p) => p.status === 'active').length
      while (queuedRef.current > 0 && activeCount < Math.floor(cwndRef.current)) {
        setQueuedPackets((prev) => Math.max(0, prev - 1))
        
        // QoS Logic: Assign a random or selected traffic type
        let type: 'voice' | 'video' | 'data'
        if (selectedType === 'all') {
            const rand = Math.random()
            type = rand < 0.33 ? 'voice' : rand < 0.66 ? 'video' : 'data'
        } else {
            type = selectedType as 'voice' | 'video' | 'data'
        }

        // Calculate loss exactly once at creation
        const baseLoss = statsRef.current.lossRate / 100
        const congestionLoss = (statsRef.current.congestion / 100) * 0.2
        let totalLossProb = Math.min(1.0, baseLoss + congestionLoss)

        // Apply Priority Resistance (QoS)
        if (type === 'voice') totalLossProb *= 0.05 // 95% resistance
        else if (type === 'video') totalLossProb *= 0.4 // 60% resistance

        const willBeLost = Math.random() < totalLossProb
        const dropProgress = willBeLost ? 30 + Math.random() * 40 : 200 // Drop anywhere 30-70

        const newPacket: NetworkPacket = {
          id: Date.now() + Math.random(),
          progress: 0,
          lossChance: statsRef.current.lossRate / 100,
          status: 'active',
          lossTtl: 0,
          dropProgress,
          lane: 20 + Math.random() * 60, // vertical percentage from 20% to 80%
          speedVar: 0.85 + Math.random() * 0.3, // 0.85x to 1.15x speed jitter
          type
        }
        
        sentThisTick += 1
        currentPackets = [...currentPackets, newPacket]
        activeCount++
      }

      const updated: NetworkPacket[] = []
      let cwndDelta = 0
      let experiencedDrop = false

      currentPackets.forEach((p) => {
        if (p.status === 'lost') {
          const nextTtl = p.lossTtl - 1
          if (nextTtl > 0) updated.push({ ...p, lossTtl: nextTtl })
          return
        }

        const jSpeed = speed * p.speedVar * jitterMultiplier
        const newProgress = p.progress + (0.8 + effectiveCongestion / 100) * jSpeed

        // Check if packet has passed its assigned drop progress within the loss zone
        const isLost = p.progress < p.dropProgress && newProgress >= p.dropProgress

        if (isLost || Math.random() < effectiveLoss / 1000) { // fiber-cut impact
          newlyLost += 1
          experiencedDrop = true
          updated.push({ ...p, progress: Math.min(newProgress, p.dropProgress), status: 'lost', lossTtl: 18 })
          return
        }

        // Packet reaches destination
        if (newProgress >= 100) {
          newlyDelivered += 1
          // TCP Additive Increase
          if (cwndRef.current < ssthreshRef.current) {
            cwndDelta += 1 // Slow Start
          } else {
            cwndDelta += 1 / Math.max(1, Math.floor(cwndRef.current)) // Congestion Avoidance
          }
          return
        }

        updated.push({ ...p, progress: newProgress })
      })

      setPackets(updated)

      // Apply TCP Window state changes
      if (experiencedDrop) {
        // TCP Multiplicative Decrease (Reno approach)
        const newSsthresh = Math.max(2, Math.floor(cwndRef.current / 2))
        setSsthresh(newSsthresh)
        setCwnd(newSsthresh) // Fast recovery
      } else if (cwndDelta > 0) {
        setCwnd((prev) => Math.min(256, prev + cwndDelta))
      }

      setPackets(updated)

      // Batch state updates to avoid race conditions
      if (sentThisTick > 0) {
        setStats((prev) => ({ ...prev, sent: prev.sent + sentThisTick }))
      }
      if (newlyLost > 0) {
        setLostTotal((prev) => prev + newlyLost)
      }
      if (newlyDelivered > 0) {
        setStats(prev => ({ ...prev, delivered: prev.delivered + newlyDelivered }))
      }

    }, 100 / speed)

    return () => clearInterval(interval)
  }, [isRunning, speed])

  useEffect(() => {
    setStats((prev) => {
      if (!isTransferring) return prev

      const throughput = Math.max(
        1,
        Math.round((activePackets * speed * (100 - prev.congestion)) / 2.5 + queuedPackets * 0.2)
      )
      const delay = Math.max(5, Math.round(8 + prev.congestion * 0.35 + activePackets * 0.4))

      return {
        ...prev,
        throughput,
        delay,
      }
    })
  }, [isTransferring, activePackets, queuedPackets, speed, stats.congestion])

  const congestionState =
    stats.congestion < 30 ? 'Low congestion' : stats.congestion < 65 ? 'Moderate congestion' : 'High congestion'
  const dropRatePercent = stats.sent > 0 ? ((lostTotal / stats.sent) * 100).toFixed(1) : '0.0'

  const activeEventRef = useRef(activeEvent)
  useEffect(() => { activeEventRef.current = activeEvent }, [activeEvent])

  // Collect recent history for small line charts
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setHistory((prev) => {
        const next = [...prev, { throughput: statsRef.current.throughput, delay: statsRef.current.delay, loss: statsRef.current.lossRate }]
        return next.slice(-120)
      })
    }, 450)
    return () => clearInterval(id)
  }, [isRunning])

  const chartWidth = 360
  const chartHeight = 140
  const chartPadding = 8
  const historySlice = history.slice(-120)

  const buildPath = (key: keyof TrendPoint) => {
    if (historySlice.length === 0) return ''
    const values = historySlice.map((p) => p[key])
    const max = Math.max(...values)
    const min = Math.min(...values)
    const span = Math.max(1, max - min)
    const len = Math.max(1, historySlice.length - 1)

    if (historySlice.length === 1) {
      const normalized = (historySlice[0][key] - min) / span
      const plotHeight = chartHeight - chartPadding * 2
      const y = chartPadding + (1 - normalized) * plotHeight
      return `M 0 ${y.toFixed(2)} L ${chartWidth} ${y.toFixed(2)}`
    }

    return historySlice
      .map((point, idx) => {
        const x = (idx / len) * chartWidth
        const normalized = (point[key] - min) / span
        const plotHeight = chartHeight - chartPadding * 2
        const y = chartPadding + (1 - normalized) * plotHeight
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join(' ')
  }

  const triggerChaos = (type: string) => {
    const events: Record<string, any> = {
      'ddos': { type: 'ddos', label: 'DDoS Attack Active', color: '#ff4444' },
      'solar-flare': { type: 'solar-flare', label: 'Solar Flare Jitter', color: '#ffaa00' },
      'fiber-cut': { type: 'fiber-cut', label: 'Fiber Cut / Blackout', color: '#ffffff' }
    }
    const event = events[type]
    setActiveEvent(event)
    setEventLog(prev => [{ time: new Date().toLocaleTimeString(), msg: `EMERGENCY: ${event.label}` }, ...prev].slice(0, 10))
  }

  const stopActiveChaos = () => {
    if (!activeEventRef.current) return
    const stoppedLabel = activeEventRef.current.label
    setActiveEvent(null)
    setEventLog(prev => [{ time: new Date().toLocaleTimeString(), msg: `RESOLVED: ${stoppedLabel}` }, ...prev].slice(0, 10))
  }

  // Chaos Engine Loop
  useEffect(() => {
    if (!isChaosEnabled) return
    const id = setInterval(() => {
      if (Math.random() < 0.3 && !activeEvent) {
        const types = ['ddos', 'solar-flare', 'fiber-cut']
        triggerChaos(types[Math.floor(Math.random() * types.length)])
      }
    }, 5000)
    return () => clearInterval(id)
  }, [isChaosEnabled, activeEvent])

  const queuePacketBatch = () => {
    if (packetTarget <= 0) return
    setQueuedPackets((prev) => prev + packetTarget)
  }

  const evaluateTransmission = (meta: PreparedTransmission, receivedPayload: string): TransmissionOutcome => {
    if (meta.method === 'parity-even' || meta.method === 'parity-odd') {
      const payload = receivedPayload.slice(0, -1)
      const parity = receivedPayload.slice(-1) || '0'
      const expected = parityBit(payload, meta.method === 'parity-even' ? 'even' : 'odd')
      const detected = parity !== expected
      return {
        detected,
        corrected: false,
        summary: detected ? 'Parity mismatch detected.' : 'Parity check passed.',
        normalized: payload,
      }
    }

    if (meta.method === 'checksum') {
      const checksum = meta.checksum ?? 0
      const ok = verifyChecksum(receivedPayload, checksum)
      return {
        detected: !ok,
        corrected: false,
        summary: ok ? 'Checksum verified at receiver.' : 'Checksum mismatch detected.',
        normalized: receivedPayload.slice(0, meta.original.length),
      }
    }

    if (meta.method === 'crc') {
      const divisor = meta.crcDivisor ?? CRC_DIVISOR
      const remainder = xorLongDivision(receivedPayload, divisor)
      const detected = /1/.test(remainder)
      return {
        detected,
        corrected: false,
        summary: detected ? `CRC remainder ${remainder} indicates corruption.` : 'CRC remainder is zero; frame accepted.',
        normalized: receivedPayload.slice(0, meta.original.length),
      }
    }

    const decoded = decodeHamming(receivedPayload, meta.original.length)
    return {
      detected: decoded.detected,
      corrected: decoded.corrected,
      summary: decoded.detected ? 'Hamming syndrome corrected one-bit error.' : 'No syndrome error found.',
      normalized: decoded.data,
    }
  }

  const prepareTransmission = (): PreparedTransmission => {
    const original = sanitizeBits(bitInput)

    if (commMethod === 'parity-even') {
      return {
        original,
        payload: `${original}${parityBit(original, 'even')}`,
        method: commMethod,
      }
    }

    if (commMethod === 'parity-odd') {
      return {
        original,
        payload: `${original}${parityBit(original, 'odd')}`,
        method: commMethod,
      }
    }

    if (commMethod === 'checksum') {
      return {
        original,
        payload: original,
        method: commMethod,
        checksum: checksumFromNibbles(original),
      }
    }

    if (commMethod === 'crc') {
      return {
        original,
        payload: buildCrcPayload(original, CRC_DIVISOR),
        method: commMethod,
        crcDivisor: CRC_DIVISOR,
      }
    }

    return {
      original,
      payload: encodeHamming(original),
      method: commMethod,
    }
  }

  const startBitTransmission = () => {
    const prepared = prepareTransmission()
    const frame = prepared.payload.split('').map((bit, index) => ({
      id: Date.now() + index,
      sent: bit as '0' | '1',
      received: bit as '0' | '1',
      progress: 0,
      lane: 18 + (index % 8) * 9,
      flipped: false,
    }))

    setPreparedTx(prepared)
    setTxSentView(prepared.payload)
    setTxReceivedView('')
    setCommOutcome(null)
    setTxBits(frame)
    setIsTxRunning(true)
  }

  useEffect(() => {
    if (!isTxRunning) return

    const id = setInterval(() => {
      setTxBits((prev) => {
        if (prev.length === 0) {
          setIsTxRunning(false)
          return prev
        }

        const next = prev.map((bit) => {
          const progress = Math.min(100, bit.progress + 2.4 + Math.random() * 2.8)
          let received = bit.received
          let flipped = bit.flipped

          if (!flipped && progress > 42 && Math.random() < (noiseLevel / 100) * 0.15) {
            received = bit.received === '1' ? '0' : '1'
            flipped = true
          }

          return { ...bit, progress, received, flipped }
        })

        const mismatches = next.filter((bit) => bit.sent !== bit.received).length
        const errorRate = next.length > 0 ? Number(((mismatches / next.length) * 100).toFixed(1)) : 0
        setCommHistory((prevHistory) => ([
          ...prevHistory,
          { errorRate, noise: noiseLevel, detection: 0 },
        ].slice(-120)))

        const done = next.every((bit) => bit.progress >= 100)
        if (done) {
          const received = next.map((bit) => bit.received).join('')
          setTxReceivedView(received)
          if (preparedTx) {
            const outcome = evaluateTransmission(preparedTx, received)
            setCommOutcome(outcome)
            setCommHistory((prevHistory) => ([
              ...prevHistory,
              { errorRate, noise: noiseLevel, detection: outcome.detected ? 100 : 0 },
            ].slice(-120)))
          }
          setIsTxRunning(false)
        }

        return next
      })
    }, 90)

    return () => clearInterval(id)
  }, [isTxRunning, noiseLevel, preparedTx])

  const commChartWidth = 360
  const commChartHeight = 140
  const commPadding = 8
  const commSlice = commHistory.slice(-120)
  const latestCommPoint = commSlice[commSlice.length - 1] ?? { errorRate: 0, noise: noiseLevel, detection: 0 }

  const buildCommPath = (key: keyof CommHistoryPoint) => {
    if (commSlice.length === 0) return ''
    const values = commSlice.map((point) => point[key])
    const max = Math.max(...values)
    const min = Math.min(...values)
    const span = Math.max(1, max - min)
    const len = Math.max(1, commSlice.length - 1)

    if (commSlice.length === 1) {
      const normalized = (commSlice[0][key] - min) / span
      const plotHeight = commChartHeight - commPadding * 2
      const y = commPadding + (1 - normalized) * plotHeight
      return `M 0 ${y.toFixed(2)} L ${commChartWidth} ${y.toFixed(2)}`
    }

    return commSlice
      .map((point, idx) => {
        const x = (idx / len) * commChartWidth
        const normalized = (point[key] - min) / span
        const plotHeight = commChartHeight - commPadding * 2
        const y = commPadding + (1 - normalized) * plotHeight
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join(' ')
  }




  return (
    <div className="app glass-bg">
      <div className="ambient-glow bg-blur-1"></div>
      <div className="ambient-glow bg-blur-2"></div>

      {mode === 'congestion' && activeEvent && (
        <div className="chaos-banner" style={{ backgroundColor: activeEvent.color }}>
          <div className="chaos-banner-content">
            <span><span className="warning-icon">⚠️</span> {activeEvent.label.toUpperCase()} IN PROGRESS</span>
            <button className="chaos-banner-stop" onClick={stopActiveChaos}>
              STOP
            </button>
          </div>
        </div>
      )}

      <header className="header glass-panel">
        <div className="header-content">
          <div className="header-main">
            <h1 className="neon-text">Data Communication & Error Control Visualizer</h1>
            <div className="mode-switch" role="tablist" aria-label="Project mode">
              <button
                className={`mode-btn ${mode === 'congestion' ? 'active' : ''}`}
                onClick={() => setMode('congestion')}
              >
                Congestion Control
              </button>
              <button
                className={`mode-btn ${mode === 'communication' ? 'active' : ''}`}
                onClick={() => setMode('communication')}
              >
                Data Communication
              </button>
            </div>
            {mode === 'congestion' && (
              <div className="tabs">
                <button
                  className={`tab-btn ${activeTab === 'simulation' ? 'active' : ''}`}
                  onClick={() => setActiveTab('simulation')}
                >
                  Simulation
                </button>
                <button
                  className={`tab-btn ${activeTab === 'chaos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chaos')}
                >
                  Chaos Lab
                </button>
                <button
                  className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  Event Log
                </button>
              </div>
            )}
            {mode === 'congestion' && (
              <div className="speed-badge" aria-label="Simulation speed">
                <span className="pill-label">Sim Speed</span>
                <span className="pill-value">{speed.toFixed(1)}x</span>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="main-container">
        {mode === 'congestion' ? (
          activeTab === 'simulation' ? (
          <div className="tab-content simulation-tab">
            {/* Classic Full-Width Visualization at the TOP */}
            <section className="network-visualization glass-panel neon-border">
              <div className="network-diagram">
                <div className="node source-node">
                  <div className="node-icon-wrapper neon-box"><ServerIcon /></div>
                  <div className="node-label">Source Node</div>
                </div>

                <div className="channel-container">
                  <div className="channel-info">
                    <span className="label">Network Medium</span>
                    {activeEvent && (
                      <span className="attack-badge" style={{ borderColor: activeEvent.color, color: activeEvent.color }}>
                        🔴 {activeEvent.label}
                      </span>
                    )}
                  </div>
                  
                  <div className="channel">
                    <div className="loss-zone-indicator radar-scanner">
                      <div className="radar-beam"></div>
                      <span className="zone-label">Interference Zone</span>
                    </div>
                    
                    <div className="packets-flow">
                      {packets.map((packet) => (
                        <div
                          key={packet.id}
                          className={`packet-capsule ${packet.status === 'lost' ? 'lost' : 'active'} type-${packet.type}`}
                          style={{ left: `${packet.progress}%`, top: `${packet.lane}%`, transform: 'translate(-50%, -50%)' }}
                        >
                          {packet.status === 'lost' ? <LostIcon /> : <PacketIcon />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="traffic-legend">
                    <div className="legend-item"><span className="dot voice"></span> Voice</div>
                    <div className="legend-item"><span className="dot video"></span> Video</div>
                    <div className="legend-item"><span className="dot data"></span> Bulk Data</div>
                  </div>
                </div>

                <div className="node destination-node">
                  <div className="node-icon-wrapper neon-box"><ServerIcon /></div>
                  <div className="node-label">Destination Node</div>
                </div>
              </div>
            </section>

            <div className="dashboard-grid">
              <div className="metrics-panel glass-panel">
                <div className="metrics-header">
                  <h3>Live Network Health</h3>
                  <div className={`global-status-banner ${stats.congestion > 70 ? 'danger' : stats.congestion > 40 ? 'warning' : 'secure'}`}>
                    <span className="status-dot"></span>
                    {stats.congestion > 70 ? 'SYSTEM OVERLOADED' : stats.congestion > 40 ? 'LINK CONGESTED' : 'OPERATIONAL: SECURE'}
                  </div>
                </div>
                <div className="health-telemetry-grid">
                  <div className="telemetry-card">
                    <div className="card-info">
                      <span className="telemetry-label">Throughput</span>
                      <span className="telemetry-value text-blue">{stats.throughput} pkts/s</span>
                    </div>
                  </div>
                  <div className="telemetry-card">
                    <div className="card-info">
                      <span className="telemetry-label">Net Latency</span>
                      <span className="telemetry-value text-warning">{stats.delay}ms</span>
                    </div>
                  </div>
                  <div className="telemetry-card">
                    <div className="card-info">
                      <span className="telemetry-label">Delivered</span>
                      <span className="telemetry-value text-green">{stats.delivered} pkts</span>
                    </div>
                  </div>
                  <div className="telemetry-card">
                    <div className="card-info">
                      <span className="telemetry-label">Lost Total</span>
                      <span className="telemetry-value text-red">{lostTotal} pkts</span>
                    </div>
                  </div>
                  <div className="telemetry-card">
                    <div className="card-info">
                      <span className="telemetry-label">In Transit</span>
                      <span className="telemetry-value text-blue">{packets.length} pkts</span>
                    </div>
                  </div>
                  <div className="telemetry-card">
                    <div className="card-info">
                      <span className="telemetry-label">Drop Rate</span>
                      <span className="telemetry-value text-warning">{dropRatePercent}%</span>
                    </div>
                  </div>
                  <div className="telemetry-card wide">
                    <div className="card-info">
                      <span className="telemetry-label">System Status</span>
                      <span className="telemetry-value text-blue">{congestionState}</span>
                    </div>
                  </div>
                </div>
                <div className="attack-impact-visual glass-inset">
                  <div className="panel-header-mini">Active Threats & Impact</div>
                  <div className="impact-bars">
                    <div className="impact-bar-item">
                      <div className="threat-label">💀 DDoS</div>
                      <div className="impact-bar-wrapper">
                        <div className="impact-bar" style={{ width: activeEvent?.type === 'ddos' ? '95%' : '0%', background: activeEvent?.type === 'ddos' ? activeEvent.color : 'rgba(255,255,255,0.1)' }}></div>
                      </div>
                      <span className="impact-value">{activeEvent?.type === 'ddos' ? '95%' : '—'}</span>
                    </div>
                    <div className="impact-bar-item">
                      <div className="threat-label">☀️ Solar Flare</div>
                      <div className="impact-bar-wrapper">
                        <div className="impact-bar" style={{ width: activeEvent?.type === 'solar-flare' ? '60%' : '0%', background: activeEvent?.type === 'solar-flare' ? activeEvent.color : 'rgba(255,255,255,0.1)' }}></div>
                      </div>
                      <span className="impact-value">{activeEvent?.type === 'solar-flare' ? '5x Jitter' : '—'}</span>
                    </div>
                    <div className="impact-bar-item">
                      <div className="threat-label">✂️ Fiber Cut</div>
                      <div className="impact-bar-wrapper">
                        <div className="impact-bar" style={{ width: activeEvent?.type === 'fiber-cut' ? '100%' : '0%', background: activeEvent?.type === 'fiber-cut' ? activeEvent.color : 'rgba(255,255,255,0.1)' }}></div>
                      </div>
                      <span className="impact-value">{activeEvent?.type === 'fiber-cut' ? '100%' : '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="trend-card glass-inset">
                  <div className="panel-header-mini">Network Performance</div>
                  <div className="trend-chart">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Network performance throughput over time">
                      <line x1="0" y1={chartHeight - 1} x2={chartWidth} y2={chartHeight - 1} className="trend-grid" />
                      <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} className="trend-grid" />
                      <line x1="0" y1="1" x2={chartWidth} y2="1" className="trend-grid" />
                      <path className="trend-line throughput" d={buildPath('throughput')} />
                    </svg>
                    <div className="trend-legend-single">
                      <span className="legend-dot throughput"></span><span>Throughput (packets/sec)</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="controls-panel glass-panel">
                <div className="control-groups">
                  <div className="control-item">
                    <div className="control-header">
                      <label>Simulation Speed</label>
                      <span className="value">{speed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.25"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="glass-slider"
                    />
                  </div>

                  <div className="control-item">
                    <div className="control-header">
                      <label>Network Congestion</label>
                      <span className="value">{stats.congestion}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={stats.congestion}
                      onChange={(e) => setStats((prev) => ({ ...prev, congestion: parseInt(e.target.value) }))}
                      className="glass-slider"
                    />
                  </div>

                  <div className="control-item">
                    <div className="control-header">
                      <label>Base Loss Rate</label>
                      <span className="value">{stats.lossRate}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={stats.lossRate}
                      onChange={(e) =>
                        setStats((prev) => ({ ...prev, lossRate: parseInt(e.target.value) }))
                      }
                      className="glass-slider"
                    />
                  </div>

                  <div className="control-item">
                    <div className="control-header">
                      <label>Active Network Environment</label>
                      <span className="value">{activeProfile || 'Custom'}</span>
                    </div>
                    <div className="environment-grid">
                      {NETWORK_PROFILES.map((profile) => (
                        <button
                          key={profile.id}
                          className={`env-card ${activeProfile === profile.id ? 'active' : ''}`}
                          onClick={() => {
                            setActiveProfile(profile.id);
                            setStats((prev) => ({
                              ...prev,
                              lossRate: profile.lossRate,
                              congestion: profile.congestion,
                            }));
                            setSpeed(profile.speed);
                          }}
                        >
                          <div className="env-card-icon">
                            <ProfileIcon id={profile.id} />
                          </div>
                          <span className="env-name">{profile.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="control-item">
                    <div className="control-header">
                      <label>Traffic Fleet Deployment</label>
                      <span className="queued">Ready: {queuedPackets}</span>
                    </div>
                    <div className="traffic-dispatch-box">
                      <div className="traffic-selector-grid">
                        <button className={`traffic-option ${selectedType === 'all' ? 'active' : ''}`} onClick={() => setSelectedType('all')}>
                          <div className="option-sq mix"></div>
                          <span>Mixed</span>
                        </button>
                        <button className={`traffic-option ${selectedType === 'voice' ? 'active' : ''}`} onClick={() => setSelectedType('voice')}>
                          <div className="option-sq voice"></div>
                          <span>Voice</span>
                        </button>
                        <button className={`traffic-option ${selectedType === 'video' ? 'active' : ''}`} onClick={() => setSelectedType('video')}>
                          <div className="option-sq video"></div>
                          <span>Video</span>
                        </button>
                        <button className={`traffic-option ${selectedType === 'data' ? 'active' : ''}`} onClick={() => setSelectedType('data')}>
                          <div className="option-sq data"></div>
                          <span>Bulk</span>
                        </button>
                      </div>
                      <div className="dispatch-controls">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={packetTarget}
                          onChange={(e) => setPacketTarget(Math.max(1, Number(e.target.value) || 1))}
                          className="glass-input dispatch-input"
                        />
                        <button className="neon-button primary dispatch-btn" onClick={queuePacketBatch}>
                          DEPLOY FLEET
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="action-row">
                    <button className="neon-button outline" onClick={() => {
                        setPackets([])
                        // Reset simulation state for Solar Flare recovery
                        setQueuedPackets(0)
                        setLostTotal(0)
                        setCwnd(1)
                        setStats(prev => ({ ...prev, throughput: 0, lossRate: 10, congestion: 30, delivered: 0 }))
                      }}>
                      RESET SIM
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          ) : activeTab === 'chaos' ? (
          <div className="tab-content chaos-tab">
            <div className="chaos-grid">
              <div className="chaos-controls glass-panel">
                <h2 className="neon-text">Chaos Lab</h2>
                <p className="text-muted">Test system resilience under extreme environmental stress.</p>
                <div className="chaos-toggle-box">
                  <label className="chaos-switch">
                    <input 
                      type="checkbox" 
                      checked={isChaosEnabled}
                      onChange={(e) => {
                        setIsChaosEnabled(e.target.checked)
                        if (!e.target.checked) setActiveEvent(null)
                      }}
                    />
                    <span className="slider round"></span>
                  </label>
                  <span>Autonomous Chaos Mode</span>
                </div>
                <div className="manual-triggers">
                  <h3>Manual Stress Triggers</h3>
                  <div className="trigger-buttons">
                    <button className="chaos-trigger ddos" onClick={() => triggerChaos('ddos')}>💀 DDoS Attack</button>
                    <button className="chaos-trigger solar" onClick={() => triggerChaos('solar-flare')}>☀️ Solar Flare</button>
                    <button className="chaos-trigger cut" onClick={() => triggerChaos('fiber-cut')}>✂️ Fiber Cut</button>
                  </div>
                  {activeEvent && (
                    <div className="action-row" style={{ marginTop: '1rem' }}>
                      <button className="neon-button outline" onClick={stopActiveChaos}>
                        STOP ACTIVE ATTACK
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="attack-comparison glass-panel">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Attack Impact Comparison</h3>
              <div className="comparison-grid">
                <div className="comparison-card">
                  <div className="attack-name ddos">💀 DDoS Attack</div>
                  <div className="impact-detail">
                    <span className="metric-label">Congestion</span>
                    <span className="metric-value">95%</span>
                  </div>
                  <div className="impact-detail">
                    <span className="metric-label">Throughput Impact</span>
                    <span className="metric-value">-80%</span>
                  </div>
                  <div className="impact-detail">
                    <span className="metric-label">Latency Spike</span>
                    <span className="metric-value">+200ms</span>
                  </div>
                </div>
                <div className="comparison-card">
                  <div className="attack-name solar">☀️ Solar Flare</div>
                  <div className="impact-detail">
                    <span className="metric-label">Jitter</span>
                    <span className="metric-value">5x Multiplier</span>
                  </div>
                  <div className="impact-detail">
                    <span className="metric-label">Packet Variance</span>
                    <span className="metric-value">High</span>
                  </div>
                  <div className="impact-detail">
                    <span className="metric-label">Loss Spike</span>
                    <span className="metric-value">+30%</span>
                  </div>
                </div>
                <div className="comparison-card">
                  <div className="attack-name cut">✂️ Fiber Cut</div>
                  <div className="impact-detail">
                    <span className="metric-label">Link Status</span>
                    <span className="metric-value">Blackout</span>
                  </div>
                  <div className="impact-detail">
                    <span className="metric-label">Loss Rate</span>
                    <span className="metric-value">100%</span>
                  </div>
                  <div className="impact-detail">
                    <span className="metric-label">Throughput</span>
                    <span className="metric-value">0 pkts/s</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="chaos-footer glass-panel">
              <div className="action-row">
                <button 
                  className={`neon-button ${isRunning ? 'danger' : 'success'}`}
                  onClick={() => setIsRunning(!isRunning)}
                >
                  {isRunning ? 'PAUSE SYSTEM' : 'RESUME SYSTEM'}
                </button>
              </div>
            </div>
          </div>
          ) : (
          <div className="tab-content history-tab">
            <div className="chaos-log glass-panel full-width">
                <h3>Event History Log</h3>
                <div className="log-entries">
                  {eventLog.length === 0 && <p className="text-muted">No events recorded.</p>}
                  {eventLog.map((log, i) => (
                    <div key={i} className="log-entry">
                      <span className="log-time">[{log.time}]</span> {log.msg}
                    </div>
                  ))}
                </div>
              </div>
          </div>
          )
        ) : (
          <div className="tab-content communication-tab">
            <section className="network-visualization glass-panel neon-border">
              <div className="metrics-header">
                <h3>Bit Transmission Visualizer</h3>
                <div className={`global-status-banner ${commOutcome?.detected ? 'warning' : 'secure'}`}>
                  <span className="status-dot"></span>
                  {isTxRunning ? 'TRANSMITTING' : commOutcome?.detected ? 'ERROR DETECTED' : 'LINK CLEAN'}
                </div>
              </div>
              <div className="network-diagram comm-network-diagram">
                <div className="node source-node">
                  <div className="node-icon-wrapper neon-box"><ServerIcon /></div>
                  <div className="node-label">Sender</div>
                </div>

                <div className="channel-container">
                  <div className="channel-info">
                    <span className="label">Transmission Medium</span>
                  </div>

                  <div className="comm-medium">
                    <div className="channel-lane-label">Transmission Channel</div>
                    {txBits.map((bit) => (
                      <div
                        key={bit.id}
                        className={`tx-bit ${bit.sent !== bit.received ? 'flipped' : ''}`}
                        style={{ left: `${bit.progress}%`, top: `${bit.lane}%` }}
                      >
                        {bit.received}
                      </div>
                    ))}
                    <div className="loss-zone-indicator">
                      <span className="zone-label">Noise Injection Area</span>
                    </div>
                  </div>
                </div>

                <div className="node destination-node">
                  <div className="node-icon-wrapper neon-box"><ServerIcon /></div>
                  <div className="node-label">Receiver</div>
                </div>
              </div>
              <div className="binary-comparison">
                <div><span>Sent:</span> <strong>{txSentView || '-'}</strong></div>
                <div><span>Received:</span> <strong>{txReceivedView || '-'}</strong></div>
              </div>
            </section>

            <section className="dashboard-grid">
              <div className="metrics-panel glass-panel">
                <h3 style={{ marginBottom: '1rem' }}>Detection Outcome</h3>
                <div className={`global-status-banner ${commOutcome?.detected ? 'warning' : 'secure'}`} style={{ marginBottom: '1rem' }}>
                  <span className="status-dot"></span>
                  {commOutcome ? (commOutcome.detected ? 'FRAME FLAGGED AT RECEIVER' : 'FRAME ACCEPTED') : 'AWAITING TRANSMISSION'}
                </div>
                <div className="health-telemetry-grid detection-grid">
                  <div className="telemetry-card outcome-detected">
                    <div className="card-info">
                      <span className="telemetry-label">Detected</span>
                      <span className={`telemetry-value ${commOutcome?.detected ? 'text-warning' : 'text-green'}`}>
                        {commOutcome ? (commOutcome.detected ? 'Yes' : 'No') : '--'}
                      </span>
                    </div>
                  </div>
                  <div className="telemetry-card outcome-corrected">
                    <div className="card-info">
                      <span className="telemetry-label">Corrected</span>
                      <span className={`telemetry-value ${commOutcome?.corrected ? 'text-green' : 'text-blue'}`}>
                        {commOutcome ? (commOutcome.corrected ? 'Yes' : 'No') : '--'}
                      </span>
                    </div>
                  </div>
                  <div className="telemetry-card wide outcome-notes">
                    <div className="card-info">
                      <span className="telemetry-label">Receiver Notes</span>
                      <span className="telemetry-value text-blue">{commOutcome?.summary ?? 'Run transmission to evaluate frame.'}</span>
                    </div>
                  </div>
                  <div className="telemetry-card wide outcome-payload">
                    <div className="card-info">
                      <span className="telemetry-label">Recovered Payload</span>
                      <span className="telemetry-value text-green">{commOutcome?.normalized ?? '-'}</span>
                    </div>
                  </div>
                  <div className="telemetry-card outcome-error-rate">
                    <div className="card-info">
                      <span className="telemetry-label">Current Error Rate</span>
                      <span className="telemetry-value text-warning">{latestCommPoint.errorRate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="telemetry-card outcome-noise-level">
                    <div className="card-info">
                      <span className="telemetry-label">Current Noise</span>
                      <span className="telemetry-value text-blue">{latestCommPoint.noise.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="telemetry-card outcome-detection-success">
                    <div className="card-info">
                      <span className="telemetry-label">Detection Success</span>
                      <span className="telemetry-value text-green">{latestCommPoint.detection.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="controls-panel glass-panel">
                <div className="control-groups">
                  <div className="control-item">
                    <div className="control-header">
                      <label>Input Data Bits</label>
                      <span className="value">Max 32 bits</span>
                    </div>
                    <input
                      value={bitInput}
                      onChange={(e) => setBitInput(sanitizeBits(e.target.value))}
                      className="glass-input"
                    />
                  </div>

                  <div className="control-item">
                    <div className="control-header">
                      <label>Error Control Method</label>
                    </div>
                    <select
                      className="glass-input"
                      value={commMethod}
                      onChange={(e) => setCommMethod(e.target.value as CommunicationMethod)}
                    >
                      <option value="parity-even">Even Parity</option>
                      <option value="parity-odd">Odd Parity</option>
                      <option value="checksum">Checksum (4-bit chunks)</option>
                      <option value="crc">CRC (divisor 1101)</option>
                      <option value="hamming">Hamming (7,4)</option>
                    </select>
                  </div>

                  <div className="control-item">
                    <div className="control-header">
                      <label>Noise Level</label>
                      <span className="value">{noiseLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={noiseLevel}
                      onChange={(e) => setNoiseLevel(parseInt(e.target.value))}
                      className="glass-slider"
                    />
                  </div>

                  <div className="control-item">
                    <div className="control-header">
                      <label>Prepared Transmission</label>
                      <span className="value">{preparedTx?.method ?? '-'}</span>
                    </div>
                    <div className="analysis-feed">
                      <div>Payload bits <span className="value">{preparedTx?.payload ?? '-'}</span></div>
                      <div>Checksum <span className="value">{preparedTx?.checksum?.toString(2).padStart(4, '0') ?? '-'}</span></div>
                      <div>CRC divisor <span className="value">{preparedTx?.crcDivisor ?? '-'}</span></div>
                    </div>
                  </div>

                  <div className="action-row">
                    <button className="neon-button primary" onClick={startBitTransmission} disabled={isTxRunning}>
                      {isTxRunning ? 'TRANSMITTING...' : 'SEND FRAME'}
                    </button>
                    <button
                      className="neon-button outline"
                      onClick={() => {
                        setTxBits([])
                        setTxSentView('')
                        setTxReceivedView('')
                        setCommOutcome(null)
                        setPreparedTx(null)
                      }}
                    >
                      RESET FRAME
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="comm-graphs-grid">
              <div className="comm-panel glass-panel trend-card">
                <div className="panel-header-mini">Error Rate vs Time</div>
                <div className="trend-chart">
                  <svg viewBox={`0 0 ${commChartWidth} ${commChartHeight}`} role="img" aria-label="Error rate trend over time">
                    <line x1="0" y1={commChartHeight - 1} x2={commChartWidth} y2={commChartHeight - 1} className="trend-grid" />
                    <line x1="0" y1={commChartHeight * 0.5} x2={commChartWidth} y2={commChartHeight * 0.5} className="trend-grid" />
                    <line x1="0" y1="1" x2={commChartWidth} y2="1" className="trend-grid" />
                    <path className="trend-line throughput" d={buildCommPath('errorRate')} />
                  </svg>
                  <div className="trend-legend-single">
                    <span className="legend-dot throughput"></span><span>Error Rate (%)</span>
                  </div>
                </div>
              </div>

              <div className="comm-panel glass-panel trend-card">
                <div className="panel-header-mini">Noise Level vs Time</div>
                <div className="trend-chart">
                  <svg viewBox={`0 0 ${commChartWidth} ${commChartHeight}`} role="img" aria-label="Noise level trend over time">
                    <line x1="0" y1={commChartHeight - 1} x2={commChartWidth} y2={commChartHeight - 1} className="trend-grid" />
                    <line x1="0" y1={commChartHeight * 0.5} x2={commChartWidth} y2={commChartHeight * 0.5} className="trend-grid" />
                    <line x1="0" y1="1" x2={commChartWidth} y2="1" className="trend-grid" />
                    <path className="trend-line delay" d={buildCommPath('noise')} />
                  </svg>
                  <div className="trend-legend-single">
                    <span className="legend-dot delay"></span><span>Noise Level (%)</span>
                  </div>
                </div>
              </div>

              <div className="comm-panel glass-panel trend-card">
                <div className="panel-header-mini">Detection Success vs Time</div>
                <div className="trend-chart">
                  <svg viewBox={`0 0 ${commChartWidth} ${commChartHeight}`} role="img" aria-label="Detection success trend over time">
                    <line x1="0" y1={commChartHeight - 1} x2={commChartWidth} y2={commChartHeight - 1} className="trend-grid" />
                    <line x1="0" y1={commChartHeight * 0.5} x2={commChartWidth} y2={commChartHeight * 0.5} className="trend-grid" />
                    <line x1="0" y1="1" x2={commChartWidth} y2="1" className="trend-grid" />
                    <path className="trend-line loss" d={buildCommPath('detection')} />
                  </svg>
                  <div className="trend-legend-single">
                    <span className="legend-dot loss"></span><span>Detection Success (%)</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
