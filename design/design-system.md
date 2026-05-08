# 段永平 · H&H 实时持仓看板 · Design System

**Version 0.1 · The Archivist's Ledger**

---

## 0. 设计哲学

这不是一个 dashboard,这是一份**档案**。

> 段永平的投资哲学是「本分 / 平常心 / 慢就是快 / stop doing list」。
> 视觉上必须把这种**克制感**和**长期性**翻译出来 ——
> 不要把它做成让人焦虑的实时屏幕,要做成可以让人安静读半小时的册页。

| 哲学概念 | 视觉转译 |
|---|---|
| **本分** | 留白讲究。不要塞满。重要的东西用空间烘托,不靠颜色嘶吼。 |
| **平常心** | 克制的强调。涨跌色降饱和、用间距和字重制造层级,不靠大色块 |
| **长期持有** | 衬线古典。Cormorant Garamond + Noto Serif SC,不要 sans-only 的"产品味"。 |
| **stop doing list** | 减法美学。没有玻璃拟态、没有 emoji 装饰、没有发光特效、没有圆角。 |
| **不要跟着我买** | 数据完整性免责声明必须显著存在,不能被 happy path 淹没。 |

**核心 metaphor**:WSJ 头版 × 苏富比拍卖目录 × 中国线装古籍 × 香港中环私人银行年报。

---

## 1. 颜色系统

### 1.1 背景三层

层级关系:深 → 浅,强调"纸感"而非"屏幕感"。

| Token | Value | 用途 |
|---|---|---|
| `--bg-ink` | `#0c0c10` | 页面底色。最深,带极轻冷灰。**不要纯黑** `#000`。 |
| `--bg-paper` | `#14141a` | 卡片 / 表格 / drawer 主面 |
| `--bg-raised` | `#1c1c24` | tooltip / 弹层 / hover 高亮基底 |

### 1.2 边线四阶

边线本身就是设计元素。**不要用 box-shadow 替代 border。**

| Token | Value | 用途 |
|---|---|---|
| `--line-mute` | `rgba(245,241,232,0.06)` | 表格行分隔(最弱) |
| `--line-hair` | `rgba(201,169,97,0.10)` | 卡片间细金线 |
| `--line-rule` | `rgba(201,169,97,0.20)` | 卡片边、节分隔 |
| `--line-accent` | `rgba(201,169,97,0.45)` | 角标 / hover 强调 |

### 1.3 文字五阶

文字色 **不是纯白**,是米白色 `#f5f1e8`,贴近老纸。

| Token | Value | 用途 |
|---|---|---|
| `--ink-1` | `#f5f1e8` | 标题 / 关键数字 |
| `--ink-2` | `#c5beae` | 正文 |
| `--ink-3` | `#8a8378` | 元信息 / 列名 |
| `--ink-4` | `#5a5450` | 弱化(MRNA closed 行) |
| `--ink-5` | `#38342f` | 极弱(分隔符 ·) |

### 1.4 金色三阶

**金色是稀缺资源**。整个页面金色比例不超过 5%。只用在:

- "段"字印章 / 关键品牌位
- 报告期 / 下次披露的关键数字
- hover 强调线
- "本分"标记 / NEW 徽章
- 段永平语录的文字内强调引号

| Token | Value | 用途 |
|---|---|---|
| `--gold-deep` | `#6b5a32` | 边线 / 弱金 |
| `--gold` | `#c9a961` | 主金色 |
| `--gold-light` | `#e4cc92` | 高光金 / 印章字 |
| `--gold-glow` | `rgba(228,204,146,0.18)` | 光晕(罕用) |

### 1.5 涨跌色 · 朱砂红 / 旧瓷青

**关键原则:降饱和。**Tailwind 默认的 `red-500` / `green-500` 太刺眼。我们用中国传统颜色:

| Token | Value | 命名缘由 |
|---|---|---|
| `--rise` | `#c0392b` | 朱砂红。比 `#ef4444` 更深沉,接近古籍页眉印章红 |
| `--fall` | `#4a8770` | 旧瓷青 / 苔绿。比 `#22c55e` 更克制,带蓝调 |
| `--rise-soft` | `rgba(192,57,43,0.16)` | 徽章背景 |
| `--fall-soft` | `rgba(74,135,112,0.16)` | 徽章背景 |

