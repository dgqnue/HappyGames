'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface ChessPiece {
  type: 'rook' | 'knight' | 'bishop' | 'guard' | 'king' | 'cannon' | 'pawn';
  color: 'red' | 'black';
  row: number;
  col: number;
}

interface ChessBoardProps {
  pieces: ChessPiece[];
  selectedPiece: { row: number; col: number } | null;
  onPieceClick: (row: number, col: number) => void;
  isMyTable: boolean;
}

// 棋子类型中文名称
const PIECE_NAMES: Record<string, string> = {
  'rook': '车',
  'knight': '马',
  'bishop': '象',
  'guard': '士',
  'king': '将',
  'cannon': '炮',
  'pawn': '兵',
};

// 棋盘配置
const BOARD_COLS = 9;
const BOARD_ROWS = 10;

// 棋盘边框配置（基于棋盘图片的实际测量）
// 棋盘图片中，木质边框占用的空间比例
// 通过测量棋盘图片确定：边框大约占图片宽度的9-10%
const BORDER_LEFT_RATIO = 0.095;   // 左边框
const BORDER_RIGHT_RATIO = 0.095;  // 右边框
const BORDER_TOP_RATIO = 0.095;    // 顶部边框
const BORDER_BOTTOM_RATIO = 0.12;  // 底部边框（可能略大）

export function ChessBoard({ pieces, selectedPiece, onPieceClick, isMyTable }: ChessBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // 监听容器尺寸变化，完全自适应
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 初始化尺寸
    const updateDimensions = () => {
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      setDimensions({ width, height });
      console.log(`[ChessBoard] Container dimensions: ${width}x${height}`);
    };

    updateDimensions();

    // 使用ResizeObserver监听容器尺寸变化
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    // 备用：监听window resize
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // 计算实际可用区域和单元格尺寸
  const containerWidth = dimensions?.width || 0;
  const containerHeight = dimensions?.height || 0;
  
  // 实际棋盘区域（去掉边框）
  const boardWidth = containerWidth * (1 - BORDER_LEFT_RATIO - BORDER_RIGHT_RATIO);
  const boardHeight = containerHeight * (1 - BORDER_TOP_RATIO - BORDER_BOTTOM_RATIO);
  
  // 每个格子的宽高
  const cellWidth = boardWidth / BOARD_COLS;
  const cellHeight = boardHeight / BOARD_ROWS;
  
  // 棋盘内容区域的起始位置
  const offsetLeft = containerWidth * BORDER_LEFT_RATIO;
  const offsetTop = containerHeight * BORDER_TOP_RATIO;

  const handleCellClick = (row: number, col: number) => {
    if (isMyTable) {
      onPieceClick(row, col);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{
        aspectRatio: `${BOARD_COLS} / ${BOARD_ROWS}`,
        maxWidth: '100%',
        padding: 0,
        margin: 0
      }}
    >
      {dimensions ? (
        <div
          className="w-full h-full"
          style={{
            backgroundImage: 'url(/images/chinesechess/board/board.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#DEB887',
            padding: 0,
            margin: 0
          }}
        >
          {/* 棋格网格（用于点击检测） */}
          <div 
            className="absolute inset-0 grid" 
            style={{ 
              gridTemplateColumns: `repeat(${BOARD_COLS}, 1fr)`, 
              gridTemplateRows: `repeat(${BOARD_ROWS}, 1fr)` 
            }}
          >
            {Array.from({ length: BOARD_ROWS }).map((_, row) =>
              Array.from({ length: BOARD_COLS }).map((_, col) => (
                <div
                  key={`grid-${row}-${col}`}
                  className={`relative cursor-pointer hover:bg-blue-200 hover:bg-opacity-20 transition-all ${
                    selectedPiece?.row === row && selectedPiece?.col === col 
                      ? 'bg-blue-300 bg-opacity-30' 
                      : ''
                  }`}
                  onClick={() => handleCellClick(row, col)}
                />
              ))
            )}
          </div>

          {/* 棋子层 */}
          <div className="absolute inset-0">
            {pieces.map((piece, index) => {
              const isSelected = 
                selectedPiece?.row === piece.row && 
                selectedPiece?.col === piece.col;
              
              const getPieceImagePath = () => {
                return `/images/chinesechess/pieces/${piece.color}/${piece.type}.png`;
              };

              // 棋子尺寸为格子的75%，确保不超出网格
              const pieceSize = Math.min(cellWidth, cellHeight) * 0.75;
              
              // 计算棋子中心位置
              // 棋子应该放在网格线交叉点上，即每个格子的中心
              const pieceX = offsetLeft + (piece.col + 0.5) * cellWidth;
              const pieceY = offsetTop + (piece.row + 0.5) * cellHeight;

              console.log(`[ChessBoard] Piece ${piece.type} at (${piece.row},${piece.col}) -> pixel (${pieceX.toFixed(1)}, ${pieceY.toFixed(1)})`);

              return (
                <div
                  key={`piece-${index}`}
                  className={`absolute cursor-pointer transition-all ${
                    isSelected ? 'ring-4 ring-blue-500 scale-110 z-10' : 'hover:scale-105'
                  }`}
                  style={{
                    left: `${pieceX}px`,
                    top: `${pieceY}px`,
                    width: `${pieceSize}px`,
                    height: `${pieceSize}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => handleCellClick(piece.row, piece.col)}
                  title={`${piece.color === 'red' ? '红' : '黑'}${PIECE_NAMES[piece.type]}`}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={getPieceImagePath()}
                      alt={`${piece.color}-${piece.type}`}
                      fill
                      className="object-contain drop-shadow-lg"
                      priority={false}
                      sizes={`${pieceSize}px`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 选中指示器 */}
          {selectedPiece && (
            <div
              className="absolute border-blue-500 rounded pointer-events-none transition-all"
              style={{
                left: `${offsetLeft + selectedPiece.col * cellWidth}px`,
                top: `${offsetTop + selectedPiece.row * cellHeight}px`,
                width: `${cellWidth}px`,
                height: `${cellHeight}px`,
                borderWidth: `${Math.max(2, cellWidth * 0.15)}px`,
              }}
            />
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gradient-to-b from-amber-100 to-yellow-100">
          <div className="animate-pulse">加载棋盘...</div>
        </div>
      )}
    </div>
  );
}

