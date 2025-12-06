'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface ChessPiece {
  type: 'rook' | 'knight' | 'bishop' | 'guard' | 'king' | 'cannon' | 'pawn';
  color: 'red' | 'black';
  row: number;
  col: number;
}

interface ChineseChessMatchViewProps {
  matchClient: any;
  onBack: () => void;
}

// 初始棋盘配置
const initialBoard: (ChessPiece | null)[][] = Array(10).fill(null).map(() => Array(9).fill(null));

// 初始化红方棋子（下方，第6-9行）
// 红方：车马象士将士象马车
const redPieces: ChessPiece[] = [
  { type: 'rook', color: 'red', row: 9, col: 0 },
  { type: 'knight', color: 'red', row: 9, col: 1 },
  { type: 'bishop', color: 'red', row: 9, col: 2 },
  { type: 'guard', color: 'red', row: 9, col: 3 },
  { type: 'king', color: 'red', row: 9, col: 4 },
  { type: 'guard', color: 'red', row: 9, col: 5 },
  { type: 'bishop', color: 'red', row: 9, col: 6 },
  { type: 'knight', color: 'red', row: 9, col: 7 },
  { type: 'rook', color: 'red', row: 9, col: 8 },
  { type: 'cannon', color: 'red', row: 7, col: 1 },
  { type: 'cannon', color: 'red', row: 7, col: 7 },
  { type: 'pawn', color: 'red', row: 6, col: 0 },
  { type: 'pawn', color: 'red', row: 6, col: 2 },
  { type: 'pawn', color: 'red', row: 6, col: 4 },
  { type: 'pawn', color: 'red', row: 6, col: 6 },
  { type: 'pawn', color: 'red', row: 6, col: 8 },
];

// 初始化黑方棋子（上方，第0-3行）
// 黑方：车马象士将士象马车
const blackPieces: ChessPiece[] = [
  { type: 'rook', color: 'black', row: 0, col: 0 },
  { type: 'knight', color: 'black', row: 0, col: 1 },
  { type: 'bishop', color: 'black', row: 0, col: 2 },
  { type: 'guard', color: 'black', row: 0, col: 3 },
  { type: 'king', color: 'black', row: 0, col: 4 },
  { type: 'guard', color: 'black', row: 0, col: 5 },
  { type: 'bishop', color: 'black', row: 0, col: 6 },
  { type: 'knight', color: 'black', row: 0, col: 7 },
  { type: 'rook', color: 'black', row: 0, col: 8 },
  { type: 'cannon', color: 'black', row: 2, col: 1 },
  { type: 'cannon', color: 'black', row: 2, col: 7 },
  { type: 'pawn', color: 'black', row: 3, col: 0 },
  { type: 'pawn', color: 'black', row: 3, col: 2 },
  { type: 'pawn', color: 'black', row: 3, col: 4 },
  { type: 'pawn', color: 'black', row: 3, col: 6 },
  { type: 'pawn', color: 'black', row: 3, col: 8 },
];

// 初始化棋盘
const initializeBoard = () => {
  const board = [...initialBoard.map(row => [...row])];
  [...redPieces, ...blackPieces].forEach(piece => {
    board[piece.row][piece.col] = piece;
  });
  return board;
};

// 棋子图片映射
const getPieceImage = (piece: ChessPiece) => {
  return `/images/chinesechess/pieces/${piece.color}/${piece.type}.png`;
};

// 棋盘尺寸
const BOARD_WIDTH = 540;
const BOARD_HEIGHT = 600;
const CELL_SIZE = 60;

