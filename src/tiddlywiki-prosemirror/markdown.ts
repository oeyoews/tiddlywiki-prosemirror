import schema from './schema';
import config from './config';
// 注意：需要确保已安装prosemirror-markdown包
// 使用require方式导入，以适应TiddlyWiki的模块系统
const {
  defaultMarkdownParser,
  defaultMarkdownSerializer
} = require('prosemirror-markdown');

// 将文本转换为ProseMirror文档
export function textToDoc(text: string) {
  // 检测文本是否是Markdown格式
  if (
    (isMarkdown(text) || config.forceMarkdown()) &&
    config.markdownEnabled()
  ) {
    try {
      // 使用prosemirror-markdown的解析器
      return defaultMarkdownParser.parse(text);
    } catch (e) {
      console.error('Error parsing Markdown:', e);
      // 如果解析失败，返回普通文本
      return schema.nodeFromJSON({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: text ? [{ type: 'text', text: text }] : []
          }
        ]
      });
    }
  } else {
    // 普通文本处理
    return schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: text ? [{ type: 'text', text: text }] : []
        }
      ]
    });
  }
}

// 将ProseMirror文档转换为文本
export function docToText(doc: any) {
  // 如果启用了Markdown并且文档类型适合Markdown或强制使用Markdown
  if (
    config.markdownEnabled() &&
    (isDocSuitableForMarkdown(doc) || config.forceMarkdown())
  ) {
    try {
      // 使用prosemirror-markdown的序列化器
      return defaultMarkdownSerializer.serialize(doc);
    } catch (e) {
      console.error('Error serializing to Markdown:', e);
      // 如果序列化失败，返回普通文本
      return extractPlainText(doc);
    }
  }

  // 默认文本提取
  return extractPlainText(doc);
}

// 提取纯文本
function extractPlainText(doc: any): string {
  let text = '';
  doc.descendants((node: any) => {
    if (node.isText) {
      text += node.text;
    }
    if (
      node.type.name === 'paragraph' &&
      text.length > 0 &&
      !text.endsWith('\n')
    ) {
      text += '\n';
    }
    return true;
  });
  return text;
}

// 检测文本是否是Markdown格式
function isMarkdown(text: string): boolean {
  // 如果配置为不自动检测Markdown
  if (!config.autoDetectMarkdown()) {
    return false;
  }

  // Markdown语法检测
  const markdownPatterns = [
    /^#+ .*$/m, // 标题
    /\*\*.*\*\*/, // 粗体
    /\*.*\*/, // 斜体
    /\[.*\]\(.*\)/, // 链接
    /^- .*$/m, // 无序列表
    /^[0-9]+\. .*$/m, // 有序列表
    /^```[\s\S]*?```$/m, // 代码块
    /`[^`]*`/, // 行内代码
    /^> .*$/m, // 引用
    /!\[.*\]\(.*\)/, // 图片
    /^---$/m, // 分隔线
    /^===$$/m // 分隔线
  ];

  return markdownPatterns.some((pattern) => pattern.test(text));
}

// 检查文档是否适合转换为Markdown
function isDocSuitableForMarkdown(doc: any): boolean {
  // 检查文档结构是否适合Markdown格式
  let suitable = false;

  const markdownNodeTypes = [
    'heading',
    'blockquote',
    'code_block',
    'bullet_list',
    'ordered_list',
    'horizontal_rule'
  ];

  const markdownMarkTypes = ['strong', 'em', 'code', 'link'];

  // 检查节点类型
  doc.descendants((node: any) => {
    if (markdownNodeTypes.includes(node.type.name)) {
      suitable = true;
      return false; // 停止遍历
    }

    // 检查标记类型
    if (node.marks && node.marks.length > 0) {
      for (const mark of node.marks) {
        if (markdownMarkTypes.includes(mark.type.name)) {
          suitable = true;
          return false; // 停止遍历
        }
      }
    }

    return true;
  });

  return suitable;
}
