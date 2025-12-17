/**
 * 中国象棋游戏显示插件
 * 简化版本：只显示棋盘
 */

'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { GameDisplayPlugin } from '@/gamecore/hierarchy/GameDisplayPlugin';
// import { ChessBoard } from '@/games/chinesechess/gamepagehierarchy/ChessBoard';
import { ChessBoardKit } from '@/games/chinesechess/gamepagehierarchy/ChessBoardKit';
import { useSystemDialog } from '@/lib/SystemDialogContext';

// 玩家信息卡片组件 - 支持折叠
interface PlayerInfoCardProps {
  player: any;
  isTop: boolean;
  isTurn: boolean;
}

const PlayerInfoCard = ({ player, isTop, isTurn }: PlayerInfoCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // 自动折叠逻辑：展开后15秒无操作自动折叠
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExpanded) {
      timer = setTimeout(() => {
        setIsExpanded(false);
      }, 15000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isExpanded]);
  
  // 头像 URL 处理
  const avatarUrl = player.avatar || '/images/default-avatar.png?v=new';
  const titleColor = player.titleColor || '#d97706';

  return (
    <div 
      className={`relative flex items-center h-16 rounded-xl shadow-lg cursor-pointer transition-all duration-700 ease-in-out overflow-hidden`}
      style={{ 
        padding: '0.5rem', 
      }}
      onClick={(e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      }}
    >
      {/* 1. 背景层 (Background Layer) - 流光或白边 */}
      <div className={`absolute inset-0 z-0 ${isTurn ? 'bg-white/30 backdrop-blur-md' : 'bg-white/70 backdrop-blur-md'}`}>
         {isTurn && (
             <>
                <div 
                    className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2"
                    style={{
                        background: `conic-gradient(from 0deg, transparent 0%, transparent 40%, ${titleColor} 50%, transparent 60%, transparent 100%)`,
                        animation: 'spin 4s linear infinite'
                    }}
                />
                <style jsx>{`
                    @keyframes spin {
                        from { transform: translate(-50%, -50%) rotate(0deg); }
                        to { transform: translate(-50%, -50%) rotate(360deg); }
                    }
                `}</style>
             </>
         )}
      </div>

      {/* 2. 遮罩背景层 (Mask Background) - 模拟边框内部 */}
      <div className="absolute inset-[2px] bg-white/30 backdrop-blur-md rounded-[10px] z-0 border border-white/40"></div>

      {/* 3. 内容层 (Content) */}
      <div className="relative z-10 flex items-center" style={{ flexDirection: isTop ? 'row' : 'row-reverse' }}>
          {/* 头像容器 */}
          <div className="relative flex-shrink-0">
            <div 
              className={`w-12 h-12 overflow-hidden rounded-full ${isTurn ? 'shadow-[0_0_15px_3px_rgba(220,38,38,0.8)] ring-2 ring-red-500 animate-pulse' : 'border-2 border-gray-100 shadow-sm'}`}
              style={{
                transition: 'all 0.7s ease-in-out',
              }}
            >
              <img 
                src={avatarUrl} 
                alt={player.nickname || 'Player'} 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* 玩家名字 - 只在展开时显示 */}
          <div 
            className={`flex flex-col ${isTop ? 'items-start' : 'items-end'} transition-all duration-700 ease-in-out overflow-hidden`}
            style={{
                maxWidth: isExpanded ? '200px' : '0px',
                opacity: isExpanded ? 1 : 0,
                // 使用 margin 代替 gap 以实现平滑过渡
                marginLeft: isTop ? (isExpanded ? '0.75rem' : '0px') : '0px',
                marginRight: !isTop ? (isExpanded ? '0.75rem' : '0px') : '0px',
            }}
          >
            <div className={`flex flex-col ${isTop ? 'items-start' : 'items-end'} px-2`}>
                <span className="text-black text-sm tracking-wide whitespace-nowrap">
                {player.nickname || '等待加入...'}
                </span>
                {/* 称号 (可选) */}
                {player.title && (
                <span className="text-xs mt-0.5 whitespace-nowrap" style={{ color: titleColor }}>
                    {player.title}
                </span>
                )}
            </div>
          </div>
      </div>
    </div>
  );
};

// 棋子类型定义
interface ChessPiece {
  type: 'rook' | 'knight' | 'bishop' | 'guard' | 'king' | 'cannon' | 'pawn';
  color: 'red' | 'black';
  row: number;
  col: number;
}