**红涨绿跌**(中国习惯)。但记住:**这两个色不是用来"上色"的,是用来"标注"的**。

#### 涨跌色使用边界(必须严格遵守)

| 允许使用 | 禁止使用 |
|---|---|
| 单元格"日 %"列的数字 | 整行背景色 |
| 季度动作"加仓 / 减仓"标签 | 实时价数字本身 |
| 估值热力图的格子背景 | 任何 hover 高亮 |
| 当日组合涨跌 hero 数字 | 边框、按钮、tab 状态 |
| 散点图柱状条 | 大面积区域 |

> **理由:**段永平最不希望投资者被涨跌情绪左右。视觉上让"涨绿跌红"成为信息标注,而不是情绪信号。

---

## 2. 字体系统

**完全避开 Inter / Roboto / Arial / system-ui** 这些 AI 默认字体。

### 2.1 字体栈

| Token | Family | 用途 | 性格 |
|---|---|---|---|
| `--serif-display` | `Cormorant Garamond` + `Noto Serif SC` | 大数字、品牌名、徽章号 | 古典、修长、有 italic 灵气 |
| `--serif-cn` | `Noto Serif SC` | 中文衬线引用、节标题中文 | 老派、宋体 |
| `--serif-quote` | `Newsreader` | 段永平语录、pull quote | 报章 italic,适合长引用 |
| `--sc` | `Cormorant SC` | small caps 章节标签 | 拉丁文献感、复古 |
| `--sans` | `Plus Jakarta Sans` + `Noto Sans SC` | UI 正文、按钮、tooltip | 现代但不平庸,几何但不冰冷 |
| `--mono` | `JetBrains Mono` | 所有数字、时间戳、CUSIP | tabular-nums、清晰、技术感 |

### 2.2 字号 scale

不是 Tailwind 默认 scale。基于"刊物排版"的级数:

| Class | px | 用途 |
|---|---|---|
| `display-xl` | 60 | hero 大数字 ($17.51 B) |
| `display-l` | 56 | 报告期 (2025 · Q4) |
| `display-m` | 44 | 下次披露 |
| `display-s` | 36 | hero italic 副标 |
| `h-page` | 58 | 品牌主标 (段永平 · H&H) |
| `h-section` | 28 | 节级 italic |
| `h-quote` | 30 | 当日引言 |
| `h-card` | 22 | 热力图 ticker |
| `body` | 14–16 | 正文 |
| `meta` | 11–12 | 元信息 |
| `caption` | 10 | 章节标签 |
| `lbl-sm` | 9 | 极小元信息 |

### 2.3 字体使用规则

| 场景 | 字体 | 原因 |
|---|---|---|
| 数字(价格、百分比、份额) | `--mono` + tabular-nums | 列对齐、可读 |
| 大数字(hero、卡片) | `--serif-display` | 古典优雅 |
| 中文标题 | `--serif-cn` (700) + 大 letter-spacing 0.42em | 古籍感 |
| 中文段落 | `--serif-cn` (400) + line-height 1.85 | 易读 |
| 引用 / 语录 | `--serif-quote` italic | 编辑感 |
| 徽章 / 章节 | `--sc` + uppercase + 0.18em tracking | 拉丁文献风 |
| UI 控件 | `--sans` | 不抢戏 |

### 2.4 letter-spacing 守则

中文衬线在大字时需要 **正向 tracking** 来透气:

- 中文标题:`0.30em` ~ `0.42em`(字间距)
- 中文章节标签:`0.42em ~ 0.55em`("新 · 建 · 仓"这种)
- 拉丁 small caps:`0.16em ~ 0.22em`
- mono 元信息:`0.05em ~ 0.10em`
- 大字英文标题:`-0.012em`(微负,显紧凑)

---

## 3. 间距网格

基于 4px 网格,但实际使用 **8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 80**。

| Token | px | 用途 |
|---|---|---|
| `space-1` | 4 | icon ↔ 文字 |
| `space-2` | 8 | 紧凑组件内 |
| `space-3` | 12 | 默认行内 |
| `space-4` | 16 | 段落 |
| `space-5` | 20 | 卡片内边距 |
| `space-6` | 24 | 卡片大内边距 |
| `space-8` | 32 | 节级间距 |
| `space-10` | 40 | 主区域水平 padding |
| `space-14` | 56 | hero 上下 |
| `space-20` | 80 | 大节之间 |

