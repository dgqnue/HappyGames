/**
 * 中国象棋棋盘套件组件
 * 
 * 功能说明：
 * - 集成棋盘、容器、网格线、棋子为一个完整组件
 * - 以棋盘为基础，严格固定所有元素的相对位置和比例
 * - 无论棋盘位置和大小如何变化，都保持显示的一致性
 * - 所有坐标和尺寸计算都基于棋盘的内部尺寸
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/**
 * 棋子接口定义
 */
interface ChessPiece {
  type: 'rook' | 'knight' | 'bishop' | 'guard' | 'king' | 'cannon' | 'pawn';
  color: 'red' | 'black';
  row: number;
  col: number;
}

/**
 * 棋盘套件组件Props接口
 */
interface ChessBoardKitProps {
  pieces: ChessPiece[];
  selectedPiece: { row: number; col: number } | null;
  onPieceClick: (row: number, col: number) => void;
  isMyTable: boolean;
  showGridLines?: boolean; // 是否显示网格线
  showPieces?: boolean;    // 是否显示棋子
}

// ======================== 常量定义 ========================

/** 棋子类型与中文名称的映射 */
const PIECE_NAMES: Record<string, string> = {
  'rook': '车',
  'knight': '马',
  'bishop': '象',
  'guard': '士',
  'king': '将',
  'cannon': '炮',
  'pawn': '兵',
};

/** 棋盘列数 */
const BOARD_COLS = 8;

/** 棋盘行数 */
const BOARD_ROWS = 9;

/**
 * 棋盘边框比例（相对于背景图）
 */
const BORDER_LEFT_RATIO = 0.055;
const BORDER_RIGHT_RATIO = 0.055;
const BORDER_TOP_RATIO = 0.055;
const BORDER_BOTTOM_RATIO = 0.08;

/**
 * 棋盘偏移量（像素，用于精细调整）
 */
const OFFSET_X = -4.5;  // X方向总偏移
const OFFSET_Y = -5.5;  // Y方向总偏移

/**
 * 棋格尺寸增加量（像素）
 */
const CELL_WIDTH_EXTRA = 0.9;   // 每个棋格额外宽度
const CELL_HEIGHT_EXTRA = 2.4;  // 每个棋格额外高度

/**
 * 棋子显示尺寸比例
 */
const PIECE_SIZE_RATIO = 0.9;  // 相对于棋格的90%

