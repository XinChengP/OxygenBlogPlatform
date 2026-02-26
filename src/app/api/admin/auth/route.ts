/**
 * 后台认证API
 */

import { NextRequest, NextResponse } from 'next/server';
import { configExists, readConfig, setPassword, verifyPassword, initConfig } from '../../../../admin/services/configService';

// 检查是否需要初始化密码
export async function GET() {
  const hasConfig = configExists();
  const config = readConfig();
  const needsSetup = !hasConfig || !config?.passwordHash;
  
  return NextResponse.json({ needsSetup, hasConfig });
}

// 设置密码（首次使用）或登录
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, password, newPassword } = body;
  
  try {
    if (action === 'setup') {
      await setPassword(password);
      return NextResponse.json({ success: true, message: '密码设置成功！' });
    }
    
    if (action === 'login') {
      const valid = await verifyPassword(password);
      if (valid) {
        const sessionId = Date.now().toString();
        return NextResponse.json({ 
          success: true, 
          message: '登录成功！',
          sessionId 
        });
      } else {
        return NextResponse.json({ success: false, message: '密码错误！' }, { status: 401 });
      }
    }
    
    return NextResponse.json({ success: false, message: '无效的操作' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
