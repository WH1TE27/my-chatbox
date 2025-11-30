

# 一、整体设计思路

## 1. 产品定位

- 做一个**前端本地运行的多会话 Chatbox**，模拟 AI 聊天场景。
- 目标：
  - 支持用户开启多个独立会话，每个会话有自己的聊天记录。
  - 支持 Markdown 格式的 AI 回复（包括列表、标题、代码块等）。
  - 提供**复制 AI 回复内容**的能力，方便用户二次使用。
  - 所有状态在本地持久化，刷新页面不丢数据。

## 2. 交互与页面结构

- **整体布局**
  - 左侧：会话侧边栏（可展开/收起）。
  - 右上：聊天记录区域（滚动容器）。
  - 右下：输入框和发送按钮（可固定在底部）。

- **多会话交互**
  - 会话列表展示所有历史会话，点击切换。
  - 「新建会话」按钮：创建一个全新空白会话。
  - 每个会话右侧有删除按钮，可删除当前会话。
  - 会话标题：自动更新为该会话的**第一条用户消息**的内容。

- **聊天交互**
  - 用户输入文本 → 发送 → 插入一条 `user` 消息。
  - AI 根据输入匹配预设规则（如包含“脚本”“北京”等）→ 从 [mock/data.json](cci:7://file:///d:/code/chatbox/my-chatbox/src/mock/data.json:0:0-0:0) 中选取对应 Markdown 模板 → 插入 `assistant` 消息。
  - 渲染时对 AI 消息使用 Markdown 渲染器，支持富文本显示。
  - AI 消息下方有一个复制按钮，将该条回复原始 Markdown 内容复制到剪贴板。

## 3. 状态管理与持久化思路

- **每个会话需要保存的内容**
  - 消息列表 `messages`
  - 输入框草稿 `draft`（对应组件里的 `inputValue`）
  - 输入框是否固定在底部 `isFixed`（对应 `Isfixed`）
- **全局需要管理的内容**
  - 全部会话的元信息列表 `sessions`：`[{ id, title, createdAt }]`
  - 当前选中的会话 `currentSessionId`

- **持久化策略**
  - 使用浏览器 `localStorage`，以约定的 key 读写：
    - 会话列表：`SESSION_LIST_KEY = 'chat_sessions'`
    - 当前会话 ID：`CURRENT_SESSION_KEY = 'chat_current_session'`
    - 单个会话数据：`chat_session_${sessionId}`
  - 组件初始化时通过 [bootstrapSessions()](cci:1://file:///d:/code/chatbox/my-chatbox/src/App.jsx:36:0-73:1) 函数，从 `localStorage` 恢复所有状态，如果没有数据则创建一个默认会话。
  - 通过 `useEffect` 监听相关 state，一旦变化就写回 `localStorage`，保证数据始终是最新的。

---

# 二、技术实现方案

## 1. 技术栈与依赖

- **基础框架**
  - React（函数组件 + Hooks）
  - Vite 构建工具

- **Markdown 渲染**
  - `react-markdown`：React 组件形式的 Markdown 渲染器。
  - `remark-gfm`：支持 GitHub 风格 Markdown（表格、任务列表等）。
  - `rehype-highlight`：代码高亮。

- **数据与资源**
  - [src/mock/data.json](cci:7://file:///d:/code/chatbox/my-chatbox/src/mock/data.json:0:0-0:0) 存放：
    - `AiReplyList`：多个预设的 AI 回复 Markdown 文本（自我介绍、抖音脚本、北京三日游等）。
    - 卡片类数据（带图片、链接等），用于展示歌手信息等。

- **样式与 UI**
  - 纯 CSS：[App.css](cci:7://file:///d:/code/chatbox/my-chatbox/src/App.css:0:0-0:0) 管理主要布局和组件样式。
  - iconfont：通过阿里图标库的 CSS 链接在 [index.html](cci:7://file:///d:/code/chatbox/my-chatbox/index.html:0:0-0:0) 中引入，使用 `<i className="iconfont icon-xxx" />` 调用。
  - 自定义 favicon：在 `public/favicon.jpg`，并在 [index.html](cci:7://file:///d:/code/chatbox/my-chatbox/index.html:0:0-0:0) 中用 `<link rel="icon" ...>` 指定。

---

## 2. 多会话管理实现

### 2.1 数据结构设计

- `sessions`（会话列表）：

  ```js
  [
    {
      id: string,         // 会话唯一 ID（例如时间戳或随机数）
      title: string,      // 会话标题，默认 “新对话”，首条用户消息发送后更新
      createdAt: number,  // 创建时间
    },
    ...
  ]
  ```

- `currentSessionId`：当前选中的会话 ID。
- 每个会话在 `localStorage` 中对应一份数据：

  ```js
  {
    messages: [],  // { id, role: 'user'|'assistant', content, type, status, ... }
    isFixed: bool,
    draft: string
  }
  ```

### 2.2 初始化与切换逻辑

- [bootstrapSessions()](cci:1://file:///d:/code/chatbox/my-chatbox/src/App.jsx:36:0-73:1)：
  - 读取 `SESSION_LIST_KEY` 和 `CURRENT_SESSION_KEY`：
    - 如果存在，则根据当前会话 ID 读取该会话的详细数据；
    - 如果不存在，则创建一个默认会话，写入 `localStorage`。
  - 返回初始的：
    - `initialSessions`
    - `initialSessionId`
    - `initialMessages`
    - `initialIsFixed`
    - `initialDraft`

- 在组件中用 `useState` 接收这些初始值：

  ```js
  const [sessions, setSessions] = useState(initialSessions)
  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId)
  const [messages, setMessages] = useState(initialMessages)
  const [Isfixed, setIsFixed] = useState(initialIsFixed)
  const [inputValue, setInputValue] = useState(initialDraft)
  ```

- **切换会话时**（点击侧边栏某一项）：
  - 更新 `currentSessionId`
  - 读取新会话对应的 `chat_session_${sessionId}` 数据，刷新 `messages` / `Isfixed` / `inputValue`。
  - 同时把新 `currentSessionId` 写入 `CURRENT_SESSION_KEY`。

### 2.3 新建和删除会话

- **新建会话**
  - 创建新的 `session` 对象，追加到 `sessions` 中。
  - 为该 `session.id` 写入一份空的会话数据：[getEmptySessionData()](cci:1://file:///d:/code/chatbox/my-chatbox/src/App.jsx:22:0-27:2)
  - 更新 `currentSessionId` 为新会话，UI 切换到空白对话。
  - 所有改动同步写入 `localStorage`。

- **删除会话**
  - 从 `sessions` 数组中移除对应 id 的会话。
  - 删除本地 `localStorage` 中对应的 `chat_session_${sessionId}`。
  - 如果删除的是当前会话：
    - 若还有其他会话：切换到剩下的其中一个。
    - 若已经是最后一个会话：自动创建一个新的默认会话并切过去。
  - 更新 `SESSION_LIST_KEY` 和 `CURRENT_SESSION_KEY`。

---

## 3. 聊天消息与 Markdown 渲染

### 3.1 消息结构

- 每条消息包含：

  ```js
  {
    id: string,
    role: 'user' | 'assistant',
    content: string,   // 文本内容（Markdown）
    type: 'text' | 'card', // 文本或卡片
    status: 'sent' | 'loading', // 是否在加载中
    cardId?: string    // 如果是卡片消息，附带卡片 ID
  }
  ```

- 发送流程：
  - 用户点击发送：
    - 往 `messages` 加一条 `role: 'user'` 的文本消息。
    - 同时加一条 `role: 'assistant', status: 'loading'` 的占位消息，显示「思考中」。
  - 模拟一段延迟后，将该 `assistant` 消息替换为实际 Markdown 内容，`status` 变为 `'sent'`。

### 3.2 Markdown 渲染

- 使用 `ReactMarkdown` 组件：

  ```jsx
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeHighlight]}
  >
    {msg.content}
  </ReactMarkdown>
  ```

- 这样 AI 回复中的：
  - 标题（`#`、`##`）
  - 列表（`-` / `*`）
  - 粗体、斜体
  - 代码块（```）
  都能以友好的格式显示。

---

## 4. 复制按钮实现方案

### 4.1 显示逻辑

在渲染消息列表时，对 AI 文本消息追加复制按钮：

```jsx
{msg.status === 'loading' && msg.role === 'assistant' ? (
  // 显示“思考中”
) : msg.type === 'card' ? (
  <Card ... />
) : (
  <>
    <ReactMarkdown ...>{msg.content}</ReactMarkdown>

    {msg.role === 'assistant' && msg.status === 'sent' && (
      <button
        className="copy-btn"
        onClick={() => {
          if (!msg.content) return
          if (navigator?.clipboard?.writeText) {
            navigator.clipboard
              .writeText(msg.content)
              .catch((err) => {
                console.error('Copy failed', err)
              })
          }
        }}
      >
        <i className='iconfont icon-fuzhi'></i>
      </button>
    )}
  </>
)}
```

### 4.2 复制 API

- 使用浏览器原生 `navigator.clipboard.writeText()` 完成复制。
- 为避免不支持的环境报错，先用可选链 `navigator?.clipboard?.writeText` 做能力检测。
- 如果复制失败，打印错误日志，不打断用户操作。

### 4.3 样式

在 [App.css](cci:7://file:///d:/code/chatbox/my-chatbox/src/App.css:0:0-0:0) 中定义 `.copy-btn`：

```css
.copy-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 30px;
  height: 30px;
  margin-top: 8px;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid #555;
  background-color: transparent;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
}
```

---
## AI实践思路

- 遇到想要实现的功能没有思路
- 将自己想要实现的功能向AI描述但是要求AI只提供思路和技术路线的实现
- 根据AI回复尝试自己实现
- 实现遇到阻碍再向AI提问
- 如果让AI辅助实现代码，实现代码后再让AI对代码实现思路进行解释

---
## 本地运行

确保本机已安装 **Node.js（推荐 18+）** 和 **npm**。

```bash
# 1. 克隆仓库
git clone [https://github.com/WH1TE27/my-chatbox.git](https://github.com/WH1TE27/my-chatbox.git)

# 2. 进入项目目录
cd my-chatbox

# 3. 安装依赖
npm install

# 4. 开发模式启动
npm run dev

---

如果你需要把这些内容整理成**课程报告的“整体设计思路”和“技术实现方案”章节**，可以直接按以上结构复制，然后根据老师要求删减或补充（比如加上你的姓名/学号、开发环境 Node 版本等）。