容器宽度:`max-w-[1480px]`(比 Tailwind 默认 7xl=1280 更宽,适合数据密集)。

---

## 4. 组件规范

### 4.1 段印章 `.seal`

整个项目的 signature element。**不能省略,不能换 emoji**。

```css
.seal {
  width: 92px; height: 92px;
  border: 2px solid var(--gold);
  inset: 4px 后 1px solid var(--line-accent); /* 双框 */
  font-family: 'Noto Serif SC' weight 700;
  font-size: 60px;
  color: var(--gold-light);
  background: 重复对角线 + 朱砂底色;
  transform: rotate(-2deg); /* 微微歪 */
  box-shadow: 0 0 28px -6px rgba(192,57,43,0.20);
}
```

变体:footer 用 60×60、36px 字、`rotate(-3deg)` —— 像盖章不正,有人味。

### 4.2 卡片 `.ban-xin`(版心)

**不用 rounded 圆角**。所有卡片直角 + 1px 边框 + 四角"角标"装饰。

```css
.ban-xin {
  border: 1px solid var(--line-rule);
  background: var(--bg-paper);
  padding: 1.4rem;
  position: relative;
  /* 四个 .corner-mark 子元素填四角 */
}
.corner-mark {
  width: 7px; height: 7px;
  border: 1px solid var(--line-accent);
  /* tl/tr/bl/br 各保留两边 */
}
```

> 角标灵感来自旧课本封面、文集装订线 —— 微小但 unforgettable。

### 4.3 动作徽章 `.badge`

**直角矩形**,不要 pill / capsule。1px 边、3px×8px padding、10px mono 字、0.10em tracking。

| 类型 | 样式 |
|---|---|
| `badge-new` | gold-light 字 / gold 边 / 微金 bg | `◆ NEW · 2025 Q1` |
| `badge-add` | rise 字 / rise 边(50% alpha) / rise-soft bg | `▲ +12.4%` |
| `badge-cut` | fall 字 / fall 边 / fall-soft bg | `▼ −22.6%` |
| `badge-close` | ink-3 字 / mute 边 / 透明 bg | `✕ closed` |
| `badge-hold` | ink-3 字 / 透明边 | `— hold` |

特殊徽章:

- `.tenet` "本 · 分":中文衬线,gold-light 字,0.55em letter-spacing。 标记长持仓(>20 季度)
- `.opt-tag` "⚙ PUT":mono 字、gold-light、9px。 标记期权头寸

### 4.4 表格 `.book-table`

**关键设计原则:hairline + 编辑感 + 不要 zebra stripes**。

```
表头:
  字体 Cormorant SC
  10px / 0.16em tracking / uppercase
  上下两条 hairline

行:
  18px 上下 padding
  列下单条 line-mute (0.06 alpha)
  hover 时:左侧 2px gold 竖线滑入(transition 0.22s)
  hover 时:行背景 rgba(201,169,97,0.025) —— 几乎看不见
```

**列对齐**:
- 序号 / Ticker / 名称:左对齐
- 动作徽章:左对齐(因为含可变宽度文字)
- 数字所有列:右对齐 + tabular-nums

**列宽**:

| 列 | 宽 | 备注 |
|---|---|---|
| # | 32px | 罗马小写斜体 i, ii, iii(`.idx` 类) |
| Issuer | flex | 含 ticker(21px Cormorant)+ 中文名(12px)+ 标签(本分/PUT) |
| Action | auto | badge |
| Qtrs | 70 | 持仓季数 |
| Last | 90 | 实时价 |
| Δ Day | 80 | 涨跌色 |
| Disclosed | 110 | 披露市值 |
| Weight | 170 | 数字 + 90px 横条 |
| PE | 70 | |
| 5Y %ile | 70 | 涨跌色按高低 |

### 4.5 Tab `.tab` / `.tab-bar`

**不用 button,用 inline 切换文本**。底部 1px 金线表示当前态。

