// client/src/hooks/useXiangqiAI.js
import { useEffect, useRef, useState, useCallback } from 'react';

export function useXiangqiAI() {
  const workerRef = useRef(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  useEffect(() => {
    // 1. 初始化 Worker
    // 注意：这里直接指向 public 目录下的文件
    workerRef.current = new Worker('/ai.worker.js');

    // 清理函数
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  /**
   * 让 AI 思考下一步
   * @param {Array} currentBoard - 当前棋盘数组
   * @param {String} aiColor - AI 执什么颜色 ('r' 或 'b')
   * @param {Function} onMoveCallback - AI 算完后执行的回调函数
   */
  const makeAiMove = useCallback((currentBoard, aiColor, onMoveCallback) => {
    if (!workerRef.current) return;
    if (isAiThinking) return; // 已经在思考了，别催

    setIsAiThinking(true);

    // 2. 发送任务给 AI
    workerRef.current.postMessage({
      board: currentBoard,
      depth: 3, // 搜索深度：3 步 (手机上建议 2-3，电脑上 3-4)
      aiColor: aiColor
    });

    // 3. 监听 AI 回复
    workerRef.current.onmessage = (e) => {
      const bestMove = e.data;

      // 为了逼真，我们人为加一点延迟（0.5秒 ~ 1.5秒）
      // 否则 AI 瞬间落子会把玩家吓一跳
      const delay = Math.random() * 1000 + 500;

      setTimeout(() => {
        onMoveCallback(bestMove); // 把结果传出去
        setIsAiThinking(false);
      }, delay);
    };
  }, [isAiThinking]);

  return { makeAiMove, isAiThinking };
}
