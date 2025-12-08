/**
 * 中国象棋游戏显示插件
 * 简化版本：只显示棋盘
 */

'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { GameDisplayPlugin } from '@/gamecore/hierarchy/GameDisplayPlugin';
import { ChessBoard } from '@/games/chinesechess/gamepagehierarchy/ChessBoard';

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

  // 棋盘点击处理
  const handleBoardClick = (row: number, col: number) => {
    try {
      if (row < 0 || row >= 10 || col < 0 || col >= 9) return;

      if (!boardData || !Array.isArray(boardData)) {
        console.warn('[ChineseChessDisplay] Board data not available');
        return;
      }

      const clickedPieceChar = boardData[row]?.[col];
      const isMyTurn = currentTurn === mySide;

      if (selectedPiece) {
        if (selectedPiece.row === row && selectedPiece.col === col) {
          setSelectedPiece(null);
          return;
        }

        if (clickedPieceChar) {
          const pieceInfo = CHAR_TO_PIECE[clickedPieceChar];
          if (pieceInfo) {
            const isMyPiece = (mySide === 'r' && pieceInfo.color === 'red') ||
              (mySide === 'b' && pieceInfo.color === 'black');

            if (isMyPiece) {
              setSelectedPiece({ row, col });
              return;
            }
          }
        }

        if (isMyTurn && tableClient && typeof tableClient.sendMove === 'function') {
          try {
            tableClient.sendMove(selectedPiece.col, selectedPiece.row, col, row);
            setSelectedPiece(null);
          } catch (err) {
            console.error('[ChineseChessDisplay] Error sending move:', err);
          }
        }
      } else {
        if (clickedPieceChar) {
          const pieceInfo = CHAR_TO_PIECE[clickedPieceChar];
          if (pieceInfo) {
            const isMyPiece = (mySide === 'r' && pieceInfo.color === 'red') ||
              (mySide === 'b' && pieceInfo.color === 'black');

            if (isMyPiece) {
              setSelectedPiece({ row, col });
            }
          }
        }
      }
    } catch (error) {
      console.error('[ChineseChessDisplay] Error handling board click:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 p-4 flex items-center justify-center">
      <div className="w-full max-w-md flex flex-col items-center gap-4">
        <button
          onClick={onLeaveTable}
          className="p-2 bg-white rounded-full shadow-md hover:bg-amber-100 transition-colors"
          aria-label="返回并离座"
        >
          <svg className="w-6 h-6 text-amber-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        
        <div className="w-full bg-white rounded-lg shadow-lg border-4 border-orange-500 p-0 overflow-hidden">
          <ChessBoard 
            pieces={pieces}
            selectedPiece={selectedPiece}
            onPieceClick={handleBoardClick}
            isMyTable={isMyTable}
          />
        </div>
      </div>
    </main>
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
