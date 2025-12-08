/**
 * 中国象棋棋盘组件
 * 
 * 功能说明：
 * - 渲染棋盘背景图片
 * - 绘制网格线（9行x8列）
 * - 显示所有棋子并支持交互
 * - 支持棋子选中状态展示
 * - 自动适配容器尺寸变化
 * - 提供调试信息面板
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/**
 * 棋子接口定义
 * @property type - 棋子类型：车、马、象、士、将、炮、兵
 * @property color - 棋子颜色：红方或黑方
 * @property row - 行位置（0-9）
 * @property col - 列位置（0-8）
 */
interface ChessPiece {
  type: 'rook' | 'knight' | 'bishop' | 'guard' | 'king' | 'cannon' | 'pawn';
  color: 'red' | 'black';
  row: number;
  col: number;
}

/**
 * 棋盘组件Props接口
 * @property pieces - 棋盘上所有棋子的数组
 * @property selectedPiece - 当前选中的棋子位置（null表示无选中）
 * @property onPieceClick - 棋子点击回调函数
 * @property isMyTable - 是否是当前玩家的棋盘
 */
interface ChessBoardProps {
  pieces: ChessPiece[];
  selectedPiece: { row: number; col: number } | null;
  onPieceClick: (row: number, col: number) => void;
  isMyTable: boolean;
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

/** 棋盘列数（标准中国象棋为8列） */
const BOARD_COLS = 8;

/** 棋盘行数（标准中国象棋为9行） */
const BOARD_ROWS = 9;

/**
 * 棋盘边框比例配置
 * 用于计算棋盘图片中实际棋盘区域的位置和大小
 * 比例值基于棋盘背景图片的尺寸
 */
let BORDER_LEFT_RATIO = 0.065;   // 左边框占图片宽度的比例
let BORDER_RIGHT_RATIO = 0.065;  // 右边框占图片宽度的比例
let BORDER_TOP_RATIO = 0.055;    // 顶部边框占图片高度的比例
let BORDER_BOTTOM_RATIO = 0.09;  // 底部边框占图片高度的比例

/**
 * 调试函数：用于测量和校准棋盘背景图片的尺寸
 * 可用于动态计算边框比例
 */
const measureBoardImage = () => {
  const img = document.createElement('img');
  img.onload = () => {
    console.log(`[ChessBoard] 棋盘图片尺寸: ${img.width}x${img.height}`);
    // 图片加载后，可以根据实际尺寸计算和调整边框比例
  };
  img.src = '/images/chinesechess/board/board.png';
};

/**
 * ChessBoard 棋盘组件主体
 * 
 * 核心功能：
 * 1. 加载和显示棋盘背景图片
 * 2. 绘制棋盘网格线
 * 3. 渲染所有棋子（支持图片）
 * 4. 处理棋盘和棋子的点击交互
 * 5. 显示选中棋子的高亮效果
 * 6. 实时响应容器尺寸变化
 * 
 * @param props - 组件属性对象
 * @returns React组件
 */
export function ChessBoard({ pieces, selectedPiece, onPieceClick, isMyTable }: ChessBoardProps) {
  // ======================== 状态变量 ========================
  
  /** 容器DOM引用，用于获取容器尺寸 */
  const containerRef = useRef<HTMLDivElement>(null);
  
  /** 容器的当前尺寸（宽度和高度） */
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  
  /** 棋盘背景图片的宽高比（宽度/高度） */
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(9 / 10); // 默认9:10

  // ======================== 生命周期钩子 ========================

  /**
   * 加载棋盘背景图片并计算其宽高比
   * 用于后续计算棋盘显示尺寸，确保图片不变形
   */
  useEffect(() => {
    const img = document.createElement('img');
    img.onload = () => {
      // 计算图片的宽高比（宽度÷高度）
      const ratio = img.width / img.height;
      setImageAspectRatio(ratio);
      console.log(`[ChessBoard] 棋盘图片宽高比: ${ratio.toFixed(3)} (${img.width}x${img.height})`);
    };
    img.src = '/images/chinesechess/board/board.png';
  }, []);

  /**
   * 监听容器尺寸变化，实现响应式自适应
   * 使用 ResizeObserver 和 window resize 事件监听
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /** 更新容器尺寸信息 */
    const updateDimensions = () => {
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      setDimensions({ width, height });
      console.log(`[ChessBoard] 容器尺寸: ${width}x${height}`);
    };

    // 初始化时更新一次尺寸
    updateDimensions();

    // 使用 ResizeObserver 监听容器尺寸变化（当容器响应式缩放时）
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    // 备用方案：监听 window resize 事件（当窗口大小改变时）
    window.addEventListener('resize', updateDimensions);

    // 组件卸载时清理监听器
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // ======================== 尺寸计算 ========================

  /** 容器宽度（像素） */
  const containerWidth = dimensions?.width || 0;
  
  /** 根据图片宽高比计算的容器高度 */
  const containerHeight = containerWidth / imageAspectRatio;
  
  /** 最终显示的图片宽度（与容器宽度相同） */
  const finalImageWidth = containerWidth;
  
  /** 最终显示的图片高度 */
  const finalImageHeight = containerHeight;
  
  /** 
   * 棋盘实际游戏区域的宽度（去掉左右边框）
   * 计算公式：图片宽度 × (1 - 左边框比例 - 右边框比例)
   */
  const boardWidth = finalImageWidth * (1 - BORDER_LEFT_RATIO - BORDER_RIGHT_RATIO);
  
  /** 
   * 棋盘实际游戏区域的高度（去掉上下边框）
   * 计算公式：图片高度 × (1 - 顶部边框比例 - 底部边框比例)
   */
  const boardHeight = finalImageHeight * (1 - BORDER_TOP_RATIO - BORDER_BOTTOM_RATIO);
  
  /** 
   * 单个棋格的宽度
   * 计算公式：棋盘宽度 ÷ 列数(8列) + 1像素（放大）
   */
  const cellWidth = boardWidth / BOARD_COLS + 1;
  
  /** 
   * 单个棋格的高度
   * 计算公式：棋盘高度 ÷ 行数(9行) + 2.8像素（放大）
   */
  const cellHeight = boardHeight / BOARD_ROWS + 2.8;
  
  /** 
   * 棋盘游戏区域相对于容器的X坐标（像素）
   * 即左边框的宽度，向左移动 5 像素
   */
  const boardStartX = finalImageWidth * BORDER_LEFT_RATIO - 5;
  
  /** 
   * 棋盘游戏区域相对于容器的Y坐标（像素）
   * 即顶部边框的高度，向上移动 6 像素
   */
  const boardStartY = finalImageHeight * BORDER_TOP_RATIO - 6;

  // ======================== 事件处理 ========================

  /**
   * 处理棋格点击事件
   * 
   * @param row - 点击位置的行号（0-8）
   * @param col - 点击位置的列号（0-7）
   */
  const handleCellClick = (row: number, col: number) => {
    // 只有当前玩家的棋盘才允许交互
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
      {/* 如果容器尺寸已加载，则显示棋盘；否则显示加载提示 */}
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
          {/* ======================== 棋盘主容器 ======================== */}
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
              // 只处理直接点击棋盘的事件（不是点击棋子或其他子元素）
              if (e.target === e.currentTarget) {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                // 获取点击位置相对于棋盘容器的坐标
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                // 将像素坐标转换为棋格坐标
                const col = Math.floor((clickX - boardStartX) / cellWidth);
                const row = Math.floor((clickY - boardStartY) / cellHeight);
                // 检查点击位置是否在有效的棋盘范围内
                if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
                  handleCellClick(row, col);
                }
              }
            }}
          >
            {/* ======================== 棋盘背景图层 ======================== */}
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

            {/* ======================== 棋子渲染层 ======================== */}
            <div style={{ zIndex: 10, position: 'absolute', inset: 0 }}>
              {pieces.map((piece, index) => {
                // 判断该棋子是否被选中
                const isSelected = 
                  selectedPiece?.row === piece.row && 
                  selectedPiece?.col === piece.col;
                
                /**
                 * 获取棋子图片路径
                 * 路径格式：/images/chinesechess/pieces/{颜色}/{棋子类型}.png
                 * 例如：/images/chinesechess/pieces/red/rook.png
                 */
                const getPieceImagePath = () => {
                  return `/images/chinesechess/pieces/${piece.color}/${piece.type}.png`;
                };

                // 棋子显示尺寸为格子的91%
                const pieceSize = Math.min(cellWidth, cellHeight) * 0.91;
                
                // 棋子在棋格交叉点上（格子的中心位置）
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
                      // 使用 translate(-50%, -50%) 使棋子以其中心点对齐网格交叉点
                      transform: 'translate(-50%, -50%)',
                    }}
                    onClick={() => handleCellClick(piece.row, piece.col)}
                    title={`${piece.color === 'red' ? '红' : '黑'}${PIECE_NAMES[piece.type]}`}
                  >
                    {/* 棋子图片容器（隐藏棋子） */}
                    <div className="relative w-full h-full opacity-0">
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

            {/* ======================== 网格线绘制层（SVG） ======================== */}
            {/* 主棋盘网格线已隐藏，使用下方的绿色调试网格代替 */}

            {/* ======================== 调试信息层 ======================== */}
            {/* 
              此层可用于开发时校准棋盘位置，如不需要可完全删除
            */}
            {true && (
            <div style={{ position: 'relative', pointerEvents: 'none', zIndex: 5 }}>
              {/* 绿色辅助网格线（用于调试定位） */}
              {Array.from({ length: BOARD_COLS + 1 }).map((_, col) => (
                <div
                  key={`vline-${col}`}
                  style={{
                    position: 'absolute',
                    left: `${boardStartX + col * cellWidth}px`,
                    top: `${boardStartY}px`,
                    width: '1px',
                    height: `${boardHeight + 2.8 * BOARD_ROWS}px`,
                    backgroundColor: 'rgba(0, 200, 0, 0.7)',
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
                    width: `${boardWidth + BOARD_COLS}px`,
                    height: '1px',
                    backgroundColor: 'rgba(0, 200, 0, 0.7)',
                  }}
                />
              ))}
              
              {/* 调试信息面板已削除 */}
            </div>
            )}

            {/* ======================== 选中棋子的高亮边框 ======================== */}
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
        /* 加载中的占位符 */
        <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gradient-to-b from-amber-100 to-yellow-100">
          <div className="animate-pulse">加载棋盘...</div>
        </div>
      )}
    </div>
  );
}

