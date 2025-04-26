import { MarkdownParser, MarkdownSerializer } from 'prosemirror-markdown';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import schema from './schema';

// 创建markdown-it实例，配置语法高亮
const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (e) {
        console.error('Syntax highlighting error:', e);
      }
    }
    return ''; // 使用默认的转义
  }
});

// 添加任务列表支持
md.use(require('markdown-it-task-lists'));

// 添加表格支持
md.use(require('markdown-it-table'));

// 添加上标下标支持
md.use(require('markdown-it-sub'));
md.use(require('markdown-it-sup'));

// 添加脚注支持
md.use(require('markdown-it-footnote'));

// 添加删除线支持
md.use(require('markdown-it-strikethrough'));

// 添加下划线支持
md.use(require('markdown-it-underline'));

// 添加高亮支持
md.use(require('markdown-it-mark'));

// 创建Markdown解析器
export const markdownParser = new MarkdownParser(schema, md, {
  // 块级标记映射
  blockquote: { block: 'blockquote' },
  paragraph: { block: 'paragraph' },
  list_item: { block: 'list_item' },
  bullet_list: { block: 'bullet_list' },
  ordered_list: { block: 'ordered_list', getAttrs: tok => ({ order: +tok.attrGet('start') || 1 }) },
  heading: { block: 'heading', getAttrs: tok => ({ level: +tok.tag.slice(1) }) },
  code_block: { block: 'code_block', getAttrs: tok => ({ params: tok.info || '' }) },
  fence: { block: 'code_block', getAttrs: tok => ({ params: tok.info || '' }) },
  hr: { block: 'horizontal_rule' },
  image: {
    node: 'image',
    getAttrs: tok => ({
      src: tok.attrGet('src'),
      title: tok.attrGet('title') || null,
      alt: tok.children[0] && tok.children[0].content || null
    })
  },
  hardbreak: { node: 'hard_break' },
  
  // 表格映射
  table: { block: 'table' },
  tr: { block: 'table_row' },
  td: { block: 'table_cell' },
  th: { block: 'table_header' },
  
  // 任务列表映射
  task_list_item: { 
    block: 'task_list_item', 
    getAttrs: tok => ({ checked: tok.attrGet('checked') === 'true' }) 
  },
  
  // 行内标记映射
  em: { mark: 'em' },
  strong: { mark: 'strong' },
  link: {
    mark: 'link',
    getAttrs: tok => ({
      href: tok.attrGet('href'),
      title: tok.attrGet('title') || null
    })
  },
  code_inline: { mark: 'code' },
  s: { mark: 'strikethrough' },
  u: { mark: 'underline' },
  mark: { mark: 'highlight' }
});

// 创建Markdown序列化器
export const markdownSerializer = new MarkdownSerializer({
  // 块级节点序列化
  blockquote(state, node) {
    state.wrapBlock('> ', null, node, () => state.renderContent(node));
  },
  code_block(state, node) {
    state.write('```' + (node.attrs.params || '') + '\n');
    state.text(node.textContent);
    state.ensureNewLine();
    state.write('```');
    state.closeBlock(node);
  },
  heading(state, node) {
    state.write('#'.repeat(node.attrs.level) + ' ');
    state.renderInline(node);
    state.closeBlock(node);
  },
  horizontal_rule(state) {
    state.write('---');
    state.closeBlock();
  },
  bullet_list(state, node) {
    state.renderList(node, '  ', () => '- ');
  },
  ordered_list(state, node) {
    let start = node.attrs.order || 1;
    let maxW = String(start + node.childCount - 1).length;
    state.renderList(node, '  ', i => {
      let nStr = String(start + i);
      return nStr + ' '.repeat(maxW - nStr.length + 1);
    });
  },
  list_item(state, node) {
    state.renderContent(node);
  },
  paragraph(state, node) {
    state.renderInline(node);
    state.closeBlock(node);
  },
  
  // 表格序列化
  table(state, node) {
    state.renderTable(node);
    state.closeBlock(node);
  },
  table_row(state, node) {
    state.renderTableRow(node);
  },
  table_cell(state, node) {
    state.renderTableCell(node);
  },
  table_header(state, node) {
    state.renderTableHeader(node);
  },
  
  // 任务列表序列化
  task_list_item(state, node) {
    state.write(node.attrs.checked ? '[x] ' : '[ ] ');
    state.renderContent(node);
  },
  
  // 图片序列化
  image(state, node) {
    state.write('![' + (node.attrs.alt || '') + '](' + node.attrs.src +
                (node.attrs.title ? ' "' + node.attrs.title + '"' : '') + ')');
  },
  
  // 硬换行序列化
  hard_break(state) {
    state.write('\\\n');
  }
}, {
  // 行内标记序列化
  em: {
    open: '*',
    close: '*',
    mixable: true,
    expelEnclosingWhitespace: true
  },
  strong: {
    open: '**',
    close: '**',
    mixable: true,
    expelEnclosingWhitespace: true
  },
  link: {
    open(_state, mark, parent, index) {
      return '[';
    },
    close(state, mark) {
      return '](' + mark.attrs.href + (mark.attrs.title ? ' "' + mark.attrs.title + '"' : '') + ')';
    }
  },
  code: {
    open: '`',
    close: '`',
    mixable: false,
    escape: false
  },
  strikethrough: {
    open: '~~',
    close: '~~',
    mixable: true,
    expelEnclosingWhitespace: true
  },
  underline: {
    open: '__',
    close: '__',
    mixable: true,
    expelEnclosingWhitespace: true
  },
  highlight: {
    open: '==',
    close: '==',
    mixable: true,
    expelEnclosingWhitespace: true
  }
});

// 扩展MarkdownSerializer原型，添加表格支持
MarkdownSerializer.prototype.renderTable = function(node) {
  this.write('|');
  let headerRow = node.child(0);
  for (let i = 0; i < headerRow.childCount; i++) {
    this.write(' ');
    this.renderInline(headerRow.child(i));
    this.write(' |');
  }
  this.ensureNewLine();
  
  this.write('|');
  for (let i = 0; i < headerRow.childCount; i++) {
    let align = headerRow.child(i).attrs.alignment || 'left';
    if (align === 'center') {
      this.write(' :---: |');
    } else if (align === 'right') {
      this.write(' ---: |');
    } else {
      this.write(' --- |');
    }
  }
  this.ensureNewLine();
  
  for (let i = 1; i < node.childCount; i++) {
    this.write('|');
    let row = node.child(i);
    for (let j = 0; j < row.childCount; j++) {
      this.write(' ');
      this.renderInline(row.child(j));
      this.write(' |');
    }
    this.ensureNewLine();
  }
};

MarkdownSerializer.prototype.renderTableRow = function(node) {
  this.write('|');
  for (let i = 0; i < node.childCount; i++) {
    this.write(' ');
    this.renderInline(node.child(i));
    this.write(' |');
  }
  this.ensureNewLine();
};

MarkdownSerializer.prototype.renderTableCell = function(node) {
  this.renderInline(node);
};

MarkdownSerializer.prototype.renderTableHeader = function(node) {
  this.renderInline(node);
};

// 导出解析和序列化函数
export function parseMarkdown(text: string) {
  try {
    return markdownParser.parse(text);
  } catch (e) {
    console.error('Error parsing Markdown:', e);
    // 如果解析失败，返回普通文本
    return schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: text }]
        }
      ]
    });
  }
}

export function serializeToMarkdown(doc: any): string {
  try {
    return markdownSerializer.serialize(doc);
  } catch (e) {
    console.error('Error serializing to Markdown:', e);
    // 如果序列化失败，返回普通文本
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
}
