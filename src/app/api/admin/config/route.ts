/**
 * 配置管理API
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  readConfig,
  saveConfig,
  setPassword,
  getGithubConfig,
  updateGithubConfig,
} from '../../../../admin/services/configService';

// 获取配置
export async function GET() {
  try {
    const config = readConfig();
    if (!config) {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 });
    }
    
    // 不返回密码哈希
    const { passwordHash, ...safeConfig } = config;
    return NextResponse.json(safeConfig);
  } catch (error) {
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

// 更新配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'setPassword') {
      const { password } = data;
      await setPassword(password);
      return NextResponse.json({ success: true, message: '密码设置成功！' });
    }

    if (action === 'updateGithub') {
      const { type, config } = data;
      updateGithubConfig(type, config);
      return NextResponse.json({ success: true, message: 'GitHub配置保存成功！' });
    }

    if (action === 'getGithub') {
      const { type } = data;
      const config = getGithubConfig(type);
      return NextResponse.json({ config });
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
