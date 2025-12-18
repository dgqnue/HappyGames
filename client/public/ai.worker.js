/* --------------------------------------------------
   第一部分：你的核心规则逻辑 
   (直接嵌入这里，确保 Worker 独立运行，无需 import)
   --------------------------------------------------
*/
class ChineseChessRules {
  static isRed(piece) { return /^[A-Z]$/.test(piece); }
  static isBlack(piece) { return /^[a-z]$/.test(piece); }
  static getSide(piece) {
      if (!piece) return null;
      return this.isRed(piece) ? 'r' : 'b';
  }

  // ... (保留你原有的核心验证逻辑) ...
  static isValidMoveV2(board, fromX, fromY, toX, toY, turn) {
      const piece = board[fromY][fromX];
      if (!piece) return false;
      if (this.getSide(piece) !== turn) return false;
      const target = board[toY][toX];
      if (target && this.getSide(target) === turn) return false; // 不能吃队友

      const dx = toX - fromX;
      const dy = toY - fromY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (dx === 0 && dy === 0) return false;

      const pieceType = piece.toLowerCase();
      
      switch (pieceType) {
          case 'k': // 将/帅
              if (toX < 3 || toX > 5) return false;
              if (turn === 'r') { if (toY < 7 || toY > 9) return false; } 
              else { if (toY < 0 || toY > 2) return false; }
              return (absDx + absDy === 1);
          case 'a': // 士
              if (toX < 3 || toX > 5) return false;
              if (turn === 'r') { if (toY < 7 || toY > 9) return false; } 
              else { if (toY < 0 || toY > 2) return false; }
              return (absDx === 1 && absDy === 1);
          case 'b': // 象
              if (turn === 'r') { if (toY < 5) return false; } 
              else { if (toY > 4) return false; }
              if (absDx !== 2 || absDy !== 2) return false;
              const eyeX = fromX + dx / 2;
              const eyeY = fromY + dy / 2;
              if (board[eyeY][eyeX]) return false; // 塞象眼
              return true;
          case 'n': // 马
              if (!((absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1))) return false;
              if (absDx === 2) { if (board[fromY][fromX + dx / 2]) return false; } // 蹩马腿
              else { if (board[fromY + dy / 2][fromX]) return false; }
              return true;
          case 'r': // 车
              if (dx !== 0 && dy !== 0) return false;
              if (!this.isPathClear(board, fromX, fromY, toX, toY)) return false;
              return true;
          case 'c': // 炮
              if (dx !== 0 && dy !== 0) return false;
              const count = this.countPiecesBetween(board, fromX, fromY, toX, toY);
              if (target) return count === 1; // 吃子
              else return count === 0; // 移动
          case 'p': // 兵
              if (turn === 'r') {
                  if (dy > 0) return false; // 不能后退
                  if (fromY > 4 && absDx !== 0) return false; // 过河前只能直走
              } else {
                  if (dy < 0) return false;
                  if (fromY < 5 && absDx !== 0) return false;
              }
              return (absDx + Math.abs(dy) === 1);
      }
      return false;
  }

  // 辅助函数：判断路径是否清晰
  static isPathClear(board, x1, y1, x2, y2) { return this.countPiecesBetween(board, x1, y1, x2, y2) === 0; }
  static countPiecesBetween(board, x1, y1, x2, y2) {
      let count = 0;
      if (x1 === x2) { 
          const min = Math.min(y1, y2), max = Math.max(y1, y2);
          for (let y = min + 1; y < max; y++) if (board[y][x1]) count++;
      } else { 
          const min = Math.min(x1, x2), max = Math.max(x1, x2);
          for (let x = min + 1; x < max; x++) if (board[y1][x]) count++;
      }
      return count;
  }
  static getKingPosition(board, side) {
      const kingPiece = side === 'r' ? 'K' : 'k';
      for (let y = 0; y < 10; y++) {
          for (let x = 0; x < 9; x++) {
              if (board[y][x] === kingPiece) return { x, y };
          }
      }
      return null;
  }
  static isKingUnderAttack(board, kingX, kingY, side) {
      const enemySide = side === 'r' ? 'b' : 'r';
      for (let y = 0; y < 10; y++) {
          for (let x = 0; x < 9; x++) {
              const piece = board[y][x];
              if (!piece || this.getSide(piece) !== enemySide) continue;
              if (this.isValidMoveV2(board, x, y, kingX, kingY, enemySide)) return true;
          }
      }
      return false;
  }
  static isSelfCheckAfterMove(board, fromX, fromY, toX, toY, side) {
      const boardCopy = board.map(row => [...row]);
      boardCopy[toY][toX] = boardCopy[fromY][fromX];
      boardCopy[fromY][fromX] = null;
      const kingPos = this.getKingPosition(boardCopy, side);
      if (!kingPos) return true;
      return this.isKingUnderAttack(boardCopy, kingPos.x, kingPos.y, side);
  }
  static isFlyingGeneral(board) {
      const redKing = this.getKingPosition(board, 'r');
      const blackKing = this.getKingPosition(board, 'b');
      if (!redKing || !blackKing || redKing.x !== blackKing.x) return false;
      return this.countPiecesBetween(board, redKing.x, redKing.y, blackKing.x, blackKing.y) === 0;
  }
  static isFlyingGeneralAfterMove(board, fromX, fromY, toX, toY) {
      const boardCopy = board.map(row => [...row]);
      boardCopy[toY][toX] = boardCopy[fromY][fromX];
      boardCopy[fromY][fromX] = null;
      return this.isFlyingGeneral(boardCopy);
  }
}

