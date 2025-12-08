/**
 * 中国象棋游戏显示插件
 * 包含所有中国象棋特定的UI和逻辑
 */

'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { GameDisplayPlugin } from '@/gamecore/hierarchy/GameDisplayPlugin';
import { ChessBoard } from './ChessBoard';

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
 * 中国象棋游戏显示组件
 */
function ChineseChessDisplay({ tableClient, isMyTable, onLeaveTable }: ChineseChessDisplayProps) {
  console.log('[ChineseChessDisplay] ✅ Component mounted successfully, isMyTable:', isMyTable);
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [boardData, setBoardData] = useState<(string | null)[][] | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'r' | 'b' | string>('r');
  const [mySide, setMySide] = useState<'r' | 'b' | undefined>(undefined);
  const [gameState, setGameState] = useState<any>({ winner: null });
  const [playerNames, setPlayerNames] = useState<any>({ r: '红方', b: '黑方' });

  // 更新游戏状态的函数
  const updateGameState = useCallback(() => {
    if (!tableClient) {
      setGameState({ winner: null });
      return;
    }

    try {
      const newBoardData = tableClient.getBoard?.() || null;
      const newCurrentTurn = tableClient.getTurn?.() || 'r';
      const mySideValue = tableClient.getMySide?.();
      const newMySide = (mySideValue === 'r' || mySideValue === 'b') ? mySideValue : undefined;
      let newGameState = tableClient.getState?.();
      
      if (!newGameState) {
        console.warn('[ChineseChessDisplay] gameState is null/undefined from tableClient.getState()');
        newGameState = { winner: null };
      }
      
      const newPlayerNames = newGameState.players || { r: '红方', b: '黑方' };
      
      console.log('[ChineseChessDisplay] Game state loaded:', { 
        boardData: !!newBoardData, 
        currentTurn: newCurrentTurn, 
        mySide: newMySide, 
        hasWinner: !!newGameState.winner, 
        playerNames: newPlayerNames 
      });

      // 更新所有状态
      setBoardData(newBoardData);
      setCurrentTurn(newCurrentTurn);
      setMySide(newMySide);
      setGameState(newGameState);
      setPlayerNames(newPlayerNames);
    } catch (err) {
      console.error('[ChineseChessDisplay] Error getting game state:', err);
      setGameState({ winner: null });
    }
  }, [tableClient]);

  // 订阅游戏状态变化
  useEffect(() => {
    if (!tableClient) return;

    // 初始化时更新一次
    updateGameState();

    try {
      const unsubscribe = tableClient.onStateChange?.(() => {
        // 游戏状态改变时更新
        updateGameState();
      });
      return unsubscribe;
    } catch (err) {
      console.error('[ChineseChessDisplay] Error in state subscription:', err);
    }
  }, [tableClient]);

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
                <div className="w-full mb-6">
                  <ChessBoard 
                    pieces={pieces}
                    selectedPiece={selectedPiece}
                    onPieceClick={handleBoardClick}
                    isMyTable={isMyTable}
                  />
                </div>

                {/* 操作提示 */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 max-w-md w-full">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">操作提示：</div>
                    <ul className="text-xs space-y-1">
                      <li>• 点击己方棋子选中（高亮显示）</li>
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

              {/* 错误提示 */}
              {gameError && (
                <div className="bg-red-100 border border-red-400 p-4 rounded-xl text-red-800 text-sm">
                  {gameError}
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
              当前选中：{selectedPiece ? `(行${selectedPiece.row} 列${selectedPiece.col})` : '无'}
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
