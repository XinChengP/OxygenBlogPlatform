/**
 * Live2D 消息配置文件
 * 包含所有普通消息的配置，彩蛋消息保留在原系统中
 * 
 * 消息类型说明：
 * - WELCOME: 欢迎消息（页面加载、欢迎回来等）
 * - INTERACTION: 互动消息（鼠标悬停、点击等）
 * - PAGE: 页面相关消息（不同页面的欢迎语）
 * - TIME: 时间相关消息（问候、停留时间等）
 * - READING: 阅读进度消息
 * - THEME: 主题切换消息
 * - MUSIC: 音乐相关消息
 * - COPY: 复制内容消息
 * - MARKDOWN: Markdown编辑器相关消息
 * - GENERAL: 通用消息
 */

export interface MessageConfig {
  messages: readonly string[];
  duration: number;
  priority: number;
}

// 消息优先级定义
export const MessagePriority = {
  LOW: 1,
  NORMAL: 3,
  MEDIUM: 5,
  HIGH: 7,
  URGENT: 9,
} as const;

// 消息显示时长定义（毫秒）
export const MessageDuration = {
  SHORT: 2000,
  NORMAL: 3000,
  LONG: 4000,
  EXTRA_LONG: 5000,
} as const;

/**
 * 欢迎消息配置
 */
