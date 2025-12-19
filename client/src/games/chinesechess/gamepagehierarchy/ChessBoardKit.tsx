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
  mySide?: 'r' | 'b';      // 玩家阵营（用于棋子旋转补偿）
  lastMove?: { from: { row: number; col: number }; to: { row: number; col: number } } | null; // 对方最后一步棋
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

/** 棋盘列数 (格子数) */
const BOARD_COLS_CELLS = 8;
/** 棋盘行数 (格子数) */
const BOARD_ROWS_CELLS = 9;

/** 棋盘列数 (交叉点数/棋子数) */
const BOARD_COLS_POINTS = 9;
/** 棋盘行数 (交叉点数/棋子数) */
const BOARD_ROWS_POINTS = 10;

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
const CELL_WIDTH_EXTRA = 0.6;   // 每个棋格额外宽度
const CELL_HEIGHT_EXTRA = 2.1;  // 每个棋格额外高度

/**
 * 棋子显示尺寸比例
 */
const PIECE_SIZE_RATIO = 0.93;  // 相对于棋格的93%

export function ChessBoardKit({
  pieces,
  selectedPiece,
  onPieceClick,
  isMyTable,
  showGridLines = false,
  showPieces = true,
  mySide,
  lastMove
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
  const cellWidth = boardWidth / BOARD_COLS_CELLS + CELL_WIDTH_EXTRA;
  const cellHeight = boardHeight / BOARD_ROWS_CELLS + CELL_HEIGHT_EXTRA;

  // 棋盘起始位置（包含偏移量）
  const boardStartX = containerWidth * BORDER_LEFT_RATIO + OFFSET_X;
  const boardStartY = containerHeight * BORDER_TOP_RATIO + OFFSET_Y;

  // 棋子尺寸
  const pieceSize = Math.min(cellWidth, cellHeight) * PIECE_SIZE_RATIO;

  // 处理棋格点击
  const handleCellClick = (row: number, col: number) => {
    if (isMyTable) {
      // 如果我是黑方，且棋盘被旋转了180度，需要转换坐标
      // 视觉上的 (row, col) 对应实际逻辑上的 (9-row, 8-col)
      let actualRow = row;
      let actualCol = col;

      if (mySide === 'b') {
        actualRow = (BOARD_ROWS_POINTS - 1) - row;
        actualCol = (BOARD_COLS_POINTS - 1) - col;
        console.log(`[ChessBoardKit] Coordinate transform (Black): Visual(${row}, ${col}) -> Actual(${actualRow}, ${actualCol})`);
      }

      onPieceClick(actualRow, actualCol);
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
              border: 'none',
              boxSizing: 'border-box'
            }}
            onClick={(e) => {
              // 移除 e.target === e.currentTarget 检查，允许点击穿透子元素（如背景图）
              // 只要是在这个容器内的点击，都计算坐标
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const clickY = e.clientY - rect.top;
              const col = Math.round((clickX - boardStartX) / cellWidth);
              const row = Math.round((clickY - boardStartY) / cellHeight);
              
              // 确保点击在有效范围内
              if (row >= 0 && row < BOARD_ROWS_POINTS && col >= 0 && col < BOARD_COLS_POINTS) {
                handleCellClick(row, col);
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
                  
                  // 判断该棋子是否是对方最后一步棋的目标
                  const isLastMoveTo =
                    lastMove?.to.row === piece.row &&
                    lastMove?.to.col === piece.col;

                  // 确保颜色判断不区分大小写，防止 Windows 文件系统大小写不敏感导致的逻辑错误
                  // 使用 as string 强制转换以避免 TypeScript 检查 'red' | 'black' 与 'r' 的重叠问题
                  const isRed = (piece.color as string).toLowerCase() === 'red' || (piece.color as string) === 'r';
                  const selectImageSrc = `/images/chinesechess/select/${isRed ? 'r' : 'b'}_select/${isRed ? 'r' : 'b'}_select.png`;

                  const getPieceImagePath = () => {
                    return `/images/chinesechess/pieces/${piece.color}/${piece.type}.png`;
                  };

                  const piecePixelX = boardStartX + piece.col * cellWidth;
                  const piecePixelY = boardStartY + piece.row * cellHeight;

                  return (
                    <div
                      key={`piece-${piece.row}-${piece.col}-${piece.color}-${piece.type}`}
                      className={`absolute cursor-pointer outline-none select-none ${
                        isSelected || isLastMoveTo ? 'z-10' : 'hover:scale-105'
                      }`}
                      style={{
                        left: `${piecePixelX}px`,
                        top: `${piecePixelY}px`,
                        width: `${pieceSize}px`,
                        height: `${pieceSize}px`,
                        transform: `translate(-50%, -50%) ${mySide === 'b' ? 'rotate(180deg)' : 'rotate(0deg)'}`,
                        WebkitTapHighlightColor: 'transparent', // 移动端点击高亮去除
                      }}
                      onClick={(e) => {
                        e.stopPropagation(); // 防止冒泡到棋盘容器导致二次触发
                        // 棋子点击直接使用棋子的逻辑坐标，不需要转换
                        // 因为棋子的位置是根据逻辑坐标渲染的
                        if (isMyTable) {
                           onPieceClick(piece.row, piece.col);
                        }
                      }}
                      title={`${piece.color === 'red' ? '红' : '黑'}${PIECE_NAMES[piece.type]}`}
                    >
                      {/* 选中效果或最后移动效果 - 使用图片 */}
                      {(isSelected || isLastMoveTo) && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '120%', // 比棋子稍大
                            height: '120%',
                            zIndex: 20,
                            pointerEvents: 'none'
                          }}
                        >
                          <Image
                            key={selectImageSrc} // 确保图片源变化时重新渲染
                            src={selectImageSrc}
                            alt="selected"
                            fill
                            className="object-contain"
                            priority
                            unoptimized // 防止图片优化导致的潜在渲染问题
                          />
                        </div>
                      )}

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
                {Array.from({ length: BOARD_COLS_POINTS }).map((_, col) => (
                  <div
                    key={`vline-${col}`}
                    style={{
                      position: 'absolute',
                      left: `${boardStartX + col * cellWidth}px`,
                      top: `${boardStartY}px`,
                      width: '1px',
                      height: `${boardHeight + CELL_HEIGHT_EXTRA * BOARD_ROWS_CELLS}px`,
                      backgroundColor: 'rgba(0, 200, 0, 0.7)',
                    }}
                  />
                ))}
                {/* 横线 - 宽度根据减小后的棋格调整 */}
                {Array.from({ length: BOARD_ROWS_POINTS }).map((_, row) => (
                  <div
                    key={`hline-${row}`}
                    style={{
                      position: 'absolute',
                      left: `${boardStartX}px`,
                      top: `${boardStartY + row * cellHeight}px`,
                      width: `${boardWidth + CELL_WIDTH_EXTRA * BOARD_COLS_CELLS - 0.2 * BOARD_COLS_CELLS}px`,
                      height: '1px',
                      backgroundColor: 'rgba(0, 200, 0, 0.7)',
                    }}
                  />
                ))}
              </div>
            )}

            {/* 选中棋子的高亮效果 */}
            {selectedPiece && showPieces && (
              <div
                className="absolute pointer-events-none transition-all"
                style={{
                  left: `${boardStartX + selectedPiece.col * cellWidth}px`,
                  top: `${boardStartY + selectedPiece.row * cellHeight}px`,
                  width: `${cellWidth}px`,
                  height: `${cellHeight}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 9,
                }}
              >
                <div className="relative w-full h-full">
                  <Image
                    src={pieces.find(p => p.row === selectedPiece.row && p.col === selectedPiece.col)?.color === 'red' 
                      ? '/images/chinesechess/select/r_select/r_select.png'
                      : '/images/chinesechess/select/b_select/b_select.png'
                    }
                    alt="selected"
                    fill
                    className="object-contain"
                    priority={false}
                  />
                </div>
              </div>
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
