// Function to fetch and cache the file content
async function fetchFileContent(file_url) {
	try {
		const response = await fetch(file_url);
		if (!response.ok) {
			throw new Error('Network response was not ok ' + response.statusText);
		}
		return await response.text();
	} catch (error) {
		console.error('Failed to fetch file content:', error);
		return '';
	}

}


var vdocs = {
	config: {
		url_docs_md_original: 'https://github.com/vlang/v/blob/master/doc/docs.md',
		url_docs_md_full_source: 'https://docs.vlang.io/assets/docs.md',
		url_playground: 'https://play.vlang.io'
	},
	hydrate: function(){
		this.ui.hydrateTheme();
		this.ui.hydrateSidebar();
		this.ui.hydrateSearch();
		vdocs.examples.init();
	},
};

vdocs.ui = {
	btnChangeTheme: null,
	currentTheme: 'dark',

	tocPanel: null,
	sidebar: null,
	hydrateSidebar: function(){
		this.sidebar = document.getElementById("sidebar-main");
		this.tocPanel = document.getElementById("topics");

		document.querySelector(".sidebar-open-btn").addEventListener("click", (event) => {
			this.sidebar.style.setProperty('display', 'block')
		})

		document.querySelector(".sidebar-close-btn").addEventListener("click", (event) => {
			this.sidebar.style.setProperty('display', 'none')
		})

		//scroll to show selected topic
		const target = document.querySelector('.nav-entry.is-selected');
		target.scrollIntoView({ behavior: 'smooth', block: 'center' });

	},
	hydrateTheme: function(){
		this.btnChangeTheme = document.querySelector("header .change-theme");
		this.currentTheme = document.querySelector("html").getAttribute("data-theme");

		const theme = localStorage.getItem("theme");
		if (theme) {
			this.setTheme(theme);
		} else {
			this.setTheme(this.currentTheme);
		}


		this.btnChangeTheme.addEventListener("click", () => {
			const new_theme = this.currentTheme =='dark' ? 'light': 'dark';
			localStorage.setItem("theme", new_theme);
			this.setTheme(new_theme);
		});
	},
	setTheme: function(newTheme) {
		this.currentTheme = newTheme;
		document.querySelector("html").setAttribute("data-theme", newTheme);
		const svgSun = this.btnChangeTheme.querySelector(".sun");
		const svgMoon = this.btnChangeTheme.querySelector(".moon");
		if (newTheme === "dark") {
			svgSun.style.display = "block";
			svgMoon.style.display = "none";
		} else {
			svgSun.style.display = "none";
			svgMoon.style.display = "block";
		}

		vdocs.examples.onThemeChanged(newTheme);

	},
	searchInput: null,
	searchResults: null,
	searchVisible: false,
	hydrateSearch: function(){
		// Initialize the search functionality when the DOM is fully loaded
		this.searchInput = document.getElementById('search-input');

		const searchKeys = document.getElementById('search-kb-shortcut');
		searchKeys.innerHTML = (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl') + '&nbsp;K';

		var handleDocKey = (e)=>{
			const key = event.key; // const {key} = event; in ES6+
			if (key === "Escape") {
				this.hideSearchResults();
			}
		};

		const closeBtn = document.getElementById('search-results-close');
		closeBtn.addEventListener('click', (event) => {
			event.preventDefault();
			this.hideSearchResults();
		});

		document.addEventListener('keydown', (event) => {

			if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
				event.preventDefault();
				this.searchInput.value = '';
				this.searchInput.focus();
			}else if (event.key === "Escape" && this.searchVisible) {
				event.preventDefault();
				this.hideSearchResults();
			}
		});

		this.searchResults = document.getElementById('search-results');
		this.searchResultsContainer = document.getElementById('search-result-container');

		this.searchInput.onfocus = () => searchKeys.style.display = 'none';
		this.searchInput.onblur = () => searchKeys.style.display = 'block';
		this.searchInput.onkeydown = (event) => {

			if (event.key === 'Enter') {
				this.handleSearch();
			} else if (event.key === 'Escape') {
				if (this.searchResults.style.display === 'none') {
					this.searchInput.blur();
					return
				}
				this.hideSearchResults();
			}
		};

		document.getElementById('search-button').addEventListener('click', (evt)=>{
			this.handleSearch();
		});

		window.onbeforeunload = () => {
			this.hideSearchResults("none");
		};
	},
	helperGetLinkToSection: function(section){

		const fixed_url = vdocs.titles_to_fnames[ section ];
		if (fixed_url) { return fixed_url; }

		const existing_html_page = vdocs.fnames[ section ];
		if (existing_html_page) { return existing_html_page; }

		// try with a simpler normalized version of the section title:
		const slug = section.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

		const sfixed_url = vdocs.titles_to_fnames[ slug ];
		if (sfixed_url) { return sfixed_url; }

		const sexisting_html_page = vdocs.fnames[ slug ];
		if (sexisting_html_page) { return sexisting_html_page; }

		// probably a 3rd level or lower title, that currently has no reverse mapping; redirect to the main docs.md:
		return vdocs.config.url_docs_md_original + '#' + slug;
	},
	hideSearchResults: function(){
		this.searchVisible = false;

		this.sidebar.classList.remove("search-results-open");
	},
	handleSearch: function(){
		vdocs.search.topic( this.searchInput.value,  (items) => this.showSearchResults(items) );

	},
	showSearchResults: function(items){

		if (typeof items === 'string') {
			return items;
		}

		let rows = items.map(item => {
			const sectionLink = this.helperGetLinkToSection(item.section);

			return `
				<div class="nav-entry is-search-result">
					<a href="${sectionLink}" class="nav-entry-link">${item.section}</a>
					<p class="nav-entry-text">${item.snippet}</p>
				</div>`;
		}).join('');

		this.searchVisible = true;
		this.searchResultsContainer.innerHTML = rows;
		this.sidebar.classList.add("search-results-open");
	},

};

