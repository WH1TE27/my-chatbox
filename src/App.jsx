import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import mockData from './mock/data.json'
import dtImg from './mock/DT.jpeg'
import beatlesImg from './mock/Beatles.webp'
import fayeImg from './mock/faye.jpg'
import './App.css'
import 'highlight.js/styles/atom-one-dark.css'

//数据结构定义
//会话列表
const SESSION_LIST_KEY = 'chat_sessions'
//每个单独会话
const CURRENT_SESSION_KEY = 'chat_current_session'

const getSessionStorageKey = (sessionId) => `chat_session_${sessionId}`

//复制一份初始消息列表并深拷贝一层，避免后面修改时直接改到 mockData 原始数据。
const cloneInitialMessages = () => (mockData.initialMessages || []).map((msg) => ({ ...msg }))

//定义新对话的默认状态
const getEmptySessionData = () => ({
  messages: cloneInitialMessages(),
  isFixed: false,
  draft: '',
})

//读取目标对话的数据返回对象
const loadSessionData = (sessionId) => {
  if (!sessionId) return null
  const raw = localStorage.getItem(getSessionStorageKey(sessionId))
  return raw ? JSON.parse(raw) : null
}

//启动时自举所有对话
const bootstrapSessions = () => {
  //获取对话列表
  let sessions = JSON.parse(localStorage.getItem(SESSION_LIST_KEY) || '[]')
  //获取当前对话的id
  let currentId = localStorage.getItem(CURRENT_SESSION_KEY)

  //如果没有历史对话默认新建对话
  if (sessions.length === 0) {
    const freshSession = {
      id: `session_${Date.now()}`,
      title: '新聊天',
      createdAt: Date.now(),
    }
    //把新建的对话添加到对话列表中
    sessions = [freshSession]
    currentId = freshSession.id
    //存储到localstorage
    localStorage.setItem(getSessionStorageKey(freshSession.id), JSON.stringify(getEmptySessionData()))
    localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(sessions))
    localStorage.setItem(CURRENT_SESSION_KEY, currentId)
  } else if (!currentId) {
    currentId = sessions[0].id
    localStorage.setItem(CURRENT_SESSION_KEY, currentId)
  }
  //如果currentId丢失默认第一个会话是current

  //加载当前会话的数据
  const currentData = loadSessionData(currentId) || getEmptySessionData()

  return {
    initialSessions: sessions,
    initialSessionId: currentId,
    initialMessages: currentData.messages || [],
    initialIsFixed: currentData.isFixed ?? false,
    initialDraft: currentData.draft ?? '',
  }
}