export function ChessBoardKit({
  pieces,
  selectedPiece,
  onPieceClick,
  isMyTable,
  showGridLines = false,
  showPieces = true
}: ChessBoardKitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(9 / 10);

  // 加载棋盘图片并获取宽高比
  useEffect(() => {
    const img = document.createElement('img');
    img.onload = () => {
      const ratio = img.width / img.height;
      setImageAspectRatio(ratio);
      console.log(`[ChessBoardKit] 棋盘图片宽高比: ${ratio.toFixed(3)}`);
    };
    img.src = '/images/chinesechess/board/board.png';
  }, []);

  // 监听容器尺寸变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      setDimensions({ width, height });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // ======================== 尺寸计算（所有计算都基于棋盘大小） ========================

  const containerWidth = dimensions?.width || 0;
  const containerHeight = containerWidth / imageAspectRatio;

  // 棋盘的实际游戏区域
  const boardWidth = containerWidth * (1 - BORDER_LEFT_RATIO - BORDER_RIGHT_RATIO);
  const boardHeight = containerHeight * (1 - BORDER_TOP_RATIO - BORDER_BOTTOM_RATIO);

  // 棋格尺寸（包含增加量）
  const cellWidth = boardWidth / BOARD_COLS + CELL_WIDTH_EXTRA;
  const cellHeight = boardHeight / BOARD_ROWS + CELL_HEIGHT_EXTRA;

  // 棋盘起始位置（包含偏移量）
  const boardStartX = containerWidth * BORDER_LEFT_RATIO + OFFSET_X;
  const boardStartY = containerHeight * BORDER_TOP_RATIO + OFFSET_Y;

  // 棋子尺寸
  const pieceSize = Math.min(cellWidth, cellHeight) * PIECE_SIZE_RATIO;

  // 处理棋格点击
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
          {/* ======================== 棋盘套件主容器 ======================== */}
          {/* 
            所有元素（背景图、网格线、棋子、高亮框）都在此容器内
            相对位置和比例严格固定，不受外部影响
          */}
          <div
            style={{
              position: 'relative',
              width: `${containerWidth}px`,
              aspectRatio: imageAspectRatio,
              backgroundColor: '#DEB887',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              overflow: 'hidden',
              border: '2px solid transparent',
              boxSizing: 'border-box'
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
            {/* 棋盘背景图层 */}
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

            {/* 棋子渲染层 */}
            {showPieces && (
              <div style={{ zIndex: 10, position: 'absolute', inset: 0 }}>
                {pieces.map((piece, index) => {
                  const isSelected = 
                    selectedPiece?.row === piece.row && 
                    selectedPiece?.col === piece.col;

                  const getPieceImagePath = () => {
                    return `/images/chinesechess/pieces/${piece.color}/${piece.type}.png`;
                  };

                  const piecePixelX = boardStartX + piece.col * cellWidth;
                  const piecePixelY = boardStartY + piece.row * cellHeight;

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
            )}

            {/* 网格线层 */}
            {showGridLines && (
              <div style={{ position: 'relative', pointerEvents: 'none', zIndex: 5 }}>
                {/* 竖线 - 高度根据减小后的棋格调整 */}
                {Array.from({ length: BOARD_COLS + 1 }).map((_, col) => (
                  <div
                    key={`vline-${col}`}
                    style={{
                      position: 'absolute',
                      left: `${boardStartX + col * cellWidth}px`,
                      top: `${boardStartY}px`,
                      width: '1px',
                      height: `${boardHeight + CELL_HEIGHT_EXTRA * BOARD_ROWS}px`,
                      backgroundColor: 'rgba(0, 200, 0, 0.7)',
                    }}
                  />
                ))}
                {/* 横线 - 宽度根据减小后的棋格调整 */}
                {Array.from({ length: BOARD_ROWS + 1 }).map((_, row) => (
                  <div
                    key={`hline-${row}`}
                    style={{
                      position: 'absolute',
                      left: `${boardStartX}px`,
                      top: `${boardStartY + row * cellHeight}px`,
                      width: `${boardWidth + CELL_WIDTH_EXTRA * BOARD_COLS - 0.2 * BOARD_COLS}px`,
                      height: '1px',
                      backgroundColor: 'rgba(0, 200, 0, 0.7)',
                    }}
                  />
                ))}
              </div>
            )}

            {/* 选中棋子的高亮边框 */}
            {selectedPiece && showPieces && (
              <div
                className="absolute border-blue-500 rounded pointer-events-none transition-all"
                style={{
                  left: `${boardStartX + selectedPiece.col * cellWidth}px`,
                  top: `${boardStartY + selectedPiece.row * cellHeight}px`,
                  width: `${cellWidth}px`,
                  height: `${cellHeight}px`,
                  borderWidth: `${Math.max(2, cellWidth * 0.15)}px`,
                  transform: 'translate(-50%, -50%)',
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

/**
 * ======================== 核心设计说明 ========================
 * 
 * 棋盘套件的核心设计原则：
 * 
 * 1. 以棋盘为基础
 *    - 所有元素都基于棋盘的实际尺寸计算
 *    - 棋盘尺寸由容器宽度和图片宽高比决定
 * 
 * 2. 严格的相对位置关系
 *    - boardStartX, boardStartY: 棋盘左上角位置（固定偏移）
 *    - cellWidth, cellHeight: 棋格尺寸（固定增量）
 *    - pieceSize: 棋子尺寸（固定比例）
 *    - 所有坐标都基于这些基础值计算
 * 
 * 3. 响应式设计
 *    - 容器宽度变化时，所有元素自动等比例缩放
 *    - 所有计算都动态进行，无硬编码尺寸
 * 
 * 4. 常数化配置
 *    - BORDER_*_RATIO: 边框比例
 *    - OFFSET_*: 精细位置调整
 *    - CELL_*_EXTRA: 棋格增加量
 *    - PIECE_SIZE_RATIO: 棋子大小比例
 *    - 修改这些常数就能改变整体显示效果
 * 
 * 5. Props控制显示内容
 *    - showGridLines: 控制网格线显示
 *    - showPieces: 控制棋子显示
 *    - 灵活组合显示不同内容
 * 
 * ================================================================
 */
