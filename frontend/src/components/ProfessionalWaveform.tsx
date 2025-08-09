'use client'
import { useRef, useEffect, useState, useCallback } from 'react'

interface WaveformProps {
  audioUrl: string
  isPlaying: boolean
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  height?: number
  barWidth?: number
  barGap?: number
  className?: string
}

interface WaveformData {
  peaks: number[]
  duration: number
}

export default function ProfessionalWaveform({
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  onSeek,
  height = 80,
  barWidth = 2,
  barGap = 1,
  className = ''
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [canvasWidth, setCanvasWidth] = useState(800)
  const animationRef = useRef<number | null>(null)

  // Generate waveform data from audio
  const generateWaveformData = useCallback(async (url: string): Promise<WaveformData> => {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        throw new Error('Not in browser environment')
      }

      // Check if Web Audio API is supported
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) {
        throw new Error('Web Audio API not supported')
      }

      const audioContext = new AudioContext()
      
      // Add timeout to fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(url, { 
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      const rawData = audioBuffer.getChannelData(0)
      const samples = Math.floor(canvasWidth / (barWidth + barGap))
      const blockSize = Math.floor(rawData.length / samples)
      const peaks: number[] = []
      
      for (let i = 0; i < samples; i++) {
        let sum = 0
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j] || 0)
        }
        peaks.push(sum / blockSize)
      }
      
      // Normalize peaks
      const maxPeak = Math.max(...peaks)
      const normalizedPeaks = maxPeak > 0 ? peaks.map(peak => peak / maxPeak) : peaks
      
      audioContext.close()
      
      return {
        peaks: normalizedPeaks,
        duration: audioBuffer.duration
      }
    } catch (error) {
      console.warn('Could not generate real waveform, using fallback:', error)
      
      // Enhanced fallback: generate more realistic fake waveform data
      const samples = Math.floor(canvasWidth / (barWidth + barGap))
      const peaks: number[] = []
      
      // Create a more musical-looking waveform pattern
      for (let i = 0; i < samples; i++) {
        const progress = i / samples
        // Create some variation that looks more like music
        const baseLevel = 0.3 + Math.sin(progress * Math.PI * 4) * 0.2
        const randomVariation = (Math.random() - 0.5) * 0.4
        const peak = Math.max(0.1, Math.min(1, baseLevel + randomVariation))
        peaks.push(peak)
      }
      
      return { 
        peaks, 
        duration: duration || 30 
      }
    }
  }, [canvasWidth, barWidth, barGap, duration])

  // Update canvas width based on container size
  useEffect(() => {
    const updateCanvasWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth
        setCanvasWidth(width)
      }
    }

    updateCanvasWidth()
    window.addEventListener('resize', updateCanvasWidth)
    return () => window.removeEventListener('resize', updateCanvasWidth)
  }, [])

  // Load waveform data when audio URL changes
  useEffect(() => {
    if (audioUrl) {
      setIsLoading(true)
      setWaveformData(null) // Clear previous data
      
      // Add a small delay to ensure audio element is ready
      const loadTimeout = setTimeout(() => {
        generateWaveformData(audioUrl)
          .then(data => {
            setWaveformData(data)
            setIsLoading(false)
          })
          .catch(error => {
            console.error('Failed to load waveform:', error)
            // Still provide fallback data even on error
            const samples = Math.floor(canvasWidth / (barWidth + barGap))
            const fallbackPeaks = Array.from({ length: samples }, (_, i) => {
              const progress = i / samples
              return 0.3 + Math.sin(progress * Math.PI * 3) * 0.3 + (Math.random() - 0.5) * 0.2
            })
            setWaveformData({ peaks: fallbackPeaks, duration: duration || 30 })
            setIsLoading(false)
          })
      }, 100)
      
      return () => clearTimeout(loadTimeout)
    }
  }, [audioUrl, generateWaveformData, canvasWidth, barWidth, barGap, duration])

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !waveformData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvasWidth
    canvas.height = height

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, height)

    const { peaks } = waveformData
    const progressRatio = duration > 0 ? currentTime / duration : 0
    const progressX = progressRatio * canvasWidth

    // Draw waveform bars
    peaks.forEach((peak, index) => {
      const x = index * (barWidth + barGap)
      const barHeight = peak * height * 0.8
      const y = (height - barHeight) / 2

      // Create gradient for bars
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      
      if (x < progressX) {
        // Played portion - bright colors
        gradient.addColorStop(0, '#60a5fa') // Light blue
        gradient.addColorStop(0.5, '#3b82f6') // Blue
        gradient.addColorStop(1, '#1d4ed8') // Dark blue
      } else {
        // Unplayed portion - muted colors
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)')
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)')
      }

      ctx.fillStyle = gradient
      ctx.fillRect(x, y, barWidth, barHeight)

      // Add glow effect for played bars
      if (x < progressX) {
        ctx.shadowColor = '#3b82f6'
        ctx.shadowBlur = 3
        ctx.fillRect(x, y, barWidth, barHeight)
        ctx.shadowBlur = 0
      }
    })

    // Draw progress line
    if (progressX > 0) {
      ctx.strokeStyle = '#fbbf24' // Yellow/orange
      ctx.lineWidth = 2
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(progressX, 0)
      ctx.lineTo(progressX, height)
      ctx.stroke()

      // Add glow to progress line
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = 8
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // Add animation effect when playing
    if (isPlaying) {
      const pulseIntensity = Math.sin(Date.now() / 200) * 0.1 + 0.9
      ctx.globalAlpha = pulseIntensity
      
      // Redraw the played portion with pulse effect
      peaks.forEach((peak, index) => {
        const x = index * (barWidth + barGap)
        if (x < progressX) {
          const barHeight = peak * height * 0.8
          const y = (height - barHeight) / 2
          
          const gradient = ctx.createLinearGradient(0, 0, 0, height)
          gradient.addColorStop(0, '#60a5fa')
          gradient.addColorStop(0.5, '#3b82f6')
          gradient.addColorStop(1, '#1d4ed8')
          
          ctx.fillStyle = gradient
          ctx.shadowColor = '#3b82f6'
          ctx.shadowBlur = 5
          ctx.fillRect(x, y, barWidth, barHeight)
        }
      })
      
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
    }
  }, [waveformData, canvasWidth, height, currentTime, duration, isPlaying, barWidth, barGap])

  // Handle canvas click for seeking
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !waveformData) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const progress = x / canvasWidth
    const seekTime = progress * waveformData.duration
    
    onSeek(seekTime)
  }

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawWaveform()
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    if (isPlaying) {
      animate()
    } else {
      drawWaveform()
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, drawWaveform])

  // Draw when not playing
  useEffect(() => {
    if (!isPlaying) {
      drawWaveform()
    }
  }, [currentTime, waveformData, drawWaveform, isPlaying])

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black/20 rounded-lg p-2 border border-white/10 ${className}`}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg z-10">
          <div className="flex flex-col items-center gap-2 text-blue-300">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-transparent"></div>
              <span className="text-sm">Analyzing audio...</span>
            </div>
            <div className="text-xs text-blue-400 opacity-75">
              This may take a moment for large files
            </div>
          </div>
        </div>
      )}

      {/* Error/Fallback notice */}
      {!isLoading && waveformData && waveformData.peaks.length > 0 && (
        <div className="absolute top-1 left-2 text-xs text-blue-400/60">
          {waveformData.duration === (duration || 30) && duration ? '📊 Live waveform' : '📊 Fallback visualization'}
        </div>
      )}

      {/* Waveform Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full cursor-pointer hover:brightness-110 transition-all duration-200"
        style={{ height: `${height}px` }}
      />

      {/* Time markers */}
      {waveformData && !isLoading && (
        <div className="flex justify-between text-xs text-blue-200 mt-1 px-1">
          <span>0:00</span>
          <span className="text-yellow-300 font-mono">
            {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
          </span>
          <span>
            {Math.floor(waveformData.duration / 60)}:{Math.floor(waveformData.duration % 60).toString().padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Frequency visualization (decorative) */}
      {isPlaying && waveformData && (
        <div className="absolute top-0 right-2 flex items-center gap-1 h-full">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-blue-600 to-purple-400 rounded-full opacity-60"
              style={{
                height: `${20 + Math.sin(Date.now() / (100 + i * 50)) * 15}px`,
                animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`
              }}
            />
          ))}
        </div>
      )}

      {/* Click instruction */}
      {!isLoading && (
        <div className="absolute bottom-1 right-2 text-xs text-blue-300/60">
          Click to seek
        </div>
      )}
    </div>
  )
}
