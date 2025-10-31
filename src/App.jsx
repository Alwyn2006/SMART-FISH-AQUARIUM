import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import './App.css'

function parseEspHtml(html) {
  const distanceMatch = html.match(/Distance:\s*(\d+)\s*cm/i)
  const tdsMatch = html.match(/TDS\s*Value:\s*([\d.]+)\s*ppm/i)
  const tempMatch = html.match(/Temperature:\s*([\d.]+)/i)
  const humidityMatch = html.match(/Humidity:\s*([\d.]+)\s*%/i)
  const soundMatch = html.match(/Sound\s*Level:\s*(\d+)/i)

  const distanceCm = distanceMatch ? Number(distanceMatch[1]) : null
  const tdsPpm = tdsMatch ? Number(tdsMatch[1]) : null
  const temperatureC = tempMatch ? Number(tempMatch[1]) : null
  const humidityPct = humidityMatch ? Number(humidityMatch[1]) : null
  const soundAdc = soundMatch ? Number(soundMatch[1]) : null

  // dB = 20 * log10(Vref / V)
  // With ADC counts, Vref ~ max (4095 for 12-bit), V proportional to ADC value.
  // So ratio simplifies to 4095 / ADC. Guard against 0.
  const FULL_SCALE = 4095
  let soundDb = null
  if (soundAdc != null && soundAdc > 0) {
    soundDb = Number((20 * Math.log10(FULL_SCALE / soundAdc)).toFixed(2))
  }

  return {
    distanceCm,
    waterLevelCm: distanceCm, // rename in UI to Water Level
    tdsPpm,
    temperatureC,
    humidityPct,
    soundAdc,
    soundDb,
  }
}

