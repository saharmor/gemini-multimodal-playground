'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, Video, Monitor } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { base64ToFloat32Array, float32ToPcm16 } from '@/lib/utils';

interface Config {
  systemPrompt: string;
  voice: string;
  googleSearch: boolean;
  allowInterruptions: boolean;
  isWakeWordEnabled: boolean;
  wakeWord: string;
  cancelPhrase: string;
}

export default function GeminiVoiceChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [isAudioSending, setIsAudioSending] = useState(false);
  const [config, setConfig] = useState<Config>({
    systemPrompt: "You are a friendly Gemini 2.0 model. Respond verbally in a casual, helpful tone.",
    voice: "Puck",
    googleSearch: true,
    allowInterruptions: false,
    isWakeWordEnabled: false,
    wakeWord: "Gemini",
    cancelPhrase: "stop listening"
  });
  
  const [wakeWordDetected, setWakeWordDetected] = useState(false);

  // Load persisted settings from local storage on mount
  useEffect(() => {
    const storedConfig = localStorage.getItem('geminiConfig');
    if (storedConfig) {
      const parsed = JSON.parse(storedConfig);
      setConfig((prev) => ({
        ...prev,
        ...parsed,
      }));
    }
  }, []);

  // Persist settings to local storage when they change
  useEffect(() => {
    const { systemPrompt, voice, isWakeWordEnabled, wakeWord, cancelPhrase } = config;
    localStorage.setItem(
      'geminiConfig',
      JSON.stringify({ systemPrompt, voice, isWakeWordEnabled, wakeWord, cancelPhrase })
    );
  }, [config.systemPrompt, config.voice, config.isWakeWordEnabled, config.wakeWord, config.cancelPhrase]);
  const [wakeWordTranscript, setWakeWordTranscript] = useState('');
  const recognitionRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioInputRef = useRef(null);
  const clientId = useRef(crypto.randomUUID());
  const wakeWordDetectedRef = useRef(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [chatMode, setChatMode] = useState<'audio' | 'video' | null>(null);
  const [videoSource, setVideoSource] = useState<'camera' | 'screen' | null>(null);

  const voices = ["Puck", "Charon", "Kore", "Fenrir", "Aoede"];
  let audioBuffer = []
  let isPlaying = false
  let currentAudioSource: AudioBufferSourceNode | null = null;

  const startStream = async (mode: 'audio' | 'camera' | 'screen') => {

    if (mode !== 'audio') {
      setChatMode('video');
    } else {
      setChatMode('audio');
    }

    wsRef.current = new WebSocket(`ws://localhost:8000/ws/${clientId.current}`);
    
    wsRef.current.onopen = async () => {
      wsRef.current.send(JSON.stringify({
        type: 'config',
        config: config
      }));
      
      await startAudioStream();

      if (mode !== 'audio') {
        setVideoEnabled(true);
        setVideoSource(mode)
      }

      setIsStreaming(true);
      setIsConnected(true);
    };

    wsRef.current.onmessage = async (event) => {
      const response = JSON.parse(event.data);
      if (response.type === 'audio') {
        const audioData = base64ToFloat32Array(response.data);
        playAudioData(audioData);
      }
    };

    wsRef.current.onerror = (error) => {
      setError('WebSocket error: ' + error.message);
      setIsStreaming(false);
    };

    wsRef.current.onclose = (event) => {
      setIsStreaming(false);
    };
  };

  // Initialize audio context and stream
  const startAudioStream = async () => {
    try {
      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000 // Required by Gemini
      });

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Always share the audio stream with SpeechRecognition (for transcription)
      if (recognitionRef.current) {
        recognitionRef.current.stream = stream;
      }
      
      // Create audio input node
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(512, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const shouldSend = !config.isWakeWordEnabled || wakeWordDetectedRef.current;
          setIsAudioSending(shouldSend); // Update state immediately
          
          if (shouldSend) {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Add validation
            if (inputData.every(sample => sample === 0)) {
              return;
            }
            
            const pcmData = float32ToPcm16(inputData);
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
            wsRef.current.send(JSON.stringify({
              type: 'audio',
              data: base64Data
            }));
          }
        }
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
      audioInputRef.current = { source, processor, stream };
      setIsStreaming(true);
    } catch (err) {
      setError('Failed to access microphone: ' + err.message);
    }
  };

  // Stop streaming
  const stopStream = () => {
    // Add transcript reset
    setWakeWordTranscript('');
    setWakeWordDetected(false);
    wakeWordDetectedRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (audioInputRef.current) {
      const { source, processor, stream } = audioInputRef.current;
      source.disconnect();
      processor.disconnect();
      stream.getTracks().forEach(track => track.stop());
      audioInputRef.current = null;
    }

    if (chatMode === 'video') {
      setVideoEnabled(false);
      setVideoSource(null);

      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
    }

    // stop ongoing audio playback
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsStreaming(false);
    setIsConnected(false);
    setChatMode(null);
  };

  const playAudioData = async (audioData) => {
    audioBuffer.push(audioData)
    if (!isPlaying) {
      playNextInQueue(); // Start playback if not already playing
      }
    }

  const playNextInQueue = async () => {
    if (!audioContextRef.current || audioBuffer.length == 0) {
      console.log("No audio context or audioBuffer is empty. Ending playback.");
      isPlaying = false;
      return;
    }

    isPlaying = true;
    const audioData = audioBuffer.shift();
    console.log("Playing next audio buffer. Remaining queue length:", audioBuffer.length);
    
    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    buffer.copyToChannel(audioData, 0);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    currentAudioSource = source; // <-- New line to store the current audio source
    source.onended = () => {
      console.log("Audio playback ended, checking for next buffer...");
      playNextInQueue();
    };
    source.start();
  };

  const handleManualInterrupt = () => {
    console.log("Manual interruption triggered by button");
    audioBuffer = [];
    if (currentAudioSource) {
      console.log("Stopping current audio source manually.");
      currentAudioSource.stop();
      currentAudioSource = null;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("Sending manual interruption text to Gemini");
      wsRef.current.send(JSON.stringify({
        type: 'interrupt'
      }));
    }
  };

  useEffect(() => {
    if (videoEnabled && videoRef.current) {
      const startVideo = async () => {
        try {
          let stream;
          if (videoSource === 'camera') {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 320 }, height: { ideal: 240 } }
            });
          } else if (videoSource === 'screen') {
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
          }
          
          videoRef.current.srcObject = stream;
          videoStreamRef.current = stream;
          
          // Start frame capture after video is playing
          videoIntervalRef.current = setInterval(() => {
            captureAndSendFrame();
          }, 1000);

        } catch (err) {
          console.error('Video initialization error:', err);
          setError('Failed to access camera/screen: ' + err.message);

          if (videoSource === 'screen') {
            // Reset chat mode and clean up any existing connections
            setChatMode(null);
            stopStream();
          }

          setVideoEnabled(false);
          setVideoSource(null);
        }
      };

      startVideo();

      // Cleanup function
      return () => {
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(track => track.stop());
          videoStreamRef.current = null;
        }
        if (videoIntervalRef.current) {
          clearInterval(videoIntervalRef.current);
          videoIntervalRef.current = null;
        }
      };
    }
  }, [videoEnabled, videoSource]);

  // Frame capture function
  const captureAndSendFrame = () => {
    if (!canvasRef.current || !videoRef.current || !wsRef.current) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    
    context.drawImage(videoRef.current, 0, 0);
    const base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
    
    wsRef.current.send(JSON.stringify({
      type: 'image',
      data: base64Image
    }));
  };

  // Toggle video function
  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVideo();
      stopStream();
    };
  }, []);

  // Wake word detection
  useEffect(() => {
    // Always initialize SpeechRecognition for continuous transcription.
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        // Use only the latest result instead of joining all results
        const latestResult = event.results[event.results.length - 1];
        const transcript = latestResult[0].transcript.toLowerCase();
        
        // Always update transcript for transcription purposes.
        setWakeWordTranscript(transcript);
        
        // If cancellation phrase is detected, ensure that audio is not sent
        if (transcript.includes(config.cancelPhrase.toLowerCase())) {
          wakeWordDetectedRef.current = false;
          setWakeWordDetected(false);
          setWakeWordTranscript('');
        } 
        // If wake word is detected, enable sending
        else if (transcript.includes(config.wakeWord.toLowerCase())) {
          wakeWordDetectedRef.current = true;
          setWakeWordDetected(true);
          setWakeWordTranscript('');
        }

        const isFinal = latestResult.isFinal;
        if (
          isFinal &&
          config.allowInterruptions &&
          !transcript.includes(config.cancelPhrase.toLowerCase()) &&
          !transcript.includes(config.wakeWord.toLowerCase())
        ) {
          console.log("Final transcript received for interruption:", transcript);
          console.log("Interrupting Gemini audio playback...");
          // Interrupt Gemini's ongoing audio playback:
          audioBuffer = []; // Clear any queued audio responses
          if (currentAudioSource) {
            currentAudioSource.stop();
            currentAudioSource = null;
          }
          // Send the new recognized speech to Gemini as a text message
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'interrupt'
            }));
          }
          setWakeWordTranscript('');
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          setError('Microphone already in use - disable wake word to continue');
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        setError('Microphone access error: ' + err.message);
      }
    } else {
      setError('Speech recognition not supported in this browser');
    }

    return () => {
      wakeWordDetectedRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [config.wakeWord, config.cancelPhrase]);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 md:px-8">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Gemini 2.0 Realtime Playground ✨</h1>
        
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                value={config.systemPrompt}
                onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                disabled={isConnected}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice-select">Voice</Label>
              <Select
                value={config.voice}
                onValueChange={(value) => setConfig(prev => ({ ...prev, voice: value }))}
                disabled={isConnected}
              >
                <SelectTrigger id="voice-select">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice} value={voice}>
                      {voice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="google-search"
                checked={config.googleSearch}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ ...prev, googleSearch: checked as boolean }))}
                disabled={isConnected}
              />
              <Label htmlFor="google-search">Enable Google Search</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow-interruptions"
                checked={config.allowInterruptions}
                onCheckedChange={(checked) =>
                  setConfig(prev => ({ ...prev, allowInterruptions: checked as boolean }))
                }
                disabled={isConnected}
              />
              <Label htmlFor="allow-interruptions">Allow Interruptions</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="wake-word-enabled"
                checked={config.isWakeWordEnabled}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ ...prev, isWakeWordEnabled: checked as boolean }))}
                disabled={isConnected}
              />
              <Label htmlFor="wake-word-enabled">Enable Wake Word</Label>
            </div>

            {config.isWakeWordEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="wake-word">Wake Word</Label>
                  <Textarea
                    id="wake-word"
                    value={config.wakeWord}
                    onChange={(e) => setConfig(prev => ({ ...prev, wakeWord: e.target.value }))}
                    disabled={isConnected}
                    className="min-h-[40px]"
                    placeholder="Enter wake word phrase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancel-phrase">Cancel Phrase</Label>
                  <Textarea
                    id="cancel-phrase"
                    value={config.cancelPhrase}
                    onChange={(e) => setConfig(prev => ({ ...prev, cancelPhrase: e.target.value }))}
                    disabled={isConnected}
                    className="min-h-[40px]"
                    placeholder="Enter cancellation phrase"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-4 justify-center">
          {!isStreaming && (
            <>
            <Button
              onClick={() => startStream('audio')}
              disabled={isStreaming}
              className="gap-2"
          >
            <Mic className="h-4 w-4" />
            Start Chatting
          </Button>

          <Button
            onClick={() => startStream('camera')}
            disabled={isStreaming}
            className="gap-2"
          >
            <Video className="h-4 w-4" />
              Start Chatting with Video
            </Button>
          
          <Button
            onClick={() => startStream('screen')}
            disabled={isStreaming}
            className="gap-2"
          >
            <Monitor className="h-4 w-4" />
              Start Chatting with Screen
            </Button>
          </>

            
          )}

          {isStreaming && (
            <>
              <Button
                onClick={stopStream}
                variant="destructive"
                className="gap-2"
              >
                <StopCircle className="h-4 w-4" />
                Stop Chat
              </Button>
              <Button
                onClick={handleManualInterrupt}
                variant="outline"
                className="gap-2"
              >
                <StopCircle className="h-4 w-4" />
                Manual Interrupt
              </Button>
            </>
          )}
        </div>

        {isStreaming && (
          <Card>
            <CardContent className="flex items-center justify-center h-24 mt-6">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Mic className={`h-8 w-8 ${isAudioSending ? 'text-green-500' : 'text-blue-500'} animate-pulse`} />
                  {isAudioSending && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-gray-600">
                    {config.isWakeWordEnabled && !wakeWordDetected 
                      ? "Listening for wake word..."
                      : "Listening to conversation..."}
                  </p>
                  <p className="text-xs text-gray-500">
                    {config.isWakeWordEnabled 
                      ? wakeWordDetected 
                        ? "Sending audio to Gemini..." 
                        : "Waiting for wake word..."
                      : isAudioSending 
                        ? "Sending audio to Gemini..." 
                        : "Audio paused"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(chatMode === 'video') && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Video Input</h2>
              </div>
              
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto object-contain"
                  style={{ transform: videoSource === 'camera' ? 'scaleX(-1)' : 'none' }}
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                  width={640}
                  height={480}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {wakeWordDetected && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-600">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Wake word detected! Listening to conversation...
              </div>
            </CardContent>
          </Card>
        )}

        {config.isWakeWordEnabled && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-lg font-semibold">Wake Word Debug</h2>
              <div className="text-sm text-muted-foreground">
                <p>Listening for: <strong>{config.wakeWord.toLowerCase()}</strong></p>
                <p className="mt-2">Current transcript:</p>
                <div className="p-2 bg-gray-50 rounded-md min-h-[40px]">
                  {isStreaming ? wakeWordTranscript : 'Start chat to begin listening...'}
                </div>
                {isStreaming && (
                  <p className="text-xs text-yellow-600 mt-2">
                    Note: Transcript may be limited while streaming due to browser microphone constraints
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
