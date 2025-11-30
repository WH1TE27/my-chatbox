# my-chatbox

一个基于 React + Vite 的简易多会话 Chatbox。支持多会话管理、Markdown 渲染、AI 回复复制按钮等功能。

## 功能介绍

- **多会话管理**
  - 左侧侧边栏展示会话列表
  - 支持「新建会话」「切换会话」「删除会话」
  - 每个会话单独保存聊天记录、输入框内容、是否固定在底部等状态
  - 所有数据使用 `localStorage` 持久化，刷新页面不会丢失

- **聊天与 AI 回复**
  - 支持用户输入文本消息
  - AI 回复使用预设的 Markdown 模板（例如自我介绍、抖音脚本、北京三日游攻略等）
  - 使用 `react-markdown` + `remark-gfm` + `rehype-highlight` 渲染 Markdown，支持标题、列表、代码块等
  - 支持渲染特定卡片并且跳转到新界面

- **复制 AI 回复**
  - 每条 AI 文本回复气泡下方有一个复制按钮
  - 点击按钮可将该条 AI 回复的**原始 Markdown 文本**复制到剪贴板，方便粘贴到其他地方

- **侧边栏与 UI**
  - 左侧侧边栏可展开/收起
  - 当前会话高亮显示
  - 使用 iconfont 图标

## 技术栈

- **框架**：React + Vite
- **语言**：JavaScript
- **样式**：CSS
- **Markdown 渲染**：
  - `react-markdown`
  - `remark-gfm`
  - `rehype-highlight`
- **数据持久化**：`localStorage`

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
