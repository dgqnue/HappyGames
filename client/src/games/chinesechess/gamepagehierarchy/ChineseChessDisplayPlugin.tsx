/**
 * 中国象棋游戏显示插件
 * 包含所有中国象棋特定的UI和逻辑
 */

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameDisplayPlugin } from '@/gamecore/hierarchy/GameDisplayPlugin';

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

// 棋盘尺寸配置
const BOARD_WIDTH = 540;
const BOARD_HEIGHT = 600;
const CELL_SIZE = 60;
const PIECE_SIZE = 50;

interface ChineseChessDisplayProps {
  tableClient: any;
  isMyTable: boolean;
  onLeaveTable: () => void;
}

/**
 * 中国象棋游戏显示组件
 */
function ChineseChessDisplay({ tableClient, isMyTable, onLeaveTable }: ChineseChessDisplayProps) {
  console.log('[ChineseChessDisplay] ✅ Component mounted successfully, isMyTable:', isMyTable);
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setTick] = useState(0);

  // 订阅游戏状态变化
  useEffect(() => {
    if (!tableClient) return;

    try {
      const unsubscribe = tableClient.onStateChange?.(() => {
        setTick(t => t + 1);
      });
      return unsubscribe;
    } catch (err) {
      console.error('[ChineseChessDisplay] Error in state subscription:', err);
    }
  }, [tableClient]);

  // 获取游戏状态
  let boardData: (string | null)[][] | null = null;
  let currentTurn: 'r' | 'b' | string = 'r';
  let mySide: 'r' | 'b' | undefined = undefined;
  let gameState: any = null;
  let playerNames: any = { r: '红方', b: '黑方' };

  try {
    if (tableClient) {
      boardData = tableClient.getBoard?.() || null;
      currentTurn = tableClient.getTurn?.() || 'r';
      const mySideValue = tableClient.getMySide?.();
      mySide = (mySideValue === 'r' || mySideValue === 'b') ? mySideValue : undefined;
      gameState = tableClient.getState?.();
      if (!gameState) {
        console.warn('[ChineseChessDisplay] gameState is null/undefined from tableClient.getState()');
        gameState = { winner: null };
      }
      playerNames = gameState.players || { r: '红方', b: '黑方' };
      console.log('[ChineseChessDisplay] Game state loaded:', { boardData: !!boardData, currentTurn, mySide, hasWinner: !!gameState.winner, playerNames });
    } else {
      console.error('[ChineseChessDisplay] tableClient is not provided');
      gameState = { winner: null };
    }
  } catch (err) {
    console.error('[ChineseChessDisplay] Error getting game state:', err);
    gameState = { winner: null };
  }

  // 棋子数据处理（useMemo避免无限循环）
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
            setGameError('移动失败，请重试');
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

  // 绘制棋盘
  useEffect(() => {
    if (!isMyTable || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      if (!boardData || boardData.length === 0) {
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        ctx.fillStyle = '#999';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('游戏初始化中...', BOARD_WIDTH / 2, BOARD_HEIGHT / 2);
        return;
      }

      // 绘制棋盘网格
      ctx.fillStyle = '#DEB887';
      ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2;

      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, BOARD_HEIGHT);
        ctx.stroke();
      }

      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(BOARD_WIDTH, i * CELL_SIZE);
        ctx.stroke();
      }

      // 绘制棋子
      pieces.forEach((piece: ChessPiece) => {
        const x = piece.col * CELL_SIZE + CELL_SIZE / 2;
        const y = piece.row * CELL_SIZE + CELL_SIZE / 2;
        const radius = PIECE_SIZE / 2 - 5;

        ctx.fillStyle = piece.color === 'red' ? '#FF6B6B' : '#4ECDC4';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (selectedPiece && selectedPiece.row === piece.row && selectedPiece.col === piece.col) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3;
          ctx.strokeRect(x - PIECE_SIZE / 2 + 2, y - PIECE_SIZE / 2 + 2, PIECE_SIZE - 4, PIECE_SIZE - 4);
        }

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const typeChar = Object.keys(CHAR_TO_PIECE).find(
          key => CHAR_TO_PIECE[key].type === piece.type && CHAR_TO_PIECE[key].color === piece.color
        ) || '?';
        ctx.fillText(typeChar, x, y);
      });

    } catch (error) {
      console.error('[ChineseChessDisplay] Error drawing board:', error);
    }
  }, [pieces, selectedPiece, boardData, isMyTable]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部导航 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onLeaveTable}
              className="p-3 bg-white rounded-full shadow-md hover:bg-amber-100 transition-colors"
              aria-label="返回并离座"
            >
              <svg className="w-6 h-6 text-amber-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-amber-900">中国象棋对局</h1>
          </div>

          {/* 回合指示器 */}
          <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-amber-100">
            <div className="text-sm text-gray-500">当前回合</div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${currentTurn === 'r' ? 'bg-red-500' : 'bg-gray-700'}`}></div>
              <div className="font-bold text-lg">
                {currentTurn === 'r' ? '🔴 红方' : '⚫ 黑方'} 走棋
              </div>
            </div>
          </div>
        </div>

        {/* 主游戏区域 */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 棋盘区域 */}
            <div className="flex-1">
              <div className="flex flex-col items-center">
                {/* 棋盘容器 */}
                <div className="relative mb-6">
                  <canvas
                    ref={canvasRef}
                    width={BOARD_WIDTH}
                    height={BOARD_HEIGHT}
                    className="border-4 border-amber-800 rounded-lg cursor-pointer shadow-xl"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;

                      const col = Math.floor(x / CELL_SIZE);
                      const row = Math.floor(y / CELL_SIZE);

                      handleBoardClick(row, col);
                    }}
                  />
                </div>

                {/* 操作提示 */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 max-w-md w-full">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">操作提示：</div>
                    <ul className="text-xs space-y-1">
                      <li>• 点击己方棋子选中（蓝色边框）</li>
                      <li>• 再次点击目标位置移动</li>
                      <li>• 只有轮到你时才能移动</li>
                      <li>• 你是：{mySide === 'r' ? '红方 (下方)' : mySide === 'b' ? '黑方 (上方)' : '观众'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 侧边信息栏 */}
            <div className="lg:w-72 space-y-6">
              {/* 红方玩家信息 */}
              <div className={`p-5 rounded-xl border transition-all ${currentTurn === 'r' ? 'bg-red-100 border-red-400 shadow-md' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-lg">
                      红
                    </div>
                    <div>
                      <div className="font-medium text-red-900">{playerNames.r || '等待加入...'}</div>
                      <div className="text-xs text-red-600">红方阵营</div>
                    </div>
                  </div>
                  {mySide === 'r' && (
                    <div className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                      我方
                    </div>
                  )}
                </div>
              </div>

              {/* 黑方玩家信息 */}
              <div className={`p-5 rounded-xl border transition-all ${currentTurn === 'b' ? 'bg-gray-200 border-gray-400 shadow-md' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-lg">
                      黑
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{playerNames.b || '等待加入...'}</div>
                      <div className="text-xs text-gray-600">黑方阵营</div>
                    </div>
                  </div>
                  {mySide === 'b' && (
                    <div className="bg-gray-700 text-white text-xs px-3 py-1 rounded-full font-medium">
                      我方
                    </div>
                  )}
                </div>
              </div>

              {/* 游戏状态 */}
              {gameState?.winner ? (
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-5 rounded-xl border border-amber-200 text-center animate-pulse">
                  <div className="text-3xl mb-3">🏆</div>
                  <div className="font-bold text-amber-900 text-xl mb-1">游戏结束</div>
                  <div className="text-amber-700">
                    {gameState?.winner === 'r' ? '红方' : '黑方'} 获得胜利！
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎮</div>
                    <div className="font-bold text-green-900">对局进行中</div>
                    <div className="text-sm text-green-700 mt-1">
                      等待 {currentTurn === 'r' ? '红方' : '黑方'} 走棋
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部状态栏 */}
        <div className="mt-8 bg-white rounded-xl p-4 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              游戏状态：<span className="font-medium text-green-600">{gameState?.winner ? '已结束' : '进行中'}</span>
            </div>
            <div>
              我的身份：{mySide === 'r' ? '红方' : mySide === 'b' ? '黑方' : '观众'}
            </div>
            <div>
              当前选中：{selectedPiece ? `(${selectedPiece.row}, ${selectedPiece.col})` : '无'}
            </div>
          </div>
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
    console.log('[ChineseChessDisplayPlugin] canHandle() called with:', {
      hasGetBoard: typeof gameClient?.getBoard === 'function',
      hasGetTurn: typeof gameClient?.getTurn === 'function',
      hasMySide: typeof gameClient?.getMySide === 'function',
      hasSendMove: typeof gameClient?.sendMove === 'function',
      keys: Object.keys(gameClient || {}).slice(0, 10)
    });
    
    // 检查gameClient是否有中国象棋特定的方法
    const result = (
      typeof gameClient?.getBoard === 'function' &&
      typeof gameClient?.getTurn === 'function' &&
      typeof gameClient?.getMySide === 'function' &&
      typeof gameClient?.sendMove === 'function'
    );
    console.log('[ChineseChessDisplayPlugin] canHandle() result:', result ? '✅' : '❌');
    return result;
  }
};
