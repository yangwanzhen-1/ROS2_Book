#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

// 根据脚本位置定位项目、Markdown 源目录和 SUMMARY.md。
const projectDir = path.resolve(__dirname, '..');
const sourceDir = path.join(projectDir, 'src');
const summaryPath = path.join(sourceDir, 'SUMMARY.md');

// AUTO_TOC 用于指定需要扫描标题的页面；START/END 包围脚本生成的目录内容。
const targetPattern = /^(\s*)[-*+]\s+\[[^\]]+\]\(([^)#]+\.md)\)\s*<!--\s*AUTO_TOC\s*-->\s*$/;
const blockStartPattern = /^\s*<!--\s*AUTO_TOC_START\s*-->\s*$/;
const blockEndPattern = /^\s*<!--\s*AUTO_TOC_END\s*-->\s*$/;

// 与 GitBook 3.2.3 的标题锚点规则保持一致，需要从锚点中移除这些符号。
const slugSymbols = /[\[\]!"'#$%&()*+,./:;<=>?@^_`{|}~©∑®†“”‘’∂ƒ™℠…œŒ˚ºª•∆∞♥]+/g;

// 去掉标题里的 Markdown 修饰，只保留侧边目录需要显示的文字。
function headingText(markdown) {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[\*_`~]/g, '')
    .trim();
}

// 将标题文字转换为 GitBook 页面中使用的跳转锚点。
function headingSlug(text) {
  return text
    .replace(slugSymbols, '')
    .replace(/ /g, '-')
    .replace(/^-/, '')
    .toLowerCase();
}

// 扫描 Markdown 中的二、三、四级标题，并忽略代码块中的伪标题。
function extractHeadings(markdown) {
  const headings = [];
  let fence = null;

  markdown.split(/\r?\n/).forEach((line) => {
    // 进入或离开 ```、~~~ 围成的代码块。
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) {
        fence = marker;
      } else if (fence === marker) {
        fence = null;
      }
      return;
    }

    if (fence !== null) {
      return;
    }

    // 一级标题是页面名称，不重复放进子目录；五级以后不加入侧边栏。
    const match = line.match(/^(#{2,4})\s+(.+?)\s*#*\s*$/);
    if (!match) {
      return;
    }

    // 页面正文如果有“目录”标题，不把“目录”本身再次放入侧边目录。
    const title = headingText(match[2]);
    if (!title || title === '目录') {
      return;
    }

    headings.push({
      level: match[1].length,
      title: title,
      slug: headingSlug(title)
    });
  });

  return headings;
}

// 先删除上一次生成的目录块，避免重复执行后产生重复条目。
function removeGeneratedBlocks(lines) {
  const result = [];
  let insideGeneratedBlock = false;

  lines.forEach((line) => {
    if (blockStartPattern.test(line)) {
      insideGeneratedBlock = true;
      return;
    }
    if (blockEndPattern.test(line)) {
      insideGeneratedBlock = false;
      return;
    }
    if (!insideGeneratedBlock) {
      result.push(line);
    }
  });

  if (insideGeneratedBlock) {
    throw new Error('SUMMARY.md 中的 AUTO_TOC 标记不完整');
  }

  return result;
}

// 读取 SUMMARY.md，为每个带 AUTO_TOC 标记的页面重新生成多级目录。
function generateSummary() {
  const original = fs.readFileSync(summaryPath, 'utf8');
  const lines = removeGeneratedBlocks(original.split(/\r?\n/));
  const output = [];
  let generatedPages = 0;

  lines.forEach((line) => {
    output.push(line);

    const target = line.match(targetPattern);
    if (!target) {
      return;
    }

    const baseIndent = target[1];
    const pageRef = target[2];
    const pagePath = path.resolve(sourceDir, pageRef);

    // 防止 SUMMARY.md 中的路径越过 src/，误读项目外部文件。
    if (pagePath !== sourceDir && !pagePath.startsWith(sourceDir + path.sep)) {
      throw new Error(`目录文件超出 src：${pageRef}`);
    }
    if (!fs.existsSync(pagePath)) {
      throw new Error(`找不到目录文件：${pageRef}`);
    }

    const headings = extractHeadings(fs.readFileSync(pagePath, 'utf8'));

    // 标题级别决定缩进：##、###、#### 分别对应一、二、三级子目录。
    output.push(`${baseIndent}  <!-- AUTO_TOC_START -->`);
    headings.forEach((heading) => {
      const indent = baseIndent + '  '.repeat(heading.level - 1);
      output.push(`${indent}- [${heading.title}](${pageRef}#${heading.slug})`);
    });
    output.push(`${baseIndent}  <!-- AUTO_TOC_END -->`);
    generatedPages += 1;
  });

  // 内容确实发生变化时才写回文件，避免无意义地修改 SUMMARY.md。
  const next = output.join('\n').replace(/\n*$/, '\n');
  if (next !== original) {
    fs.writeFileSync(summaryPath, next, 'utf8');
  }

  console.log(`侧边目录已更新：${generatedPages} 个页面`);
}

// 将错误转换为清晰的中文提示，并让 build_book.sh 立即停止。
try {
  generateSummary();
} catch (error) {
  console.error(`生成侧边目录失败：${error.message}`);
  process.exit(1);
}
