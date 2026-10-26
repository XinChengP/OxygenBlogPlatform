/**
 * 学习打卡快速记录脚本
 *
 * 用法（在项目根目录）：
 *   npm run study -- "今天学了修剪和偏移命令" -s CAD -m 60
 *   npm run study -- "画完第一个草图" -s SolidWorks -m 90 --mood good --tags 草图,约束
 *   npm run study -- "补昨天的卡" -s CAD -m 30 --date 2026-10-25
 *   npm run study -- "复习" -s CAD -m 30 --push        # 打卡后自动提交并推送
 *
 * 行为说明：
 * - 当天的记录文件不存在时新建（src/content/study-log/YYYY-MM-DD.md）
 * - 已存在时把科目时长合并进 frontmatter（同名科目累加分钟数），笔记追加到正文
 * - 同一天可以运行多次：每学一段记一笔，脚本自动合并
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// ---------- 参数解析 ----------

interface CliArgs {
  note: string;
  subject?: string;
  minutes?: number;
  mood?: string;
  tags: string[];
  date?: string;
  push: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { note: '', tags: [], push: false };
  const rest = [...argv];

  const takeValue = (flag: string): string => {
    const value = rest.shift();
    if (value === undefined) {
      console.error(`❌ 参数 ${flag} 缺少值`);
      process.exit(1);
    }
    return value;
  };

  while (rest.length > 0) {
    const flag = rest.shift() as string;
    switch (flag) {
      case '-s':
      case '--subject':
        args.subject = takeValue(flag);
        break;
      case '-m':
      case '--minutes': {
        const minutes = Number(takeValue(flag));
        if (!Number.isInteger(minutes) || minutes < 0) {
          console.error('❌ -m 学习时长必须是大于等于 0 的整数（分钟）');
          process.exit(1);
        }
        args.minutes = minutes;
        break;
      }
      case '--mood':
        args.mood = takeValue(flag);
        break;
      case '-t':
      case '--tags':
        args.tags = takeValue(flag)
          .split(/[,，]/)
          .map(tag => tag.trim())
          .filter(Boolean);
        break;
      case '--date': {
        const date = takeValue(flag);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          console.error('❌ --date 需要 YYYY-MM-DD 格式，例如 --date 2026-10-25');
          process.exit(1);
        }
        args.date = date;
        break;
      }
      case '--push':
        args.push = true;
        break;
      default:
        // 第一个未知参数视为打卡内容
        if (!args.note) {
          args.note = flag;
        } else {
          args.note += ` ${flag}`;
        }
        break;
    }
  }

  return args;
}

function showUsage(): never {
  console.log(`
📚 学习打卡脚本

用法：
  npm run study -- "今天学了什么" [-s 科目] [-m 分钟数] [选项]

参数：
  -s, --subject   科目名称，如 CAD、SolidWorks
  -m, --minutes   学习时长（分钟）
  --mood          心情：great | good | normal | hard
  -t, --tags      标签，逗号分隔，如 草图,约束
  --date          指定日期补卡（YYYY-MM-DD），默认今天
  --push          打卡后自动 git 提交并推送

示例：
  npm run study -- "学了修剪、偏移和镜像" -s CAD -m 60 --mood good
  npm run study -- "练了完全定义草图" -s SolidWorks -m 90 --push
`);
  process.exit(0);
}

// ---------- 记录读写 ----------

interface SubjectRecord {
  name: string;
  minutes: number;
}

function localDate(dateStr?: string): string {
  if (dateStr) return dateStr;
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const VALID_MOODS = ['great', 'good', 'normal', 'hard'];

async function main() {
  if (process.argv.slice(2).some(arg => arg === '-h' || arg === '--help')) {
    showUsage();
  }

  const args = parseArgs(process.argv.slice(2));

  if (!args.note && args.subject === undefined) {
    console.error('❌ 至少提供打卡内容或科目时长，运行 npm run study 查看用法');
    process.exit(1);
  }
  if (args.subject !== undefined && args.minutes === undefined) {
    console.error('❌ 指定科目 -s 时请同时用 -m 提供学习时长（分钟）');
    process.exit(1);
  }
  if (args.mood && !VALID_MOODS.includes(args.mood)) {
    console.error(`❌ 无效的心情 ${args.mood}，可选：${VALID_MOODS.join(' | ')}`);
    process.exit(1);
  }

  const date = localDate(args.date);
  const logDir = path.join(process.cwd(), 'src', 'content', 'study-log');
  const filePath = path.join(logDir, `${date}.md`);

  fs.mkdirSync(logDir, { recursive: true });

  const newSubject: SubjectRecord | null =
    args.subject !== undefined ? { name: args.subject, minutes: args.minutes as number } : null;

  let data: Record<string, unknown>;
  let body: string;
  let isNewFile = false;

  if (fs.existsSync(filePath)) {
    const parsed = matter(fs.readFileSync(filePath, 'utf8'));
    data = parsed.data;
    body = parsed.content.trimEnd();

    // 合并科目：同名累加，否则新增
    const subjects: SubjectRecord[] = Array.isArray(data.subjects)
      ? (data.subjects as SubjectRecord[]).map(subject => ({ ...subject }))
      : [];
    if (newSubject) {
      const existing = subjects.find(subject => subject.name === newSubject.name);
      if (existing) {
        existing.minutes += newSubject.minutes;
      } else {
        subjects.push(newSubject);
      }
    }
    data.subjects = subjects;

    // 心情与标签：显式提供时覆盖/合并
    if (args.mood) data.mood = args.mood;
    if (args.tags.length > 0) {
      const tags = new Set<string>(Array.isArray(data.tags) ? (data.tags as string[]) : []);
      args.tags.forEach(tag => tags.add(tag));
      data.tags = Array.from(tags);
    }

    // 笔记追加到正文：上一条笔记是列表项时单行续写，保持 Markdown 列表紧凑
    if (args.note) {
      const lastLine = body.split('\n').pop()?.trim() || '';
      const isListItem = lastLine.startsWith('- ');
      body += `${isListItem ? '\n' : body ? '\n\n' : ''}- **${nowTime()}** ${args.note}`;
    }
  } else {
    isNewFile = true;
    data = {
      date,
      subjects: newSubject ? [newSubject] : [],
    };
    if (args.mood) data.mood = args.mood;
    if (args.tags.length > 0) data.tags = args.tags;
    body = args.note;
  }

  fs.writeFileSync(filePath, matter.stringify(body, data), 'utf8');

  // 输出结果
  const subjectSummary = (data.subjects as SubjectRecord[])
    .map(subject => `${subject.name} ${subject.minutes} 分钟`)
    .join('，');
  console.log(`✅ ${isNewFile ? '新建' : '更新'}打卡记录：${date}`);
  if (subjectSummary) console.log(`   科目时长：${subjectSummary}`);
  console.log(`   文件：src/content/study-log/${date}.md`);

  if (args.push) {
    const { simpleGit } = await import('simple-git');
    try {
      const git = simpleGit();
      await git.add(filePath);
      await git.commit(`study-log: ${date} 打卡`);
      await git.push();
      console.log('🚀 已提交并推送，等 CI 构建完成后网页就会更新');
    } catch (error) {
      console.error('⚠️ 自动推送失败，请手动执行 git push：', error instanceof Error ? error.message : error);
    }
  } else {
    console.log('💡 提醒：改动还没提交。运行 git add -A && git commit -m "study-log: 打卡" && git push 发布，');
    console.log('   或者在命令里加 --push 让脚本自动推送。');
  }
}

main().catch(error => {
  console.error('❌ 打卡失败：', error instanceof Error ? error.message : error);
  process.exit(1);
});