// 字符到棋子类型的映射
const CHAR_TO_PIECE: Record<string, { type: ChessPiece['type'], color: ChessPiece['color'] }> = {
  'R': { type: 'rook', color: 'red' },
  'N': { type: 'knight', color: 'red' },
  'B': { type: 'bishop', color: 'red' },
  'A': { type: 'guard', color: 'red' },
  'K': { type: 'king', color: 'red' },
  'C': { type: 'cannon', color: 'red' },
  'P': { type: 'pawn', color: 'red' },
  'r': { type: 'rook', color: 'black' },
  'n': { type: 'knight', color: 'black' },
  'b': { type: 'bishop', color: 'black' },
  'a': { type: 'guard', color: 'black' },
  'k': { type: 'king', color: 'black' },
  'c': { type: 'cannon', color: 'black' },
  'p': { type: 'pawn', color: 'black' },
};

interface ChineseChessDisplayProps {
  tableClient: any;
  isMyTable: boolean;
  onLeaveTable: () => void;
}

/**
 * 中国象棋游戏显示组件 - 简化版
 */
function ChineseChessDisplay({ tableClient, isMyTable, onLeaveTable }: ChineseChessDisplayProps) {
  console.log('[ChineseChessDisplay] Component mounted, isMyTable:', isMyTable);
  
  // 使用全局对话框服务
  const { showError } = useSystemDialog();
  
  // 使用 tableClient 保存的选中状态初始化，防止组件重挂载导致状态丢失
  const [selectedPiece, setSelectedPieceState] = useState<{ row: number; col: number } | null>(
    () => (tableClient as any).getSelectedPiece?.() || null
  );

  // 跟踪上次播放的音效时间，防止重复播放
  // 支持的音效类型：'select'（选中）、'eat'（吃子）、'win'（胜利）、'lose'（失败）
  const lastAudioTimeRef = useRef<{ [key: string]: number }>({ select: 0, eat: 0, win: 0, lose: 0 });

  // 包装 setSelectedPiece，同步更新到 tableClient
  const setSelectedPiece = (piece: { row: number; col: number } | null) => {
    setSelectedPieceState(piece);
    if (tableClient && typeof (tableClient as any).setSelectedPiece === 'function') {
      (tableClient as any).setSelectedPiece(piece);
    }
  };

  // 处理开始/准备
  const handleStart = () => {
    console.log('[ChineseChessDisplay] User clicked Start/Ready');
    if (tableClient) {
        // 优先使用 sendReady 方法
        if (typeof (tableClient as any).sendReady === 'function') {
            console.log('[ChineseChessDisplay] Calling tableClient.sendReady(true)');
            (tableClient as any).sendReady(true);
        } 
        // 其次尝试 setReady 方法 (GameTableClient 基类方法)
        else if (typeof (tableClient as any).setReady === 'function') {
            console.log('[ChineseChessDisplay] Calling tableClient.setReady(true)');
            (tableClient as any).setReady(true);
        }
        // 最后尝试直接 socket 发送
        else if ((tableClient as any).socket) {
            console.log('[ChineseChessDisplay] sendReady/setReady not found, using socket.emit player_ready');
            (tableClient as any).socket.emit('player_ready'); // 注意：事件名通常是 player_ready
        }
        playSound('select');
    } else {
        console.error('[ChineseChessDisplay] tableClient is null, cannot start game');
    }
  };

  const [boardData, setBoardData] = useState<(string | null)[][] | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'r' | 'b' | string>('r');
  const [mySide, setMySide] = useState<'r' | 'b' | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [roundResult, setRoundResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [isRoundEnded, setIsRoundEnded] = useState(false);
  const [gameEndStats, setGameEndStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);

  // 资源预加载
  useEffect(() => {
    const preloadResources = async () => {
      const imagesToLoad = [
        '/images/chinesechess/ui/loadPageBackground.png?v=2',
        '/images/chinesechess/ui/woodenPlankBackground.png?v=2',
        '/images/chinesechess/ui/victory.png',
        '/images/chinesechess/ui/defeat.png',
        '/images/chinesechess/buttoms/start.png?v=new',
        '/images/chinesechess/buttoms/undo.png?v=new',
        '/images/chinesechess/buttoms/resign.png?v=new',
        '/images/chinesechess/buttoms/draw.png?v=new',
        '/images/chinesechess/buttoms/exit.png?v=new',
        '/images/chinesechess/select/r_select/r_select.png',
        '/images/chinesechess/select/b_select/b_select.png',
        // 棋子图片
        ...['red', 'black'].flatMap(color => 
          ['rook', 'knight', 'bishop', 'guard', 'king', 'cannon', 'pawn'].map(type => 
            `/images/chinesechess/pieces/${color}/${type}.png`
          )
        )
      ];

      const totalResources = imagesToLoad.length;
      let loadedCount = 0;

      const updateProgress = () => {
        loadedCount++;
        setLoadingProgress(Math.round((loadedCount / totalResources) * 100));
      };

      const loadPromises = imagesToLoad.map(src => {
        return new Promise((resolve, reject) => {
          const img = new window.Image();
          img.src = src;
          img.onload = () => {
            updateProgress();
            resolve(src);
          };
          img.onerror = () => {
            console.warn(`Failed to load image: ${src}`);
            updateProgress(); // 即使失败也算完成，避免卡死
            resolve(src);
          };
        });
      });

      // 至少显示1.5秒加载页，避免闪烁
      const minTimePromise = new Promise(resolve => setTimeout(resolve, 1500));

      try {
        await Promise.all([...loadPromises, minTimePromise]);
      } catch (err) {
        console.error('Resource loading failed:', err);
      } finally {
        setResourcesLoaded(true);
      }
    };

    preloadResources();
  }, []);

  // 监听资源加载和游戏状态，决定何时关闭加载页
  useEffect(() => {
    if (resourcesLoaded && boardData) {
      // 稍微延迟一点点，确保渲染完成
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [resourcesLoaded, boardData]);

  // 更新游戏状态的函数
  const updateGameState = useCallback(() => {
    if (!tableClient) {
      console.warn('[ChineseChessDisplay] updateGameState: tableClient is null');
      return;
    }

    try {
      const newBoardData = tableClient.getBoard?.() || null;
      const newCurrentTurn = tableClient.getTurn?.() || 'r';
      const mySideValue = tableClient.getMySide?.();
      const newMySide = (mySideValue === 'r' || mySideValue === 'b') ? mySideValue : undefined;
      
      const state = tableClient.getState?.();
      const isGamePlaying = state?.status === 'playing';
      setIsPlaying(isGamePlaying);
      setIsRoundEnded(state?.isRoundEnded || false);
      
      // 获取玩家信息
      const currentPlayers = state?.players || [];
      setPlayers(currentPlayers);

      console.log('[ChineseChessDisplay] updateGameState:', { 
        turn: newCurrentTurn, 
        mySide: newMySide, 
        isPlaying: isGamePlaying, 
        isRoundEnded: state?.isRoundEnded,
        boardRows: newBoardData ? newBoardData.length : 'null',
        tableState: state?.status,
        playersCount: currentPlayers.length
      });

      setBoardData(newBoardData);
      setCurrentTurn(newCurrentTurn);
      setMySide(newMySide);
    } catch (err) {
      console.error('[ChineseChessDisplay] Error getting game state:', err);
    }
  }, [tableClient]);

  // 订阅游戏状态变化
  useEffect(() => {
    if (!tableClient) return;

    // 初始化时更新一次
    updateGameState();

    try {
      const unsubscribe = tableClient.onStateChange?.(() => {
        updateGameState();
      });

      // 监听服务器广播的移动事件以播放公开音效（吃子、将军、移动）
      // 注意：选中棋子、胜利、失败的音效是私有的，只在本地播放
      // 吃子、将军、移动音效是公开的，由服务器广播给所有玩家
      const onMoveHandler = (data: any) => {
          console.log('[ChineseChessDisplay] onMove callback triggered:', { 
              captured: data.captured,
              check: data.check,
              mySide, 
              turn: data.turn,
              tableClientId: (tableClient as any).instanceId 
          });
          // 吃子音效是公开的，所有玩家都应该听到
          // 这个事件由服务器广播，所以两个玩家都会接收到
          if (data.captured) {
              console.log('[ChineseChessDisplay] Playing eat sound (public event from server)');
              playSound('eat');
          } else {
              // 调试：如果 captured 为空，但实际上可能发生了吃子？
              // 这里我们信任服务器，但打印日志以防万一
              console.log('[ChineseChessDisplay] No capture detected in move event');
          }
          
          // 处理将军事件（公开音效）
          if (data.check) {
              console.log('[ChineseChessDisplay] Playing check sound (public event from server)');
              playSound('check');
          }
          
          // 处理棋子移动音效（公开音效）
          // 所有玩家都听到移动音效
          console.log('[ChineseChessDisplay] Playing move sound (public event from server)');
          playSound('move');
      };

      if (typeof (tableClient as any).addMoveListener === 'function') {
          console.log(`[ChineseChessDisplay] Registering move listener via addMoveListener to TableClient:${(tableClient as any).instanceId}`);
          (tableClient as any).addMoveListener(onMoveHandler);
      } else if ((tableClient as any).onMove === undefined) {
         console.log('[ChineseChessDisplay] Registering onMove callback (legacy)');
         (tableClient as any).onMove = onMoveHandler;
      } else {
         console.log('[ChineseChessDisplay] onMove callback already registered and addMoveListener not available, skipping');
      }

      // 监听游戏结束事件以播放胜利音效
      const prevGameEnded = (tableClient as any).onGameEnded;
      (tableClient as any).onGameEnded = (data: any) => {
        console.log('[ChineseChessDisplay] onGameEnded callback triggered:', data);
        console.log('[ChineseChessDisplay] Current mySide:', mySide);
        
        // setGameEndStats(data); // 延迟设置，避免在胜负弹窗前显示结算信息
        setIsRoundEnded(true); // 强制设置回合结束状态，确保开始按钮显示
        
        // 延迟播放胜利/失败音效，确保最后一步的音效（吃子/将军）能先播放完
        setTimeout(() => {
          const winner = data?.result?.winner;
          console.log('[ChineseChessDisplay] Processing game result. Winner:', winner, 'MySide:', mySide);

          // 检查是否是己方获胜
          if (winner === mySide) {
            console.log('[ChineseChessDisplay] Playing win sound and showing victory');
            playSound('win');
            setRoundResult('win');
          } else if (winner && winner !== mySide) {
            console.log('[ChineseChessDisplay] Playing lose sound and showing defeat');
            playSound('lose');
            setRoundResult('lose');
          } else {
            console.warn('[ChineseChessDisplay] Winner condition not met or draw?', { winner, mySide });
          }

          // 3秒后自动关闭胜负弹窗
          setTimeout(() => {
              console.log('[ChineseChessDisplay] Clearing round result popup');
              setRoundResult(null);
              setGameEndStats(data); // 胜负弹窗关闭后，再显示结算信息

              // 10秒后自动关闭结算信息
              setTimeout(() => {
                  console.log('[ChineseChessDisplay] Auto clearing game end stats after 10s');
                  setGameEndStats(null);
              }, 10000);
          }, 3000);

        }, 100); // 延迟0.1秒
      };

      // 监听游戏开始事件以清除结果弹窗
      // 尝试多种方式监听游戏开始
      const onGameStartHandler = (data: any) => {
          console.log('[ChineseChessDisplay] Game started, clearing result');
          setRoundResult(null);
          setGameEndStats(null); // Clear stats on new game
          setIsRoundEnded(false); // 回合开始，隐藏开始按钮
      };

      if (typeof (tableClient as any).addGameStartListener === 'function') {
          (tableClient as any).addGameStartListener(onGameStartHandler);
      } else {
          // Fallback: hook into onGameStart property
          const prevGameStart = (tableClient as any).onGameStart;
          (tableClient as any).onGameStart = (data: any) => {
              onGameStartHandler(data);
              if (prevGameStart) prevGameStart(data);
          };
      }

      // 监听加入失败并显示消息
      const prevJoinFailed = (tableClient as any).onJoinFailed;
      (tableClient as any).onJoinFailed = (data: any) => {
        console.log('[ChineseChessDisplay] onJoinFailed callback triggered:', data);
        const msg = data?.message || '加入失败';
        console.log('[ChineseChessDisplay] Showing error dialog:', msg);
        showError('无法入座', msg);
        if (prevJoinFailed) prevJoinFailed(data);
      };

      return () => {
        unsubscribe?.();
        
        if (typeof (tableClient as any).removeMoveListener === 'function') {
            (tableClient as any).removeMoveListener(onMoveHandler);
        } else if ((tableClient as any).onMove === onMoveHandler) {
            (tableClient as any).onMove = undefined;
        }

        (tableClient as any).onGameEnded = prevGameEnded;
        (tableClient as any).onJoinFailed = prevJoinFailed;
      };
    } catch (err) {
      console.error('[ChineseChessDisplay] Error in state subscription:', err);
    }
  }, [tableClient, updateGameState, mySide]);

  // 棋子数据处理
  const pieces = useMemo(() => {
    const result: ChessPiece[] = [];
    if (boardData && boardData.length > 0) {
      try {
        boardData.forEach((row, rowIndex) => {
          row.forEach((char, colIndex) => {
            if (char && CHAR_TO_PIECE[char]) {
              result.push({
                ...CHAR_TO_PIECE[char],
                row: rowIndex,
                col: colIndex
              });
            }
          });
        });
      } catch (err) {
        console.error('[ChineseChessDisplay] Error processing board data:', err);
      }
    }
    return result;
  }, [boardData]);

  // 音频上下文状态
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<{ [key: string]: AudioBuffer }>({});

  // 初始化音频上下文
  useEffect(() => {
    const initAudio = async () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          
          // 预加载音频
          const loadBuffer = async (url: string, key: string) => {
            try {
              const response = await fetch(url);
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
              audioBuffersRef.current[key] = audioBuffer;
              console.log(`[ChineseChessDisplay] Loaded audio: ${key}`);
            } catch (e) {
              console.warn(`[ChineseChessDisplay] Failed to load audio: ${key}`, e);
            }
          };

          await Promise.all([
            loadBuffer('/audio/effects/CHESS_SELECT.mp3', 'select'),
            loadBuffer('/audio/effects/CHESS_EAT.mp3', 'eat'),
            loadBuffer('/audio/effects/CHESS_WIN.mp3', 'win'),
            loadBuffer('/audio/effects/CHESS_DEFEAT.mp3', 'lose'),
            loadBuffer('/audio/effects/jiangjun.mp3', 'check'),
            loadBuffer('/audio/effects/MOVE.WAV', 'move')
          ]);
        }
      } catch (e) {
        console.error('[ChineseChessDisplay] Audio initialization failed:', e);
      }
    };

    initAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // 播放音效
  // 音效分类：
  // - 私有音效（只有己方能听到）：'select'（选中棋子）、'win'（胜利）、'lose'（失败）
  // - 公开音效（双方都能听到）：'eat'（吃子，由服务器广播）、'check'（将军）、'move'（移动）
  const playSound = useCallback((type: 'select' | 'eat' | 'win' | 'lose' | 'check' | 'move') => {
    try {
      const now = Date.now();
      const lastTime = lastAudioTimeRef.current[type] || 0;
      
      // 防止100ms内重复播放同一音效（防止重复触发）
      if (now - lastTime < 100) {
        console.log(`[ChineseChessDisplay] Skipping audio ${type} - played too recently`);
        return;
      }
      
      lastAudioTimeRef.current[type] = now;
      
      // 尝试使用 Web Audio API 播放
      if (audioContextRef.current && audioBuffersRef.current[type]) {
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffersRef.current[type];
        source.connect(audioContextRef.current.destination);
        source.start(0);
        console.log(`[ChineseChessDisplay] Playing ${type} sound via Web Audio API`);
        return;
      }

      // 降级回退到 HTML5 Audio
      let audioPath = '';
      if (type === 'select') {
        audioPath = '/audio/effects/CHESS_SELECT.mp3';
      } else if (type === 'eat') {
        audioPath = '/audio/effects/CHESS_EAT.mp3';
      } else if (type === 'win') {
        audioPath = '/audio/effects/CHESS_WIN.mp3'; 
      } else if (type === 'lose') {
        audioPath = '/audio/effects/CHESS_DEFEAT.mp3';
      } else if (type === 'check') {
        audioPath = '/audio/effects/jiangjun.mp3';
      } else if (type === 'move') {
        audioPath = '/audio/effects/MOVE.WAV';
      }
      
      console.log(`[ChineseChessDisplay] Playing ${type} sound via HTML5 Audio at ${now}`);
      const audio = new Audio(audioPath);
      audio.play().catch(err => console.warn('Audio play failed:', err));
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  }, []);

  // 棋盘点击处理
  const handleBoardClick = (row: number, col: number) => {
    // 尝试解锁 AudioContext
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        console.log('[ChineseChessDisplay] AudioContext resumed on user interaction');
      });
    }

    try {
      console.log(`[BoardClick] Clicked at (${row}, ${col}), Current Turn: ${currentTurn}, My Side: ${mySide}`);
      
      if (row < 0 || row >= 10 || col < 0 || col >= 9) {
        console.warn(`[BoardClick] Click out of bounds: row=${row}, col=${col}`);
        return;
      }

      if (!boardData || !Array.isArray(boardData)) {
        console.warn('[ChineseChessDisplay] Board data not available');
        return;
      }

      const clickedPieceChar = boardData[row]?.[col];
      const isMyTurn = currentTurn === mySide;

      console.log(`[BoardClick] Clicked Piece: ${clickedPieceChar}, Is My Turn: ${isMyTurn}, Selected:`, selectedPiece);
      if (!isMyTurn) {
        console.log(`[BoardClick] NOT my turn: currentTurn=${currentTurn}, mySide=${mySide}`);
      }

      // 点击的是己方棋子
      const clickedPieceInfo = clickedPieceChar ? CHAR_TO_PIECE[clickedPieceChar] : null;
      const isClickedMyPiece = clickedPieceInfo && (
        (mySide === 'r' && clickedPieceInfo.color === 'red') ||
        (mySide === 'b' && clickedPieceInfo.color === 'black')
      );

      if (selectedPiece) {
        // 已有选中的棋子
        
        // 如果点击了同一个棋子，允许重新选择它（不取消）
        if (selectedPiece.row === row && selectedPiece.col === col) {
          console.log('[BoardClick] Clicked same piece again, keeping selection');
          return; // 保持选中状态
        }

        // 如果点击了另一个己方棋子，切换选中
        if (isClickedMyPiece) {
          console.log(`[BoardClick] Switching selection from (${selectedPiece.col},${selectedPiece.row}) to (${col},${row})`);
          setSelectedPiece({ row, col });
          playSound('select'); // 播放选中音效
          return;
        }

        // 尝试移动到目标位置（可能是空地或对方棋子）
        if (isMyTurn) {
          if (tableClient && typeof tableClient.sendMove === 'function') {
            console.log(`[BoardClick] Sending move: (${selectedPiece.col}, ${selectedPiece.row}) -> (${col}, ${row})`);
            try {
              tableClient.sendMove(selectedPiece.col, selectedPiece.row, col, row);
              setSelectedPiece(null);
              // 音效现在由服务器广播的 onMove 事件触发，确保两个玩家同时听到
            } catch (err) {
              console.error('[ChineseChessDisplay] Error sending move:', err);
            }
          } else {
            console.error('[BoardClick] tableClient.sendMove is not a function');
          }
        } else {
          console.warn('[BoardClick] Not my turn, cannot move');
        }
      } else {
        // 没有选中棋子时，尝试选中己方棋子
        if (isClickedMyPiece) {
          console.log(`[BoardClick] Selected piece: (${col},${row})`);
          setSelectedPiece({ row, col });
          playSound('select'); // 播放选中音效
        } else if (clickedPieceChar) {
          console.log('[BoardClick] Clicked opponent piece, cannot select');
        } else {
          console.log(`[BoardClick] Clicked empty cell at (${col},${row})`);
        }
      }
    } catch (error) {
      console.error('[ChineseChessDisplay] Error handling board click:', error);
    }
  };

  // 渲染玩家信息组件
  const renderPlayerInfo = (player: any, isTop: boolean) => {
    if (!player) return <div className="w-16 h-16" />; // 占位符

    // 确定是否轮到该玩家
    const playerIndex = players.findIndex(p => p.userId === player.userId);
    const playerSide = playerIndex === 0 ? 'r' : 'b';
    const isTurn = currentTurn === playerSide;
    
    return (
        <PlayerInfoCard 
            player={player} 
            isTop={isTop} 
            isTurn={isTurn} 
        />
    );
  };

  // 确定上下方玩家
  // 默认：players[0] (红) 在下，players[1] (黑) 在上
  // 如果我是黑方 (mySide === 'b')，则翻转：黑在下，红在上
  let bottomPlayer = players[0]; // 红方
  let topPlayer = players[1];    // 黑方
  
  if (mySide === 'b') {
    bottomPlayer = players[1]; // 黑方
    topPlayer = players[0];    // 红方
  }

  return (
    <div 
      className="w-screen min-h-screen overflow-visible flex flex-col relative"
      style={{
        margin: 0,
        padding: 0,
        minWidth: '100vw',
        backgroundImage: 'url("/images/chinesechess/ui/woodenPlankBackground.png?v=2")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {isLoading && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            zIndex: 20000, // Ensure it covers everything including buttons (z-9999)
            backgroundColor: '#000', // Ensure opaque background
            backgroundImage: 'url("/images/chinesechess/ui/loadPageBackground.png?v=2")',
            backgroundSize: '100% auto',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute bottom-20 w-64 h-2 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full bg-yellow-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="absolute bottom-12 text-yellow-200 font-bold text-lg drop-shadow-md">
            Loading... {loadingProgress}%
          </div>
        </div>
      )}
      
      {boardData && (
        <>
      {/* Background removed to match Game Center style */}

      {/* 顶部玩家信息栏 (绝对定位或作为第一项) */}
      <div className="w-full flex justify-start px-4 py-4" style={{ maxWidth: '500px', margin: '0 auto' }}>
        {renderPlayerInfo(topPlayer, true)}
      </div>

      {/* 棋盘套件容器 */}
      <div 
        className="w-full flex flex-col items-center justify-start"
      >
        <div 
          style={{ 
            width: '90vw', 
            maxWidth: '500px',
            transform: mySide === 'b' ? 'rotate(180deg)' : 'rotate(0deg)',
            position: 'relative'
          }}
        >
          {/* 使用棋盘套件显示棋盘 */}
          <ChessBoardKit
            pieces={pieces}
            selectedPiece={selectedPiece}
            onPieceClick={handleBoardClick}
            isMyTable={isMyTable}
            showGridLines={false}
            showPieces={true}
            mySide={mySide}
          />

          {/* 游戏结束结算弹窗 (移至棋盘容器内) */}
          {roundResult && (
            <div 
              className="absolute inset-0 z-[10000] flex items-center justify-center pointer-events-none"
              style={{ 
                animation: 'fadeIn 0.5s ease-in-out',
                backgroundColor: 'rgba(0,0,0,0.5)', // 仅遮罩棋盘区域
                transform: mySide === 'b' ? 'rotate(180deg)' : 'none', // 如果棋盘翻转了，需要反向翻转回来
                zIndex: 10000 // Ensure high z-index
              }}
            >
              <div className="relative flex flex-col items-center">
                <img 
                  src={roundResult === 'win' ? '/images/chinesechess/ui/victory.png' : '/images/chinesechess/ui/defeat.png'} 
                  alt={roundResult === 'win' ? 'Victory' : 'Defeat'}
                  style={{ 
                    maxWidth: '80%', 
                    maxHeight: '60%', 
                    objectFit: 'contain',
                    animation: 'zoomIn 0.5s ease-out'
                  }}
                />
              </div>
              <style jsx>{`
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes zoomIn {
                  from { transform: scale(0.5); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>

      {/* 底部玩家信息栏 */}
      <div className="w-full flex justify-end px-4 py-4" style={{ maxWidth: '500px', margin: '0 auto' }}>
        {renderPlayerInfo(bottomPlayer, false)}
      </div>

      {/* 游戏操作按钮栏 */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          zIndex: 9999,
          paddingBottom: '20px'
        }}
      >
        {/* 催促 */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src="/images/chinesechess/buttoms/urge.png?v=new"
            alt="催促"
            title="催促"
            style={{ width: '50px', height: '50px', cursor: 'pointer', display: 'block' }}
            onClick={() => console.log('催促')}
          />
        </div>

        {/* 复盘 */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src="/images/chinesechess/buttoms/review.png?v=new"
            alt="复盘"
            title="复盘"
            style={{ width: '50px', height: '50px', cursor: 'pointer', display: 'block' }}
            onClick={() => console.log('复盘')}
          />
        </div>

        {/* 开始 */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: (!isPlaying || roundResult || isRoundEnded) ? 1 : 0.5,
            pointerEvents: (!isPlaying || roundResult || isRoundEnded) ? 'auto' : 'none',
            filter: (!isPlaying || roundResult || isRoundEnded) ? 'none' : 'grayscale(100%)'
          }}
        >
          <img
            src="/images/chinesechess/buttoms/start.png?v=new"
            alt="开始"
            title="开始"
            style={{ width: '50px', height: '50px', cursor: 'pointer', display: 'block' }}
            onClick={handleStart}
          />
        </div>

        {/* 悔棋 */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src="/images/chinesechess/buttoms/undo.png?v=new"
            alt="悔棋"
            title="悔棋"
            style={{ width: '50px', height: '50px', cursor: 'pointer', display: 'block' }}
            onClick={() => console.log('悔棋')}
          />
        </div>

        {/* 认输 */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src="/images/chinesechess/buttoms/resign.png?v=new"
            alt="认输"
            title="认输"
            style={{ width: '50px', height: '50px', cursor: 'pointer', display: 'block' }}
            onClick={() => console.log('认输')}
          />
        </div>

        {/* 讲和 */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src="/images/chinesechess/buttoms/draw.png?v=new"
            alt="讲和"
            title="讲和"
            style={{ width: '50px', height: '50px', cursor: 'pointer', display: 'block' }}
            onClick={() => console.log('讲和')}
          />
        </div>

        {/* 退出 */}
        <div 
          style={{
            display: (isPlaying || roundResult) ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001 // 确保在遮罩层之上
          }}
        >
          <img
            src="/images/chinesechess/buttoms/exit.png?v=new"
            alt="退出"
            title="退出"
            style={{ width: '50px', height: '50px', cursor: 'pointer', display: 'block' }}
            onClick={onLeaveTable}
          />
        </div>
      </div>

      {/* 游戏结束结算弹窗 - 已移动到棋盘容器内 */}


      {/* 回合结算信息 (当胜负弹窗关闭后显示) */}
      {isRoundEnded && gameEndStats && !roundResult && (
          <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-red-100/30 p-4 rounded-lg text-blue-200 text-center z-50 border border-red-200/30 shadow-lg backdrop-blur-md">
              <h3 className="text-lg mb-2 text-blue-100">本局结算</h3>
              {(() => {
                  // 解析 ELO 数据
                  const winnerId = gameEndStats.result?.winnerId;
                  const eloData = gameEndStats.result?.elo;
                  
                  // 找到当前玩家的数据
                  // 如果我是赢家，我是 playerA；如果我是输家，我是 playerB
                  // 注意：这里假设 playerA 总是 winnerId (根据 EloService.processMatchResult 调用顺序)
                  
                  // 查找当前用户的 ID
                  // 我们需要知道当前用户的 ID，但这里只有 mySide ('r' or 'b')
                  // 我们可以通过 players 数组找到自己的 ID
                  const myPlayer = players.find((p, idx) => {
                      const side = idx === 0 ? 'r' : 'b';
                      return side === mySide;
                  });
                  
                  if (!myPlayer || !eloData) return null;
                  
                  const isWinner = myPlayer.userId === winnerId;
                  const myStats = isWinner ? eloData.playerA : eloData.playerB;
                  
                  if (!myStats) return null;

                  const delta = myStats.delta;
                  const newRating = myStats.newRating;
                  
                  return (
                      <div className="flex flex-col gap-1">
                          <div className="text-base text-blue-100">
                              等级分: <span className="text-blue-50">{newRating}</span>
                              <span className={delta >= 0 ? "text-green-500 ml-2" : "text-red-500 ml-2"}>
                                  {delta >= 0 ? `+${delta}` : delta}
                              </span>
                          </div>
                          {/* 如果有称号变化，也可以显示 */}
                          {gameEndStats.result?.title && gameEndStats.result.title[myPlayer.userId] && (
                              <div className="text-sm mt-1 text-blue-200">
                                  当前称号: <span style={{ color: gameEndStats.result.title[myPlayer.userId].color || '#fbbf24' }}>{gameEndStats.result.title[myPlayer.userId].title}</span>
                              </div>
                          )}
                      </div>
                  );
              })()}
              <div className="mt-3 text-xs text-blue-200/80 animate-pulse">
                  请点击下方“开始”继续，或“退出”离开
              </div>
          </div>
      )}
        </>
      )}
    </div>
  );
}

/**
 * 导出中国象棋显示插件
 */
export const ChineseChessDisplayPlugin: GameDisplayPlugin = {
  gameType: 'chinesechess',

  Component: ChineseChessDisplay,

  canHandle: (gameClient: any) => {
    return (
      typeof gameClient?.getBoard === 'function' &&
      typeof gameClient?.getTurn === 'function' &&
      typeof gameClient?.getMySide === 'function' &&
      typeof gameClient?.sendMove === 'function'
    );
  }
};
