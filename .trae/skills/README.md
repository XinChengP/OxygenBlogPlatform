# AI 技能系统

本项目整合了 [mattpocock/skills](https://github.com/mattpocock/skills) 的 AI 辅助开发技能，帮助提升开发效率和代码质量。

## 技能列表

### 工程类 (Engineering)

| 技能 | 命令 | 用途 |
|------|------|------|
| 带文档的深度提问 | `/grill-with-docs` | 复杂功能开发，建立领域模型，记录架构决策 |
| 测试驱动开发 | `/tdd` | 红-绿-重构循环开发，确保代码质量 |
| 系统化调试 | `/diagnose` | 困难 bug 的规范诊断流程 |
| 生成 PRD | `/to-prd` | 将讨论结果沉淀为产品需求文档 |
| 更新日志 | `/changelog` | 按项目规范创建和管理更新日志 |

### 生产力类 (Productivity)

| 技能 | 命令 | 用途 |
|------|------|------|
| 深度提问 | `/grill-me` | 需求澄清，设计梳理 |
| 极简沟通 | `/caveman` | 减少 token 消耗，快速获取技术信息 |

## 快速开始

### 1. 需求澄清场景

当你有一个模糊的想法，需要深入思考：

```
你: /grill-me 我想添加一个文章评论系统
AI: [开始持续提问，梳理需求细节]
```

### 2. 复杂功能开发

当你要开发复杂功能，需要统一术语和记录决策：

```
你: /grill-with-docs 我要开发文章协作编辑功能
AI: [提问并同步更新 CONTEXT.md 和 ADR]
```

### 3. 测试驱动开发

当你需要高质量代码：

```
你: /tdd 实现文章评论功能
AI: [规划 → RED → GREEN → 重构 循环]
```

### 4. 调试困难 Bug

当遇到难以解决的 bug：

```
你: /diagnose 评论提交后有时不显示
AI: [复现 → 假设 → 插桩 → 修复 → 回归测试]
```

### 5. 生成需求文档

当讨论结束需要沉淀文档：

```
你: /to-prd 把我们讨论的评论功能整理成文档
AI: [生成 PRD 并发布到 GitHub Issues]
```

### 6. 记录更新日志

当完成开发需要记录变更：

```
你: /changelog 记录今天的图片预览重构和社交链接扩展
AI: [按项目规范生成更新日志文件]
```

### 7. 极简沟通

当你想减少 token 消耗：

```
你: /caveman 为什么组件重复渲染？
AI: Inline obj prop -> new ref -> re-render. useMemo.
```

## 文档结构

```
.trae/
├── CONTEXT.md              # 领域词汇表
├── docs/
│   ├── adr/                # 架构决策记录
│   │   ├── 0001-选择-nextjs.md
│   │   └── 0002-数据库选型.md
│   └── prd/                # 产品需求文档
├── skills/
│   ├── engineering/        # 工程技能
│   │   ├── grill-with-docs/
│   │   ├── tdd/
│   │   ├── diagnose/
│   │   ├── to-prd/
│   │   └── changelog/      # 更新日志管理
│   └── productivity/       # 生产力技能
│       ├── grill-me/
│       └── caveman/
└── rules/
    └── project_rules.md    # 项目规则
```

## 技能详解

### /grill-me vs /grill-with-docs

| 特性 | /grill-me | /grill-with-docs |
|------|-----------|------------------|
| 文档产出 | 无 | CONTEXT.md、ADR |
| 适用场景 | 简单需求澄清 | 复杂功能、需要统一术语 |
| 持续时间 | 较短 | 可能较长 |
| 长期价值 | 即时 | 持续（文档沉淀） |

### /tdd 核心理念

**测试应该验证行为，而非实现细节。**

- ✅ 好的测试：通过公共接口测试，重构时不会失败
- ❌ 坏的测试：与实现耦合，测试私有方法

**垂直切片（追踪弹）：**
```
RED→GREEN: test1→impl1
RED→GREEN: test2→impl2
...
```

### /diagnose 六阶段

1. **建立反馈循环** —— 最关键，投入不成比例的努力
2. **复现** —— 确认症状
3. **假设** —— 3-5 个可证伪的排序假设
4. **插桩** —— 一次改变一个变量
5. **修复 + 回归测试** —— 先写测试再修复
6. **清理 + 事后分析** —— 移除调试代码，记录经验

## 最佳实践

1. **复杂功能先用 `/grill-with-docs`** —— 建立清晰的领域模型
2. **核心功能用 `/tdd`** —— 确保代码质量
3. **困难 bug 用 `/diagnose`** —— 系统化调试
4. **沉淀文档用 `/to-prd`** —— 与团队协作
5. **记录变更用 `/changelog`** —— 按规范生成更新日志
6. **token 紧张用 `/caveman`** —— 快速沟通

## 参考

- [mattpocock/skills](https://github.com/mattpocock/skills) - 原始技能仓库
- [The Pragmatic Programmer](https://www.amazon.co.uk/Pragmatic-Programmer-Anniversary-Journey-Mastery/dp/B0833F1T3V) - 务实的程序员
- [A Philosophy Of Software Design](https://www.amazon.co.uk/Philosophy-Software-Design-2nd/dp/173210221X) - 软件设计的哲学
