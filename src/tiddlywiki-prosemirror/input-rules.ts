import {
  inputRules,
  InputRule,
  wrappingInputRule,
  textblockTypeInputRule
} from 'prosemirror-inputrules';
import schema from './schema';

// 匹配Markdown标题语法: # 到 ######
const headingRule = textblockTypeInputRule(
  /^(#{1,6})\s$/,
  schema.nodes.heading,
  (match) => ({ level: match[1].length })
);

// 匹配Markdown引用语法: >
const blockquoteRule = wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote);

// 匹配Markdown无序列表语法: - 或 * 或 +
const bulletListRule = wrappingInputRule(
  /^\s*([-+*])\s$/,
  schema.nodes.bullet_list
);

// 匹配Markdown有序列表语法: 1.
const orderedListRule = wrappingInputRule(
  /^\s*(\d+)\.\s$/,
  schema.nodes.ordered_list,
  (match) => ({ order: +match[1] }),
  (match, node) => node.childCount + node.attrs.order === +match[1]
);

// 匹配Markdown代码块语法: ```
const codeBlockRule = textblockTypeInputRule(/^```$/, schema.nodes.code_block);

// 匹配Markdown水平线语法: --- 或 *** 或 ___
const horizontalRuleRule = new InputRule(
  /^([-*_]){3,}$/,
  (state, match, start, end) => {
    return state.tr.replaceRangeWith(
      start,
      end,
      schema.nodes.horizontal_rule.create()
    );
  }
);

// 匹配Markdown粗体语法: **text**
const strongRule = new InputRule(
  /\*\*([^*]+)\*\*$/,
  (state, match, start, end) => {
    const from = end - match[0].length;
    const to = end;
    return state.tr
      .replaceWith(from, to, schema.text(match[1]))
      .addMark(from, from + match[1].length, schema.marks.strong.create());
  }
);

// 匹配Markdown斜体语法: *text*
const emRule = new InputRule(
  /(?<!\*)\*([^*]+)\*$/,
  (state, match, start, end) => {
    const from = end - match[0].length;
    const to = end;
    return state.tr
      .replaceWith(from, to, schema.text(match[1]))
      .addMark(from, from + match[1].length, schema.marks.em.create());
  }
);

// 匹配Markdown行内代码语法: `code`
const codeRule = new InputRule(/`([^`]+)`$/, (state, match, start, end) => {
  const from = end - match[0].length;
  const to = end;
  return state.tr
    .replaceWith(from, to, schema.text(match[1]))
    .addMark(from, from + match[1].length, schema.marks.code.create());
});

// 匹配Markdown链接语法: [text](url)
const linkRule = new InputRule(
  /\[([^\]]+)\]\(([^)]+)\)$/,
  (state, match, start, end) => {
    const [full, text, href] = match;
    const from = end - full.length;
    const to = end;
    return state.tr
      .replaceWith(from, to, schema.text(text))
      .addMark(from, from + text.length, schema.marks.link.create({ href }));
  }
);

// 匹配Markdown图片语法: ![alt](url)
const imageRule = new InputRule(
  /!\[([^\]]+)\]\(([^)]+)\)$/,
  (state, match, start, end) => {
    const [full, alt, src] = match;
    const from = end - full.length;
    const to = end;
    return state.tr.replaceWith(
      from,
      to,
      schema.nodes.image.create({ src, alt })
    );
  }
);

// 匹配Markdown删除线语法: ~~text~~
const strikethroughRule = new InputRule(
  /~~([^~]+)~~$/,
  (state, match, start, end) => {
    // 检查schema是否支持删除线标记
    if (!schema.marks.strikethrough) return null;

    const from = end - match[0].length;
    const to = end;
    return state.tr
      .replaceWith(from, to, schema.text(match[1]))
      .addMark(
        from,
        from + match[1].length,
        schema.marks.strikethrough.create()
      );
  }
);

// 匹配Markdown任务列表语法: [ ] 或 [x]
const taskListRule = new InputRule(
  /^\s*\[([ xX])\]\s$/,
  (state, match, start, end) => {
    // 检查schema是否支持任务列表节点
    if (!schema.nodes.task_list_item) return null;

    const checked = match[1] !== ' ';
    const { tr } = state;

    // 删除匹配的文本
    tr.delete(start, end);

    // 创建任务列表项
    const taskItem = schema.nodes.task_list_item.create(
      { checked },
      schema.nodes.paragraph.create()
    );

    // 插入任务列表项
    tr.replaceWith(start, start, taskItem);

    return tr;
  }
);

// 匹配Markdown表格语法: | header1 | header2 |
const tableRule = new InputRule(/^\|(.+)\|\s$/, (state, match, start, end) => {
  // 检查schema是否支持表格节点
  if (!schema.nodes.table) return null;

  const cells = match[1]
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s);
  if (cells.length === 0) return null;

  const { tr } = state;

  // 删除匹配的文本
  tr.delete(start, end);

  // 创建表格头部单元格
  const headerCells = cells.map((text) =>
    schema.nodes.table_header.create(
      null,
      schema.nodes.paragraph.create(null, schema.text(text))
    )
  );

  // 创建表格头部行
  const headerRow = schema.nodes.table_row.create(null, headerCells);

  // 创建空的数据行
  const dataCells = cells.map(() =>
    schema.nodes.table_cell.create(null, schema.nodes.paragraph.create())
  );

  // 创建数据行
  const dataRow = schema.nodes.table_row.create(null, dataCells);

  // 创建表格
  const table = schema.nodes.table.create(null, [headerRow, dataRow]);

  // 插入表格
  tr.replaceWith(start, start, table);

  return tr;
});

// 创建并导出所有Markdown输入规则
export const markdownInputRules = inputRules({
  rules: [
    headingRule,
    blockquoteRule,
    bulletListRule,
    orderedListRule,
    codeBlockRule,
    horizontalRuleRule,
    strongRule,
    emRule,
    codeRule,
    linkRule,
    imageRule,
    strikethroughRule,
    taskListRule,
    tableRule
  ]
});