//逻辑层
function App() {
  const {
    initialSessions,
    initialSessionId,
    initialMessages,
    initialIsFixed,
    initialDraft,
  } = bootstrapSessions()

  const [sessions, setSessions] = useState(initialSessions)
  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId)

  // 对话消息列表：后面会用 setMessages 来新增/更新
  const [messages, setMessages] = useState(initialMessages)
  
  //对话框固定状态
  const [Isfixed, setIsFixed] = useState(initialIsFixed)

  // 输入框草稿
  const [inputValue, setInputValue] = useState(initialDraft)

  //侧边栏开合状态
  const [IsClosed, setIsClosed] = useState(false)

  // 将当前 session 的数据写回 localStorage
  useEffect(() => {
    const payload = {
      messages,
      isFixed: Isfixed,
      draft: inputValue,
    }
    localStorage.setItem(getSessionStorageKey(currentSessionId), JSON.stringify(payload))
  }, [messages, Isfixed, inputValue])

  // 当切换 session 时加载数据
  useEffect(() => {
    localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId)
    const data = loadSessionData(currentSessionId) || getEmptySessionData()
    setMessages(data.messages || [])
    setIsFixed(data.isFixed ?? false)
    setInputValue(data.draft ?? '')
  }, [currentSessionId])

  //Ai回复数组
  const AiReplyList = mockData.AiReplyList 

  //卡片数据数组
  const cardsData = mockData.Cards
  const cardImageMap = {
    card1: dtImg,
    card2: beatlesImg,
    card3: fayeImg
  }

  // 计数器：用来生成递增的 id，不影响界面，用 useRef 更合适
  const idCounterRef = useRef(1)

  // 消息列表滚动容器的 ref，用于实现自动滚动到底部
  const chatListWrapperRef = useRef(null)

  //随机数函数：返回 [N, M] 区间的整数
  function getRandom(N, M) {
    return Math.floor(Math.random() * (M - N + 1)) + N
  }
  
  //处理按下回车发送消息
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault() // 阻止默认的换行行为
      sendMessage()
    }
  }

  //实现模拟对话：返回“类型 + 数据”的规则对象
  function getReplyRule(userText) {
    const text = userText.toLowerCase()

    if (text.includes('hello') || text.includes('你好') || text.includes('hi')) {
      return {
        type: 'text',
        text: AiReplyList[0],
      }
    }

    if (text.includes('介绍') && (text.includes('你自己') || text.includes('你是谁'))) {
      return {
        type: 'text',
        text: AiReplyList[1],
      }
    }

    if (text.includes('冒泡')) {
      return {
        type: 'text',
        text: AiReplyList[2],
      }
    }

    if (text.includes('天气')) {
      return {
        type: 'text',
        text: AiReplyList[3],
      }
    }

    if (text.includes('脚本')) {
      return {
        type: 'text',
        text: AiReplyList[4]
      }
    }

    if (
      text.includes('介绍') &&
      (text.includes('歌手') || text.includes('乐队') || text.includes('你喜欢'))
    ) {
      return {
        type: 'card',
        cardId: `card${getRandom(1, 3)}`,
      }
    }

    return {
      type: 'text',
      text: '抱歉，我不太明白你的意思',
    }
  }

  //实现打字机效果
  function typeWrite(msgId, reply) {
    //先将状态更新为typing
    setMessages((prev) => 
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              status: 'typing',
              content: '',
            }
          : m
      )
    )

    //开始打字
    let index = 0
    const timerId = setInterval(() => {
      index++
      const current = reply.slice(0, index)
      setMessages((prev) => 
        prev.map((m) =>
          m.id === msgId
            ? {
              ...m,
                content: current,
              status: index === reply.length ? 'sent' : 'typing',
              }
            : m
        )
      )

      if (index === reply.length) {
        clearInterval(timerId)
      }
    }, 40)
  }

  // 切换到指定会话
  function handleSelectSession(sessionId) {
    if (sessionId === currentSessionId) return
    setCurrentSessionId(sessionId)
    setIsClosed(false)
  }

  function handleDeleteSession(e, sessionId) {
    e.stopPropagation()
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId)
      localStorage.removeItem(getSessionStorageKey(sessionId))
      if (next.length === 0) {
        const freshSession = {
          id: `session_${Date.now()}`,
          title: '新聊天',
          createdAt: Date.now(),
        }
        const sessionsArr = [freshSession]
        localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(sessionsArr))
        localStorage.setItem(
          getSessionStorageKey(freshSession.id),
          JSON.stringify(getEmptySessionData())
        )
        setCurrentSessionId(freshSession.id)
        return sessionsArr
      }
      localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(next))
      if (sessionId === currentSessionId) {
        setCurrentSessionId(next[0].id)
      }
      return next
    })
  }

  //创建新会话
  function createNewSession() {
    const newSession = {
      id: `session_${Date.now()}`,
      title: `新聊天 ${sessions.length + 1}`,
      createdAt: Date.now(),
    }
    const nextSessions = [newSession, ...sessions]
    setSessions(nextSessions)
    localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(nextSessions))
    localStorage.setItem(
      getSessionStorageKey(newSession.id),
      JSON.stringify(getEmptySessionData())
    )
    setCurrentSessionId(newSession.id)
    setIsClosed(false)
  }

  //发送消息
  function sendMessage() {
    setIsFixed(true)
    const text = inputValue.trim()
    if (!text) return

    // 如果这是本会话中的第一条用户消息，用它来更新会话标题
    const hasUserMessage = messages.some((m) => m.role === 'user')
    if (!hasUserMessage) {
      const newTitle = text.length > 20 ? `${text.slice(0, 20)}...` : text
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                title: newTitle,
              }
            : s
        )
        localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(next))
        return next
      })
    }

    const userId = `m${idCounterRef.current++}`
    const aiId = `m${idCounterRef.current++}`

    const newMessage = {
      id: userId,
      role: 'user',
      content: text,
      createdAt: Date.now(),
      status: 'sent',
      type: 'text',
    }

    // 追加一条新的用户消息
    setMessages((prev) => [...prev, newMessage])

    // 清空输入框
    setInputValue('')
    
    //发送后延迟一段时间模拟AI回复

    //loading状态的ai回复
    const loadingMessage = {
      id: aiId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      status: 'loading',
      type: 'text',
    }

    // 先追加用户消息 + 一条 AI 的加载中消息
    setMessages((prev) => [...prev, loadingMessage])

    // 发送后延迟一段时间，模拟 AI 回复
    setTimeout(() => {
      const rule = getReplyRule(text) // rule 描述回复类型
      console.log('[sendMessage] rule:', rule)

      // 卡片消息：直接替换 loading 消息为 card 类型
      if (rule.type === 'card') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  type: 'card',
                  status: 'sent',
                  cardId: rule.cardId,
                  content: '', // 真实内容交给渲染层根据 cardId 来渲染
                }
              : m
          )
        )
        return // 不再走打字机逻辑
      }

      // 文本消息：启动打字机效果，由 typeWrite 唯一负责更新这条 AI 消息
      if (rule.type === 'text') {
        typeWrite(aiId, rule.text)
      }
    }, 2000)
  }

  // 当 messages 变化时，自动滚动到底部
  useEffect(() => {
    const wrapper = chatListWrapperRef.current
    if (!wrapper) return

    // 使用平滑滚动效果
    wrapper.scrollTo({
      top: wrapper.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  // 根据 cardId 找到对应卡片数据
  function findCardById(cardId) {
    return cardsData.find(card => card.id === cardId)
  }

  // 卡片组件
  function Card({ card }) {
    if (!card) return null

    return (
      <div className="cards">
        <img src={cardImageMap[card.id] ?? card.img} alt={card.name} />
        <a
          href={card.links[0].url}
          className="name"
          target="_blank"
          rel="noopener noreferrer"
        >
          {card.name}
        </a>
        <p>{card.description}</p>
        <ul className="intro">
          {card.links.slice(1).map(link => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  //渲染层
  return (
    <>
      {/* 侧边栏 */}
      <div className={`sider-container ${IsClosed ? 'closed' : 'opened'}`}>
        <div className= {`sider-${IsClosed ? 'closed' : 'opened'}`}>
          <p>
            <button className='close' title='关闭边栏' onClick={() => setIsClosed(prev => !prev)}>
              <i className='iconfont icon-sidebarcebianlan'></i>
            </button>
          </p>
          <button className='new-chat' title='创建新聊天' onClick={createNewSession}>
            <i className='iconfont icon-xiezi'></i>
            <span>新聊天</span>
          </button>
          <ul className="session-list">
            {sessions.map((session) => (
              <li
                key={session.id}
                className={`session-item${
                  session.id === currentSessionId ? ' active' : ''
                }`}
                onClick={(e) => {
                  //防止点击切换对话时触发其他按钮
                  e.stopPropagation();
                  handleSelectSession(session.id);
                }}
              >
                <span className="session-title">{session.title}</span>
                <button
                  className="session-delete-btn"
                  title="删除会话"
                  onClick={(e) => {
                    //防止点击删除对话时触发其他按钮
                    e.stopPropagation();
                    handleDeleteSession(e, session.id);
                  }}
                >
                  <i className='iconfont icon-lajitong'></i>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 右侧区域 */}
      <div className="right">
        {/* 顶部栏 */}
        <div className="header">
          <i className="iconfont icon-jiqirenguanli"></i>
          <span>Chatbot</span>
        </div>
        <div className="footer">
          请核查重要信息
       </div>
        <div
          className="chat-list-scroll-wrapper"
          ref={chatListWrapperRef}
        >
          {/* 消息列表 */}
          <div className="chat-list">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message-row ${msg.role}`}
              >
                <div className="message-bubble">
                  {msg.status === 'loading' && msg.role === 'assistant' ? (
                    <span className="loading-dot">
                      <i className="iconfont icon-radio-on-full"></i>思考中
                    </span>
                  ) : msg.type === 'card' ? (
                    <Card card={findCardById(msg.cardId)} />
                  ) : (
                    <>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {msg.content}
                      </ReactMarkdown>
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
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 对话框 */}
        <div className={`chatbox${Isfixed ? '-fixed' : ''}`}>
          <textarea
            id="tx"
            placeholder='询问任何问题'
            maxLength={200}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          ></textarea>
          
          {/* 按钮点击事件 */}
          <button onClick={sendMessage}>
            <i className='iconfont icon-chevron-up'></i>
          </button>
        </div>
      </div>
    </>
  )
}

export default App
 