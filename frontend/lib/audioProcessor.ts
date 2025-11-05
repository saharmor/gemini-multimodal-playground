/**
 * Advanced Audio Buffer Management System
 * 
 * This module provides sophisticated audio buffer management with adaptive sizing
 * based on network conditions and playback performance metrics.
 */

// Configuration for the audio buffer system
export interface AudioBufferConfig {
  initialBufferSize: number;     // Initial buffer size in chunks
  minBufferSize: number;         // Minimum buffer size before playback starts
  maxBufferSize: number;         // Maximum buffer size to prevent memory issues
  adaptiveThreshold: number;     // Threshold for buffer adaptation (0-1)
  sampleRate: number;            // Audio sample rate
  adaptationRate: number;        // How quickly buffer adapts (0-1)
}

// Default configuration with reasonable values
export const DEFAULT_AUDIO_BUFFER_CONFIG: AudioBufferConfig = {
  initialBufferSize: 3,
  minBufferSize: 1,
  maxBufferSize: 10,
  adaptiveThreshold: 0.3,
  sampleRate: 24000,
  adaptationRate: 0.2,
};

// Metrics for audio buffer performance
export interface AudioBufferMetrics {
  underruns: number;             // Count of buffer underruns
  overruns: number;              // Count of buffer overruns
  averageLatency: number;        // Average latency in ms
  jitter: number;                // Jitter measurement in ms
  bufferSize: number;            // Current buffer size
  playbackGaps: number;          // Number of gaps in playback
}

// Audio chunk with metadata for better processing
export interface AudioChunk {
  data: Float32Array;            // The actual audio data
  timestamp: number;             // When the chunk was received
  sequence: number;              // Sequence number for ordering
  duration: number;              // Duration of the audio in ms
}

/**
 * AdaptiveAudioBuffer - Manages audio buffering with adaptive sizing
 * based on network conditions and playback performance.
 */
export class AdaptiveAudioBuffer {
  private buffer: AudioChunk[] = [];
  private config: AudioBufferConfig;
  private metrics: AudioBufferMetrics;
  private isPlaying: boolean = false;
  private lastPlayTimestamp: number = 0;
  private sequence: number = 0;
  private audioContext: AudioContext | null = null;
  private onMetricsUpdate: ((metrics: AudioBufferMetrics) => void) | null = null;
  private analyzerNode: AnalyserNode | null = null;
  private visualizationData: Uint8Array | null = null;

  /**
   * Creates a new adaptive audio buffer
   * @param config Configuration for the buffer
   * @param audioContext AudioContext to use for playback
   * @param onMetricsUpdate Optional callback for metrics updates
   */
  constructor(
    config: Partial<AudioBufferConfig> = {}, 
    audioContext: AudioContext | null = null,
    onMetricsUpdate: ((metrics: AudioBufferMetrics) => void) | null = null
  ) {
    this.config = { ...DEFAULT_AUDIO_BUFFER_CONFIG, ...config };
    this.audioContext = audioContext;
    this.onMetricsUpdate = onMetricsUpdate;
    
    // Initialize metrics
    this.metrics = {
      underruns: 0,
      overruns: 0,
      averageLatency: 0,
      jitter: 0,
      bufferSize: 0,
      playbackGaps: 0,
    };

    // Setup analyzer if audio context is provided
    if (this.audioContext) {
      this.setupAnalyzer();
    }
  }

  /**
   * Set up audio analyzer for visualization
   */
  private setupAnalyzer(): void {
    if (!this.audioContext) return;
    
    this.analyzerNode = this.audioContext.createAnalyser();
    this.analyzerNode.fftSize = 256;
    const bufferLength = this.analyzerNode.frequencyBinCount;
    this.visualizationData = new Uint8Array(bufferLength);
    this.analyzerNode.connect(this.audioContext.destination);
  }

  /**
   * Add audio data to the buffer
   * @param audioData Float32Array of audio data
   * @returns Current buffer length after addition
   */
  public addAudioData(audioData: Float32Array): number {
    const now = performance.now();
    
    // Create a chunk with metadata
    const chunk: AudioChunk = {
      data: audioData,
      timestamp: now,
      sequence: this.sequence++,
      duration: (audioData.length / this.config.sampleRate) * 1000
    };
    
    // Add to buffer
    this.buffer.push(chunk);
    
    // Update metrics
    this.metrics.bufferSize = this.buffer.length;
    
    // Check for buffer overrun
    if (this.buffer.length > this.config.maxBufferSize) {
      this.metrics.overruns++;
      // Adapt buffer size if needed
      this.adaptBufferSize();
    }
    
    // Start playback if not already playing and buffer is sufficiently filled
    if (!this.isPlaying && this.buffer.length >= this.config.minBufferSize) {
      this.startPlayback();
    }
    
    // Notify metrics update
    this.updateMetrics();
    
    return this.buffer.length;
  }

  /**
   * Start audio playback from the buffer
   */
  private startPlayback(): void {
    if (this.buffer.length === 0 || this.isPlaying) return;
    
    this.isPlaying = true;
    this.playNextChunk();
  }

