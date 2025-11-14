// 工具分类配置
export const toolCategories = [
  "all", 
  "文本工具", 
  "图像工具", 
  "颜色工具", 
  "编码工具",
  "其他"
];

// 工具项接口
export interface ToolItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string; // 使用图标或emoji
  isActive: boolean; // 是否已经开发完成
  path?: string; // 如果已开发完成，提供路径
}