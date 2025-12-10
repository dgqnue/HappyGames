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

  const [boardData, setBoardData] = useState<(string | null)[][] | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'r' | 'b' | string>('r');
  const [mySide, setMySide] = useState<'r' | 'b' | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);

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

      console.log('[ChineseChessDisplay] updateGameState:', { 
        turn: newCurrentTurn, 
        mySide: newMySide, 
        isPlaying: isGamePlaying, 
        boardRows: newBoardData ? newBoardData.length : 'null',
        tableState: state?.status
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

      // 监听服务器广播的移动事件以播放公开音效（吃子）
      // 注意：选中棋子、胜利、失败的音效是私有的，只在本地播放
      // 吃子音效是公开的，由服务器广播给所有玩家
      const onMoveHandler = (data: any) => {
          console.log('[ChineseChessDisplay] onMove callback triggered:', { captured: data.captured });
          // 吃子音效是公开的，所有玩家都应该听到
          // 这个事件由服务器广播，所以两个玩家都会接收到
          if (data.captured) {
              console.log('[ChineseChessDisplay] Playing eat sound (public event from server)');
              playSound('eat');
          }
      };

      if (typeof (tableClient as any).addMoveListener === 'function') {
          console.log('[ChineseChessDisplay] Registering move listener via addMoveListener');
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
        // 检查是否是己方获胜
        if (data?.result?.winner === mySide) {
          console.log('[ChineseChessDisplay] Playing win sound');
          playSound('win');
        }
      };

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

  // 播放音效
  // 音效分类：
  // - 私有音效（只有己方能听到）：'select'（选中棋子）、'win'（胜利）、'lose'（失败）
  // - 公开音效（双方都能听到）：'eat'（吃子，由服务器广播）
  const playSound = useCallback((type: 'select' | 'eat' | 'win' | 'lose') => {
    try {
      const now = Date.now();
      const lastTime = lastAudioTimeRef.current[type] || 0;
      
      // 防止100ms内重复播放同一音效（防止重复触发）
      if (now - lastTime < 100) {
        console.log(`[ChineseChessDisplay] Skipping audio ${type} - played too recently`);
        return;
      }
      
      lastAudioTimeRef.current[type] = now;
      
      let audioPath = '';
      if (type === 'select') {
        audioPath = '/audio/effects/CHESS_SELECT.mp3';
      } else if (type === 'eat') {
        audioPath = '/audio/effects/CHESS_EAT.mp3';
      } else if (type === 'win') {
        audioPath = '/audio/effects/CHESS_WIN.mp3'; // 需要准备这个文件
      } else if (type === 'lose') {
        audioPath = '/audio/effects/CHESS_LOSE.mp3'; // 需要准备这个文件
      }
      
      console.log(`[ChineseChessDisplay] Playing ${type} sound at ${now}`);
      const audio = new Audio(audioPath);
      audio.play().catch(err => console.warn('Audio play failed:', err));
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  }, []);

  // 棋盘点击处理
  const handleBoardClick = (row: number, col: number) => {
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
              // 音效现在由 onMove 事件触发，确保只有在服务器确认移动后才播放
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

  return (
    <div 
      className="w-screen min-h-screen overflow-visible flex flex-col"
      style={{
        position: 'static',
        backgroundImage: 'url(/images/chinesechess/ymbj/ymbg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        margin: 0,
        padding: 0,
        minWidth: '100vw'
      }}
    >
      {/* 棋盘顶部空白占位符 - 实现下移 */}
      <div style={{ height: 'calc(100vh / 6)' }} />

      {/* 棋盘套件容器 */}
      <div 
        className="w-full flex flex-col items-center justify-start"
      >
        <div 
          style={{ 
            width: '90vw', 
            maxWidth: '500px',
            transform: mySide === 'b' ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        >
          {/* 原棋盘组件代码已注释掉，改用棋盘套件 */}
          {/*
          <ChessBoard 
            pieces={pieces}
            selectedPiece={selectedPiece}
            onPieceClick={handleBoardClick}
            isMyTable={isMyTable}
          />
          */}
          
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
        </div>
      </div>

      {/* 游戏操作按钮栏 */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          zIndex: 9999
        }}
      >
        {/* 调试信息栏 */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '5px',
          fontSize: '12px',
          zIndex: 10000,
          pointerEvents: 'none'
        }}>
          <div>Status: {isPlaying ? 'Playing' : 'Not Playing'}</div>
          <div>Turn: {currentTurn === 'r' ? 'Red' : 'Black'}</div>
          <div>My Side: {mySide === 'r' ? 'Red' : (mySide === 'b' ? 'Black' : 'Spectator')}</div>
          <div>Is My Turn: {currentTurn === mySide ? 'Yes' : 'No'}</div>
        </div>

        {/* 催促 */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src="/images/chinesechess/buttoms/urge.png"
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
            src="/images/chinesechess/buttoms/review.png"
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
            justifyContent: 'center'
          }}
        >
          <img
            src="/images/chinesechess/buttoms/start.png"
            alt="开始"
            title="开始"
            style={{ width: '50px', height: '50px', cursor: 'pointer', display: 'block' }}
            onClick={() => console.log('开始')}
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
            src="/images/chinesechess/buttoms/undo.png"
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
            src="/images/chinesechess/buttoms/resign.png"
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
            src="/images/chinesechess/buttoms/draw.png"
            alt="讲和"
            title="讲和"
            style={{ width: '50px', height: '50px', cursor: 'pointer', display: 'block' }}
            onClick={() => console.log('讲和')}
          />
        </div>

        {/* 退出 */}
        <div 
          style={{
            display: isPlaying ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src="/images/chinesechess/buttoms/exit.png"
            alt="退出"
            title="退出"
            style={{ width: '50px', height: '50px', cursor: 'pointer', display: 'block' }}
            onClick={onLeaveTable}
          />
        </div>
      </div>
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