- 字体:Cormorant SC + Noto Serif SC 中文(中文 0.42em letter-spacing)
- 当前态:`--ink-1` 字色 + 底部 1px gold underline
- 非当前态:`--ink-3` 字色,无 underline
- "参考标"用 `.est`:9px sans + 1px dashed border —— 视觉降级

### 4.6 段永平语录 drawer

```
ban-xin 容器
├── 顶部:lbl-sm "XUEQIU · STATEMENTS" + ticker + 关闭 ✕
├── 元信息:N statements · 时间区间 · 排序
├── 多条语录(border-top 分隔):
│   ├── 日期 lbl-sm + 来源 + "原帖 →" gold-link
│   ├── pull-quote 16px italic line-height 1.75
│   │   └── 中文用 `.h-cn`, 英文用 italic em
│   └── 标签 badge 列
└── "查看 N 条全部 →" gold-link
```

**关键:语录里中英混排时,中文用 `.h-cn`(serif-cn)直立,英文用 italic em 倾斜**。这是 editorial typography 的细节。

### 4.7 估值热力图 `.heat-grid`

6 列 grid,1px 间距(用 `gap` + 容器底色 `--line-hair` 制造网格线)。

每格:
- aspect-ratio 1.05(略矮于正方,显沉稳)
- 14px padding
- flex column space-between(标签 / ticker / PE 数据 三层)
- ticker 字体 22px Cormorant Garamond

色阶 4 阶 + vacant:

| 类 | 色 | 含义 |
|---|---|---|
| `heat-q1` | rise → rise-soft 渐变(青) | 0–25 %ile,便宜 |
| `heat-q2` | 弱青 | 25–50 |
| `heat-q3` | 弱朱 | 50–75 |
| `heat-q4` | 朱→深朱 渐变 | 75–100,昂贵 |
| `heat-vacant` | 透明 + 1px dashed border | 占位 |

hover:`translateY(-2px)` + `outline 1px gold`。

### 4.8 顶部时间戳条

三类数据状态用三种**色点**区分(色点宽度 6px 方块或圆):

| 数据类 | 色点 | 文字 |
|---|---|---|
| 行情(实时) | rise 圆 + 脉冲动画 | `QUOTE / 实时 · 28 s ago` |
| 13F(季度) | gold 方块 | `13F / 2025-12-31 · filed 02-14` |
| 基本面(每日) | ink-3 方块 | `FUNDAMENTALS / EOD · 04-29` |

---

## 5. 微交互

**全站只允许两种入场动画**,不要堆砌:

### 5.1 `.stagger` page-load

- 子元素 opacity 0 → 1
- transform translateY(10px → 0)
- 0.75s ease,delay 阶梯 0.05 / 0.18 / 0.32 / 0.46 / 0.60 / 0.74
- 只用在 hero、引言、quartet 这些首屏块

### 5.2 `.gold-rule`

- 金色 hairline 从中心向两侧画出(scaleX 0 → 1)
- 1s ease
- 用在 hero 底部的分隔线

### 5.3 hover state

| 元素 | 行为 |
|---|---|
| 表格行 | 左侧 2px 金竖线滑入(width 0 → 2px) + 行底色 0.025 alpha |
| 热力图格 | translateY -2px + outline 1px gold |
| gold-link | 颜色 light → bright + border-color 加深 |
| tab | 字色 ink-3 → ink-2 |

**禁止使用**:transform scale(>1.02)、阴影脉冲、彩色发光、float 动画。

### 5.4 实时点 `.pulse`

```css
@keyframes pulse-dot {
  0%,100% { opacity: 1; transform: scale(1); }
  50%     { opacity: 0.55; transform: scale(0.85); }
}
```

只用在顶部"行情实时"色点。频率 2.4s。

---

## 6. 表格密度可读性策略

数据密集是这个项目的核心挑战。十一行 × 十列的表必须好读。

