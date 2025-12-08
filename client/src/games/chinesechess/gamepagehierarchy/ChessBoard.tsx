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
const CELL_SIZE = 60;
const PIECE_SIZE = 52;

export function ChessBoard({ pieces, selectedPiece, onPieceClick, isMyTable }: ChessBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(BOARD_COLS * CELL_SIZE);

  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      setBoardWidth(Math.min(width, BOARD_COLS * CELL_SIZE));
    }
  }, []);

  // 创建棋子位置映射，快速查找
  const piecesMap = new Map<string, ChessPiece>();
  pieces.forEach(piece => {
    piecesMap.set(`${piece.row}-${piece.col}`, piece);
  });

  const handleCellClick = (row: number, col: number) => {
    if (isMyTable) {
      onPieceClick(row, col);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex justify-center items-center bg-gradient-to-b from-amber-100 to-yellow-100 rounded-lg shadow-2xl overflow-hidden"
      style={{
        width: '100%',
        aspectRatio: `${BOARD_COLS} / ${BOARD_ROWS}`,
        maxWidth: `${BOARD_COLS * CELL_SIZE}px`,
      }}
    >
      {/* 棋盘底板背景 */}
      <div
        className="relative bg-contain bg-no-repeat bg-center"
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: 'url(/images/chinesechess/board/board.png)',
        }}
      >
        {/* 棋格网格（用于点击检测） */}
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${BOARD_COLS}, 1fr)`, gridTemplateRows: `repeat(${BOARD_ROWS}, 1fr)` }}>
          {Array.from({ length: BOARD_ROWS }).map((_, row) =>
            Array.from({ length: BOARD_COLS }).map((_, col) => (
              <div
                key={`${row}-${col}`}
                className={`relative cursor-pointer hover:bg-blue-200 hover:bg-opacity-20 transition-all ${
                  selectedPiece?.row === row && selectedPiece?.col === col ? 'bg-blue-300 bg-opacity-30' : ''
                }`}
                onClick={() => handleCellClick(row, col)}
              />
            ))
          )}
        </div>

        {/* 棋子层 */}
        <div className="absolute inset-0">
          {pieces.map((piece, index) => {
            const isSelected = selectedPiece?.row === piece.row && selectedPiece?.col === piece.col;
            const getPieceImagePath = () => {
              const pieceName = piece.type;
              return `/images/chinesechess/pieces/${piece.color}/${pieceName}.png`;
            };

            return (
              <div
                key={index}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                  isSelected ? 'ring-4 ring-blue-500 scale-110' : 'hover:scale-105'
                }`}
                style={{
                  left: `${((piece.col + 0.5) / BOARD_COLS) * 100}%`,
                  top: `${((piece.row + 0.5) / BOARD_ROWS) * 100}%`,
                  width: `${(PIECE_SIZE / (BOARD_COLS * CELL_SIZE)) * 100}%`,
                  aspectRatio: '1',
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
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 选中指示器 */}
        {selectedPiece && (
          <div
            className="absolute border-4 border-blue-500 rounded pointer-events-none"
            style={{
              left: `${(selectedPiece.col / BOARD_COLS) * 100}%`,
              top: `${(selectedPiece.row / BOARD_ROWS) * 100}%`,
              width: `${(1 / BOARD_COLS) * 100}%`,
              aspectRatio: '1',
            }}
          />
        )}
      </div>
    </div>
  );
}