/* --------------------------------------------------
   第二部分：AI 核心大脑 (Minimax + 估值)
   --------------------------------------------------
*/

// 棋子基础分值
const PIECE_VALUES = {
  'k': 10000, 'K': 10000, // 帅/将
  'r': 900,   'R': 900,   // 车
  'n': 450,   'N': 450,   // 马
  'c': 450,   'C': 450,   // 炮
  'a': 200,   'A': 200,   // 士
  'b': 200,   'B': 200,   // 象
  'p': 100,   'P': 100    // 兵
};

/**
 * 获取某个颜色的所有合法走法
 * 这里使用了你提供的 ChineseChessRules 里的三个关键检查函数
 */
function getAllLegalMoves(board, turn) {
  const moves = [];
  for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
          const piece = board[y][x];
          if (!piece || ChineseChessRules.getSide(piece) !== turn) continue;

          // 为了性能，我们不盲目遍历 90 个点，而是根据棋子类型生成“潜在”目标
          // 这里简化处理：直接遍历所有点，但依靠 isValidMoveV2 快速过滤
          // 真正的优化可以在这里做，但目前 Render 服务器或客户端足够快
          for (let ty = 0; ty < 10; ty++) {
              for (let tx = 0; tx < 9; tx++) {
                  // 1. 基础行走规则检查 (马走日等)
                  if (ChineseChessRules.isValidMoveV2(board, x, y, tx, ty, turn)) {
                      // 2. 送将检查 (不能自杀)
                      if (!ChineseChessRules.isSelfCheckAfterMove(board, x, y, tx, ty, turn)) {
                          // 3. 飞将检查 (老头不能对脸)
                          if (!ChineseChessRules.isFlyingGeneralAfterMove(board, x, y, tx, ty)) {
                              moves.push({ from: { x, y }, to: { x: tx, y: ty } });
                          }
                      }
                  }
              }
          }
      }
  }
  return moves;
}

// 局面评估：红方分 - 黑方分
function evaluateBoard(board) {
  let score = 0;
  for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
          const piece = board[y][x];
          if (!piece) continue;
          const val = PIECE_VALUES[piece] || 0;
          
          // 简单的位置加分 (例如过河兵)
          let positionBonus = 0;
          if (piece === 'P' && y < 5) positionBonus = 100; // 红兵过河
          if (piece === 'p' && y > 4) positionBonus = 100; // 黑卒过河

          if (ChineseChessRules.isRed(piece)) {
              score += (val + positionBonus);
          } else {
              score -= (val + positionBonus);
          }
      }
  }
  return score;
}

// Minimax 算法
function minimax(board, depth, alpha, beta, isMaximizing, aiColor) {
  if (depth === 0) {
      // AI 如果是红方，希望分数越高越好；如果是黑方，希望分数越低越好
      // 为了统一逻辑，我们根据 AI 颜色调整返回值的正负
      const evalScore = evaluateBoard(board);
      return { score: aiColor === 'r' ? evalScore : -evalScore };
  }

  const turn = isMaximizing ? aiColor : (aiColor === 'r' ? 'b' : 'r');
  const moves = getAllLegalMoves(board, turn);

  if (moves.length === 0) {
      // 无路可走，判负
      return { score: -100000 + (10 - depth) }; // 越早输分越低
  }

  let bestMove = null;
  let bestScore = -Infinity;

  // 简单的排序优化：优先搜索吃子的步数 (如果目标位置有子)
  moves.sort((a, b) => {
      const pieceA = board[a.to.y][a.to.x] ? 1 : 0;
      const pieceB = board[b.to.y][b.to.x] ? 1 : 0;
      return pieceB - pieceA;
  });

  for (const move of moves) {
      // 模拟移动
      const newBoard = board.map(row => [...row]);
      newBoard[move.to.y][move.to.x] = newBoard[move.from.y][move.from.x];
      newBoard[move.from.y][move.from.x] = null;

      const result = minimax(newBoard, depth - 1, alpha, beta, false, aiColor);
      
      // 取反 result.score，因为对手会选对我最不利的分数
      const currentScore = -result.score;

      if (currentScore > bestScore) {
          bestScore = currentScore;
          bestMove = move;
      }
      
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break; // 剪枝
  }

  return { score: bestScore, move: bestMove };
}

/* --------------------------------------------------
   第三部分：监听主线程指令
   --------------------------------------------------
*/
self.onmessage = (e) => {
  const { board, depth, aiColor } = e.data;
  
  // 启动计算
  // 注意：AI 总是试图最大化自己的利益，所以 isMaximizing = true
  const result = minimax(board, depth, -Infinity, Infinity, true, aiColor);
  
  self.postMessage(result.move);
};