/**
 * 动态加载脚本
 * @param url 脚本URL
 * @returns Promise
 */
export function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 检查脚本是否已加载
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    
    script.onload = () => {
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error(`Failed to load script: ${url}`));
    };
    
    document.head.appendChild(script);
  });
}