import { Schema } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';

// 使用prosemirror-markdown库需要的schema
// 扩展基本schema，添加列表节点和自定义节点
const nodes = addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block');

// 添加任务列表相关节点
const customNodes = nodes.addToEnd('task_item', {
  attrs: { checked: { default: false } },
  defining: true,
  parseDOM: [
    {
      tag: 'li.task-list-item',
      getAttrs: (dom) => ({
        checked: (dom as HTMLElement).getAttribute('data-checked') === 'true'
      })
    }
  ],
  toDOM(node) {
    return [
      'li',
      {
        class: 'task-list-item',
        'data-checked': node.attrs.checked.toString()
      },
      [
        'span',
        {
          class: 'task-list-item-checkbox',
          contenteditable: 'false'
        },
        node.attrs.checked ? '☑' : '☐'
      ],
      ['div', 0]
    ];
  },
  content: 'paragraph block*',
  group: 'block'
});

// 添加自定义标记
const marks = basicSchema.spec.marks.addToEnd('strikethrough', {
  parseDOM: [
    { tag: 'strike' },
    { tag: 's' },
    { tag: 'del' },
    { style: 'text-decoration=line-through' }
  ],
  toDOM() {
    return ['s', 0];
  }
});

// 创建扩展的schema
const schema = new Schema({
  nodes: customNodes,
  marks
});

export default schema;