vdocs.search = {
	source_cache: null,

	topic: function(query, onDone){

		if(!this.source_cache){
			console.log('loading docs cache from "%s"...', vdocs.config.url_docs_md_full_source);
			fetch(vdocs.config.url_docs_md_full_source).then((resp)=>{
				return resp.text();
			}).then((data)=>{
				this.source_cache = data;
				this.findTopic(query, onDone);
			}).catch(function (err) {
				// There was an error
				console.warn('Failed to fetch search source.', err);
			});

			return;
		}

		this.findTopic(query, onDone);
	},
	findTopic: function(query, onDone){
		if (!this.source_cache) {
			return 'File content not loaded. Please try again later.';
		}

		const sections = this.parseMarkdown(this.source_cache);
		const results = [];
		const regex = new RegExp(query, 'gi');

		for (const section in sections) {
			const sectionContent = sections[section].join('\n');
			const match = sectionContent.match(regex);
			if (match) {
				results.push({ section, snippet: this.getSnippet(sectionContent, match[0]) });
			}
		}

		// Filter out the "Table of Contents" section
		if(onDone){
			let items = results.filter(result => result.section.toLowerCase() !== 'table of contents');
			onDone(items);
		}

	},
	// Function to parse the markdown content and create a map of sections
	parseMarkdown: function(content) {
		const lines = content.split('\n');
		const sections = {};
		let currentSection = '';

		lines.forEach(line => {
			const sectionMatch = line.match(/^##+\s+(.+)/); // Match headers (##, ###, etc.)
			if (sectionMatch) {
				currentSection = sectionMatch[1];
				sections[currentSection] = [];
			} else if (currentSection) {
				sections[currentSection].push(line);
			}
		});

		return sections;
	},

	// Function to get a snippet of text around the first match
	getSnippet: function(content, match) {
		const index = content.indexOf(match);
		const snippetLength = 100;
		const start = Math.max(index - snippetLength / 2, 0);
		const end = Math.min(index + snippetLength / 2, content.length);
		return content.substring(start, end).replace(/\n/g, ' ') + '...';
	}



};

/*
	Uses Codemirror 6 with new `V` mode implemented in "cm-lang-v.js".
	https://codemirror.net/docs/
*/
vdocs.examples = {
	items: [],
	init: function(){
		CodeMirror.defineMode("v", vdocs_init_mode);

		let items = document.querySelectorAll('.language-v');

		for(let el of items){
			this.createEditor(el);
		}
	},
	onThemeChanged: function(theme){
		for(let item of this.items){
			item[1].setOption("theme", theme);
		}
	},
	createEditor: function(el){
		//Old codemirror docs https://marijnhaverbeke.nl/blog/codemirror-mode-system.html

		const code  = el.textContent;
		el.classList.add('v-code-example');
		el.innerHTML = `<div class='v-code-example-header'>

		<div class="v-code-btn-run v-code-btn" title="Try it in the V Playground..." role="button">
		  <svg class="run-icon" width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
			<g clip-path="url(#clip0_14_12)">
			  <path d="M14.0548 8.75068L3.25542 14.9857C2.92209 15.1782 2.50542 14.9376 2.50542 14.5527L2.50542 2.08263C2.50542 1.69774 2.92208 1.45717 3.25542 1.64962L14.0548 7.88465C14.3881 8.0771 14.3881 8.55823 14.0548 8.75068Z"
					fill="#659360" fill-opacity="0.2" stroke="#659360"/>
			</g>
			<defs>
			  <clipPath id="clip0_14_12">
				<rect width="16" height="16" fill="white"/>
			  </clipPath>
			</defs>
		  </svg> Try it...
		</div>
		<div class="v-code-btn-copy v-code-btn" title="Copy code..." role="button">
			<svg height="16px" viewBox="0 0 24 24" width="16px" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1">
			<path d="M21 5.4A2.4 2.4 0 0 0 18.6 3H5.4A2.4 2.4 0 0 0 3 5.4v15.2A2.4 2.4 0 0 0 5.4 23h13.2a2.4 2.4 0 0 0 2.4-2.4V5.4Z" fill="#5D87BF" fill-opacity=".16" stroke="#5D87BF" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round"/><path d="M15.2 1H8.8a.8.8 0 0 0-.8.8v2.4a.8.8 0 0 0 .8.8h6.4a.8.8 0 0 0 .8-.8V1.8a.8.8 0 0 0-.8-.8Z" fill="#5D87BF" stroke="#5D87BF" fill-opacity="0.2" stroke-width="1" stroke-miterlimit="10"/>
			<path d="M16 3h2.6A2.4 2.4 0 0 1 21 5.4v15.2a2.4 2.4 0 0 1-2.4 2.4H5.4A2.4 2.4 0 0 1 3 20.6V5.4A2.4 2.4 0 0 1 5.4 3H8" stroke="#5D87BF" stroke-width="1" fill="none" stroke-miterlimit="10" stroke-linecap="round"/>
			</svg>
		</div>
		</div>`;

		let editor = CodeMirror(el, {
			value: code,
			theme: 	vdocs.ui.currentTheme,
			mode: 'v',
			lineNumbers: false,
			readOnly: false
		});


		this.items.push([el, editor]);

		el.querySelector('.v-code-btn-run').addEventListener('click', (evt)=>{

			let code = editor.getValue();
			let url = "https://play.vlang.io/?base64=" + btoa(code);

			window.open(url, "_blank");

			return;

		});
		el.querySelector('.v-code-btn-copy').addEventListener('click', (evt)=>{
			let code = editor.getValue();
			navigator.clipboard.writeText(code);
		});
	},
	run: function(el, editor){
		const data = new FormData();

		//Old server https://play.vosca.dev/ is defunc

		let code = editor.getValue();
		data.append('code', code);

		//Attempt to use play.vlang.io but cloudflare doesnt play nice here...
		fetch('https://play.vlang.io/run_test', {
			method: 'POST',
			mode: 'no-cors',
			headers: {
				'Host': 'play.vlang.io',
				'Accept': '*/*',
				'User-Agent': 'curl/8.4.0'
			},
			body: data,
		}).then((response) => {
			console.log(response);
			response.headers.forEach(function(val, key) { console.log(key + ' -> ' + val); });

			return response.json()
		}).then((data) => {
			console.log(data);
		})
		.catch((error) => {
			console.log(error);
		});

	},

}

document.addEventListener('DOMContentLoaded', () => {
	vdocs.hydrate();
});

function vdocs_init_mode(config){
	//Creates a CM5 Language Mode
	//Deprecated, replaced with CM6 Language Mode in cm-lang-v.js

	//Keywords
	var A = new Set([
		"as", "asm", "assert", "atomic", "break", "const", "continue", "defer", "else", "enum", "fn", "for", "go", "goto", "if", "import", "in", "interface", "is", "isreftype", "lock", "match", "module", "mut", "none", "or", "pub", "return", "rlock", "select", "shared", "sizeof", "static", "struct", "spawn", "type", "typeof", "union", "unsafe", "volatile", "__global", "__offsetof",
	]);
	//Atoms
	var B = new Set(["true", "false", "nil", "print", "println", "exit", "panic", "error", "dump"]);

	//builtin
	var W = new Set(["bool", "string", "i8", "i16", "int", "i64", "i128", "u8", "u16", "u32", "u64", "u128", "rune", "f32", "f64", "isize", "usize", "voidptr", "any"]);

	var N = new Set(["sql", "chan", "thread"]);

	const VATTRS = [
		"params",	"noinit",	"required",	"skip",
		"assert_continues",	"unsafe", "manualfree", "heap",
		"nonnull", "primary", "inline", "direct_array_access", "live", "flag",
		"noinline", "noreturn", "typedef", "console", "sql", "table",
		"deprecated", "deprecated_after", "export", "callconv",
	];

	let U = "[\\w_]+";
	let Y = `(${U}: ${U})`;

	//RegEx to match attributes
	let Q = new RegExp(`^(${VATTRS.join("|")})]$`);
	let G = new RegExp(`^(${VATTRS.join("|")}(; ?)?){2,}]$`);
	let Z = new RegExp(`^${Y}]$`);
	let J = new RegExp(`^((${Y})(; )?){2,}]$`);
	let X = new RegExp(`^if ${U} \\??]`);

var y;
	let e = (y = config.indentUnit) != null ? y : 0;
	let t = /[+\-*&^%:=<>!?|\/]/;
	let n = null;

	function r(i) {
		return i.eatWhile(/[\w$_\xa1-\uffff]/), i.current();
	}
	function a(i, o) {
		return i.match("}") ? ((o.tokenize = g(o.context.stringQuote)), "end-interpolation") : ((o.tokenize = tokenBase), o.tokenize(i, o));
	}
	function d(i, o) {
		let s = i.next();
		if (s === " ") return (o.tokenize = g(o.context.stringQuote)), o.tokenize(i, o);
		if (s === ".") return "operator";
		let h = r(i);
		if (h[0].toLowerCase() === h[0].toUpperCase()) return (o.tokenize = g(o.context.stringQuote)), o.tokenize(i, o);
		let c = i.next();
		return i.backUp(1), c === "." ? (o.tokenize = d) : (o.tokenize = g(o.context.stringQuote)), "variable";
	}
	function p(i, o) {
		let s = i.next();
		return s === "$" && i.eat("{") ? ((o.tokenize = a), "start-interpolation") : s === "$" ? ((o.tokenize = d), "start-interpolation") : "string";
	}
	function g(i) {
		return function (o, s) {
			(s.context.insideString = !0), (s.context.stringQuote = i);
			let h = "",
				c = !1,
				x = !1;
			for (; (h = o.next()) != null; ) {
				if (h === i && !c) {
					x = !0;
					break;
				}
				if (h === "$" && !c && o.eat("{")) return (s.tokenize = p), o.backUp(2), "string";
				if (h === "$" && !c) return (s.tokenize = p), o.backUp(1), "string";
				c = !c && h === "\\";
			}
			return (x || c) && (s.tokenize = tokenBase), (s.context.insideString = !1), (s.context.stringQuote = null), "string";
		};
	}
	function f(i, o) {
		let s = !1,
			h;
		for (; (h = i.next()); ) {
			if (h === "/" && s) {
				o.tokenize = tokenBase;
				break;
			}
			s = h === "*";
		}
		return "comment";
	}
	function b(state, column, type) {
		return (state.context = new vState(state.indention, column, type, null, state.context));
	}
	function m(state) {
		if (!state.context.prev) return;
		let o = state.context.type;
		return (o === ")" || o === "]" || o === "}") && (state.indention = state.context.indentation), (state.context = state.context.prev), state.context;
	}

	function tokenBase(stream, state) {
		let s = stream.next();
		if (s === null) return null;

		if (state.context.insideString && s === "}") return stream.eat("}"), (state.tokenize = g(state.context.stringQuote)), "end-interpolation";

		//Is literal string...
		if (s === '"' || s === "'" || s === "`") return (state.tokenize = g(s)), state.tokenize(stream, state);

		//Is operator
		if (s === "." && !stream.match(/^[0-9]+([eE][\-+]?[0-9]+)?/)) return "operator";

		//Is attribute?
		if (s === "[" && (stream.match(Q) || stream.match(Z) || stream.match(G) || stream.match(J) || stream.match(X))) return "attribute";

		if (/[\d.]/.test(s)) return s === "0" ? stream.match(/^[xX][0-9a-fA-F_]+/) || stream.match(/^o[0-7_]+/) || stream.match(/^b[0-1_]+/) : stream.match(/^[0-9_]*\.?[0-9_]*([eE][\-+]?[0-9_]+)?/), "number";

		if (/[\[\]{}(),;:.]/.test(s)) return (n = s), null;

		if (s === "/") {
			if (stream.eat("*")) return (state.tokenize = f), f(stream, state);
			if (stream.eat("/")) return stream.skipToEnd(), "comment";
		}

		if (t.test(s)) return stream.eatWhile(t), "operator";
		if (s === "@") return r(stream), "at-identifier";
		if (s === "$") {
			let M = r(stream).slice(1);
			return A.has(M) ? "keyword" : "compile-time-identifier";
		}
		stream.backUp(2);
		let h = stream.next() === ".";
		stream.next();

		let c = r(stream);
		if ((c === "import" && (state.context.expectedImportName = !0), A.has(c) || N.has(c))) return "keyword";
		if (B.has(c)) return "atom";
		if (W.has(c)) return "builtin";
		if (c.length > 0 && c[0].toUpperCase() === c[0]) return "type";
		let x = stream.peek();
		if (x === "(" || x === "<") return "function";
		if (x === "[") {
			stream.next();
			let M = stream.next();
			if ((stream.backUp(2), M != null && M.match(/[A-Z]/i))) return "function";
		}
		return h
			? "property"
			: state.context.expectedImportName && stream.peek() != "."
			? ((state.context.expectedImportName = !1), state.context.knownImports === void 0 && (state.context.knownImports = new Set()), state.context.knownImports.add(c), "import-name")
			: state.context.knownImports.has(c) && stream.peek() == "."
			? "import-name"
			: "variable";
	}

	class vState {
		constructor(e, t, n, r, l) {
			this.indentation = e;
			this.column = t;
			this.type = n;
			this.align = r;
			this.prev = l;
			this.insideString = !1;
			this.stringQuote = null;
			this.expectedImportName = !1;
			this.knownImports = new Set();
		}
	};

	let vMode = {
		indent: function (stream, state) {
			if ((stream.tokenize !== l && stream.tokenize != null) || stream.context.type == "top") return 0;
			let s = stream.context,
				c = state.charAt(0) === s.type;
			return s.align ? s.column + (c ? 0 : 1) : s.indentation + (c ? 0 : e);
		},
		token: function (stream, state) {
			let s = state.context;
			if ((stream.sol() && (s.align == null && (s.align = !1), (state.indention = stream.indentation()), (state.startOfLine = !0)), stream.eatSpace())) return null;
			n = null;
			let h = (state.tokenize || tokenBase)(stream, state);
			return (
				h === "comment" ||
					(s.align == null && (s.align = !0),
					n === "{" ? b(state, stream.column(), "}") : n === "[" ? b(state, stream.column(), "]") : n === "(" ? b(state, stream.column(), ")") : ((n === "}" && s.type === "}") || n === s.type) && m(state),
					(state.startOfLine = !1)),
				h
			);
		},
		electricChars: "{}):",
		closeBrackets: "()[]{}''\"\"``",
		fold: "brace",
		blockCommentStart: "/*",
		blockCommentEnd: "*/",
		lineComment: "//",
		startState: function () {
			return { tokenize: null, context: new vState(0, 0, "top", !1), indention: 0, startOfLine: !0 };
		},
	};

	return vMode;



}


	// Lookups of sections to files
	vdocs.titles_to_fnames = {
	"Introduction":	"introduction.html",
	"Installing V from source":	"installing-v-from-source.html",
	"Upgrading V to latest version":	"upgrading-v-to-latest-version.html",
	"Packaging V for distribution":	"packaging-v-for-distribution.html",
	"Getting started":	"getting-started.html",
	"Hello World":	"hello-world.html",
	"Running a project folder with several files":	"running-a-project-folder-with-several-files.html",
	"Comments":	"comments.html",
	"Hoisting":	"functions.html#hoisting",
	"hoisting":	"functions.html#hoisting",
	"HOISTING":	"functions.html#hoisting",
	"Returning multiple values":	"functions.html#returning-multiple-values",
	"returning multiple values":	"functions.html#returning-multiple-values",
	"RETURNING MULTIPLE VALUES":	"functions.html#returning-multiple-values",
	"returning-multiple-values":	"functions.html#returning-multiple-values",
	"Functions":	"functions.html",
	"Symbol visibility":	"symbol-visibility.html",
	"Mutable variables":	"variables.html#mutable-variables",
	"mutable variables":	"variables.html#mutable-variables",
	"MUTABLE VARIABLES":	"variables.html#mutable-variables",
	"mutable-variables":	"variables.html#mutable-variables",
	"Initialization vs assignment":	"variables.html#initialization-vs-assignment",
	"initialization vs assignment":	"variables.html#initialization-vs-assignment",
	"INITIALIZATION VS ASSIGNMENT":	"variables.html#initialization-vs-assignment",
	"initialization-vs-assignment":	"variables.html#initialization-vs-assignment",
	"Warnings and declaration errors":	"variables.html#warnings-and-declaration-errors",
	"warnings and declaration errors":	"variables.html#warnings-and-declaration-errors",
	"WARNINGS AND DECLARATION ERRORS":	"variables.html#warnings-and-declaration-errors",
	"warnings-and-declaration-errors":	"variables.html#warnings-and-declaration-errors",
	"Variables":	"variables.html",
	"Primitive types":	"v-types.html#primitive-types",
	"primitive types":	"v-types.html#primitive-types",
	"PRIMITIVE TYPES":	"v-types.html#primitive-types",
	"primitive-types":	"v-types.html#primitive-types",
	"Strings":	"v-types.html#strings",
	"strings":	"v-types.html#strings",
	"STRINGS":	"v-types.html#strings",
	"Runes":	"v-types.html#runes",
	"runes":	"v-types.html#runes",
	"RUNES":	"v-types.html#runes",
	"Numbers":	"v-types.html#numbers",
	"numbers":	"v-types.html#numbers",
	"NUMBERS":	"v-types.html#numbers",
	"Arrays":	"v-types.html#arrays",
	"arrays":	"v-types.html#arrays",
	"ARRAYS":	"v-types.html#arrays",
	"Fixed size arrays":	"v-types.html#fixed-size-arrays",
	"fixed size arrays":	"v-types.html#fixed-size-arrays",
	"FIXED SIZE ARRAYS":	"v-types.html#fixed-size-arrays",
	"fixed-size-arrays":	"v-types.html#fixed-size-arrays",
	"Maps":	"v-types.html#maps",
	"maps":	"v-types.html#maps",
	"MAPS":	"v-types.html#maps",
	"Map update syntax":	"v-types.html#map-update-syntax",
	"map update syntax":	"v-types.html#map-update-syntax",
	"MAP UPDATE SYNTAX":	"v-types.html#map-update-syntax",
	"map-update-syntax":	"v-types.html#map-update-syntax",
	"String interpolation":	"v-types.html#string-interpolation",
	"string interpolation":	"v-types.html#string-interpolation",
	"STRING INTERPOLATION":	"v-types.html#string-interpolation",
	"string-interpolation":	"v-types.html#string-interpolation",
	"String operators":	"v-types.html#string-operators",
	"string operators":	"v-types.html#string-operators",
	"STRING OPERATORS":	"v-types.html#string-operators",
	"string-operators":	"v-types.html#string-operators",
	"Array Fields":	"v-types.html#array-fields",
	"array fields":	"v-types.html#array-fields",
	"ARRAY FIELDS":	"v-types.html#array-fields",
	"array-fields":	"v-types.html#array-fields",
	"Array Initialization":	"v-types.html#array-initialization",
	"array initialization":	"v-types.html#array-initialization",
	"ARRAY INITIALIZATION":	"v-types.html#array-initialization",
	"array-initialization":	"v-types.html#array-initialization",
	"Array Types":	"v-types.html#array-types",
	"array types":	"v-types.html#array-types",
	"ARRAY TYPES":	"v-types.html#array-types",
	"array-types":	"v-types.html#array-types",
	"Multidimensional Arrays":	"v-types.html#multidimensional-arrays",
	"multidimensional arrays":	"v-types.html#multidimensional-arrays",
	"MULTIDIMENSIONAL ARRAYS":	"v-types.html#multidimensional-arrays",
	"multidimensional-arrays":	"v-types.html#multidimensional-arrays",
	"Array methods":	"v-types.html#array-methods",
	"array methods":	"v-types.html#array-methods",
	"ARRAY METHODS":	"v-types.html#array-methods",
	"array-methods":	"v-types.html#array-methods",
	"Array Slices":	"v-types.html#array-slices",
	"array slices":	"v-types.html#array-slices",
	"ARRAY SLICES":	"v-types.html#array-slices",
	"array-slices":	"v-types.html#array-slices",
	"Array method chaining":	"v-types.html#array-method-chaining",
	"array method chaining":	"v-types.html#array-method-chaining",
	"ARRAY METHOD CHAINING":	"v-types.html#array-method-chaining",
	"array-method-chaining":	"v-types.html#array-method-chaining",
	"Sorting Arrays":	"v-types.html#sorting-arrays",
	"sorting arrays":	"v-types.html#sorting-arrays",
	"SORTING ARRAYS":	"v-types.html#sorting-arrays",
	"sorting-arrays":	"v-types.html#sorting-arrays",
	"Slices with negative indexes":	"v-types.html#slices-with-negative-indexes",
	"slices with negative indexes":	"v-types.html#slices-with-negative-indexes",
	"SLICES WITH NEGATIVE INDEXES":	"v-types.html#slices-with-negative-indexes",
	"slices-with-negative-indexes":	"v-types.html#slices-with-negative-indexes",
	"V Types":	"v-types.html",
	"Selective imports":	"module-imports.html#selective-imports",
	"selective imports":	"module-imports.html#selective-imports",
	"SELECTIVE IMPORTS":	"module-imports.html#selective-imports",
	"selective-imports":	"module-imports.html#selective-imports",
	"Module hierarchy":	"module-imports.html#module-hierarchy",
	"module hierarchy":	"module-imports.html#module-hierarchy",
	"MODULE HIERARCHY":	"module-imports.html#module-hierarchy",
	"module-hierarchy":	"module-imports.html#module-hierarchy",
	"Module import aliasing":	"module-imports.html#module-import-aliasing",
	"module import aliasing":	"module-imports.html#module-import-aliasing",
	"MODULE IMPORT ALIASING":	"module-imports.html#module-import-aliasing",
	"module-import-aliasing":	"module-imports.html#module-import-aliasing",
	"Module imports":	"module-imports.html",
	"If":	"statements-&-expressions.html#if",
	"if":	"statements-&-expressions.html#if",
	"IF":	"statements-&-expressions.html#if",
	"Match":	"statements-&-expressions.html#match",
	"match":	"statements-&-expressions.html#match",
	"MATCH":	"statements-&-expressions.html#match",
	"In operator":	"statements-&-expressions.html#in-operator",
	"in operator":	"statements-&-expressions.html#in-operator",
	"IN OPERATOR":	"statements-&-expressions.html#in-operator",
	"in-operator":	"statements-&-expressions.html#in-operator",
	"For loop":	"statements-&-expressions.html#for-loop",
	"for loop":	"statements-&-expressions.html#for-loop",
	"FOR LOOP":	"statements-&-expressions.html#for-loop",
	"for-loop":	"statements-&-expressions.html#for-loop",
	"Defer":	"statements-&-expressions.html#defer",
	"defer":	"statements-&-expressions.html#defer",
	"DEFER":	"statements-&-expressions.html#defer",
	"Goto":	"statements-&-expressions.html#goto",
	"goto":	"statements-&-expressions.html#goto",
	"GOTO":	"statements-&-expressions.html#goto",
	"If expressions":	"statements-&-expressions.html#if-expressions",
	"if expressions":	"statements-&-expressions.html#if-expressions",
	"IF EXPRESSIONS":	"statements-&-expressions.html#if-expressions",
	"if-expressions":	"statements-&-expressions.html#if-expressions",
	"If unwrapping":	"statements-&-expressions.html#if-unwrapping",
	"if unwrapping":	"statements-&-expressions.html#if-unwrapping",
	"IF UNWRAPPING":	"statements-&-expressions.html#if-unwrapping",
	"if-unwrapping":	"statements-&-expressions.html#if-unwrapping",
	"Type checks and casts":	"statements-&-expressions.html#type-checks-and-casts",
	"type checks and casts":	"statements-&-expressions.html#type-checks-and-casts",
	"TYPE CHECKS AND CASTS":	"statements-&-expressions.html#type-checks-and-casts",
	"type-checks-and-casts":	"statements-&-expressions.html#type-checks-and-casts",
	"for/in":	"statements-&-expressions.html#forin",
	"FOR/IN":	"statements-&-expressions.html#forin",
	"forin":	"statements-&-expressions.html#forin",
	"Condition for":	"statements-&-expressions.html#condition-for",
	"condition for":	"statements-&-expressions.html#condition-for",
	"CONDITION FOR":	"statements-&-expressions.html#condition-for",
	"condition-for":	"statements-&-expressions.html#condition-for",
	"Bare for":	"statements-&-expressions.html#bare-for",
	"bare for":	"statements-&-expressions.html#bare-for",
	"BARE FOR":	"statements-&-expressions.html#bare-for",
	"bare-for":	"statements-&-expressions.html#bare-for",
	"C for":	"statements-&-expressions.html#c-for",
	"c for":	"statements-&-expressions.html#c-for",
	"C FOR":	"statements-&-expressions.html#c-for",
	"c-for":	"statements-&-expressions.html#c-for",
	"Labelled break & continue":	"statements-&-expressions.html#labelled-break-&-continue",
	"labelled break & continue":	"statements-&-expressions.html#labelled-break-&-continue",
	"LABELLED BREAK & CONTINUE":	"statements-&-expressions.html#labelled-break-&-continue",
	"labelled-break-&-continue":	"statements-&-expressions.html#labelled-break-&-continue",
	"Array for":	"statements-&-expressions.html#array-for",
	"array for":	"statements-&-expressions.html#array-for",
	"ARRAY FOR":	"statements-&-expressions.html#array-for",
	"array-for":	"statements-&-expressions.html#array-for",
	"Custom iterators":	"statements-&-expressions.html#custom-iterators",
	"custom iterators":	"statements-&-expressions.html#custom-iterators",
	"CUSTOM ITERATORS":	"statements-&-expressions.html#custom-iterators",
	"custom-iterators":	"statements-&-expressions.html#custom-iterators",
	"Map for":	"statements-&-expressions.html#map-for",
	"map for":	"statements-&-expressions.html#map-for",
	"MAP FOR":	"statements-&-expressions.html#map-for",
	"map-for":	"statements-&-expressions.html#map-for",
	"Range for":	"statements-&-expressions.html#range-for",
	"range for":	"statements-&-expressions.html#range-for",
	"RANGE FOR":	"statements-&-expressions.html#range-for",
	"range-for":	"statements-&-expressions.html#range-for",
	"Statements & expressions":	"statements-&-expressions.html",
	"Heap structs":	"structs.html#heap-structs",
	"heap structs":	"structs.html#heap-structs",
	"HEAP STRUCTS":	"structs.html#heap-structs",
	"heap-structs":	"structs.html#heap-structs",
	"Default field values":	"structs.html#default-field-values",
	"default field values":	"structs.html#default-field-values",
	"DEFAULT FIELD VALUES":	"structs.html#default-field-values",
	"default-field-values":	"structs.html#default-field-values",
	"Required fields":	"structs.html#required-fields",
	"required fields":	"structs.html#required-fields",
	"REQUIRED FIELDS":	"structs.html#required-fields",
	"required-fields":	"structs.html#required-fields",
	"Short struct literal syntax":	"structs.html#short-struct-literal-syntax",
	"short struct literal syntax":	"structs.html#short-struct-literal-syntax",
	"SHORT STRUCT LITERAL SYNTAX":	"structs.html#short-struct-literal-syntax",
	"short-struct-literal-syntax":	"structs.html#short-struct-literal-syntax",
	"Struct update syntax":	"structs.html#struct-update-syntax",
	"struct update syntax":	"structs.html#struct-update-syntax",
	"STRUCT UPDATE SYNTAX":	"structs.html#struct-update-syntax",
	"struct-update-syntax":	"structs.html#struct-update-syntax",
	"Trailing struct literal arguments":	"structs.html#trailing-struct-literal-arguments",
	"trailing struct literal arguments":	"structs.html#trailing-struct-literal-arguments",
	"TRAILING STRUCT LITERAL ARGUMENTS":	"structs.html#trailing-struct-literal-arguments",
	"trailing-struct-literal-arguments":	"structs.html#trailing-struct-literal-arguments",
	"Access modifiers":	"structs.html#access-modifiers",
	"access modifiers":	"structs.html#access-modifiers",
	"ACCESS MODIFIERS":	"structs.html#access-modifiers",
	"access-modifiers":	"structs.html#access-modifiers",
	"Anonymous structs":	"structs.html#anonymous-structs",
	"anonymous structs":	"structs.html#anonymous-structs",
	"ANONYMOUS STRUCTS":	"structs.html#anonymous-structs",
	"anonymous-structs":	"structs.html#anonymous-structs",
	"Static type methods":	"structs.html#static-type-methods",
	"static type methods":	"structs.html#static-type-methods",
	"STATIC TYPE METHODS":	"structs.html#static-type-methods",
	"static-type-methods":	"structs.html#static-type-methods",
	"[noinit] structs":	"structs.html#noinit-structs",
	"[NOINIT] STRUCTS":	"structs.html#noinit-structs",
	"noinit-structs":	"structs.html#noinit-structs",
	"Methods":	"structs.html#methods",
	"methods":	"structs.html#methods",
	"METHODS":	"structs.html#methods",
	"Embedded structs":	"structs.html#embedded-structs",
	"embedded structs":	"structs.html#embedded-structs",
	"EMBEDDED STRUCTS":	"structs.html#embedded-structs",
	"embedded-structs":	"structs.html#embedded-structs",
	"Structs":	"structs.html",
	"Why use unions?":	"unions.html#why-use-unions?",
	"why use unions?":	"unions.html#why-use-unions?",
	"WHY USE UNIONS?":	"unions.html#why-use-unions?",
	"why-use-unions?":	"unions.html#why-use-unions?",
	"Embedding":	"unions.html#embedding",
	"embedding":	"unions.html#embedding",
	"EMBEDDING":	"unions.html#embedding",
	"Unions":	"unions.html",
	"Immutable function args by default":	"functions-2.html#immutable-function-args-by-default",
	"immutable function args by default":	"functions-2.html#immutable-function-args-by-default",
	"IMMUTABLE FUNCTION ARGS BY DEFAULT":	"functions-2.html#immutable-function-args-by-default",
	"immutable-function-args-by-default":	"functions-2.html#immutable-function-args-by-default",
	"Mutable arguments":	"functions-2.html#mutable-arguments",
	"mutable arguments":	"functions-2.html#mutable-arguments",
	"MUTABLE ARGUMENTS":	"functions-2.html#mutable-arguments",
	"mutable-arguments":	"functions-2.html#mutable-arguments",
	"Variable number of arguments":	"functions-2.html#variable-number-of-arguments",
	"variable number of arguments":	"functions-2.html#variable-number-of-arguments",
	"VARIABLE NUMBER OF ARGUMENTS":	"functions-2.html#variable-number-of-arguments",
	"variable-number-of-arguments":	"functions-2.html#variable-number-of-arguments",
	"Anonymous & higher order functions":	"functions-2.html#anonymous-&-higher-order-functions",
	"anonymous & higher order functions":	"functions-2.html#anonymous-&-higher-order-functions",
	"ANONYMOUS & HIGHER ORDER FUNCTIONS":	"functions-2.html#anonymous-&-higher-order-functions",
	"anonymous-&-higher-order-functions":	"functions-2.html#anonymous-&-higher-order-functions",
	"Lambda expressions":	"functions-2.html#lambda-expressions",
	"lambda expressions":	"functions-2.html#lambda-expressions",
	"LAMBDA EXPRESSIONS":	"functions-2.html#lambda-expressions",
	"lambda-expressions":	"functions-2.html#lambda-expressions",
	"Closures":	"functions-2.html#closures",
	"closures":	"functions-2.html#closures",
	"CLOSURES":	"functions-2.html#closures",
	"Parameter evaluation order":	"functions-2.html#parameter-evaluation-order",
	"parameter evaluation order":	"functions-2.html#parameter-evaluation-order",
	"PARAMETER EVALUATION ORDER":	"functions-2.html#parameter-evaluation-order",
	"parameter-evaluation-order":	"functions-2.html#parameter-evaluation-order",
	"Functions 2":	"functions-2.html",
	"References":	"references.html",
	"Required module prefix":	"constants.html#required-module-prefix",
	"required module prefix":	"constants.html#required-module-prefix",
	"REQUIRED MODULE PREFIX":	"constants.html#required-module-prefix",
	"required-module-prefix":	"constants.html#required-module-prefix",
	"Constants":	"constants.html",
	"println":	"builtin-functions.html#println",
	"PRINTLN":	"builtin-functions.html#println",
	"Printing custom types":	"builtin-functions.html#printing-custom-types",
	"printing custom types":	"builtin-functions.html#printing-custom-types",
	"PRINTING CUSTOM TYPES":	"builtin-functions.html#printing-custom-types",
	"printing-custom-types":	"builtin-functions.html#printing-custom-types",
	"Dumping expressions at runtime":	"builtin-functions.html#dumping-expressions-at-runtime",
	"dumping expressions at runtime":	"builtin-functions.html#dumping-expressions-at-runtime",
	"DUMPING EXPRESSIONS AT RUNTIME":	"builtin-functions.html#dumping-expressions-at-runtime",
	"dumping-expressions-at-runtime":	"builtin-functions.html#dumping-expressions-at-runtime",
	"Builtin functions":	"builtin-functions.html",
	"Create modules":	"modules.html#create-modules",
	"create modules":	"modules.html#create-modules",
	"CREATE MODULES":	"modules.html#create-modules",
	"create-modules":	"modules.html#create-modules",
	"Special considerations for project folders":	"modules.html#special-considerations-for-project-folders",
	"special considerations for project folders":	"modules.html#special-considerations-for-project-folders",
	"SPECIAL CONSIDERATIONS FOR PROJECT FOLDERS":	"modules.html#special-considerations-for-project-folders",
	"special-considerations-for-project-folders":	"modules.html#special-considerations-for-project-folders",
	"init functions":	"modules.html#init-functions",
	"INIT FUNCTIONS":	"modules.html#init-functions",
	"init-functions":	"modules.html#init-functions",
	"cleanup functions":	"modules.html#cleanup-functions",
	"CLEANUP FUNCTIONS":	"modules.html#cleanup-functions",
	"cleanup-functions":	"modules.html#cleanup-functions",
	"Modules":	"modules.html",
	"Type aliases":	"type-declarations.html#type-aliases",
	"type aliases":	"type-declarations.html#type-aliases",
	"TYPE ALIASES":	"type-declarations.html#type-aliases",
	"type-aliases":	"type-declarations.html#type-aliases",
	"Enums":	"type-declarations.html#enums",
	"enums":	"type-declarations.html#enums",
	"ENUMS":	"type-declarations.html#enums",
	"Function Types":	"type-declarations.html#function-types",
	"function types":	"type-declarations.html#function-types",
	"FUNCTION TYPES":	"type-declarations.html#function-types",
	"function-types":	"type-declarations.html#function-types",
	"Interfaces":	"type-declarations.html#interfaces",
	"interfaces":	"type-declarations.html#interfaces",
	"INTERFACES":	"type-declarations.html#interfaces",
	"Sum types":	"type-declarations.html#sum-types",
	"sum types":	"type-declarations.html#sum-types",
	"SUM TYPES":	"type-declarations.html#sum-types",
	"sum-types":	"type-declarations.html#sum-types",
	"Option/Result types and error handling":	"type-declarations.html#optionresult-types-and-error-handling",
	"option/result types and error handling":	"type-declarations.html#optionresult-types-and-error-handling",
	"OPTION/RESULT TYPES AND ERROR HANDLING":	"type-declarations.html#optionresult-types-and-error-handling",
	"optionresult-types-and-error-handling":	"type-declarations.html#optionresult-types-and-error-handling",
	"Custom error types":	"type-declarations.html#custom-error-types",
	"custom error types":	"type-declarations.html#custom-error-types",
	"CUSTOM ERROR TYPES":	"type-declarations.html#custom-error-types",
	"custom-error-types":	"type-declarations.html#custom-error-types",
	"Generics":	"type-declarations.html#generics",
	"generics":	"type-declarations.html#generics",
	"GENERICS":	"type-declarations.html#generics",
	"Implement an interface":	"type-declarations.html#implement-an-interface",
	"implement an interface":	"type-declarations.html#implement-an-interface",
	"IMPLEMENT AN INTERFACE":	"type-declarations.html#implement-an-interface",
	"implement-an-interface":	"type-declarations.html#implement-an-interface",
	"Casting an interface":	"type-declarations.html#casting-an-interface",
	"casting an interface":	"type-declarations.html#casting-an-interface",
	"CASTING AN INTERFACE":	"type-declarations.html#casting-an-interface",
	"casting-an-interface":	"type-declarations.html#casting-an-interface",
	"Interface method definitions":	"type-declarations.html#interface-method-definitions",
	"interface method definitions":	"type-declarations.html#interface-method-definitions",
	"INTERFACE METHOD DEFINITIONS":	"type-declarations.html#interface-method-definitions",
	"interface-method-definitions":	"type-declarations.html#interface-method-definitions",
	"Embedded interface":	"type-declarations.html#embedded-interface",
	"embedded interface":	"type-declarations.html#embedded-interface",
	"EMBEDDED INTERFACE":	"type-declarations.html#embedded-interface",
	"embedded-interface":	"type-declarations.html#embedded-interface",
	"Dynamic casts":	"type-declarations.html#dynamic-casts",
	"dynamic casts":	"type-declarations.html#dynamic-casts",
	"DYNAMIC CASTS":	"type-declarations.html#dynamic-casts",
	"dynamic-casts":	"type-declarations.html#dynamic-casts",
	"Smart casting":	"type-declarations.html#smart-casting",
	"smart casting":	"type-declarations.html#smart-casting",
	"SMART CASTING":	"type-declarations.html#smart-casting",
	"smart-casting":	"type-declarations.html#smart-casting",
	"Matching sum types":	"type-declarations.html#matching-sum-types",
	"matching sum types":	"type-declarations.html#matching-sum-types",
	"MATCHING SUM TYPES":	"type-declarations.html#matching-sum-types",
	"matching-sum-types":	"type-declarations.html#matching-sum-types",
	"Options/results when returning multiple values":	"type-declarations.html#optionsresults-when-returning-multiple-values",
	"options/results when returning multiple values":	"type-declarations.html#optionsresults-when-returning-multiple-values",
	"OPTIONS/RESULTS WHEN RETURNING MULTIPLE VALUES":	"type-declarations.html#optionsresults-when-returning-multiple-values",
	"optionsresults-when-returning-multiple-values":	"type-declarations.html#optionsresults-when-returning-multiple-values",
	"Handling options/results":	"type-declarations.html#handling-optionsresults",
	"handling options/results":	"type-declarations.html#handling-optionsresults",
	"HANDLING OPTIONS/RESULTS":	"type-declarations.html#handling-optionsresults",
	"handling-optionsresults":	"type-declarations.html#handling-optionsresults",
	"Type Declarations":	"type-declarations.html",
	"Spawning Concurrent Tasks":	"concurrency.html#spawning-concurrent-tasks",
	"spawning concurrent tasks":	"concurrency.html#spawning-concurrent-tasks",
	"SPAWNING CONCURRENT TASKS":	"concurrency.html#spawning-concurrent-tasks",
	"spawning-concurrent-tasks":	"concurrency.html#spawning-concurrent-tasks",
	"Channels":	"concurrency.html#channels",
	"channels":	"concurrency.html#channels",
	"CHANNELS":	"concurrency.html#channels",
	"Shared Objects":	"concurrency.html#shared-objects",
	"shared objects":	"concurrency.html#shared-objects",
	"SHARED OBJECTS":	"concurrency.html#shared-objects",
	"shared-objects":	"concurrency.html#shared-objects",
	"Difference Between Channels and Shared Objects":	"concurrency.html#difference-between-channels-and-shared-objects",
	"difference between channels and shared objects":	"concurrency.html#difference-between-channels-and-shared-objects",
	"DIFFERENCE BETWEEN CHANNELS AND SHARED OBJECTS":	"concurrency.html#difference-between-channels-and-shared-objects",
	"difference-between-channels-and-shared-objects":	"concurrency.html#difference-between-channels-and-shared-objects",
	"Syntax and Usage":	"concurrency.html#syntax-and-usage",
	"syntax and usage":	"concurrency.html#syntax-and-usage",
	"SYNTAX AND USAGE":	"concurrency.html#syntax-and-usage",
	"syntax-and-usage":	"concurrency.html#syntax-and-usage",
	"Buffered Channels":	"concurrency.html#buffered-channels",
	"buffered channels":	"concurrency.html#buffered-channels",
	"BUFFERED CHANNELS":	"concurrency.html#buffered-channels",
	"buffered-channels":	"concurrency.html#buffered-channels",
	"Closing Channels":	"concurrency.html#closing-channels",
	"closing channels":	"concurrency.html#closing-channels",
	"CLOSING CHANNELS":	"concurrency.html#closing-channels",
	"closing-channels":	"concurrency.html#closing-channels",
	"Channel Select":	"concurrency.html#channel-select",
	"channel select":	"concurrency.html#channel-select",
	"CHANNEL SELECT":	"concurrency.html#channel-select",
	"channel-select":	"concurrency.html#channel-select",
	"Special Channel Features":	"concurrency.html#special-channel-features",
	"special channel features":	"concurrency.html#special-channel-features",
	"SPECIAL CHANNEL FEATURES":	"concurrency.html#special-channel-features",
	"special-channel-features":	"concurrency.html#special-channel-features",
	"Example of Shared Objects":	"concurrency.html#example-of-shared-objects",
	"example of shared objects":	"concurrency.html#example-of-shared-objects",
	"EXAMPLE OF SHARED OBJECTS":	"concurrency.html#example-of-shared-objects",
	"example-of-shared-objects":	"concurrency.html#example-of-shared-objects",
	"Concurrency":	"concurrency.html",
	"Decoding JSON":	"json.html#decoding-json",
	"decoding json":	"json.html#decoding-json",
	"DECODING JSON":	"json.html#decoding-json",
	"decoding-json":	"json.html#decoding-json",
	"Encoding JSON":	"json.html#encoding-json",
	"encoding json":	"json.html#encoding-json",
	"ENCODING JSON":	"json.html#encoding-json",
	"encoding-json":	"json.html#encoding-json",
	"JSON":	"json.html",
	"Asserts":	"testing.html#asserts",
	"asserts":	"testing.html#asserts",
	"ASSERTS":	"testing.html#asserts",
	"Asserts with an extra message":	"testing.html#asserts-with-an-extra-message",
	"asserts with an extra message":	"testing.html#asserts-with-an-extra-message",
	"ASSERTS WITH AN EXTRA MESSAGE":	"testing.html#asserts-with-an-extra-message",
	"asserts-with-an-extra-message":	"testing.html#asserts-with-an-extra-message",
	"Asserts that do not abort your program":	"testing.html#asserts-that-do-not-abort-your-program",
	"asserts that do not abort your program":	"testing.html#asserts-that-do-not-abort-your-program",
	"ASSERTS THAT DO NOT ABORT YOUR PROGRAM":	"testing.html#asserts-that-do-not-abort-your-program",
	"asserts-that-do-not-abort-your-program":	"testing.html#asserts-that-do-not-abort-your-program",
	"Test files":	"testing.html#test-files",
	"test files":	"testing.html#test-files",
	"TEST FILES":	"testing.html#test-files",
	"test-files":	"testing.html#test-files",
	"Running tests":	"testing.html#running-tests",
	"running tests":	"testing.html#running-tests",
	"RUNNING TESTS":	"testing.html#running-tests",
	"running-tests":	"testing.html#running-tests",
	"Testing":	"testing.html",
	"Control":	"memory-management.html#control",
	"control":	"memory-management.html#control",
	"CONTROL":	"memory-management.html#control",
	"Stack and Heap":	"memory-management.html#stack-and-heap",
	"stack and heap":	"memory-management.html#stack-and-heap",
	"STACK AND HEAP":	"memory-management.html#stack-and-heap",
	"stack-and-heap":	"memory-management.html#stack-and-heap",
	"Stack and Heap Basics":	"memory-management.html#stack-and-heap-basics",
	"stack and heap basics":	"memory-management.html#stack-and-heap-basics",
	"STACK AND HEAP BASICS":	"memory-management.html#stack-and-heap-basics",
	"stack-and-heap-basics":	"memory-management.html#stack-and-heap-basics",
	"V's default approach":	"memory-management.html#v's-default-approach",
	"v's default approach":	"memory-management.html#v's-default-approach",
	"V'S DEFAULT APPROACH":	"memory-management.html#v's-default-approach",
	"v's-default-approach":	"memory-management.html#v's-default-approach",
	"Manual Control for Stack and Heap":	"memory-management.html#manual-control-for-stack-and-heap",
	"manual control for stack and heap":	"memory-management.html#manual-control-for-stack-and-heap",
	"MANUAL CONTROL FOR STACK AND HEAP":	"memory-management.html#manual-control-for-stack-and-heap",
	"manual-control-for-stack-and-heap":	"memory-management.html#manual-control-for-stack-and-heap",
	"Memory management":	"memory-management.html",
	"ORM":	"orm.html",
	"Newlines in Documentation Comments":	"writing-documentation.html#newlines-in-documentation-comments",
	"newlines in documentation comments":	"writing-documentation.html#newlines-in-documentation-comments",
	"NEWLINES IN DOCUMENTATION COMMENTS":	"writing-documentation.html#newlines-in-documentation-comments",
	"newlines-in-documentation-comments":	"writing-documentation.html#newlines-in-documentation-comments",
	"Writing Documentation":	"writing-documentation.html",
	"v fmt":	"tools.html#v-fmt",
	"V FMT":	"tools.html#v-fmt",
	"v-fmt":	"tools.html#v-fmt",
	"v shader":	"tools.html#v-shader",
	"V SHADER":	"tools.html#v-shader",
	"v-shader":	"tools.html#v-shader",
	"Profiling":	"tools.html#profiling",
	"profiling":	"tools.html#profiling",
	"PROFILING":	"tools.html#profiling",
	"Disabling the formatting locally":	"tools.html#disabling-the-formatting-locally",
	"disabling the formatting locally":	"tools.html#disabling-the-formatting-locally",
	"DISABLING THE FORMATTING LOCALLY":	"tools.html#disabling-the-formatting-locally",
	"disabling-the-formatting-locally":	"tools.html#disabling-the-formatting-locally",
	"Tools":	"tools.html",
	"Package commands":	"package-management.html#package-commands",
	"package commands":	"package-management.html#package-commands",
	"PACKAGE COMMANDS":	"package-management.html#package-commands",
	"package-commands":	"package-management.html#package-commands",
	"Publish package":	"package-management.html#publish-package",
	"publish package":	"package-management.html#publish-package",
	"PUBLISH PACKAGE":	"package-management.html#publish-package",
	"publish-package":	"package-management.html#publish-package",
	"Package management":	"package-management.html",
	"Attributes":	"attributes.html",
	"Compile time pseudo variables":	"conditional-compilation.html#compile-time-pseudo-variables",
	"compile time pseudo variables":	"conditional-compilation.html#compile-time-pseudo-variables",
	"COMPILE TIME PSEUDO VARIABLES":	"conditional-compilation.html#compile-time-pseudo-variables",
	"compile-time-pseudo-variables":	"conditional-compilation.html#compile-time-pseudo-variables",
	"Compile time reflection":	"conditional-compilation.html#compile-time-reflection",
	"compile time reflection":	"conditional-compilation.html#compile-time-reflection",
	"COMPILE TIME REFLECTION":	"conditional-compilation.html#compile-time-reflection",
	"compile-time-reflection":	"conditional-compilation.html#compile-time-reflection",
	"Compile time code":	"conditional-compilation.html#compile-time-code",
	"compile time code":	"conditional-compilation.html#compile-time-code",
	"COMPILE TIME CODE":	"conditional-compilation.html#compile-time-code",
	"compile-time-code":	"conditional-compilation.html#compile-time-code",
	"Compile time types":	"conditional-compilation.html#compile-time-types",
	"compile time types":	"conditional-compilation.html#compile-time-types",
	"COMPILE TIME TYPES":	"conditional-compilation.html#compile-time-types",
	"compile-time-types":	"conditional-compilation.html#compile-time-types",
	"Environment specific files":	"conditional-compilation.html#environment-specific-files",
	"environment specific files":	"conditional-compilation.html#environment-specific-files",
	"ENVIRONMENT SPECIFIC FILES":	"conditional-compilation.html#environment-specific-files",
	"environment-specific-files":	"conditional-compilation.html#environment-specific-files",
	".fields":	"conditional-compilation.html#.fields",
	".FIELDS":	"conditional-compilation.html#.fields",
	".values":	"conditional-compilation.html#.values",
	".VALUES":	"conditional-compilation.html#.values",
	".attributes":	"conditional-compilation.html#.attributes",
	".ATTRIBUTES":	"conditional-compilation.html#.attributes",
	".variants":	"conditional-compilation.html#.variants",
	".VARIANTS":	"conditional-compilation.html#.variants",
	".methods":	"conditional-compilation.html#.methods",
	".METHODS":	"conditional-compilation.html#.methods",
	".params":	"conditional-compilation.html#.params",
	".PARAMS":	"conditional-compilation.html#.params",
	"$if condition":	"conditional-compilation.html#$if-condition",
	"$IF CONDITION":	"conditional-compilation.html#$if-condition",
	"$if-condition":	"conditional-compilation.html#$if-condition",
	"$embed_file":	"conditional-compilation.html#$embed_file",
	"$EMBED_FILE":	"conditional-compilation.html#$embed_file",
	"$tmpl for embedding and parsing V template files":	"conditional-compilation.html#$tmpl-for-embedding-and-parsing-v-template-files",
	"$tmpl for embedding and parsing v template files":	"conditional-compilation.html#$tmpl-for-embedding-and-parsing-v-template-files",
	"$TMPL FOR EMBEDDING AND PARSING V TEMPLATE FILES":	"conditional-compilation.html#$tmpl-for-embedding-and-parsing-v-template-files",
	"$tmpl-for-embedding-and-parsing-v-template-files":	"conditional-compilation.html#$tmpl-for-embedding-and-parsing-v-template-files",
	"$env":	"conditional-compilation.html#$env",
	"$ENV":	"conditional-compilation.html#$env",
	"$d":	"conditional-compilation.html#$d",
	"$D":	"conditional-compilation.html#$d",
	"$compile_error and $compile_warn":	"conditional-compilation.html#$compile_error-and-$compile_warn",
	"$COMPILE_ERROR AND $COMPILE_WARN":	"conditional-compilation.html#$compile_error-and-$compile_warn",
	"$compile_error-and-$compile_warn":	"conditional-compilation.html#$compile_error-and-$compile_warn",
	"Conditional compilation":	"conditional-compilation.html",
	"Debugger":	"debugger.html",
	"Call stack":	"call-stack.html",
	"Trace":	"trace.html",
	"Memory-unsafe code":	"memory-unsafe-code.html",
	"Structs with reference fields":	"structs-with-reference-fields.html",
	"sizeof and __offsetof":	"sizeof-and-__offsetof.html",
	"Implicitly generated overloads":	"limited-operator-overloading.html#implicitly-generated-overloads",
	"implicitly generated overloads":	"limited-operator-overloading.html#implicitly-generated-overloads",
	"IMPLICITLY GENERATED OVERLOADS":	"limited-operator-overloading.html#implicitly-generated-overloads",
	"implicitly-generated-overloads":	"limited-operator-overloading.html#implicitly-generated-overloads",
	"Restriction":	"limited-operator-overloading.html#restriction",
	"restriction":	"limited-operator-overloading.html#restriction",
	"RESTRICTION":	"limited-operator-overloading.html#restriction",
	"Type restrictions":	"limited-operator-overloading.html#type-restrictions",
	"type restrictions":	"limited-operator-overloading.html#type-restrictions",
	"TYPE RESTRICTIONS":	"limited-operator-overloading.html#type-restrictions",
	"type-restrictions":	"limited-operator-overloading.html#type-restrictions",
	"Other restrictions":	"limited-operator-overloading.html#other-restrictions",
	"other restrictions":	"limited-operator-overloading.html#other-restrictions",
	"OTHER RESTRICTIONS":	"limited-operator-overloading.html#other-restrictions",
	"other-restrictions":	"limited-operator-overloading.html#other-restrictions",
	"Limited operator overloading":	"limited-operator-overloading.html",
	"Tuning operations details":	"performance-tuning.html#tuning-operations-details",
	"tuning operations details":	"performance-tuning.html#tuning-operations-details",
	"TUNING OPERATIONS DETAILS":	"performance-tuning.html#tuning-operations-details",
	"tuning-operations-details":	"performance-tuning.html#tuning-operations-details",
	"@[inline]":	"performance-tuning.html#@inline",
	"@[INLINE]":	"performance-tuning.html#@inline",
	"@inline":	"performance-tuning.html#@inline",
	"@[direct_array_access]":	"performance-tuning.html#@direct_array_access",
	"@[DIRECT_ARRAY_ACCESS]":	"performance-tuning.html#@direct_array_access",
	"@direct_array_access":	"performance-tuning.html#@direct_array_access",
	"@[packed]":	"performance-tuning.html#@packed",
	"@[PACKED]":	"performance-tuning.html#@packed",
	"@packed":	"performance-tuning.html#@packed",
	"@[aligned]":	"performance-tuning.html#@aligned",
	"@[ALIGNED]":	"performance-tuning.html#@aligned",
	"@aligned":	"performance-tuning.html#@aligned",
	"@[minify]":	"performance-tuning.html#@minify",
	"@[MINIFY]":	"performance-tuning.html#@minify",
	"@minify":	"performance-tuning.html#@minify",
	"_likely_/_unlikely_":	"performance-tuning.html#_likely__unlikely_",
	"_LIKELY_/_UNLIKELY_":	"performance-tuning.html#_likely__unlikely_",
	"_likely__unlikely_":	"performance-tuning.html#_likely__unlikely_",
	"likely/unlikely":	"performance-tuning.html#_likely__unlikely_",
	"likelyunlikely":	"performance-tuning.html#_likely__unlikely_",
	"-fast-math":	"performance-tuning.html#-fast-math",
	"-FAST-MATH":	"performance-tuning.html#-fast-math",
	"-d no_segfault_handler":	"performance-tuning.html#-d-no_segfault_handler",
	"-D NO_SEGFAULT_HANDLER":	"performance-tuning.html#-d-no_segfault_handler",
	"-d-no_segfault_handler":	"performance-tuning.html#-d-no_segfault_handler",
	"-cflags -march=native":	"performance-tuning.html#-cflags--march=native",
	"-CFLAGS -MARCH=NATIVE":	"performance-tuning.html#-cflags--march=native",
	"-cflags--march=native":	"performance-tuning.html#-cflags--march=native",
	"-compress":	"performance-tuning.html#-compress",
	"-COMPRESS":	"performance-tuning.html#-compress",
	"PGO (Profile-Guided Optimization)":	"performance-tuning.html#pgo-(profile-guided-optimization)",
	"pgo (profile-guided optimization)":	"performance-tuning.html#pgo-(profile-guided-optimization)",
	"PGO (PROFILE-GUIDED OPTIMIZATION)":	"performance-tuning.html#pgo-(profile-guided-optimization)",
	"pgo-(profile-guided-optimization)":	"performance-tuning.html#pgo-(profile-guided-optimization)",
	"Performance tuning":	"performance-tuning.html",
	"Atomics":	"atomics.html",
	"Global Variables":	"global-variables.html",
	"Static Variables":	"static-variables.html",
	"Cross compilation":	"cross-compilation.html",
	"C Backend binaries (Default)":	"debugging.html#c-backend-binaries-(default)",
	"c backend binaries (default)":	"debugging.html#c-backend-binaries-(default)",
	"C BACKEND BINARIES (DEFAULT)":	"debugging.html#c-backend-binaries-(default)",
	"c-backend-binaries-(default)":	"debugging.html#c-backend-binaries-(default)",
	"Native Backend binaries":	"debugging.html#native-backend-binaries",
	"native backend binaries":	"debugging.html#native-backend-binaries",
	"NATIVE BACKEND BINARIES":	"debugging.html#native-backend-binaries",
	"native-backend-binaries":	"debugging.html#native-backend-binaries",
	"Javascript Backend":	"debugging.html#javascript-backend",
	"javascript backend":	"debugging.html#javascript-backend",
	"JAVASCRIPT BACKEND":	"debugging.html#javascript-backend",
	"javascript-backend":	"debugging.html#javascript-backend",
	"Debugging":	"debugging.html",
	"Calling C from V":	"v-and-c.html#calling-c-from-v",
	"calling c from v":	"v-and-c.html#calling-c-from-v",
	"CALLING C FROM V":	"v-and-c.html#calling-c-from-v",
	"calling-c-from-v":	"v-and-c.html#calling-c-from-v",
	"Calling V from C":	"v-and-c.html#calling-v-from-c",
	"calling v from c":	"v-and-c.html#calling-v-from-c",
	"CALLING V FROM C":	"v-and-c.html#calling-v-from-c",
	"calling-v-from-c":	"v-and-c.html#calling-v-from-c",
	"Passing C compilation flags":	"v-and-c.html#passing-c-compilation-flags",
	"passing c compilation flags":	"v-and-c.html#passing-c-compilation-flags",
	"PASSING C COMPILATION FLAGS":	"v-and-c.html#passing-c-compilation-flags",
	"passing-c-compilation-flags":	"v-and-c.html#passing-c-compilation-flags",
	"pkgconfig":	"v-and-c.html#pkgconfig",
	"PKGCONFIG":	"v-and-c.html#pkgconfig",
	"Including C code":	"v-and-c.html#including-c-code",
	"including c code":	"v-and-c.html#including-c-code",
	"INCLUDING C CODE":	"v-and-c.html#including-c-code",
	"including-c-code":	"v-and-c.html#including-c-code",
	"C types":	"v-and-c.html#c-types",
	"c types":	"v-and-c.html#c-types",
	"C TYPES":	"v-and-c.html#c-types",
	"c-types":	"v-and-c.html#c-types",
	"C Declarations":	"v-and-c.html#c-declarations",
	"c declarations":	"v-and-c.html#c-declarations",
	"C DECLARATIONS":	"v-and-c.html#c-declarations",
	"c-declarations":	"v-and-c.html#c-declarations",
	"Export to shared library":	"v-and-c.html#export-to-shared-library",
	"export to shared library":	"v-and-c.html#export-to-shared-library",
	"EXPORT TO SHARED LIBRARY":	"v-and-c.html#export-to-shared-library",
	"export-to-shared-library":	"v-and-c.html#export-to-shared-library",
	"Translating C to V":	"v-and-c.html#translating-c-to-v",
	"translating c to v":	"v-and-c.html#translating-c-to-v",
	"TRANSLATING C TO V":	"v-and-c.html#translating-c-to-v",
	"translating-c-to-v":	"v-and-c.html#translating-c-to-v",
	"Working around C issues":	"v-and-c.html#working-around-c-issues",
	"working around c issues":	"v-and-c.html#working-around-c-issues",
	"WORKING AROUND C ISSUES":	"v-and-c.html#working-around-c-issues",
	"working-around-c-issues":	"v-and-c.html#working-around-c-issues",
	"V and C":	"v-and-c.html",
	"Inline assembly":	"other-v-features.html#inline-assembly",
	"inline assembly":	"other-v-features.html#inline-assembly",
	"INLINE ASSEMBLY":	"other-v-features.html#inline-assembly",
	"inline-assembly":	"other-v-features.html#inline-assembly",
	"Hot code reloading":	"other-v-features.html#hot-code-reloading",
	"hot code reloading":	"other-v-features.html#hot-code-reloading",
	"HOT CODE RELOADING":	"other-v-features.html#hot-code-reloading",
	"hot-code-reloading":	"other-v-features.html#hot-code-reloading",
	"Cross-platform shell scripts in V":	"other-v-features.html#cross-platform-shell-scripts-in-v",
	"cross-platform shell scripts in v":	"other-v-features.html#cross-platform-shell-scripts-in-v",
	"CROSS-PLATFORM SHELL SCRIPTS IN V":	"other-v-features.html#cross-platform-shell-scripts-in-v",
	"cross-platform-shell-scripts-in-v":	"other-v-features.html#cross-platform-shell-scripts-in-v",
	"Vsh scripts with no extension":	"other-v-features.html#vsh-scripts-with-no-extension",
	"vsh scripts with no extension":	"other-v-features.html#vsh-scripts-with-no-extension",
	"VSH SCRIPTS WITH NO EXTENSION":	"other-v-features.html#vsh-scripts-with-no-extension",
	"vsh-scripts-with-no-extension":	"other-v-features.html#vsh-scripts-with-no-extension",
	"About keeping states in hot reloading functions with v -live run":	"other-v-features.html#about-keeping-states-in-hot-reloading-functions-with-v--live-run",
	"about keeping states in hot reloading functions with v -live run":	"other-v-features.html#about-keeping-states-in-hot-reloading-functions-with-v--live-run",
	"ABOUT KEEPING STATES IN HOT RELOADING FUNCTIONS WITH V -LIVE RUN":	"other-v-features.html#about-keeping-states-in-hot-reloading-functions-with-v--live-run",
	"about-keeping-states-in-hot-reloading-functions-with-v--live-run":	"other-v-features.html#about-keeping-states-in-hot-reloading-functions-with-v--live-run",
	"Other V Features":	"other-v-features.html",
	"Appendix I: Keywords":	"appendix-i-keywords.html",
	"Appendix II: Operators":	"appendix-ii-operators.html",
	"V contributing guide":	"other-online-resources.html#v-contributing-guide",
	"v contributing guide":	"other-online-resources.html#v-contributing-guide",
	"V CONTRIBUTING GUIDE":	"other-online-resources.html#v-contributing-guide",
	"v-contributing-guide":	"other-online-resources.html#v-contributing-guide",
	"V language documentation":	"other-online-resources.html#v-language-documentation",
	"v language documentation":	"other-online-resources.html#v-language-documentation",
	"V LANGUAGE DOCUMENTATION":	"other-online-resources.html#v-language-documentation",
	"v-language-documentation":	"other-online-resources.html#v-language-documentation",
	"V standard module documentation":	"other-online-resources.html#v-standard-module-documentation",
	"v standard module documentation":	"other-online-resources.html#v-standard-module-documentation",
	"V STANDARD MODULE DOCUMENTATION":	"other-online-resources.html#v-standard-module-documentation",
	"v-standard-module-documentation":	"other-online-resources.html#v-standard-module-documentation",
	"V online playground":	"other-online-resources.html#v-online-playground",
	"v online playground":	"other-online-resources.html#v-online-playground",
	"V ONLINE PLAYGROUND":	"other-online-resources.html#v-online-playground",
	"v-online-playground":	"other-online-resources.html#v-online-playground",
	"Awesome V":	"other-online-resources.html#awesome-v",
	"awesome v":	"other-online-resources.html#awesome-v",
	"AWESOME V":	"other-online-resources.html#awesome-v",
	"awesome-v":	"other-online-resources.html#awesome-v",
	"The V language Discord":	"other-online-resources.html#the-v-language-discord",
	"the v language discord":	"other-online-resources.html#the-v-language-discord",
	"THE V LANGUAGE DISCORD":	"other-online-resources.html#the-v-language-discord",
	"the-v-language-discord":	"other-online-resources.html#the-v-language-discord",
	"Other online resources":	"other-online-resources.html"
};
	vdocs.fnames = {
	"index.html":	"index.html",
	"introduction.html":	"introduction.html",
	"installing-v-from-source.html":	"installing-v-from-source.html",
	"upgrading-v-to-latest-version.html":	"upgrading-v-to-latest-version.html",
	"packaging-v-for-distribution.html":	"packaging-v-for-distribution.html",
	"getting-started.html":	"getting-started.html",
	"hello-world.html":	"hello-world.html",
	"running-a-project-folder-with-several-files.html":	"running-a-project-folder-with-several-files.html",
	"comments.html":	"comments.html",
	"functions.html":	"functions.html",
	"symbol-visibility.html":	"symbol-visibility.html",
	"variables.html":	"variables.html",
	"v-types.html":	"v-types.html",
	"module-imports.html":	"module-imports.html",
	"statements-&-expressions.html":	"statements-&-expressions.html",
	"structs.html":	"structs.html",
	"unions.html":	"unions.html",
	"functions-2.html":	"functions-2.html",
	"references.html":	"references.html",
	"constants.html":	"constants.html",
	"builtin-functions.html":	"builtin-functions.html",
	"modules.html":	"modules.html",
	"type-declarations.html":	"type-declarations.html",
	"concurrency.html":	"concurrency.html",
	"json.html":	"json.html",
	"testing.html":	"testing.html",
	"memory-management.html":	"memory-management.html",
	"orm.html":	"orm.html",
	"writing-documentation.html":	"writing-documentation.html",
	"tools.html":	"tools.html",
	"package-management.html":	"package-management.html",
	"attributes.html":	"attributes.html",
	"conditional-compilation.html":	"conditional-compilation.html",
	"debugger.html":	"debugger.html",
	"call-stack.html":	"call-stack.html",
	"trace.html":	"trace.html",
	"memory-unsafe-code.html":	"memory-unsafe-code.html",
	"structs-with-reference-fields.html":	"structs-with-reference-fields.html",
	"sizeof-and-__offsetof.html":	"sizeof-and-__offsetof.html",
	"limited-operator-overloading.html":	"limited-operator-overloading.html",
	"performance-tuning.html":	"performance-tuning.html",
	"atomics.html":	"atomics.html",
	"global-variables.html":	"global-variables.html",
	"static-variables.html":	"static-variables.html",
	"cross-compilation.html":	"cross-compilation.html",
	"debugging.html":	"debugging.html",
	"v-and-c.html":	"v-and-c.html",
	"other-v-features.html":	"other-v-features.html",
	"appendix-i-keywords.html":	"appendix-i-keywords.html",
	"appendix-ii-operators.html":	"appendix-ii-operators.html",
	"other-online-resources.html":	"other-online-resources.html"
};