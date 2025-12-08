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

  // 计算动态单元格尺寸
  const cellWidth = dimensions ? dimensions.width / BOARD_COLS : 0;
  const cellHeight = dimensions ? dimensions.height / BOARD_ROWS : 0;

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
        maxWidth: '100%'
      }}
    >
      {dimensions ? (
        <div
          className="relative w-full h-full"
          style={{
            backgroundImage: 'url(/images/chinesechess/board/board.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#DEB887',
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

              // 棋子尺寸为格子的85%
              const pieceSize = Math.min(cellWidth, cellHeight) * 0.85;

              return (
                <div
                  key={`piece-${index}`}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                    isSelected ? 'ring-4 ring-blue-500 scale-110 z-10' : 'hover:scale-105'
                  }`}
                  style={{
                    left: `${((piece.col + 0.5) / BOARD_COLS) * 100}%`,
                    top: `${((piece.row + 0.5) / BOARD_ROWS) * 100}%`,
                    width: `${pieceSize}px`,
                    height: `${pieceSize}px`,
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
              className="absolute border-4 border-blue-500 rounded pointer-events-none transition-all"
              style={{
                left: `${(selectedPiece.col / BOARD_COLS) * 100}%`,
                top: `${(selectedPiece.row / BOARD_ROWS) * 100}%`,
                width: `${(1 / BOARD_COLS) * 100}%`,
                aspectRatio: '1',
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