export const WelcomeMessages = {
  // 页面初次加载欢迎
  PAGE_LOAD: {
    messages: [
      '天依来啦！很高兴见到你～',
      '欢迎光临！天依在这里陪你～',
      '你来啦！今天也要开心哦～',
      '天依已上线！准备好开始了吗？'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.NORMAL
  },

  // 欢迎回来（页面重新可见）
  WELCOME_BACK: {
    messages: [
      '你回来啦！天依一直在这里等你～',
      '欢迎回来！继续刚才的阅读吧～',
      '天依没有离开过哦～',
      '页面重新可见了呢，太好了！',
      '天依想念你了～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.NORMAL
  }
} as const;

/**
 * 互动消息配置
 */
export const InteractionMessages = {
  // 标题悬停
  TITLE_HOVER: {
    messages: [
      '要看看 {text} 吗？',
      '这是什么呢？好有趣的样子～',
      '想要了解更多吗？',
      '这个标题看起来很吸引人呢！'
    ],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },

  // 搜索框悬停
  SEARCH_HOVER: {
    messages: [
      '在找什么东西呢，需要帮忙吗？',
      '搜索很重要哦，天依来帮你～',
      '找不到想要的内容吗？',
      '有什么想知道的吗？'
    ],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },

  // 导航链接悬停
  NAVIGATION_HOVER: {
    messages: [
      '这里好像有很好玩的内容！',
      '要去看其他地方吗？',
      '导航很重要呢～',
      '想去哪里看看呢？'
    ],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },

  // 点击看板娘
  LIVE2D_CLICK: {
    messages: [
      '想听我唱歌吗？',
      '天依很萌的！',
      '要请我吃小笼包吗qwq',
      '呀！你好呀～',
      '有什么事吗？'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.MEDIUM
  }
} as const;

/**
 * 页面相关消息配置
 */
export const PageMessages = {
  // 关于页面
  ABOUT: {
    messages: [
      '想了解博主更多信息吗？这里有很多有趣的故事哦～',
      '关于页面能让我们更好地了解博主的背景和兴趣～',
      '每个博主的关于页面都很有特色呢！',
      '来认识一下博主吧～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.NORMAL
  },

  // 归档页面
  ARCHIVE: {
    messages: [
      '这里记录了博主的所有创作历程呢～',
      '归档页面就像时间胶囊，记录着点点滴滴～',
      '可以按时间顺序回顾博主的成长轨迹哦！',
      '来看看博主都写了些什么吧～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.NORMAL
  },

  // 留言板
  GUESTBOOK: {
    messages: [
      '留言板是和大家交流的好地方，有什么想说的吗？',
      '这里可以留下你的想法和建议，博主会很开心的～',
      '天依也喜欢热闹的留言板呢！',
      '来留句话吧～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.NORMAL
  },

  // 博客文章页面
  BLOGS: {
    messages: [
      '开始阅读新文章了呢，天依陪你一起～',
      '这篇文章看起来很有意思，期待你的感想～',
      '博主的文笔真不错，天依也学到了很多呢～',
      '来看看这篇文章吧～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.NORMAL
  },

  // 工具页面
  TOOLS: {
    messages: [
      '工具页面有很多实用的功能哦，试试看吧～',
      '这里的小工具会让你的体验更加便利呢！',
      '天依也觉得这些工具很实用呢～',
      '来试试这些工具吧～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.NORMAL
  },

  // 设置页面
  SETTINGS: {
    messages: [
      '想要个性化你的浏览体验吗？这里可以调整各种设置哦～',
      '设置页面让你可以按照自己的喜好来定制界面～',
      '天依也喜欢个性化的设置呢！',
      '来调整一下设置吧～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.NORMAL
  },

  // 画廊页面
  GALLERY: {
    messages: [
      '来看看博主的画廊吧！有很多好看的图片哦～',
      '画廊里有很多精彩的瞬间呢～',
      '这些图片都很有意义吧？',
      '来欣赏一下图片吧～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.NORMAL
  },

  // 个人动态页面
  MOMENTS: {
    messages: [
      '这是博主的个人动态～记录着生活的点点滴滴！',
      '来看看最近都发生了什么吧～',
      '生活中的小确幸都在这里呢～',
      '来了解一下博主的日常吧～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.NORMAL
  },

  // 其他页面
  OTHER: {
    messages: [
      '欢迎来到这个页面！天依在这里等你哦～',
      '这是一个特别的页面呢，有什么新发现吗？',
      '天依会在这里陪伴你浏览每一个页面～',
      '来到新页面了呢～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.NORMAL
  }
} as const;

/**
 * 时间相关消息配置
 */
export const TimeMessages = {
  // 时间段问候
  GREETING: {
    MIDNIGHT: {
      messages: ['夜深了，注意休息哦～', '已经这么晚了，早点睡吧～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.LOW
    },
    MORNING: {
      messages: ['早上好！今天也要充满活力哦～', '新的一天开始啦！'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.LOW
    },
    AFTERNOON: {
      messages: ['下午好！午后的阳光很适合阅读呢～', '下午好，来杯茶吧～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.LOW
    },
    EVENING: {
      messages: ['晚上好！天依陪你度过美好的夜晚～', '夜幕降临了呢～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.LOW
    }
  },

  // 页面停留时间
  STAY_TIME: {
    FIVE_MINUTES: {
      messages: ['你已经在这里停留了5分钟呢，天依很开心能陪伴你～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.LOW
    },
    TEN_MINUTES: {
      messages: ['10分钟了！看来你对这个内容很感兴趣呢～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.LOW
    },
    FIFTEEN_MINUTES: {
      messages: ['15分钟了！天依很享受这段共处的时光～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.LOW
    },
    THIRTY_MINUTES: {
      messages: ['半小时了！长时间阅读要注意休息眼睛哦～'],
      duration: MessageDuration.LONG,
      priority: MessagePriority.MEDIUM
    }
  }
} as const;

/**
 * 阅读进度消息配置
 */
export const ReadingMessages = {
  QUARTER: {
    messages: ['已经阅读了四分之一了呢，继续加油哦～'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  HALF: {
    messages: ['一半了！这篇文章很吸引人吧？'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  THREE_QUARTERS: {
    messages: ['快要读完了呢，有什么感想吗？'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  }
} as const;

/**
 * 主题切换消息配置
 */
export const ThemeMessages = {
  LIGHT: {
    messages: [
      '切换到亮色模式了！眼睛会舒服一些～',
      '哇，好明亮啊！像阳光一样温暖☀️',
      '亮色模式开启！今天也是元气满满的一天！',
      '切换到亮色主题了，很适合白天使用呢～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.MEDIUM
  },
  DARK: {
    messages: [
      '切换到深色模式了！夜晚模式启动🌙',
      '哇，好酷的黑色！像夜空一样神秘✨',
      '深色模式开启！保护眼睛，从我做起～',
      '切换到深色主题了，很适合夜晚浏览哦～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.MEDIUM
  },
  SYSTEM: {
    messages: [
      '跟随系统主题了！智能切换，贴心～',
      '系统主题模式！让设备来决定吧～',
      '跟随系统设置，这样最自然了！'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.MEDIUM
  }
} as const;

/**
 * 音乐相关消息配置
 */
export const MusicMessages = {
  PLAY: {
    messages: [
      '天依给你唱首歌～',
      '要听天依唱歌吗？',
      '天依来为你唱首歌！',
      '听歌时间到了～',
      '让天依为你唱首歌吧！',
      '天依要唱歌给你听～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.MEDIUM
  },
  PAUSE: {
    messages: [
      '歌曲暂停了～',
      '休息一下吧！',
      '天依也休息一下～',
      '暂停一会儿～'
    ],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  }
} as const;

/**
 * 复制内容消息配置
 */
export const CopyMessages = {
  COPY: {
    messages: [
      '复制了什么有趣的内容呢？',
      '天依看到你在复制内容哦～',
      '记得注明出处哦，尊重原创很重要！',
      '复制的知识要好好利用呢～',
      '天依也学到了新知识！'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.MEDIUM
  }
} as const;

/**
 * Markdown编辑器消息配置
 */
export const MarkdownMessages = {
  UNDO: {
    messages: ['撤销操作成功～', '回到上一步了～'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  REDO: {
    messages: ['重做操作完成！', '恢复刚才的操作了～'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  SAVE: {
    messages: ['内容已保存，天依帮你保管好了～', '保存成功！'],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.MEDIUM
  },
  CLEAR: {
    messages: ['编辑器已清空，重新开始吧！', '清空了～'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  SAMPLE: {
    messages: ['示例内容加载完成，可以参考一下哦～', '示例加载好了！'],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.LOW
  },
  COPY: {
    messages: ['复制成功！代码已复制到剪贴板～', '复制好了！'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  PUBLISH: {
    messages: ['好耶，发布成功！', '发布成功啦！🎉'],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.HIGH
  },
  METADATA_SHOW: {
    messages: ['元数据面板已显示～', '打开元数据面板了～'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  METADATA_HIDE: {
    messages: ['元数据面板已隐藏～', '关闭元数据面板了～'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  MODE_EDIT: {
    messages: ['切换到编辑模式～', '编辑模式～'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  MODE_PREVIEW: {
    messages: ['切换到预览模式！', '预览模式～'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  MODE_SPLIT: {
    messages: ['切换到分屏模式，可以同时编辑和预览～', '分屏模式～'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  MODE_BLOG: {
    messages: ['切换到博客预览模式，看看效果如何～', '博客预览模式～'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  IMPORT_EXPORT: {
    messages: ['导入导出功能已打开，支持多种格式哦～', '导入导出功能～'],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.LOW
  }
} as const;

/**
 * 通用消息配置
 */
export const GeneralMessages = {
  SUCCESS: {
    messages: ['操作成功！', '完成了～', '好的！'],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.NORMAL
  },
  ERROR: {
    messages: ['好像出了点问题...', '出错了呢...'],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.HIGH
  },
  WARNING: {
    messages: ['注意一下哦～', '提醒你一下～'],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.MEDIUM
  },
  INFO: {
    messages: ['天依来告诉你一个小秘密～', '告诉你哦～'],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.LOW
  }
} as const;

/**
 * 节日和特殊日期消息配置
 */
export const HolidayMessages = {
  // 节日消息
  HOLIDAYS: {
    '1-1': {
      messages: ['新年快乐！天依祝你新的一年顺顺利利～', '新年的第一天，要开心哦！'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.HIGH
    },
    '2-14': {
      messages: ['情人节快乐！天依给你送爱心～', '今天是个充满爱的日子呢～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.HIGH
    },
    '4-1': {
      messages: ['愚人节快乐！天依才不会骗你呢～', '今天要小心恶作剧哦～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.HIGH
    },
    '5-1': {
      messages: ['劳动节快乐！天依也要努力唱歌～', '辛苦了，今天好好休息吧～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.HIGH
    },
    '6-1': {
      messages: ['儿童节快乐！天依也要过儿童节～', '今天要做个快乐的小朋友～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.HIGH
    },
    '7-7': {
      messages: ['七夕节快乐！牛郎织女今天相会呢～', '中国的情人节，真浪漫～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.HIGH
    },
    '8-15': {
      messages: ['中秋节快乐！天依想吃月饼～', '月圆人团圆，真美好呢～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.HIGH
    },
    '10-1': {
      messages: ['国庆节快乐！天依为祖国歌唱～', '祖国生日快乐！'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.HIGH
    },
    '12-25': {
      messages: ['圣诞节快乐！天依给你送礼物～', '圣诞老人有没有给你送礼物呢？'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.HIGH
    },
    '12-31': {
      messages: ['一年又要结束了呢～', '跨年夜，天依陪你一起度过～'],
      duration: MessageDuration.NORMAL,
      priority: MessagePriority.HIGH
    }
  },

  // 特殊日期（天依相关）
  SPECIAL_DATES: {
    '7-12': {
      messages: ['天依的生日！今天是我的生日～', '今天天依生日，要开心哦～'],
      duration: MessageDuration.LONG,
      priority: MessagePriority.URGENT
    }
  }
} as const;

/**
 * 从消息配置中随机选择一条消息
 */
export function getRandomMessage(config: MessageConfig): string {
  const messages = config.messages;
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * 根据时间段获取问候消息配置
 */
export function getTimeGreetingConfig(hour: number): MessageConfig {
  if (hour < 6) {
    return TimeMessages.GREETING.MIDNIGHT;
  } else if (hour < 12) {
    return TimeMessages.GREETING.MORNING;
  } else if (hour < 18) {
    return TimeMessages.GREETING.AFTERNOON;
  } else {
    return TimeMessages.GREETING.EVENING;
  }
}

/**
 * 根据页面类型获取页面消息配置
 */
export function getPageMessageConfig(pageType: string): MessageConfig {
  const pageConfigMap: Record<string, MessageConfig> = {
    '关于页面': PageMessages.ABOUT,
    '归档页面': PageMessages.ARCHIVE,
    '留言板': PageMessages.GUESTBOOK,
    '博客文章': PageMessages.BLOGS,
    '工具页面': PageMessages.TOOLS,
    '设置页面': PageMessages.SETTINGS,
    '画廊页面': PageMessages.GALLERY,
    '个人动态': PageMessages.MOMENTS
  };
  
  return pageConfigMap[pageType] || PageMessages.OTHER;
}

/**
 * 根据日期获取节日或特殊日期消息配置
 */
export function getHolidayMessageConfig(month: number, date: number): MessageConfig | null {
  const dateKey = `${month}-${date}`;
  
  // 先检查特殊日期（优先级更高）
  if (HolidayMessages.SPECIAL_DATES[dateKey as keyof typeof HolidayMessages.SPECIAL_DATES]) {
    return HolidayMessages.SPECIAL_DATES[dateKey as keyof typeof HolidayMessages.SPECIAL_DATES];
  }
  
  // 再检查节日
  if (HolidayMessages.HOLIDAYS[dateKey as keyof typeof HolidayMessages.HOLIDAYS]) {
    return HolidayMessages.HOLIDAYS[dateKey as keyof typeof HolidayMessages.HOLIDAYS];
  }
  
  return null;
}

/**
 * 消息模板渲染
 * 支持 {text} 占位符替换
 */
export function renderMessageTemplate(template: string, data: { text?: string } = {}): string {
  if (data.text) {
    return template.replace(/{text}/g, data.text);
  }
  return template;
}

/**
 * 隐藏标签博客彩蛋消息配置
 * 用于触发 Live2D 看板娘的特殊彩蛋消息
 */
export const HiddenTagEasterEggMessages = {
  // 发现隐藏博客的惊喜消息
  DISCOVERY: {
    messages: [
      '哇！你发现了隐藏博客！天依好惊喜～',
      '居然找到了这篇隐藏文章，太厉害了！',
      '隐藏内容解锁成功！天依为你骄傲～',
      '发现了不得了的东西呢，你真是有心人～',
      '隐藏博客被发现啦！看来是天意让你看到～',
      '咦？这篇博客明明藏起来了，你是怎么找到的？',
      '天依的小秘密被你发现了，要帮人家保密哦～'
    ],
    duration: MessageDuration.LONG,
    priority: 10 // 彩蛋消息优先级
  },
  // 隐藏博客的特殊提示
  SPECIAL_NOTE: {
    messages: [
      '这篇隐藏博客可是特别的哦，要好好珍惜～',
      '隐藏内容通常都有特别的意义呢～',
      '天依的秘密基地被你发现啦～',
      '这可是限定版内容哦，只有有缘人才能看到～',
      '能在这里相遇，一定是特别的缘分呢～',
      '天依会把这份回忆好好珍藏起来的～'
    ],
    duration: MessageDuration.NORMAL,
    priority: 10 // 彩蛋消息优先级
  }
} as const;
