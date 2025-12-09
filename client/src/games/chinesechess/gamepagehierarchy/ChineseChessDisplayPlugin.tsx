/**
 * 中国象棋游戏显示插件
 * 简化版本：只显示棋盘
 */

'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import { GameDisplayPlugin } from '@/gamecore/hierarchy/GameDisplayPlugin';
// import { ChessBoard } from '@/games/chinesechess/gamepagehierarchy/ChessBoard';
import { ChessBoardKit } from '@/games/chinesechess/gamepagehierarchy/ChessBoardKit';

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
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const [boardData, setBoardData] = useState<(string | null)[][] | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'r' | 'b' | string>('r');
  const [mySide, setMySide] = useState<'r' | 'b' | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);

  // 更新游戏状态的函数
  const updateGameState = useCallback(() => {
    if (!tableClient) {
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
      return unsubscribe;
    } catch (err) {
      console.error('[ChineseChessDisplay] Error in state subscription:', err);
    }
  }, [tableClient, updateGameState]);

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
  const playSound = useCallback((type: 'select' | 'eat') => {
    try {
      const audioPath = type === 'select' 
        ? '/audio/effects/CHESS_SELECT.mp3' 
        : '/audio/effects/CHESS_EAT.mp3';
      
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
      
      if (row < 0 || row >= 10 || col < 0 || col >= 9) return;

      if (!boardData || !Array.isArray(boardData)) {
        console.warn('[ChineseChessDisplay] Board data not available');
        return;
      }

      const clickedPieceChar = boardData[row]?.[col];
      const isMyTurn = currentTurn === mySide;

      console.log(`[BoardClick] Clicked Piece: ${clickedPieceChar}, Is My Turn: ${isMyTurn}, Selected:`, selectedPiece);

      if (selectedPiece) {
        // 如果点击的是已选中的棋子，取消选中
        if (selectedPiece.row === row && selectedPiece.col === col) {
          setSelectedPiece(null);
          return;
        }

        // 如果点击了另一个棋子
        if (clickedPieceChar) {
          const pieceInfo = CHAR_TO_PIECE[clickedPieceChar];
          if (pieceInfo) {
            const isMyPiece = (mySide === 'r' && pieceInfo.color === 'red') ||
              (mySide === 'b' && pieceInfo.color === 'black');

            // 如果是己方棋子，切换选中
            if (isMyPiece) {
              setSelectedPiece({ row, col });
              playSound('select'); // 播放选中音效
              return;
            }
          }
        }

        // 尝试移动（包括吃子）
        if (isMyTurn) {
          if (tableClient && typeof tableClient.sendMove === 'function') {
            console.log(`[BoardClick] Sending move: (${selectedPiece.col}, ${selectedPiece.row}) -> (${col}, ${row})`);
            try {
              tableClient.sendMove(selectedPiece.col, selectedPiece.row, col, row);
              setSelectedPiece(null);
              // 如果目标位置有子，播放吃子音效（这里只是预测，实际以服务器结果为准，但为了即时反馈可以先播）
              if (clickedPieceChar) {
                 playSound('eat');
              }
            } catch (err) {
              console.error('[ChineseChessDisplay] Error sending move:', err);
            }
          } else {
            console.error('[BoardClick] tableClient.sendMove is not a function');
          }
        } else {
          console.warn('[BoardClick] Not my turn or invalid state');
        }
      } else {
        // 没有选中棋子时，尝试选中
        if (clickedPieceChar) {
          const pieceInfo = CHAR_TO_PIECE[clickedPieceChar];
          if (pieceInfo) {
            const isMyPiece = (mySide === 'r' && pieceInfo.color === 'red') ||
              (mySide === 'b' && pieceInfo.color === 'black');

            if (isMyPiece) {
              setSelectedPiece({ row, col });
              playSound('select'); // 播放选中音效
            } else {
              console.log('[BoardClick] Clicked opponent piece');
            }
          }
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