  /**
   * Play the next chunk in the buffer
   */
  private playNextChunk(): void {
    if (!this.isPlaying || !this.audioContext) {
      this.isPlaying = false;
      return;
    }

    // Check for buffer underrun
    if (this.buffer.length === 0) {
      this.metrics.underruns++;
      this.isPlaying = false;
      
      // Adapt buffer size for next playback
      this.adaptBufferSize();
      
      // Update metrics
      this.updateMetrics();
      return;
    }

    // Get next chunk
    const chunk = this.buffer.shift()!;
    
    // Calculate gap since last playback
    const now = performance.now();
    if (this.lastPlayTimestamp > 0) {
      const gap = now - this.lastPlayTimestamp;
      const expectedGap = this.lastPlayDuration || 0;
      
      // Detect gaps in playback
      if (gap > expectedGap * 1.5) {
        this.metrics.playbackGaps++;
      }
      
      // Update jitter calculation
      const jitterSample = Math.abs(gap - expectedGap);
      this.metrics.jitter = this.metrics.jitter * 0.95 + jitterSample * 0.05;
    }
    
    // Update timestamps
    this.lastPlayTimestamp = now;
    const lastPlayDuration = chunk.duration;

    try {
      // Create audio buffer
      const audioBuffer = this.audioContext.createBuffer(
        1, 
        chunk.data.length, 
        this.config.sampleRate
      );
      
      // Copy data to buffer
      audioBuffer.copyToChannel(chunk.data, 0);
      
      // Create source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Connect to analyzer if available
      if (this.analyzerNode) {
        source.connect(this.analyzerNode);
      } else {
        source.connect(this.audioContext.destination);
      }
      
      // Handle playback completion
      source.onended = () => {
        this.playNextChunk();
      };
      
      // Start playback
      source.start();
      
      // Update latency metrics
      const latency = now - chunk.timestamp;
      this.metrics.averageLatency = this.metrics.averageLatency * 0.95 + latency * 0.05;
      
    } catch (error) {
      console.error("Audio playback error:", error);
      // Continue to next chunk on error
      setTimeout(() => this.playNextChunk(), 100);
    }
    
    // Update metrics
    this.metrics.bufferSize = this.buffer.length;
    this.updateMetrics();
  }

  /**
   * Adapt buffer size based on performance metrics
   */
  private adaptBufferSize(): void {
    // Calculate buffer health score (0-1)
    const underrunRate = this.metrics.underruns / Math.max(1, this.sequence);
    const overrunRate = this.metrics.overruns / Math.max(1, this.sequence);
    const jitterFactor = Math.min(1, this.metrics.jitter / 100);
    
    // Weighted health score
    const bufferHealth = 
      (1 - underrunRate) * 0.5 + 
      (1 - overrunRate) * 0.3 + 
      (1 - jitterFactor) * 0.2;
    
    // Adapt min buffer size based on health
    if (bufferHealth < this.config.adaptiveThreshold) {
      // Poor health, increase buffer size
      const newMinSize = Math.min(
        this.config.maxBufferSize,
        this.config.minBufferSize + 1
      );
      this.config.minBufferSize = newMinSize;
    } else if (
      bufferHealth > 0.8 && 
      this.config.minBufferSize > DEFAULT_AUDIO_BUFFER_CONFIG.minBufferSize
    ) {
      // Good health, gradually decrease buffer size
      this.config.minBufferSize = Math.max(
        DEFAULT_AUDIO_BUFFER_CONFIG.minBufferSize,
        this.config.minBufferSize - this.config.adaptationRate
      );
    }
  }

  /**
   * Update metrics and notify listeners
   */
  private updateMetrics(): void {
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate({ ...this.metrics });
    }
  }

  /**
   * Get current visualization data for audio
   * @returns Uint8Array of frequency data or null if not available
   */
  public getVisualizationData(): Uint8Array | null {
    if (!this.analyzerNode || !this.visualizationData) return null;
    
    this.analyzerNode.getByteFrequencyData(this.visualizationData);
    return this.visualizationData;
  }

  /**
   * Reset the buffer and all metrics
   */
  public reset(): void {
    this.buffer = [];
    this.isPlaying = false;
    this.sequence = 0;
    this.lastPlayTimestamp = 0;
    
    this.metrics = {
      underruns: 0,
      overruns: 0,
      averageLatency: 0,
      jitter: 0,
      bufferSize: 0,
      playbackGaps: 0,
    };
    
    this.updateMetrics();
  }

  /**
   * Get current buffer metrics
   * @returns Copy of current metrics
   */
  public getMetrics(): AudioBufferMetrics {
    return { ...this.metrics };
  }

  /**
   * Set audio context and initialize analyzer
   * @param audioContext New audio context
   */
  public setAudioContext(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    this.setupAnalyzer();
  }
}

/**
 * Utility function to convert base64 to Float32Array with error handling
 * @param base64 Base64 encoded audio data
 * @returns Float32Array of audio data
 */
export function base64ToFloat32Array(base64: string): Float32Array {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    // Convert to 16-bit PCM
    const pcm16 = new Int16Array(bytes.buffer);
    
    // Convert to float32 with bounds checking
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = Math.max(-1, Math.min(1, pcm16[i] / 32768.0));
    }
    
    return float32;
  } catch (error) {
    console.error("Error converting base64 to Float32Array:", error);
    // Return empty array on error
    return new Float32Array(0);
  }
}

/**
 * Utility function to convert Float32Array to PCM16 with error handling
 * @param float32Array Float32Array of audio data
 * @returns Int16Array of PCM data
 */
export function float32ToPcm16(float32Array: Float32Array | any[]): Int16Array {
  try {
    const pcm16 = new Int16Array(float32Array.length);
    
    for (let i = 0; i < float32Array.length; i++) {
      // Ensure value is in range [-1, 1]
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      // Convert to 16-bit PCM
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    return pcm16;
  } catch (error) {
    console.error("Error converting Float32Array to PCM16:", error);
    // Return empty array on error
    return new Int16Array(0);
  }
}
