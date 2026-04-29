import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RefreshCw, Trophy } from 'lucide-react';

const GRID_SIZE = 25;
const INITIAL_SPEED = 120;
const MIN_SPEED = 40;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const TRACKS = [
  { id: 1, title: 'AI Genesis', artist: 'NeuralNet Audio', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=150&auto=format&fit=crop' },
  { id: 2, title: 'Cybernetic Dreams', artist: 'Deep Learning Synth', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', cover: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=150&auto=format&fit=crop' },
  { id: 3, title: 'Neon Synapse', artist: 'Algorithm Beats', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', cover: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=150&auto=format&fit=crop' },
];

export default function App() {
  // === Music Player State ===
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // === Snake Game State ===
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameRunning, setIsGameRunning] = useState(false);

  // Direction ref to prevent rapid multiple key presses
  const directionRef = useRef<Direction>(direction);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  // Handle Audio events
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((e) => console.log('Audio play failed:', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIdx]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const skipNext = () => {
    setCurrentTrackIdx((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };
  
  const skipPrev = () => {
    setCurrentTrackIdx((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  // Snake Logic
  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line no-loop-func
      if (!currentSnake.some((segment) => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection('RIGHT');
    setFood(generateFood([{ x: 10, y: 10 }]));
    setScore(0);
    setIsGameOver(false);
    setIsGameRunning(true);
    // Auto start music if not playing
    if (!isPlaying) setIsPlaying(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' && (isGameOver || !isGameRunning)) {
        resetGame();
        return;
      }

      const currDir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currDir !== 'DOWN') setDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currDir !== 'UP') setDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currDir !== 'RIGHT') setDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currDir !== 'LEFT') setDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver, isGameRunning, isPlaying]);

  useEffect(() => {
    if (!isGameRunning || isGameOver) return;

    const moveSnake = () => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const newHead = { ...head };

        switch (directionRef.current) {
          case 'UP':
            newHead.y -= 1;
            break;
          case 'DOWN':
            newHead.y += 1;
            break;
          case 'LEFT':
            newHead.x -= 1;
            break;
          case 'RIGHT':
            newHead.x += 1;
            break;
        }

        // Wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          handleGameOver();
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          handleGameOver();
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Food collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore((s) => s + 10);
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const currentSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - Math.floor(score / 50) * 10);
    const intervalId = setInterval(moveSnake, currentSpeed);

    return () => clearInterval(intervalId);
  }, [isGameRunning, isGameOver, food, score, generateFood]);

  const handleGameOver = () => {
    setIsGameOver(true);
    setIsGameRunning(false);
    if (score > highScore) {
      setHighScore(score);
    }
  };

  const currentTrack = TRACKS[currentTrackIdx];

  return (
    <div className="min-h-screen bg-gray-950 text-white font-mono flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background ambient glowing effect */}
      <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Header */}
      <header className="z-10 w-full max-w-5xl mx-auto flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 p-2 rounded-lg border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <Trophy className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs text-cyan-400 uppercase tracking-widest font-bold opacity-80">High Score</div>
            <div className="text-2xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">{highScore}</div>
          </div>
        </div>

        <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] flex items-center gap-2">
          SYNTH<span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">SNAKE</span>
        </h1>
        
        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="text-xs text-pink-400 uppercase tracking-widest font-bold opacity-80">Score</div>
            <div className="text-2xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">{score}</div>
          </div>
          <div className="bg-pink-500/20 p-2 rounded-lg border border-pink-400/50 shadow-[0_0_15px_rgba(236,72,153,0.5)]">
            <RefreshCw className="w-6 h-6 text-pink-400 cursor-pointer hover:rotate-180 transition-transform duration-500" onClick={resetGame} />
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="z-10 flex-1 flex items-center justify-center w-full px-4 mb-24">
        <div 
          className="relative bg-gray-900/80 backdrop-blur-md p-4 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.2)]"
        >
          {/* Game Grid */}
          <div 
            className="grid bg-black/60 border border-gray-800 overflow-hidden"
            style={{ 
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              width: 'min(70vh, 90vw)',
              height: 'min(70vh, 90vw)',
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              
              const isSnakeHead = snake[0].x === x && snake[0].y === y;
              const isSnakeBody = snake.some((seg, idx) => idx !== 0 && seg.x === x && seg.y === y);
              const isFood = food.x === x && food.y === y;

              let cellClasses = 'w-full h-full ';

              if (isSnakeHead) {
                cellClasses += 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] scale-110 z-10';
              } else if (isSnakeBody) {
                cellClasses += 'bg-cyan-500/80 shadow-[0_0_5px_rgba(6,182,212,0.4)] scale-95';
              } else if (isFood) {
                cellClasses += 'bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.9)] rounded-full scale-75 animate-pulse';
              } else {
                cellClasses += 'border-[0.5px] border-gray-800/30';
              }

              return <div key={i} className={cellClasses} />;
            })}
          </div>

          {/* Overlays */}
          {(!isGameRunning || isGameOver) && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm border border-pink-500/50 shadow-[inset_0_0_50px_rgba(236,72,153,0.2)]">
              <div className="text-center">
                {isGameOver ? (
                  <>
                    <h2 className="text-5xl font-black text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)] mb-2">SYSTEM FAILURE</h2>
                    <p className="text-cyan-400 mb-8 font-bold text-xl drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">FINAL SCORE: {score}</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-5xl font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] mb-2">READY</h2>
                    <p className="text-gray-400 mb-8 font-bold text-lg">INITIALIZING SNAKE PROTOCOL</p>
                  </>
                )}
                
                <button 
                  onClick={resetGame}
                  className="px-8 py-4 bg-transparent border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900 font-bold tracking-widest text-xl uppercase transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]"
                >
                  {isGameOver ? 'REBOOT' : 'START [SPACE]'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Music Player Bar - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          
          {/* Now Playing Info */}
          <div className="flex items-center gap-4 w-1/3 min-w-0">
            <div className={`relative w-14 h-14 overflow-hidden shrink-0 border border-gray-700 ${isPlaying ? 'animate-[spin_10s_linear_infinite] rounded-full' : 'rounded-md'}`}>
              <img src={currentTrack.cover} alt={currentTrack.title} className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-black/20" />
              {isPlaying && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gray-900 rounded-full border border-gray-700" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white truncate drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]">{currentTrack.title}</div>
              <div className="text-xs text-cyan-500/80 truncate font-semibold uppercase tracking-wider">{currentTrack.artist}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="flex items-center gap-6">
              <button 
                onClick={skipPrev}
                className="text-gray-400 hover:text-white hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] transition-all"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>
              
              <button 
                onClick={togglePlay}
                className="w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-white text-gray-900 rounded-full transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:scale-105"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-0.5" />}
              </button>

              <button 
                onClick={skipNext}
                className="text-gray-400 hover:text-white hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] transition-all"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>
            </div>
            
            {/* Visualizer bar */}
            <div className="w-full max-w-sm h-1 bg-gray-800 rounded-full overflow-hidden flex">
               {isPlaying ? (
                  <div className="h-full w-2/3 bg-gradient-to-r from-cyan-500 to-pink-500 origin-left animate-pulse" />
               ) : (
                  <div className="h-full w-0 bg-cyan-500 transition-all duration-500" />
               )}
            </div>
          </div>

          {/* Volume Group */}
          <div className="flex items-center justify-end gap-3 w-1/3">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (parseFloat(e.target.value) > 0) setIsMuted(false);
              }}
              className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef}
        src={currentTrack.url}
        onEnded={skipNext}
        loop={false}
      />
    </div>
  );
}
