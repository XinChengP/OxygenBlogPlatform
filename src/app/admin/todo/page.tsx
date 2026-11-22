import { getTodoConfig } from '@/actions/todoActions';
import TodoManageClient from './TodoManageClient';

/**
 * 待办管理页面（服务端组件）
 *
 * 数据来自线上同步 API。静态导出（GitHub Pages）要求所有页面都能在构建期
 * 静态渲染，因此这里不能声明 force-dynamic；开发环境 Next 每次请求都会重新
 * 渲染，生产服务端模式下写入后由 revalidatePath('/admin/todo') 刷新缓存。
 */
export default async function TodoManagePage() {
  const result = await getTodoConfig();
  const config = result.success && result.data
    ? result.data
    : { title: '待办事项', items: [], showStats: true };

  // message 为 Success 时不提示；回退快照或出错时把原因带到界面
  const notice = result.message !== 'Success' ? result.message : undefined;

  return <TodoManageClient initialConfig={config} notice={notice} />;
}
