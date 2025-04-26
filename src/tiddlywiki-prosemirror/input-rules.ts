import { inputRules, InputRule, wrappingInputRule, textblockTypeInputRule } from 'prosemirror-inputrules';
import schema from './schema';

// 匹配Markdown标题语法: # 到 ######
const headingRule = textblockTypeInputRule(
  /^(#{1,6})\s$/, 
  schema.nodes.heading, 
  match => ({ level: match[1].length })
);

// 匹配Markdown引用语法: >
const blockquoteRule = wrappingInputRule(
  /^\s*>\s$/, 
  schema.nodes.blockquote
);

// 匹配Markdown无序列表语法: - 或 * 或 +
const bulletListRule = wrappingInputRule(
  /^\s*([-+*])\s$/, 
  schema.nodes.bullet_list
);

// 匹配Markdown有序列表语法: 1.
const orderedListRule = wrappingInputRule(
  /^\s*(\d+)\.\s$/, 
  schema.nodes.ordered_list,
  match => ({ order: +match[1] }),
  (match, node) => node.childCount + node.attrs.order === +match[1]
);

// 匹配Markdown代码块语法: ```
const codeBlockRule = textblockTypeInputRule(
  /^```$/, 
  schema.nodes.code_block
);

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
      .addMark(
        from, 
        from + match[1].length, 
        schema.marks.strong.create()
      );
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
      .addMark(
        from, 
        from + match[1].length, 
        schema.marks.em.create()
      );
  }
);

// 匹配Markdown行内代码语法: `code`
const codeRule = new InputRule(
  /`([^`]+)`$/, 
  (state, match, start, end) => {
    const from = end - match[0].length;
    const to = end;
    return state.tr
      .replaceWith(from, to, schema.text(match[1]))
      .addMark(
        from, 
        from + match[1].length, 
        schema.marks.code.create()
      );
  }
);

// 匹配Markdown链接语法: [text](url)
const linkRule = new InputRule(
  /\[([^\]]+)\]\(([^)]+)\)$/, 
  (state, match, start, end) => {
    const [full, text, href] = match;
    const from = end - full.length;
    const to = end;
    return state.tr
      .replaceWith(from, to, schema.text(text))
      .addMark(
        from, 
        from + text.length, 
        schema.marks.link.create({ href })
      );
  }
);

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
    linkRule
  ]
});