export default function App() {
  const ESP_BASE = import.meta.env.DEV ? '/esp' : 'http://10.240.190.83'
  const CAM_BASE = import.meta.env.DEV ? '/camera' : 'http://10.240.190.161'
  const CAM81_BASE = import.meta.env.DEV ? '/cam81' : 'http://10.240.190.161:81'
  const STREAM_URL = import.meta.env.DEV ? `${CAM81_BASE}/stream` : 'http://10.240.190.161:81/stream'
  const TDS_RANGE = { min: 100, max: 300 }
  const TEMP_RANGE = { min: 24, max: 32 }
  const [readings, setReadings] = useState({
    distanceCm: null,
    waterLevelCm: null,
    tdsPpm: null,
    temperatureC: null,
    humidityPct: null,
    soundAdc: null,
    soundDb: null,
  })
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [streamBust, setStreamBust] = useState(0)
  const [streamError, setStreamError] = useState(false)
  const [ledIntensity, setLedIntensity] = useState(0)
  const [updatingLed, setUpdatingLed] = useState(false)
  const ledTimerRef = useRef(null)
  const lastRangeRef = useRef({ tds: null, temp: null })

  const formatTimestamp = useMemo(() => {
    if (!lastUpdated) return 'Not yet'
    try {
      return new Date(lastUpdated).toLocaleTimeString()
    } catch {
      return String(lastUpdated)
    }
  }, [lastUpdated])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchSensorData = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${ESP_BASE}/`, { responseType: 'text', timeout: 8000 })
      const data = parseEspHtml(res.data || '')
      setReadings(data)
      setLastUpdated(Date.now())
    } catch (err) {
      const msg = (err?.message || '').toLowerCase()
      if (msg.includes('abort')) {
        // Ignore benign abort errors
        return
      }
      console.error('Failed to fetch sensor data:', err)
      showToast('Failed to fetch sensor data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleLed = async () => {
    try {
      await axios.get(`${ESP_BASE}/toggle_led`, { timeout: 8000 })
      showToast('LED command sent', 'success')
    } catch (err) {
      console.error('LED toggle failed:', err)
      showToast('LED toggle failed', 'error')
    }
  }

  useEffect(() => {
    fetchSensorData()
    const id = setInterval(fetchSensorData, 3000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    setVH()
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', setVH)
    return () => {
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
    }
  }, [])

  const online = useMemo(() => {
    if (!lastUpdated) return false
    return Date.now() - lastUpdated < 9000 // considered online if updated within 9s
  }, [lastUpdated])

  const refreshStream = () => {
    setStreamError(false)
    setStreamBust((n) => n + 1)
  }

  const sendLedIntensity = async (value) => {
    try {
      setUpdatingLed(true)
      const candidates = [
        `${CAM_BASE}/led_intensity?value=${value}`,
        `${CAM_BASE}/control?var=led_intensity&val=${value}`,
        `${CAM_BASE}/led?value=${value}`,
        `${CAM81_BASE}/led_intensity?value=${value}`,
        `${CAM81_BASE}/control?var=led_intensity&val=${value}`,
        `${CAM81_BASE}/led?value=${value}`,
      ]
      let ok = false
      let lastErr
      for (const url of candidates) {
        try {
          const res = await axios.get(url, { timeout: 8000 })
          if (res.status >= 200 && res.status < 300) {
            ok = true
            break
          }
        } catch (err) {
          lastErr = err
          const msg = (err?.message || '').toLowerCase()
          if (msg.includes('abort')) {
            // Benign abort; continue trying
            continue
          }
        }
      }
      if (ok) {
        showToast(`Light intensity set to ${value}`, 'success')
      } else {
        console.error('LED intensity update failed:', lastErr)
        showToast('Failed to set light intensity', 'error')
      }
    } finally {
      setUpdatingLed(false)
    }
  }

  const onIntensityChange = (e) => {
    const val = Number(e.target.value)
    setLedIntensity(val)
    if (ledTimerRef.current) clearTimeout(ledTimerRef.current)
    ledTimerRef.current = setTimeout(() => {
      sendLedIntensity(val)
    }, 300)
  }

  const commitIntensity = () => {
    if (ledTimerRef.current) {
      clearTimeout(ledTimerRef.current)
      ledTimerRef.current = null
    }
    sendLedIntensity(ledIntensity)
  }

  // Notify when crossing range boundaries for TDS and Temperature
  useEffect(() => {
    const msgs = []
    let anyError = false
    const tds = readings.tdsPpm
    const temp = readings.temperatureC
    if (tds != null) {
      const inRange = tds >= TDS_RANGE.min && tds <= TDS_RANGE.max
      if (lastRangeRef.current.tds !== inRange) {
        lastRangeRef.current.tds = inRange
        if (inRange) msgs.push('TDS in range (clean water)')
        else { msgs.push(`TDS out of range: ${tds} ppm`); anyError = true }
      }
    }
    if (temp != null) {
      const inRange = temp >= TEMP_RANGE.min && temp <= TEMP_RANGE.max
      if (lastRangeRef.current.temp !== inRange) {
        lastRangeRef.current.temp = inRange
        if (inRange) msgs.push('Temperature in range 24–32°C')
        else { msgs.push(`Temperature out of range: ${temp} °C`); anyError = true }
      }
    }
    if (msgs.length) {
      showToast(msgs.join(' • '), anyError ? 'error' : 'success')
    }
  }, [readings.tdsPpm, readings.temperatureC])

  const Icons = {
    water: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3s-6 6-6 10a6 6 0 0012 0c0-4-6-10-6-10z" />
      </svg>
    ),
    tds: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20" />
        <path d="M7 4v16" />
        <path d="M17 6v12" />
      </svg>
    ),
    temp: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 14a4 4 0 108 0V6a4 4 0 10-8 0v8z" />
        <path d="M10 14h8" />
      </svg>
    ),
    humidity: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3s-6 6-6 10a6 6 0 0012 0c0-4-6-10-6-10z" />
      </svg>
    ),
    sound: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 9v6l4 3V6L5 9z" />
        <path d="M15 9a3 3 0 010 6" />
        <path d="M17 7a5 5 0 010 10" />
      </svg>
    ),
  }

  const MetricCard = ({ title, value, unit, icon }) => (
    <article className="card metric-card">
      <div className="metric-header">
        {icon}
        <h3>{title}</h3>
      </div>
      <p className="value">
        {value != null ? (
          `${value} ${unit}`
        ) : (
          <span className="skeleton" aria-hidden="true"></span>
        )}
      </p>
    </article>
  )

  return (
    <div className="App">
      <header className="App-header">
        <div className="container">
          <div className="header-top">
            <div className="titles">
              <h1>Smart Fish Tank Dashboard</h1>
              <p className="subhead">ESP32 sensors and live camera</p>
            </div>
            <div className="toolbar" role="toolbar" aria-label="Actions">
              <button className="btn outline small" onClick={fetchSensorData} disabled={loading}>
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
              <button className="btn success" onClick={toggleLed} aria-label="Toggle tank light">Turn Light On</button>
              <button
                className="btn primary"
                onClick={() => window.open('http://10.240.190.161:81/stream', '_blank')}
              >
                Open Live Camera
              </button>
              <span className="status">
                <span className={`status-dot ${online ? 'online' : 'offline'}`} aria-hidden="true"></span>
                <span className="timestamp">Updated: {formatTimestamp}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {toast && (
        <div className={`toast ${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      <main className="dashboard">
        <div className="container">
          <section className="metrics">
            <div className="cards">
              <MetricCard title="Water Level" value={readings.waterLevelCm ?? readings.distanceCm} unit="cm" icon={Icons.water} />
              <MetricCard title="TDS" value={readings.tdsPpm} unit="ppm" icon={Icons.tds} />
              <MetricCard title="Temperature" value={readings.temperatureC} unit="°C" icon={Icons.temp} />
              <MetricCard title="Humidity" value={readings.humidityPct} unit="%" icon={Icons.humidity} />
              <MetricCard title="Sound" value={readings.soundDb} unit="dB" icon={Icons.sound} />
            </div>
          </section>

          <section className="camera-card" aria-label="ESP32-CAM Live Stream">
            <div className="camera-header">
              <h3>ESP32-CAM Live Stream</h3>
              <div className="camera-actions">
                <button className="btn outline" onClick={refreshStream}>Refresh Stream</button>
                <button
                  className="btn outline"
                  onClick={() => window.open(STREAM_URL, '_blank')}
                >
                  Open in New Tab
                </button>
              </div>
            </div>
            <div className="camera-aspect">
              <img
                className="camera-frame"
                id="stream"
                crossOrigin=""
                key={streamBust}
                src={STREAM_URL}
                alt="ESP32-CAM stream"
                onError={() => { setStreamError(true); showToast('Stream error', 'error') }}
                onLoad={() => setStreamError(false)}
              />
              {streamError && (
                <div className="camera-offline" role="status" aria-live="polite">
                  Camera offline or unreachable
                </div>
              )}
            </div>
            <div className="slider-wrap">
              <label htmlFor="led_intensity">Light Intensity</label>
              <div className="slider-row">
                <input
                  type="range"
                  id="led_intensity"
                  min="0"
                  max="255"
                  value={ledIntensity}
                  onChange={onIntensityChange}
                  onMouseUp={commitIntensity}
                  onTouchEnd={commitIntensity}
                  className="range"
                  disabled={updatingLed}
                />
                <span className="range-value" aria-live="polite">{ledIntensity}</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
