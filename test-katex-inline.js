const { marked } = require('marked');
const markedKatex = require('marked-katex-extension');

marked.use(markedKatex({ throwOnError: false }));

const text = "a partir de dentro ($\\text{Type}{\\mathrm{rep}}$) não confere";
console.log(marked.parse(text));
