/*\
title: $:/plugins/oeyoews/tiddlywiki-prosemirror/utils/get-markdown
type: application/javascript
module-type: macro

宏：获取编辑器的Markdown内容

\*/
(function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.name = "get-markdown";
exports.params = [
  { name: "tiddler" }
];

exports.run = function(tiddler) {
  // 如果没有指定条目，使用当前条目
  tiddler = tiddler || this.getVariable("currentTiddler");
  
  // 如果不在浏览器环境中，直接返回条目文本
  if (!$tw.browser) {
    return $tw.wiki.getTiddlerText(tiddler) || "";
  }
  
  // 在浏览器环境中，尝试从编辑器获取Markdown内容
  try {
    // 查找当前打开的编辑器
    var editors = document.querySelectorAll(".tc-tiddler-edit-frame[data-tiddler-title='" + tiddler.replace(/'/g, "\\'") + "'] .prosemirror-editor-container");
    
    if (editors.length > 0) {
      var editor = editors[0].prosemirror;
      if (editor) {
        // 使用ProseMirror的docToText方法获取Markdown文本
        var markdownText = editor.state.doc.content.size > 0 ? 
          $tw.modules.execute('$:/plugins/oeyoews/tiddlywiki-prosemirror/markdown.js').docToText(editor.state.doc) : 
          "";
        
        // 输出Markdown文本
        return markdownText;
      }
    }
  } catch (e) {
    console.error("Error getting Markdown from editor:", e);
  }
  
  // 如果无法从编辑器获取，则返回原始文本
  return $tw.wiki.getTiddlerText(tiddler) || "";
};

})();
