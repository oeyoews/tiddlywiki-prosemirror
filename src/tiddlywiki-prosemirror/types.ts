// 定义KeyInfo接口
export interface KeyInfo {
  keyCode: number;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

// 定义TiddlyWiki编辑器小部件接口
export interface IWidget {
  document: {
    createElement(tagName: string): TW_Element;
  };
  domNodes: Node[];
  editClass?: string;
  parseTreeNode: {
    type: string;
  };
  parentWidget: IWidget | null;
  isFileDropEnabled?: boolean;
  saveChanges?: () => void;
  handleKeydownEvent: (e: KeyboardEvent) => boolean;
  keyInfoArray?: KeyInfo[];
}

// 扩展TiddlyWiki元素类型
export interface TW_Element extends HTMLElement {
  _style?: any;
  isRaw?: boolean;
  isTiddlyWikiFakeDom?: boolean;
  tag?: string;
  prosemirror: any;
}

// 扩展DOM元素类型，添加prosemirror属性
declare global {
  interface Element {
    prosemirror: any;
  }
}
