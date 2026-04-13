# 重构友链和导航结构规范

## Why
当前关于页面包含了友链和相关链接两个模块，导致页面内容过多。用户希望将友链和相关链接分离到独立页面，优化导航结构。同时将留言板、友链合并成"社交"下拉菜单，将关于、相关链接合并成"关于"下拉菜单，提升导航的整洁度。

## What Changes
- **新增友链独立页面** (`/friends`): 将原关于页面的友情链接独立成页面
- **新增相关链接独立页面** (`/links`): 将原关于页面的相关链接独立成页面
- **修改导航栏**: 
  - 在"日志"后添加"社交"下拉菜单，包含: 留言板、友链
  - "关于"改为"关于我"下拉菜单，包含: 关于我、相关链接
  - 移除独立的"留言板"导航项
- **修改关于页面**: 
  - 移除友链和相关链接组件

## Impact
- 受影响文件:
  - `src/components/Navigation.tsx` - 修改导航项，添加下拉菜单功能
  - `src/app/about/page.tsx` - 移除友链和相关链接
  - `src/app/friends/page.tsx` - 新建友链页面
  - `src/app/links/page.tsx` - 新建相关链接页面

## ADDED Requirements

### Requirement: 友链独立页面
The system SHALL provide a dedicated friends link page at `/friends`.

#### Scenario: 页面结构
- **GIVEN** 用户访问 `/friends`
- **THEN** 页面应显示友链列表
- **AND** 页面应使用与其他页面统一的布局风格

### Requirement: 相关链接独立页面
The system SHALL provide a dedicated related links page at `/links`.

#### Scenario: 页面结构
- **GIVEN** 用户访问 `/links`
- **THEN** 页面应显示相关链接列表
- **AND** 页面应使用与其他页面统一的布局风格

### Requirement: 社交下拉菜单
The system SHALL provide a dropdown menu for social features in the navigation bar.

#### Scenario: 下拉菜单结构
- **GIVEN** 导航栏显示
- **THEN** "日志"后应有"社交"下拉菜单
- **AND** 下拉菜单包含: 留言板 (`/guestbook`)、友链 (`/friends`)
- **AND** 下拉菜单样式应与主题一致
- **AND** 鼠标悬停或点击时显示下拉菜单

### Requirement: 关于我下拉菜单
The system SHALL convert the "关于" navigation item to a dropdown menu named "关于我".

#### Scenario: 下拉菜单结构
- **GIVEN** 导航栏显示
- **THEN** "关于我"应为下拉菜单
- **AND** 下拉菜单包含: 关于我 (`/about`)、相关链接 (`/links`)
- **AND** 下拉菜单样式应与主题一致
- **AND** 鼠标悬停或点击时显示下拉菜单

## MODIFIED Requirements

### Requirement: 关于页面简化
The about page SHALL be simplified by removing embedded link components.

#### Scenario: 内容调整
- **GIVEN** 用户访问 `/about`
- **THEN** 页面不应直接显示友链和相关链接

### Requirement: 导航栏更新
The navigation bar SHALL be updated to use dropdown menus.

#### Scenario: 导航项调整
- **GIVEN** 导航栏显示
- **THEN** 不应有独立的"留言板"导航项
- **AND** "社交"下拉菜单替代原有独立导航项
- **AND** "关于"改为"关于我"下拉菜单

## REMOVED Requirements

### Requirement: 留言板独立导航
**Reason**: 留言板已整合到社交下拉菜单中
**Migration**: 用户通过"社交"下拉菜单访问留言板
