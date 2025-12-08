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

// 棋盘边框配置（需要根据新图片调整）
// 临时使用保守估计，之后根据实际显示效果调整
let BORDER_LEFT_RATIO = 0.095;   // 左边框
let BORDER_RIGHT_RATIO = 0.095;  // 右边框
let BORDER_TOP_RATIO = 0.095;    // 顶部边框
let BORDER_BOTTOM_RATIO = 0.12;  // 底部边框

// 调试函数：用于校准边框比例
const measureBoardImage = () => {
  const img = document.createElement('img');
  img.onload = () => {
    console.log(`[ChessBoard] Board image dimensions: ${img.width}x${img.height}`);
    // 图片加载后，可以根据实际尺寸计算
  };
  img.src = '/images/chinesechess/board/board.png';
};

export function ChessBoard({ pieces, selectedPiece, onPieceClick, isMyTable }: ChessBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(9 / 10); // 默认9:10

  // 加载棋盘图片并获取其实际宽高比
  useEffect(() => {
    const img = document.createElement('img');
    img.onload = () => {
      const ratio = img.width / img.height;
      setImageAspectRatio(ratio);
      console.log(`[ChessBoard] Board image aspect ratio: ${ratio.toFixed(3)} (${img.width}x${img.height})`);
    };
    img.src = '/images/chinesechess/board/board.png';
  }, []);

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

  // 计算实际棋盘区域和单元格尺寸
  const containerWidth = dimensions?.width || 0;
  const containerHeight = containerWidth / imageAspectRatio;
  
  // 使用object-cover，图片会填满整个容器
  const finalImageWidth = containerWidth;
  const finalImageHeight = containerHeight;
  
  // 实际棋盘区域（去掉边框）
  const boardWidth = finalImageWidth * (1 - BORDER_LEFT_RATIO - BORDER_RIGHT_RATIO);
  const boardHeight = finalImageHeight * (1 - BORDER_TOP_RATIO - BORDER_BOTTOM_RATIO);
  
  // 每个格子的宽高
  const cellWidth = boardWidth / BOARD_COLS;
  const cellHeight = boardHeight / BOARD_ROWS;
  
  // 棋盘内容区域的起始位置（相对于容器）
  const boardStartX = finalImageWidth * BORDER_LEFT_RATIO;
  const boardStartY = finalImageHeight * BORDER_TOP_RATIO;

  const handleCellClick = (row: number, col: number) => {
    if (isMyTable) {
      onPieceClick(row, col);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full relative"
      style={{
        maxWidth: '100%',
        padding: 0,
        margin: 0,
        position: 'relative'
      }}
    >
      {dimensions && containerWidth > 0 ? (
        <div
          className="flex items-center justify-center"
          style={{
            width: '100%',
            minHeight: '300px',
            backgroundColor: 'transparent',
            padding: 0,
            margin: 0
          }}
        >
          {/* 棋盘容器 - 根据图片宽高比自动调整大小 */}
          <div
            style={{
              position: 'relative',
              width: `${containerWidth}px`,
              aspectRatio: imageAspectRatio,
              backgroundColor: '#DEB887',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              overflow: 'hidden'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                const col = Math.floor((clickX - boardStartX) / cellWidth);
                const row = Math.floor((clickY - boardStartY) / cellHeight);
                if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
                  handleCellClick(row, col);
                }
              }
            }}
          >
            {/* 棋盘背景图 */}
            <Image
              src="/images/chinesechess/board/board.png"
              alt="棋盘"
              fill
              className="object-cover"
              priority
              unoptimized
              style={{
                zIndex: 1,
                pointerEvents: 'none'
              }}
            />

          {/* 棋子层 */}
          <div style={{ zIndex: 10, position: 'absolute', inset: 0 }}>
            {pieces.map((piece, index) => {
              const isSelected = 
                selectedPiece?.row === piece.row && 
                selectedPiece?.col === piece.col;
              
              const getPieceImagePath = () => {
                return `/images/chinesechess/pieces/${piece.color}/${piece.type}.png`;
              };

              // 棋子尺寸为格子的75%
              const pieceSize = Math.min(cellWidth, cellHeight) * 0.75;
              
              // 棋子在容器中的像素位置（相对于棋盘内容区域的起始点）
              const piecePixelX = boardStartX + (piece.col + 0.5) * cellWidth;
              const piecePixelY = boardStartY + (piece.row + 0.5) * cellHeight;

              return (
                <div
                  key={`piece-${index}`}
                  className={`absolute cursor-pointer transition-all ${
                    isSelected ? 'ring-4 ring-blue-500 scale-110 z-10' : 'hover:scale-105'
                  }`}
                  style={{
                    left: `${piecePixelX}px`,
                    top: `${piecePixelY}px`,
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

          {/* 调试网格 - 显示边框和网格线，帮助校准 */}
          <div style={{ position: 'relative', pointerEvents: 'none', zIndex: 5, display: 'none' }}>
            {/* 边框指示线 */}
            <div style={{
              position: 'absolute',
              left: `${boardStartX}px`,
              top: `${boardStartY}px`,
              width: `${boardWidth}px`,
              height: `${boardHeight}px`,
              border: '2px dashed rgba(255, 0, 0, 0.3)',
            }} />
            
            {/* 网格线 */}
            {Array.from({ length: BOARD_COLS + 1 }).map((_, col) => (
              <div
                key={`vline-${col}`}
                style={{
                  position: 'absolute',
                  left: `${boardStartX + col * cellWidth}px`,
                  top: `${boardStartY}px`,
                  width: '1px',
                  height: `${boardHeight}px`,
                  backgroundColor: 'rgba(0, 255, 0, 0.1)',
                }}
              />
            ))}
            {Array.from({ length: BOARD_ROWS + 1 }).map((_, row) => (
              <div
                key={`hline-${row}`}
                style={{
                  position: 'absolute',
                  left: `${boardStartX}px`,
                  top: `${boardStartY + row * cellHeight}px`,
                  width: `${boardWidth}px`,
                  height: '1px',
                  backgroundColor: 'rgba(0, 255, 0, 0.1)',
                }}
              />
            ))}
            
            {/* 输出调试信息 */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              fontSize: '10px',
              color: 'red',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              padding: '5px',
              fontFamily: 'monospace',
            }}>
              <div>图片:{finalImageWidth.toFixed(0)}x{finalImageHeight.toFixed(0)}</div>
              <div>棋盘:({boardWidth.toFixed(0)}x{boardHeight.toFixed(0)})</div>
              <div>格子:{cellWidth.toFixed(1)}x{cellHeight.toFixed(1)}</div>
            </div>
          </div>

          {/* 选中指示器 */}
          {selectedPiece && (
            <div
              className="absolute border-blue-500 rounded pointer-events-none transition-all"
              style={{
                left: `${boardStartX + selectedPiece.col * cellWidth}px`,
                top: `${boardStartY + selectedPiece.row * cellHeight}px`,
                width: `${cellWidth}px`,
                height: `${cellHeight}px`,
                borderWidth: `${Math.max(2, cellWidth * 0.15)}px`,
              }}
            />
          )}
            </div>
          </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gradient-to-b from-amber-100 to-yellow-100">
          <div className="animate-pulse">加载棋盘...</div>
        </div>
      )}
    </div>
  );
}

