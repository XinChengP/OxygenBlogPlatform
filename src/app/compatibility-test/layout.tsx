/**
 * 兼容性测试页面布局
 */

export const metadata = {
  title: '浏览器兼容性测试 - 洛天依主题博客',
  description: '测试您的浏览器对 Live2D 功能的支持情况',
};

export default function CompatibilityTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}