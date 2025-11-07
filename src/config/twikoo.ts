// Twikoo评论系统配置
export const TWIKOO_CONFIG = {
  // Twikoo环境ID，需要替换为您的实际环境ID
  // 您可以在Twikoo管理面板中找到这个ID
  envId: process.env.NEXT_PUBLIC_TWIKOO_ENV_ID || 'https://twikoo.yourdomain.com',
  
  // 其他可选配置
  // 更多配置选项请参考: https://twikoo.js.org/
  options: {
    // 是否显示评论数量
    showCommentCount: true,
    
    // 是否启用表情包
    enableEmoji: true,
    
    // 是否启用图片上传
    enableImageUpload: true,
    
    // 是否启用Markdown
    enableMarkdown: true,
    
    // 是否启用LaTeX数学公式
    enableMath: true,
    
    // 是否启用代码高亮
    enableHighlight: true,
    
    // 评论排序方式：'latest' | 'oldest' | 'hottest'
    order: 'latest',
    
    // 每页显示的评论数量
    pageSize: 10,
    
    // 是否显示浏览器信息
    showBrowserInfo: true,
    
    // 是否显示操作系统信息
    showOSInfo: true,
    
    // 是否显示地理位置信息
    showLocation: true,
    
    // 是否启用评论审核
    enableCommentAudit: false,
    
    // 是否启用邮件通知
    enableEmailNotification: false,
    
    // 是否启用微信通知
    enableWeChatNotification: false,
    
    // 是否启用QQ通知
    enableQQNotification: false,
    
    // 是否启用钉钉通知
    enableDingTalkNotification: false,
    
    // 是否启用企业微信通知
    enableWeWorkNotification: false,
    
    // 是否启用飞书通知
    enableFeishuNotification: false,
    
    // 是否启用Slack通知
    enableSlackNotification: false,
    
    // 是否启用Discord通知
    enableDiscordNotification: false,
    
    // 是否启用Telegram通知
    enableTelegramNotification: false,
    
    // 是否启用Webhook通知
    enableWebhookNotification: false,
    
    // Webhook通知URL
    webhookUrl: '',
    
    // 是否启用评论点赞
    enableLike: true,
    
    // 是否启用评论回复
    enableReply: true,
    
    // 是否启用评论删除
    enableDelete: true,
    
    // 是否启用举报功能
    enableReport: true,
    
    // 是否启用评论编辑
    enableEdit: true,
    
    // 是否启用评论置顶
    enablePin: true,
    
    // 是否启用评论折叠
    enableFold: true,
    
    // 是否启用评论分页
    enablePagination: true,
    
    // 是否启用评论搜索
    enableSearch: true,
    
    // 是否启用评论导出
    enableExport: true,
    
    // 是否启用评论导入
    enableImport: true,
    
    // 是否启用评论统计
    enableStatistics: true,
    
    // 是否启用评论分析
    enableAnalysis: true,
    
    // 是否启用评论过滤
    enableFilter: true,
    
    // 是否启用评论黑名单
    enableBlacklist: true,
    
    // 是否启用评论白名单
    enableWhitelist: true,
    
    // 是否启用评论审核
    enableModeration: false,
    
    // 是否启用评论自动审核
    enableAutoModeration: false,
    
    // 是否启用评论人工审核
    enableManualModeration: false,
    
    // 是否启用评论AI审核
    enableAIModeration: false,
    
    // 是否启用评论敏感词过滤
    enableSensitiveWordFilter: true,
    
    // 是否启用评论垃圾评论过滤
    enableSpamFilter: true,
    
    // 是否启用评论广告过滤
    enableAdFilter: true,
    
    // 是否启用评论恶意链接过滤
    enableMaliciousLinkFilter: true,
    
    // 是否启用评论恶意脚本过滤
    enableMaliciousScriptFilter: true,
    
    // 是否启用评论恶意代码过滤
    enableMaliciousCodeFilter: true,
    
    // 是否启用评论恶意内容过滤
    enableMaliciousContentFilter: true,
    
    // 是否启用评论恶意行为过滤
    enableMaliciousBehaviorFilter: true,
    
    // 是否启用评论恶意用户过滤
    enableMaliciousUserFilter: true,
    
    // 是否启用评论恶意IP过滤
    enableMaliciousIPFilter: true,
    
    // 是否启用评论恶意设备过滤
    enableMaliciousDeviceFilter: true,
    
    // 是否启用评论恶意浏览器过滤
    enableMaliciousBrowserFilter: true,
    
    // 是否启用评论恶意操作系统过滤
    enableMaliciousOSFilter: true,
    
    // 是否启用评论恶意地理位置过滤
    enableMaliciousLocationFilter: true,
    
    // 是否启用评论恶意时间过滤
    enableMaliciousTimeFilter: true,
    
    // 是否启用评论恶意频率过滤
    enableMaliciousFrequencyFilter: true,
    
    // 是否启用评论恶意长度过滤
    enableMaliciousLengthFilter: true,
    
    // 是否启用评论恶意字符过滤
    enableMaliciousCharacterFilter: true,
    
    // 是否启用评论恶意表情过滤
    enableMaliciousEmojiFilter: true,
    
    // 是否启用评论恶意图片过滤
    enableMaliciousImageFilter: true,
    
    // 是否启用评论恶意视频过滤
    enableMaliciousVideoFilter: true,
    
    // 是否启用评论恶意音频过滤
    enableMaliciousAudioFilter: true,
    
    // 是否启用评论恶意文件过滤
    enableMaliciousFileFilter: true
  }
};

// 获取Twikoo环境ID的函数
export const getTwikooEnvId = (): string => {
  return TWIKOO_CONFIG.envId;
};

// 获取Twikoo配置的函数
export const getTwikooOptions = () => {
  return TWIKOO_CONFIG.options;
};