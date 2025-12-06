'use client';

import { useEffect, useRef, useState } from 'react';
import { ChineseChessMatchClient } from './ChineseChessMatchClient';

interface ChineseChessMatchViewProps {
  matchClient: ChineseChessMatchClient;
  onBack: () => void;
}

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
const PIECE_SIZE = 50; // 棋子绘制大小

export default function ChineseChessMatchView({ matchClient, onBack }: ChineseChessMatchViewProps) {
  // 强制刷新状态
  const [, setTick] = useState(0);
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 订阅游戏状态变化
  useEffect(() => {
    const unsubscribe = matchClient.onStateChange(() => {
      setTick(t => t + 1);
    });
    return unsubscribe;
  }, [matchClient]);

  // 获取当前游戏状态
  const boardData = matchClient.getBoard(); // (string | null)[][]
  const currentTurn = matchClient.getTurn();
  const mySide = matchClient.getMySide();
  const state = matchClient.getState();
  const playerNames = state.players || { r: '红方', b: '黑方' };

  // 将字符串棋盘转换为对象数组以便渲染
  const pieces: ChessPiece[] = [];
  if (boardData && boardData.length > 0) {
    boardData.forEach((row, rowIndex) => {
      row.forEach((char, colIndex) => {
        if (char && CHAR_TO_PIECE[char]) {
          pieces.push({
            ...CHAR_TO_PIECE[char],
            row: rowIndex,
            col: colIndex
          });
        }
      });
    });
  }

  // 棋子图片路径获取
  const getPieceImage = (piece: ChessPiece) => {
    return `/images/chinesechess/pieces/${piece.color}/${piece.type}.png`;
  };

  // 处理棋盘点击
  const handleBoardClick = (row: number, col: number) => {
    // 检查是否在棋盘范围内
    if (row < 0 || row >= 10 || col < 0 || col >= 9) return;

    const clickedPieceChar = boardData[row]?.[col];
    const isMyTurn = currentTurn === mySide;

    console.log(`Clicked: (${row}, ${col}), Char: ${clickedPieceChar}, MySide: ${mySide}, Turn: ${currentTurn}`);

    // 如果已经选中了一个棋子
    if (selectedPiece) {
      // 如果点击的是同一个位置，取消选中
      if (selectedPiece.row === row && selectedPiece.col === col) {
        setSelectedPiece(null);
        return;
      }

      // 如果点击的是己方棋子，切换选中
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

      // 尝试移动 (如果是我的回合)
      if (isMyTurn) {
        console.log(`Attempting move from (${selectedPiece.row}, ${selectedPiece.col}) to (${row}, ${col})`);
        matchClient.sendMove(selectedPiece.col, selectedPiece.row, col, row);
        setSelectedPiece(null);
      }
    } else {
      // 如果没有选中棋子，且点击了己方棋子，则选中
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
    const boardImage = new Image();
    boardImage.src = '/images/chinesechess/board/board.png';

    boardImage.onload = () => {
      // 绘制棋盘
      ctx.drawImage(boardImage, 0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      // 绘制棋子
      pieces.forEach((piece) => {
        const pieceImage = new Image();
        pieceImage.src = getPieceImage(piece);

        pieceImage.onload = () => {
          // 计算棋子位置（居中对齐）
          const x = piece.col * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2;
          const y = piece.row * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2;

          // 绘制棋子
          ctx.drawImage(pieceImage, x, y, PIECE_SIZE, PIECE_SIZE);

          // 如果棋子被选中，绘制选中效果
          if (selectedPiece && selectedPiece.row === piece.row && selectedPiece.col === piece.col) {
            ctx.strokeStyle = '#3b82f6'; // 蓝色高亮
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 2, y - 2, PIECE_SIZE + 4, PIECE_SIZE + 4);
          }
        };
      });
    };

    // 如果 boardImage 已经缓存，onload 可能不会触发，所以需要处理 complete
    if (boardImage.complete) {
      boardImage.onload(new Event('load'));
    }

  }, [pieces, selectedPiece]); // 依赖 pieces (由 boardData 派生) 和 selectedPiece

  // 处理返回/退出操作
  const handleBack = () => {
    console.log('[ChineseChessMatchView] 点击退出按钮，执行离座操作');
    onBack();
  };

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
              {state.winner ? (
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-5 rounded-xl border border-amber-200 text-center animate-pulse">
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
            </div>
          </div>
        </div>

        {/* 底部状态栏 */}
        <div className="mt-8 bg-white rounded-xl p-4 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              游戏状态：<span className="font-medium text-green-600">{state.winner ? '已结束' : '进行中'}</span>
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
