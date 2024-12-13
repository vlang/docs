
/*
	V-Lang Language Mode for CodeMirror
*/
(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
	mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
	define(["../../lib/codemirror"], mod);
  else // Plain browser env
	mod(CodeMirror);
})(function(CodeMirror) {

const baseAttributes = [
	"params", "noinit", "required", "skip", "assert_continues",
	"unsafe", "manualfree", "heap", "nonnull", "primary", "inline",
	"direct_array_access", "live", "flag", "noinline", "noreturn", "typedef", "console",
	"sql", "table", "deprecated", "deprecated_after", "export", "callconv"
];
const baseModules = [
	"arrays",
	"benchmark", "bitfield",
	"cli", "clipboard", "compress", "context", "crypto",
	"darwin", "datatypes", "dl", "dlmalloc",
	"encoding", "eventbus",
	"flag", "fontstash",
	"gg", "gx",
	"hash",
	"io",
	"js", "json",
	"log",
	"math", "mssql", "mysql",
	"net",
	"orm", "os",
	"pg", "picoev", "picohttpparser",
	"rand", "readline", "regex", "runtime",
	"semver", "sokol", "sqlite", "stbi", "strconv", "strings", "sync", "szip",
	"term", "time", "toml",
	"v", "vweb",
	"x",
];
const word = "[\\w_]+";
//[key: value]
const keyValue = `(${word}: ${word})`;

// [if expr ?]
const ifAttributesRegexp = new RegExp(`^if ${word} \\??]`);
// [key: value; key: value]
const keyValueAttributesRegexp = new RegExp(`^((${keyValue})(; )?){2,}]$`);
const simpleAttributesRegexp = new RegExp(`^(${baseAttributes.join("|")})]$`);
const singleKeyValueAttributesRegexp = new RegExp(`^${keyValue}]$`);
const severalSingleKeyValueAttributesRegexp = new RegExp(`^(${baseAttributes.join("|")}(; ?)?){2,}]$`);

class Context {
  constructor(
	indentation,
	column,
	type,
	align,
	prev,
	knownImports = new Set()
  ) {
	this.indentation = indentation
	this.column = column
	this.type = type
	this.align = align
	this.prev = prev
	this.knownImports = knownImports
  }

  /**
   * Whenever current position inside a string.
   */
  insideString = false

  /**
   * Current quotation mark.
   * Valid only when insideString is true.
   */
  stringQuote = null

  /**
   * Whenever next token expected to be an import name.
   * Used for highlighting import names in import statements.
   */
  expectedImportName = false
}

const keywords = new Set([
  "as",
  "asm",
  "assert",
  "atomic",
  "break",
  "const",
  "continue",
  "defer",
  "else",
  "enum",
  "fn",
  "for",
  "go",
  "goto",
  "if",
  "implements",
  "import",
  "in",
  "interface",
  "is",
  "isreftype",
  "lock",
  "match",
  "module",
  "mut",
  "none",
  "or",
  "pub",
  "return",
  "rlock",
  "select",
  "shared",
  "sizeof",
  "static",
  "struct",
  "spawn",
  "type",
  "typeof",
  "union",
  "unsafe",
  "volatile",
  "__global",
  "__offsetof"
])

const pseudoKeywords = new Set(["sql", "chan", "thread"])

const hashDirectives = new Set(["#flag", "#include", "#pkgconfig"])

const atoms = new Set([
  "true",
  "false",
  "nil",
  "print",
  "println",
  "exit",
  "panic",
  "error",
  "dump"
])

const builtinTypes = new Set([
  "bool",
  "string",
  "i8",
  "i16",
  "int",
  "i32",
  "i64",
  "i128",
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "rune",
  "f32",
  "f64",
  "isize",
  "usize",
  "voidptr",
  "any"
])


CodeMirror.defineMode("v", config => {
  const indentUnit = config.indentUnit ?? 0

  const isOperatorChar = /[+\-*&^%:=<>!?|\/]/

  let curPunc = null

  function eatIdentifier(stream) {
	stream.eatWhile(/[\w$_\xa1-\uffff]/)
	return stream.current()
  }

  function tokenBase(stream, state) {
	const ch = stream.next()
	if (ch === null) {
	  return null
	}

	if (state.context.insideString && ch === "}") {
	  stream.eat("}")
	  state.tokenize = tokenString(state.context.stringQuote)
	  return "end-interpolation"
	}

	if (ch === '"' || ch === "'" || ch === "`") {
	  state.tokenize = tokenString(ch)
	  return state.tokenize(stream, state)
	}

	// r'foo' or c'foo'
	// r"foo" or c"foo"
	if (
	  (ch === "r" || ch === "c") &&
	  (stream.peek() == '"' || stream.peek() == "'")
	) {
	  const next = stream.next()
	  if (next === null) {
		return "string"
	  }
	  state.tokenize = tokenRawString(next)
	  return "string"
	}

	if (ch === ".") {
	  if (!stream.match(/^[0-9]+([eE][\-+]?[0-9]+)?/)) {
		return "operator"
	  }
	}

	// probably attribute
	// [attr]
	// [attr: value]
	// [attr1; attr2]
	if (ch === "[") {
	  // [unsafe]
	  if (stream.match(simpleAttributesRegexp)) {
		return "attribute"
	  }

	  // [sql: foo]
	  if (stream.match(singleKeyValueAttributesRegexp)) {
		return "attribute"
	  }

	  // [sql; foo]
	  if (stream.match(severalSingleKeyValueAttributesRegexp)) {
		return "attribute"
	  }

	  // [attr: value; attr: value]
	  // [attr: value; attr]
	  if (stream.match(keyValueAttributesRegexp)) {
		return "attribute"
	  }

	  // match `[if some ?]`
	  if (stream.match(ifAttributesRegexp)) {
		return "attribute"
	  }
	}

	if (/[\d.]/.test(ch)) {
	  if (ch === "0") {
		stream.match(/^[xX][0-9a-fA-F_]+/) ||
		  stream.match(/^o[0-7_]+/) ||
		  stream.match(/^b[0-1_]+/)
	  } else {
		stream.match(/^[0-9_]*\.?[0-9_]*([eE][\-+]?[0-9_]+)?/)
	  }
	  return "number"
	}
	if (/[\[\]{}(),;:.]/.test(ch)) {
	  curPunc = ch
	  return null
	}
	if (ch === "/") {
	  if (stream.eat("*")) {
		state.tokenize = tokenComment
		return tokenComment(stream, state)
	  }
	  if (stream.eat("/")) {
		stream.skipToEnd()
		return "comment"
	  }
	}
	if (isOperatorChar.test(ch)) {
	  stream.eatWhile(isOperatorChar)
	  return "operator"
	}

	if (ch === "@") {
	  eatIdentifier(stream)
	  return "at-identifier"
	}

	if (ch === "$") {
	  const ident = eatIdentifier(stream).slice(1)
	  if (keywords.has(ident)) {
		return "keyword"
	  }

	  return "compile-time-identifier"
	}

	stream.backUp(2)
	const wasDot = stream.next() === "."
	stream.next()

	const cur = eatIdentifier(stream)
	if (cur === "import") {
	  state.context.expectedImportName = true
	}

	if (keywords.has(cur)) return "keyword"
	if (pseudoKeywords.has(cur)) return "keyword"
	if (atoms.has(cur)) return "atom"
	if (hashDirectives.has(cur)) return "hash-directive"

	if (!wasDot) {
	  // don't highlight `foo.int()`
	  //                      ^^^ as builtin
	  if (builtinTypes.has(cur)) return "builtin"
	}

	if (cur.length > 0 && cur[0].toUpperCase() === cur[0]) {
	  return "type"
	}

	const next = stream.peek()
	if (next === "(" || next === "<") {
	  return "function"
	}

	if (next === "[") {
	  stream.next()
	  const after = stream.next()
	  stream.backUp(2)
	  if (after != null && after.match(/[A-Z]/i)) {
		return "function"
	  }
	}

	// highlight only last part
	// example:
	//   import foo.boo
	//              ^^^ - only this part will be highlighted
	if (state.context.expectedImportName && stream.peek() !== ".") {
	  state.context.expectedImportName = false
	  if (state.context.knownImports === undefined) {
		state.context.knownImports = new Set()
	  }
	  state.context.knownImports.add(cur)
	  return "import-name"
	}

	if (wasDot) {
	  return "property"
	}

	// highlight only identifier with dot after it
	// example:
	//   import foo
	//   import bar
	//
	//   foo.bar
	//   ^^^ - only this part will be highlighted
	if (state.context.knownImports.has(cur) && stream.peek() == ".") {
	  return "import-name"
	}

	return "variable"
  }

  function tokenLongInterpolation(stream, state) {
	if (stream.match("}")) {
	  state.tokenize = tokenString(state.context.stringQuote)
	  return "end-interpolation"
	}
	state.tokenize = tokenBase
	return state.tokenize(stream, state)
  }

  function tokenShortInterpolation(stream, state) {
	const ch = stream.next()
	if (ch === " ") {
	  state.tokenize = tokenString(state.context.stringQuote)
	  return state.tokenize(stream, state)
	}
	if (ch === ".") {
	  return "operator"
	}

	const ident = eatIdentifier(stream)
	if (ident[0].toLowerCase() === ident[0].toUpperCase()) {
	  state.tokenize = tokenString(state.context.stringQuote)
	  return state.tokenize(stream, state)
	}

	const next = stream.next()
	stream.backUp(1)
	if (next === ".") {
	  state.tokenize = tokenShortInterpolation
	} else {
	  state.tokenize = tokenString(state.context.stringQuote)
	}

	return "variable"
  }

  function tokenNextInterpolation(stream, state) {
	let next = stream.next()
	if (next === "$" && stream.eat("{")) {
	  state.tokenize = tokenLongInterpolation
	  return "start-interpolation"
	}
	if (next === "$") {
	  state.tokenize = tokenShortInterpolation
	  return "start-interpolation"
	}

	return "string"
  }

  function tokenNextEscape(stream, state) {
	let next = stream.next()
	if (next === "\\") {
	  stream.next()
	  state.tokenize = tokenString(state.context.stringQuote)
	  // we already know that next char is valid escape
	  return "valid-escape"
	}

	return "string"
  }

  function isValidEscapeChar(ch) {
	return (
	  ch === "n" ||
	  ch === "t" ||
	  ch === "r" ||
	  ch === "\\" ||
	  ch === '"' ||
	  ch === "'" ||
	  ch === "0"
	)
  }

  function tokenString(quote) {
	return function(stream, state) {
	  state.context.insideString = true
	  state.context.stringQuote = quote

	  let next = ""
	  let escaped = false
	  let end = false

	  while ((next = stream.next()) != null) {
		if (next === quote && !escaped) {
		  end = true
		  break
		}
		if (next === "$" && !escaped && stream.eat("{")) {
		  state.tokenize = tokenNextInterpolation
		  stream.backUp(2)
		  return "string"
		}
		if (next === "$" && !escaped) {
		  state.tokenize = tokenNextInterpolation
		  stream.backUp(1)
		  return "string"
		}
		if (escaped && isValidEscapeChar(next)) {
		  stream.backUp(2)
		  state.tokenize = tokenNextEscape
		  return "string"
		}
		escaped = !escaped && next === "\\"
	  }

	  if (end || escaped) {
		state.tokenize = tokenBase
	  }

	  state.context.insideString = false
	  state.context.stringQuote = null
	  return "string"
	}
  }

  function tokenRawString(quote) {
	return function(stream, state) {
	  state.context.insideString = true
	  state.context.stringQuote = quote

	  let next = ""
	  let escaped = false
	  let end = false

	  while ((next = stream.next()) != null) {
		if (next === quote && !escaped) {
		  end = true
		  break
		}
		escaped = !escaped && next === "\\"
	  }

	  if (end || escaped) {
		state.tokenize = tokenBase
	  }

	  state.context.insideString = false
	  state.context.stringQuote = null
	  return "string"
	}
  }

  function tokenComment(stream, state) {
	let maybeEnd = false
	let ch
	while ((ch = stream.next())) {
	  if (ch === "/" && maybeEnd) {
		state.tokenize = tokenBase
		break
	  }
	  maybeEnd = ch === "*"
	}
	return "comment"
  }

  function pushContext(state, column, type) {
	return (state.context = new Context(
	  state.indention,
	  column,
	  type,
	  null,
	  state.context,
	  state.context.knownImports
	))
  }

  function popContext(state) {
	if (!state.context.prev) return
	const t = state.context.type
	if (t === ")" || t === "]" || t === "}")
	  state.indention = state.context.indentation
	state.context = state.context.prev
	return state.context
  }

  return {
	startState: function() {
	  return {
		tokenize: null,
		context: new Context(0, 0, "top", false),
		indention: 0,
		startOfLine: true
	  }
	},

	token: function(stream, state) {
	  const ctx = state.context
	  if (stream.sol()) {
		if (ctx.align == null) {
		  ctx.align = false
		}
		state.indention = stream.indentation()
		state.startOfLine = true
	  }
	  if (stream.eatSpace()) {
		return null
	  }
	  curPunc = null
	  const style = state.tokenize || tokenBase(stream, state)
	  if (style === "comment") {
		return style
	  }
	  if (ctx.align == null) {
		ctx.align = true
	  }

	  if (curPunc === "{") pushContext(state, stream.column(), "}")
	  else if (curPunc === "[") pushContext(state, stream.column(), "]")
	  else if (curPunc === "(") pushContext(state, stream.column(), ")")
	  else if (curPunc === "}" && ctx.type === "}") popContext(state)
	  else if (curPunc === ctx.type) popContext(state)
	  state.startOfLine = false
	  return style
	},

	indent: function(state, textAfter) {
	  if (state.tokenize !== tokenBase && state.tokenize != null) {
		return 0
	  }

	  if (state.context.type == "top") {
		return 0
	  }

	  const ctx = state.context
	  const firstChar = textAfter.charAt(0)

	  const closing = firstChar === ctx.type
	  if (ctx.align) {
		return ctx.column + (closing ? 0 : 1)
	  }

	  return ctx.indentation + (closing ? 0 : indentUnit)
	},

	// @ts-ignore
	electricChars: "{}):",
	// @ts-ignore
	closeBrackets: "()[]{}''\"\"``",
	fold: "brace",
	blockCommentStart: "/*",
	blockCommentEnd: "*/",
	lineComment: "//"
  }
})

CodeMirror.defineMIME("text/x-v", "v");

});