export function ChineseChessMatchView({ matchClient, onBack }: ChineseChessMatchViewProps) {
  const [board, setBoard] = useState<(ChessPiece | null)[][]>(initializeBoard());
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 处理棋盘点击
  const handleBoardClick = (row: number, col: number) => {
    console.log(`Clicked on row: ${row}, col: ${col}`);
    
    // 如果已经选中了一个棋子
    if (selectedPiece) {
      // 如果是同一个位置，取消选中
      if (selectedPiece.row === row && selectedPiece.col === col) {
        setSelectedPiece(null);
      } else {
        // 尝试移动棋子
        console.log(`Move from (${selectedPiece.row}, ${selectedPiece.col}) to (${row}, ${col})`);
        // TODO: 这里可以添加实际的移动逻辑
        setSelectedPiece(null);
      }
    } else {
      // 如果没有选中棋子，检查当前位置是否有棋子
      const piece = board[row][col];
      if (piece) {
        setSelectedPiece({ row, col });
      }
    }
  };

    // 绘制棋盘和棋子
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    // 绘制棋盘背景
    const boardImage = document.createElement('img');
    boardImage.src = '/images/chinesechess/board/board.png';
    
    boardImage.onload = () => {
      // 绘制棋盘
      ctx.drawImage(boardImage, 0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      // 绘制棋子
      board.forEach((row, rowIndex) => {
        row.forEach((piece, colIndex) => {
          if (piece) {
            const pieceImage = document.createElement('img');
            pieceImage.src = getPieceImage(piece);
            
            pieceImage.onload = () => {
              // 计算棋子位置（居中对齐）
              const x = colIndex * CELL_SIZE + (CELL_SIZE - 50) / 2;
              const y = rowIndex * CELL_SIZE + (CELL_SIZE - 50) / 2;
              
              // 绘制棋子
              ctx.drawImage(pieceImage, x, y, 50, 50);
              
              // 如果棋子被选中，绘制选中效果
              if (selectedPiece && selectedPiece.row === rowIndex && selectedPiece.col === colIndex) {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 3;
                ctx.strokeRect(x - 2, y - 2, 54, 54);
              }
            };
          }
        });
      });
    };
  }, [board, selectedPiece]);

  // 处理返回/退出操作
  const handleBack = () => {
    console.log('[ChineseChessMatchView] 点击退出按钮，执行离座操作');
    
    // 调用上层传递的返回回调，该回调会触发 roomClient.deselectTable()
    // 进而调用 tableClient.leaveTable() 从游戏桌离座
    console.log('[ChineseChessMatchView] 调用 onBack() 触发离座流程');
    onBack();
  };

  // 获取当前回合信息
  const state = matchClient?.getState?.() || {};
  const currentTurn = state.turn || 'r';
  const playerNames = state.players || { r: '红方', b: '黑方' };

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部导航 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
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
                      
                      if (col >= 0 && col < 9 && row >= 0 && row < 10) {
                        handleBoardClick(row, col);
                      }
                    }}
                  />
                </div>

                {/* 操作提示 */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 max-w-md">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">操作提示：</div>
                    <ul className="text-xs space-y-1">
                      <li>• 点击棋子选中（蓝色边框）</li>
                      <li>• 再次点击目标位置移动</li>
                      <li>• 轮到你时才能移动己方棋子</li>
                      <li>• 点击已选中的棋子可取消选择</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 侧边信息栏 */}
            <div className="lg:w-72 space-y-6">
              {/* 红方玩家信息 */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 p-5 rounded-xl border border-red-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-lg">
                      红
                    </div>
                    <div>
                      <div className="font-medium text-red-900">{playerNames.r || '红方玩家'}</div>
                      <div className="text-xs text-red-600">下方阵营</div>
                    </div>
                  </div>
                  {state.mySide === 'r' && (
                    <div className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                      我方
                    </div>
                  )}
                </div>
                <div className="text-sm text-red-700">
                  剩余棋子：{redPieces.length} 枚
                </div>
              </div>

              {/* 黑方玩家信息 */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-lg">
                      黑
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{playerNames.b || '黑方玩家'}</div>
                      <div className="text-xs text-gray-600">上方阵营</div>
                    </div>
                  </div>
                  {state.mySide === 'b' && (
                    <div className="bg-gray-700 text-white text-xs px-3 py-1 rounded-full font-medium">
                      我方
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-700">
                  剩余棋子：{blackPieces.length} 枚
                </div>
              </div>

              {/* 游戏状态 */}
              {state.winner ? (
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-5 rounded-xl border border-amber-200 text-center">
                  <div className="text-3xl mb-3">🏆</div>
                  <div className="font-bold text-amber-900 text-xl mb-1">游戏结束</div>
                  <div className="text-amber-700">
                    {state.winner === 'r' ? '红方' : '黑方'} 获得胜利！
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

              {/* 棋子说明 */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
                <div className="text-sm text-purple-800">
                  <div className="font-medium mb-2">棋子说明：</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                      <span>红方</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-gray-700 rounded-sm"></div>
                      <span>黑方</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部状态栏 */}
        <div className="mt-8 bg-white rounded-xl p-4 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              游戏状态：<span className="font-medium text-green-600">进行中</span>
            </div>
            <div>
              棋盘尺寸：{BOARD_WIDTH} × {BOARD_HEIGHT}
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
