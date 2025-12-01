'use client';

import { useEffect, useRef, useState } from 'react';

interface BoardProps {
    board: (string | null)[][];
    turn: 'r' | 'b';
    mySide?: 'r' | 'b';
    onMove: (fromX: number, fromY: number, toX: number, toY: number) => void;
}

const PIECE_NAMES: Record<string, string> = {
    'K': '帅', 'k': '将',
    'A': '仕', 'a': '士',
    'B': '相', 'b': '象',
    'N': '马', 'n': '马',
    'R': '车', 'r': '车',
    'C': '炮', 'c': '炮',
    'P': '兵', 'p': '卒'
};

export default function ChessBoard({ board, turn, mySide, onMove }: BoardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);

    const CELL_SIZE = 50;
    const BOARD_WIDTH = 9 * CELL_SIZE;
    const BOARD_HEIGHT = 10 * CELL_SIZE;

    useEffect(() => {
        drawBoard();
    }, [board, selected]);

    const drawBoard = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;

        // Vertical lines
        for (let i = 0; i < 9; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE + 25, 25);
            ctx.lineTo(i * CELL_SIZE + 25, BOARD_HEIGHT - 25);
            ctx.stroke();
        }

        // Horizontal lines
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(25, i * CELL_SIZE + 25);
            ctx.lineTo(BOARD_WIDTH - 25, i * CELL_SIZE + 25);
            ctx.stroke();
        }

        // Draw river text
        ctx.font = '20px Arial';
        ctx.fillStyle = '#8B4513';
        ctx.fillText('楚河', BOARD_WIDTH / 2 - 60, CELL_SIZE * 4.5 + 35);
        ctx.fillText('汉界', BOARD_WIDTH / 2 + 20, CELL_SIZE * 4.5 + 35);

        // Draw pieces
        board.forEach((row, y) => {
            row.forEach((piece, x) => {
                if (piece) {
                    drawPiece(ctx, piece, x, y);
                }
            });
        });

        // Draw selection
        if (selected) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(
                selected.x * CELL_SIZE + 25,
                selected.y * CELL_SIZE + 25,
                22,
                0,
                2 * Math.PI
            );
            ctx.stroke();
        }
    };

    const drawPiece = (ctx: CanvasRenderingContext2D, piece: string, x: number, y: number) => {
        const centerX = x * CELL_SIZE + 25;
        const centerY = y * CELL_SIZE + 25;

        // Draw circle
        ctx.fillStyle = piece === piece.toUpperCase() ? '#FF6B6B' : '#4ECDC4';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(PIECE_NAMES[piece] || piece, centerX, centerY);
    };

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const gridX = Math.round((clickX - 25) / CELL_SIZE);
        const gridY = Math.round((clickY - 25) / CELL_SIZE);

        if (gridX < 0 || gridX > 8 || gridY < 0 || gridY > 9) return;

        if (!selected) {
            // Select piece
            const piece = board[gridY][gridX];
            if (piece && ((mySide === 'r' && piece === piece.toUpperCase()) || (mySide === 'b' && piece === piece.toLowerCase()))) {
                setSelected({ x: gridX, y: gridY });
            }
        } else {
            // Move piece
            onMove(selected.x, selected.y, gridX, gridY);
            setSelected(null);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div className="mb-4 text-xl font-bold text-amber-900">
                {turn === 'r' ? '红方回合' : '黑方回合'}
                {mySide && (
                    <span className="ml-4 text-sm">
                        (你是 {mySide === 'r' ? '红方' : '黑方'})
                    </span>
                )}
            </div>
            <canvas
                ref={canvasRef}
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                onClick={handleClick}
                className="border-4 border-amber-900 rounded-lg shadow-2xl bg-amber-50 cursor-pointer"
            />
        </div>
    );
}