/**
 * ======================== 核心功能说明 ========================
 * 
 * 1. 坐标系统
 * - 使用 (row, col) 表示棋格位置，其中 row:0-8, col:0-7
 * - row 从上到下递增，col 从左到右递增
 * - 棋子显示在各棋格的交叉点（网格顶点），而非格子中心
 * 
 * 2. 尺寸计算流程
 * - 容器宽度（动态）→ 图片高度（根据宽高比）
 * - 图片尺寸 - 边框 = 棋盘尺寸
 * - 棋盘尺寸 ÷ 行列数 = 单格尺寸
 * - 像素坐标转棋格坐标：(pixel - boardStart) ÷ cellSize
 * 
 * 3. 渲染层次（从下到上，zIndex）
 * - zIndex 1: 棋盘背景图
 * - zIndex 5: 网格线（SVG）+ 调试信息
 * - zIndex 10: 棋子层
 * 
 * 4. 交互处理
 * - 点击棋格或棋子都会触发 handleCellClick
 * - 选中棋子时显示蓝色边框和缩放效果
 * - 非当前玩家棋盘上的点击被忽略（isMyTable 检查）
 * 
 * 5. 响应式设计
 * - 使用 ResizeObserver 监听容器尺寸变化
 * - 容器宽度改变时自动重新计算所有尺寸
 * - 图片保持宽高比不变（aspectRatio）
 * 
 * 6. 调试功能
 * - 右上角的调试面板显示当前的所有尺寸数据
 * - 绿色网格线用于验证网格对齐
 * - 可通过调整 BORDER_*_RATIO 来校准棋盘位置
 * 
 * ================================================================
 */