| 策略 | 实现 |
|---|---|
| 数字列右对齐 | `text-right` |
| 数字字体等宽 + tabular-nums | `font-mono` + `font-feature-settings: 'tnum' 1` |
| 行高足够呼吸 | 18px 上下 padding |
| 中英文双行 | ticker(21px Cormorant)+ 中文(12px Noto Serif SC)+ 元信息(9px Cormorant SC) |
| 分组分隔 | 行间用 `--line-mute` 几乎不可见的细线 |
| hover 状态用空间提示 | 2px 金线滑入 + 极弱底色,而非整行变色 |
| 已清仓行 opacity 0.55 + 删除线 | 视觉降级 |
| 长列名用 small caps | 缩短表头视觉宽度 |
| 关键数字配大字号 | ticker 21px / 数字 14px / 元信息 9px |

---

## 7. "段永平气质"细节清单

这是设计 vs 实现时不能丢的灵魂细节:

| # | 细节 | 体现 |
|---|---|---|
| 1 | 朱砂"段"字印章 | 整页唯一的中文落款 element |
| 2 | "丙午年 · 季春"古日 + 西元日并列 | 顶部时间戳条 |
| 3 | 引言条用古典 italic + 中英混排 | "本分这两个字,...do the right thing" |
| 4 | 卡片角的 `.corner-mark` 四角线 | 古籍装订线感 |
| 5 | 罗马小写序号 `i, ii, iii` | 旧版书目录 |
| 6 | "本分" 标签的 0.55em 大字间距 | 古印 / 章法 |
| 7 | "stop doing list 比 to do list 更重要" footer 引言 | 段永平 signature 哲学 |
| 8 | "不要跟着我买"投资警示 | 段永平本人的话 |
| 9 | 期权头寸 `⚙ PUT` 小标记 | 段永平爱卖 put 的风格化标识 |
| 10 | "新 · 建 · 仓" 节标题 0.42em 字间距 | 古籍标目 |
| 11 | 数据完整性 banner 朱砂底 + ⚠ | 编者按风,不是 alert |
| 12 | footer 印章 `rotate(-3deg)` | 像人手盖章不正 |
| 13 | "MMXXVI" 罗马年 | 拍卖目录式 |
| 14 | 估值热力图按"贵 / 公允 / 便宜"三态而非热度排序 | 投资学认知,不是热度学 |

---

## 8. 反模式 · 禁止清单

| ❌ 不要 | ✅ 替代方案 |
|---|---|
| Tailwind 默认 `bg-emerald-500` `text-rose-400` | 自定义 `--rise` `--fall` 朱砂青色 |
| 圆角 `rounded-lg` | 直角 + 1px hairline + 四角标 |
| 玻璃拟态 backdrop-blur | 实色卡片 + corner-mark |
| 紫粉渐变 / sky 渐变 | 仅金色阶 + 朱砂阶 |
| Inter / Roboto / system-ui 单一 sans | Cormorant + Noto Serif SC + JetBrains Mono + Plus Jakarta Sans |
| emoji(🚀 📈 ✨ 🔥) | 几何符号 ▲ ▼ ◆ ✕ ⚙ |
| 整行涨跌色 | 仅"日 %"列 + 徽章着色 |
| 大圆形头像 | "段"字方印 |
| pill 胶囊徽章 | 直角徽章 |
| neon glow / drop-shadow 发光 | 仅 footer 印章微微 box-shadow |
| 卡通插画 / 3D 图标 | 全 typography + 几何线条 |
| Bloomberg 灰白橙单调 | 深色墨夜 + 克制金 + 朱砂点缀 |

---

## 9. 实施时的 Component → Token 对照

后续 Phase 3 React + Tailwind 实现时,把本文档的 CSS 变量直接映射到 `tailwind.config.ts`:

```ts
// tailwind.config.ts (后续 Phase 3 用)
export default {
  theme: {
    extend: {
      colors: {
        ink: { 0:'#0c0c10', paper:'#14141a', raised:'#1c1c24' },
        bone: { 100:'#f5f1e8', 200:'#c5beae', 300:'#8a8378', 400:'#5a5450', 500:'#38342f' },
        gold: { deep:'#6b5a32', DEFAULT:'#c9a961', light:'#e4cc92' },
        rise: '#c0392b',
        fall: '#4a8770',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"Noto Serif SC"', 'serif'],
        serifCn: ['"Noto Serif SC"', 'serif'],
        quote:   ['Newsreader', 'serif'],
        sc:      ['"Cormorant SC"', 'serif'],
        sans:    ['"Plus Jakarta Sans"', '"Noto Sans SC"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
}
```

