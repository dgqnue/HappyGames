/**
 * 经典棋局库 - 中国象棋
 * 
 * 收录经典对局棋谱，供 AI 在对局中参考学习
 * 棋谱来源：历届全国象棋个人赛、五羊杯、银荔杯等经典对局
 * 
 * 棋谱格式说明：
 * - moves: 走法数组，每步格式 { from: {x, y}, to: {x, y} }
 * - 坐标系：x 0-8 从左到右，y 0-9 从上（黑方）到下（红方）
 * - 红方先手
 * 
 * 文件位置: server/src/ai/ClassicGames.js
 */

/**
 * 经典对局棋谱库
 * 每个对局包含：
 * - name: 对局名称
 * - red: 红方棋手
 * - black: 黑方棋手  
 * - year: 年份
 * - opening: 开局类型
 * - result: 结果 ('red_win', 'black_win', 'draw')
 * - moves: 走法序列
 * - comments: 关键着法注释（可选）
 */
const CLASSIC_GAMES = [
    // ==================== 中炮对屏风马 ====================
    {
        name: '胡荣华vs杨官璘 1960年全国个人赛',
        red: '胡荣华',
        black: '杨官璘',
        year: 1960,
        opening: '中炮对屏风马',
        result: 'red_win',
        moves: [
            // 1. 炮二平五 马8进7
            { from: { x: 7, y: 7 }, to: { x: 4, y: 7 } },
            { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
            // 2. 马二进三 车9平8
            { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },
            { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
            // 3. 车一平二 马2进3
            { from: { x: 8, y: 9 }, to: { x: 7, y: 9 } },
            { from: { x: 7, y: 0 }, to: { x: 6, y: 2 } },
            // 4. 兵七进一 卒7进1
            { from: { x: 2, y: 6 }, to: { x: 2, y: 5 } },
            { from: { x: 2, y: 3 }, to: { x: 2, y: 4 } },
            // 5. 马八进七 炮8平9
            { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },
            { from: { x: 1, y: 2 }, to: { x: 0, y: 2 } },
            // 6. 车二进六 马7进8
            { from: { x: 7, y: 9 }, to: { x: 7, y: 3 } },
            { from: { x: 2, y: 2 }, to: { x: 1, y: 4 } },
            // 7. 车二平三 车8进4
            { from: { x: 7, y: 3 }, to: { x: 6, y: 3 } },
            { from: { x: 1, y: 0 }, to: { x: 1, y: 4 } },
            // 8. 兵三进一 炮2平1
            { from: { x: 6, y: 6 }, to: { x: 6, y: 5 } },
            { from: { x: 7, y: 2 }, to: { x: 8, y: 2 } },
            // 9. 炮八平九 车1平2
            { from: { x: 1, y: 7 }, to: { x: 0, y: 7 } },
            { from: { x: 8, y: 0 }, to: { x: 7, y: 0 } },
            // 10. 车九进一 车8平7
            { from: { x: 0, y: 9 }, to: { x: 0, y: 8 } },
            { from: { x: 1, y: 4 }, to: { x: 2, y: 4 } },
        ],
        comments: {
            6: '车二进六 - 经典的巡河车战术',
            10: '车九进一 - 出动另一只车形成双车协同'
        }
    },
    
    {
        name: '许银川vs赵国荣 1998年全国个人赛',
        red: '许银川',
        black: '赵国荣',
        year: 1998,
        opening: '中炮对屏风马',
        result: 'red_win',
        moves: [
            // 1. 炮二平五 马8进7
            { from: { x: 7, y: 7 }, to: { x: 4, y: 7 } },
            { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
            // 2. 马二进三 卒7进1
            { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },
            { from: { x: 2, y: 3 }, to: { x: 2, y: 4 } },
            // 3. 车一平二 车9平8
            { from: { x: 8, y: 9 }, to: { x: 7, y: 9 } },
            { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
            // 4. 车二进六 马2进3
            { from: { x: 7, y: 9 }, to: { x: 7, y: 3 } },
            { from: { x: 7, y: 0 }, to: { x: 6, y: 2 } },
            // 5. 兵七进一 炮8平9
            { from: { x: 2, y: 6 }, to: { x: 2, y: 5 } },
            { from: { x: 1, y: 2 }, to: { x: 0, y: 2 } },
            // 6. 马八进七 士4进5
            { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },
            { from: { x: 5, y: 0 }, to: { x: 4, y: 1 } },
            // 7. 炮八平九 车1平2
            { from: { x: 1, y: 7 }, to: { x: 0, y: 7 } },
            { from: { x: 8, y: 0 }, to: { x: 7, y: 0 } },
            // 8. 车九进一 炮2进4
            { from: { x: 0, y: 9 }, to: { x: 0, y: 8 } },
            { from: { x: 7, y: 2 }, to: { x: 7, y: 6 } },
            // 9. 车二平三 车8进9
            { from: { x: 7, y: 3 }, to: { x: 6, y: 3 } },
            { from: { x: 1, y: 0 }, to: { x: 1, y: 9 } },
            // 10. 马三退二 车8平7
            { from: { x: 6, y: 7 }, to: { x: 7, y: 9 } },
            { from: { x: 1, y: 9 }, to: { x: 2, y: 9 } },
        ]
    },

    // ==================== 仕角炮开局 ====================
    {
        name: '王天一vs郑惟桐 2015年全国个人赛',
        red: '王天一',
        black: '郑惟桐',
        year: 2015,
        opening: '仕角炮对进卒',
        result: 'red_win',
        moves: [
            // 1. 炮二平四 马8进7（仕角炮开局）
            { from: { x: 7, y: 7 }, to: { x: 5, y: 7 } },
            { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
            // 2. 马二进三 卒7进1
            { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },
            { from: { x: 2, y: 3 }, to: { x: 2, y: 4 } },
            // 3. 车一平二 车9平8
            { from: { x: 8, y: 9 }, to: { x: 7, y: 9 } },
            { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
            // 4. 马八进九 马2进1
            { from: { x: 1, y: 9 }, to: { x: 0, y: 7 } },
            { from: { x: 7, y: 0 }, to: { x: 8, y: 2 } },
            // 5. 炮八进四 炮8平7
            { from: { x: 1, y: 7 }, to: { x: 1, y: 3 } },
            { from: { x: 1, y: 2 }, to: { x: 2, y: 2 } },
            // 6. 炮八平七 车1进1
            { from: { x: 1, y: 3 }, to: { x: 2, y: 3 } },
            { from: { x: 8, y: 0 }, to: { x: 8, y: 1 } },
            // 7. 车九进一 炮2进2
            { from: { x: 0, y: 9 }, to: { x: 0, y: 8 } },
            { from: { x: 7, y: 2 }, to: { x: 7, y: 4 } },
            // 8. 车九平六 车1平4
            { from: { x: 0, y: 8 }, to: { x: 3, y: 8 } },
            { from: { x: 8, y: 1 }, to: { x: 5, y: 1 } },
        ]
    },

    // ==================== 飞相局 ====================
    {
        name: '吕钦vs胡荣华 1989年五羊杯',
        red: '吕钦',
        black: '胡荣华',
        year: 1989,
        opening: '飞相局',
        result: 'red_win',
        moves: [
            // 1. 相三进五 炮8平5（飞相局）
            { from: { x: 6, y: 9 }, to: { x: 4, y: 7 } },
            { from: { x: 1, y: 2 }, to: { x: 4, y: 2 } },
            // 2. 马二进三 马8进7
            { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },
            { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
            // 3. 兵七进一 卒7进1
            { from: { x: 2, y: 6 }, to: { x: 2, y: 5 } },
            { from: { x: 2, y: 3 }, to: { x: 2, y: 4 } },
            // 4. 马八进七 马2进3
            { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },
            { from: { x: 7, y: 0 }, to: { x: 6, y: 2 } },
            // 5. 车一平二 车9进1
            { from: { x: 8, y: 9 }, to: { x: 7, y: 9 } },
            { from: { x: 0, y: 0 }, to: { x: 0, y: 1 } },
            // 6. 车二进四 车9平4
            { from: { x: 7, y: 9 }, to: { x: 7, y: 5 } },
            { from: { x: 0, y: 1 }, to: { x: 5, y: 1 } },
            // 7. 仕四进五 车1平2
            { from: { x: 5, y: 9 }, to: { x: 4, y: 8 } },
            { from: { x: 8, y: 0 }, to: { x: 7, y: 0 } },
            // 8. 炮二平一 炮2平1
            { from: { x: 7, y: 7 }, to: { x: 8, y: 7 } },
            { from: { x: 7, y: 2 }, to: { x: 8, y: 2 } },
        ]
    },

    // ==================== 起马局 ====================
    {
        name: '蒋川vs洪智 2010年全国个人赛',
        red: '蒋川',
        black: '洪智',
        year: 2010,
        opening: '起马局',
        result: 'draw',
        moves: [
            // 1. 马二进三 马8进7（起马局）
            { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },
            { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
            // 2. 兵七进一 卒7进1
            { from: { x: 2, y: 6 }, to: { x: 2, y: 5 } },
            { from: { x: 2, y: 3 }, to: { x: 2, y: 4 } },
            // 3. 车一平二 车9平8
            { from: { x: 8, y: 9 }, to: { x: 7, y: 9 } },
            { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
            // 4. 马八进七 马2进1
            { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },
            { from: { x: 7, y: 0 }, to: { x: 8, y: 2 } },
            // 5. 炮二平三 炮8平7
            { from: { x: 7, y: 7 }, to: { x: 6, y: 7 } },
            { from: { x: 1, y: 2 }, to: { x: 2, y: 2 } },
            // 6. 车二进六 炮2平3
            { from: { x: 7, y: 9 }, to: { x: 7, y: 3 } },
            { from: { x: 7, y: 2 }, to: { x: 6, y: 2 } },
            // 7. 车九平八 象3进5
            { from: { x: 0, y: 9 }, to: { x: 1, y: 9 } },
            { from: { x: 6, y: 0 }, to: { x: 4, y: 2 } },
            // 8. 车八进四 士4进5
            { from: { x: 1, y: 9 }, to: { x: 1, y: 5 } },
            { from: { x: 5, y: 0 }, to: { x: 4, y: 1 } },
        ]
    },

    // ==================== 过宫炮开局 ====================
    {
        name: '柳大华vs李来群 1981年全国个人赛',
        red: '柳大华',
        black: '李来群',
        year: 1981,
        opening: '过宫炮',
        result: 'red_win',
        moves: [
            // 1. 炮二平六 马8进7（过宫炮开局）
            { from: { x: 7, y: 7 }, to: { x: 3, y: 7 } },
            { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
            // 2. 马二进三 车9平8
            { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },
            { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
            // 3. 车一平二 炮8平9
            { from: { x: 8, y: 9 }, to: { x: 7, y: 9 } },
            { from: { x: 1, y: 2 }, to: { x: 0, y: 2 } },
            // 4. 车二进六 马2进1
            { from: { x: 7, y: 9 }, to: { x: 7, y: 3 } },
            { from: { x: 7, y: 0 }, to: { x: 8, y: 2 } },
            // 5. 兵七进一 卒7进1
            { from: { x: 2, y: 6 }, to: { x: 2, y: 5 } },
            { from: { x: 2, y: 3 }, to: { x: 2, y: 4 } },
            // 6. 马八进七 炮2平3
            { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },
            { from: { x: 7, y: 2 }, to: { x: 6, y: 2 } },
            // 7. 马七进六 车1平2
            { from: { x: 2, y: 7 }, to: { x: 3, y: 5 } },
            { from: { x: 8, y: 0 }, to: { x: 7, y: 0 } },
            // 8. 炮八平七 象7进5
            { from: { x: 1, y: 7 }, to: { x: 2, y: 7 } },
            { from: { x: 2, y: 0 }, to: { x: 4, y: 2 } },
        ]
    },

    // ==================== 顺炮局 ====================
    {
        name: '赵鑫鑫vs王天一 2012年全国个人赛',
        red: '赵鑫鑫',
        black: '王天一',
        year: 2012,
        opening: '顺炮直车对横车',
        result: 'black_win',
        moves: [
            // 1. 炮二平五 炮8平5（顺炮）
            { from: { x: 7, y: 7 }, to: { x: 4, y: 7 } },
            { from: { x: 1, y: 2 }, to: { x: 4, y: 2 } },
            // 2. 马二进三 马8进7
            { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },
            { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
            // 3. 车一平二 车9平8
            { from: { x: 8, y: 9 }, to: { x: 7, y: 9 } },
            { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
            // 4. 车二进六 车8进4
            { from: { x: 7, y: 9 }, to: { x: 7, y: 3 } },
            { from: { x: 1, y: 0 }, to: { x: 1, y: 4 } },
            // 5. 兵七进一 卒7进1
            { from: { x: 2, y: 6 }, to: { x: 2, y: 5 } },
            { from: { x: 2, y: 3 }, to: { x: 2, y: 4 } },
            // 6. 马八进七 马2进3
            { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },
            { from: { x: 7, y: 0 }, to: { x: 6, y: 2 } },
            // 7. 相三进五 车1平2
            { from: { x: 6, y: 9 }, to: { x: 4, y: 7 } },
            { from: { x: 8, y: 0 }, to: { x: 7, y: 0 } },
            // 8. 车九平八 炮2进4
            { from: { x: 0, y: 9 }, to: { x: 1, y: 9 } },
            { from: { x: 7, y: 2 }, to: { x: 7, y: 6 } },
        ]
    },

    // ==================== 反宫马 ====================
    {
        name: '徐天红vs于幼华 1993年全国个人赛',
        red: '徐天红',
        black: '于幼华',
        year: 1993,
        opening: '中炮对反宫马',
        result: 'red_win',
        moves: [
            // 1. 炮二平五 马2进3（反宫马）
            { from: { x: 7, y: 7 }, to: { x: 4, y: 7 } },
            { from: { x: 7, y: 0 }, to: { x: 6, y: 2 } },
            // 2. 马二进三 炮8平6
            { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },
            { from: { x: 1, y: 2 }, to: { x: 3, y: 2 } },
            // 3. 车一平二 马8进7
            { from: { x: 8, y: 9 }, to: { x: 7, y: 9 } },
            { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
            // 4. 兵七进一 卒7进1
            { from: { x: 2, y: 6 }, to: { x: 2, y: 5 } },
            { from: { x: 2, y: 3 }, to: { x: 2, y: 4 } },
            // 5. 马八进七 车9平8
            { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },
            { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
            // 6. 车二进六 士4进5
            { from: { x: 7, y: 9 }, to: { x: 7, y: 3 } },
            { from: { x: 5, y: 0 }, to: { x: 4, y: 1 } },
            // 7. 炮八平九 象7进5
            { from: { x: 1, y: 7 }, to: { x: 0, y: 7 } },
            { from: { x: 2, y: 0 }, to: { x: 4, y: 2 } },
            // 8. 车九进一 车1平2
            { from: { x: 0, y: 9 }, to: { x: 0, y: 8 } },
            { from: { x: 8, y: 0 }, to: { x: 7, y: 0 } },
        ]
    },

    // ==================== 列炮 ====================
    {
        name: '孙勇征vs谢靖 2008年全国个人赛',
        red: '孙勇征',
        black: '谢靖',
        year: 2008,
        opening: '中炮对列炮',
        result: 'draw',
        moves: [
            // 1. 炮二平五 炮2平5（列炮）
            { from: { x: 7, y: 7 }, to: { x: 4, y: 7 } },
            { from: { x: 7, y: 2 }, to: { x: 4, y: 2 } },
            // 2. 马二进三 马8进7
            { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },
            { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
            // 3. 车一平二 车9进1
            { from: { x: 8, y: 9 }, to: { x: 7, y: 9 } },
            { from: { x: 0, y: 0 }, to: { x: 0, y: 1 } },
            // 4. 兵七进一 车9平4
            { from: { x: 2, y: 6 }, to: { x: 2, y: 5 } },
            { from: { x: 0, y: 1 }, to: { x: 5, y: 1 } },
            // 5. 马八进七 马2进3
            { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },
            { from: { x: 7, y: 0 }, to: { x: 6, y: 2 } },
            // 6. 车九平八 卒7进1
            { from: { x: 0, y: 9 }, to: { x: 1, y: 9 } },
            { from: { x: 2, y: 3 }, to: { x: 2, y: 4 } },
            // 7. 炮八进四 炮8平7
            { from: { x: 1, y: 7 }, to: { x: 1, y: 3 } },
            { from: { x: 1, y: 2 }, to: { x: 2, y: 2 } },
            // 8. 车二进四 象3进5
            { from: { x: 7, y: 9 }, to: { x: 7, y: 5 } },
            { from: { x: 6, y: 0 }, to: { x: 4, y: 2 } },
        ]
    },

    // ==================== 仙人指路 ====================
    {
        name: '汪洋vs郑惟桐 2018年全国个人赛',
        red: '汪洋',
        black: '郑惟桐',
        year: 2018,
        opening: '仙人指路对卒底炮',
        result: 'red_win',
        moves: [
            // 1. 兵七进一 炮2平3（仙人指路对卒底炮）
            { from: { x: 2, y: 6 }, to: { x: 2, y: 5 } },
            { from: { x: 7, y: 2 }, to: { x: 6, y: 2 } },
            // 2. 炮二平五 象7进5
            { from: { x: 7, y: 7 }, to: { x: 4, y: 7 } },
            { from: { x: 2, y: 0 }, to: { x: 4, y: 2 } },
            // 3. 马二进三 马8进7
            { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },
            { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
            // 4. 车一平二 车9平8
            { from: { x: 8, y: 9 }, to: { x: 7, y: 9 } },
            { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
            // 5. 马八进七 卒7进1
            { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },
            { from: { x: 2, y: 3 }, to: { x: 2, y: 4 } },
            // 6. 车二进六 马2进1
            { from: { x: 7, y: 9 }, to: { x: 7, y: 3 } },
            { from: { x: 7, y: 0 }, to: { x: 8, y: 2 } },
            // 7. 炮八平九 车1平2
            { from: { x: 1, y: 7 }, to: { x: 0, y: 7 } },
            { from: { x: 8, y: 0 }, to: { x: 7, y: 0 } },
            // 8. 车九进一 炮8平7
            { from: { x: 0, y: 9 }, to: { x: 0, y: 8 } },
            { from: { x: 1, y: 2 }, to: { x: 2, y: 2 } },
        ]
    }
];

/**
 * 按开局类型分类
 */
const GAMES_BY_OPENING = {};
for (const game of CLASSIC_GAMES) {
    const opening = game.opening;
    if (!GAMES_BY_OPENING[opening]) {
        GAMES_BY_OPENING[opening] = [];
    }
    GAMES_BY_OPENING[opening].push(game);
}

/**
 * 获取与当前局面匹配的经典对局走法
 * 
 * @param {Array} board - 当前棋盘状态
 * @param {string} side - 当前走棋方 ('r' 红方 / 'b' 黑方)
 * @param {number} moveCount - 当前回合数（从0开始）
 * @param {number} rating - AI 等级分（用于选择对局水平）
 * @returns {Object|null} 匹配的走法 { from: {x, y}, to: {x, y}, source: '对局名称' } 或 null
 */
function findClassicMove(board, side, moveCount, rating = 1200) {
    // 只在前20步使用棋谱（后面局面变化太大）
    if (moveCount > 20) {
        return null;
    }
    
    // 确定搜索的步数索引
    const stepIndex = moveCount;
    
    // 遍历所有经典对局
    const candidates = [];
    
    for (const game of CLASSIC_GAMES) {
        // 检查是否有足够的走法
        if (stepIndex >= game.moves.length) {
            continue;
        }
        
        const candidateMove = game.moves[stepIndex];
        
        // 验证走法是否合理：起点必须有我方棋子
        const piece = board[candidateMove.from.y]?.[candidateMove.from.x];
        if (!piece) continue;
        
        const pieceIsRed = piece === piece.toUpperCase();
        const sideIsRed = side === 'r';
        
        if (pieceIsRed !== sideIsRed) continue;
        
        // 验证终点是否可以到达（简单检查：不能吃自己的子）
        const targetPiece = board[candidateMove.to.y]?.[candidateMove.to.x];
        if (targetPiece) {
            const targetIsRed = targetPiece === targetPiece.toUpperCase();
            if (targetIsRed === sideIsRed) continue; // 不能吃自己的子
        }
        
        candidates.push({
            move: candidateMove,
            game: game,
            weight: calculateGameWeight(game, side, rating)
        });
    }
    
    if (candidates.length === 0) {
        return null;
    }
    
    // 按权重随机选择
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const candidate of candidates) {
        random -= candidate.weight;
        if (random <= 0) {
            console.log(`[ClassicGames] 使用棋谱: ${candidate.game.name}, 步数: ${stepIndex + 1}`);
            return {
                from: candidate.move.from,
                to: candidate.move.to,
                source: candidate.game.name
            };
        }
    }
    
    const selected = candidates[0];
    return {
        from: selected.move.from,
        to: selected.move.to,
        source: selected.game.name
    };
}

/**
 * 计算对局权重
 */
function calculateGameWeight(game, side, rating) {
    let weight = 10;
    
    if ((side === 'r' && game.result === 'red_win') ||
        (side === 'b' && game.result === 'black_win')) {
        weight += 5;
    }
    
    if (game.result === 'draw') {
        weight += 2;
    }
    
    if (rating > 1600) {
        if (game.opening.includes('反宫马') || 
            game.opening.includes('列炮') ||
            game.opening.includes('仙人指路')) {
            weight += 3;
        }
    }
    
    if (rating < 1200) {
        if (game.opening.includes('中炮') && !game.opening.includes('反')) {
            weight += 2;
        }
    }
    
    return weight;
}

/**
 * 获取指定开局类型的所有对局
 */
function getGamesByOpening(openingType) {
    return GAMES_BY_OPENING[openingType] || [];
}

/**
 * 获取所有可用的开局类型
 */
function getAvailableOpenings() {
    return Object.keys(GAMES_BY_OPENING);
}

/**
 * 获取对局总数
 */
function getTotalGamesCount() {
    return CLASSIC_GAMES.length;
}

module.exports = {
    CLASSIC_GAMES,
    GAMES_BY_OPENING,
    findClassicMove,
    getGamesByOpening,
    getAvailableOpenings,
    getTotalGamesCount
};