每个组件文件应该 import 这份文档列出的 token,**不要硬编码颜色 / 字号**。

---

## 10. Self-Evaluation

### 10.1 哪些细节体现了"段永平气质"

1. **朱砂"段"字印章**:整个设计的灵魂落款,微微歪斜(`rotate(-2deg)`),像真人盖章。不是中性的 monogram,是有"我"的标识。
2. **引言条 + 古籍鱼尾**:hero 区"本分这两个字,是我们公司的核心" + ▼ 鱼尾分隔符,直接把段永平本人的话作为页面"碑文"。
3. **"丙午年 · 季春"古历**:顶部时间戳并列阴历干支与公历 MMXXVI,把"长期视角"植入到时间感知里。
4. **数据完整性免责声明**:朱砂底 + ⚠ 编者按式排版,而不是常规 alert 红色 banner —— 因为段永平本人就强调"不要跟着我买"。
5. **"本分"长持标签**:用中文衬线 + 0.55em 大字间距,像古印章的章法。只标给持仓 ≥20 季度的票(AAPL 28 季、BRK.B 32 季)。
6. **footer 的 stop doing list 引言** + 印章微歪:把段永平的标志性哲学放在结尾,不喧宾夺主。

### 10.2 哪些地方做了"视觉冒险"(超出常规财务看板)

1. **罗马小写斜体序号 `i, ii, iii`**:99% 的 dashboard 用阿拉伯数字 1/2/3,我用罗马小写 + Cormorant italic,直接拉到 18 世纪刊物气质。
2. **中英文双行排版**:ticker 是大字 Cormorant + 中文小字 Noto Serif SC 双重身份,常规 dashboard 只放一种。
3. **没有任何饼图**:分配 100% 用横条 + 数字表达,而不是 Recharts donut。**段永平讨厌花架子**,饼图是花架子。
4. **估值热力图按贵/公允/便宜 + ticker 名表**:不是常规的"权重 × 行业"九宫格,而是把"段永平在什么估值水位上买入" 这个核心问题直接翻译成 grid。
5. **季度动作面板 4 栏直角卡 + 中文章节标签 0.42em 字间距**:像旧报纸的"立春 / 立夏 / 立秋 / 立冬"四时令版面,而不是 dashboard 常见的 4-card-row。
6. **顶部"丙午年 · 季春" + MMXXVI 罗马数字**:把农历干支、24 节气、罗马年混排,这是大胆的文化层次叠加。

### 10.3 哪些妥协是有意为之

1. **没用变量字体的全部 axes**:Cormorant Garamond 是 variable font,可以调 OPSZ / WGHT / SOFT 多轴,但实现里只用了一两档 weight 和 italic —— 因为 Tailwind CDN 模式下用 `font-variation-settings` 会让 selector 变重,Phase 3 React 时再开。
2. **drawer 没做真正的滑入收起**:设计稿里 drawer 是直接展示展开态,而不是从右侧滑入。理由是这是 design lock-in 文档,要让人一眼看到"展开后长什么样",不是演示 interaction。
3. **没做暗 / 亮主题切换**:档案感天然适合 dark。亮模式会让"老纸"质感变成"白纸",失去一半精神内核。**有意拒绝 toggle**。
4. **数据是 dummy**:权重总和 100.81%(故意 + 期权 notional 让它略大于 100,符合 13F 真实结构)、AAPL 33.65%(段永平历史 79% 巅峰已减仓多次后的合理水位)。Phase 1 接 EDGAR 后会刷成真数据,但 Phase 3 实现时 dummy 应当保留作 storybook fixture。
5. **没有移动端布局**:`max-w-[1480px]` 桌面优先。这是个"档案",不是"app"。移动端做成"目录页 + 单栏长滚动"是 v2 工作。
6. **港股 / A 股 tab 灰化但内容相同结构**:设计稿只展示了美股 tab 内容,港股 / A 股 tab 视觉降级("参考标 · 公开访谈"),内容结构与美股一致(只是数据源标签不同)—— 让 Phase 3 复用同一组件即可。

---

**End of Design System v0.1**

> 「做对的事情,把事情做对」 —— 段永平
