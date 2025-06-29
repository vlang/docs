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

			const code = editor.getValue();
			const b64 = btoa(code);
			const url = "https://play.vlang.io/?base64=" + encodeURIComponent(b64);

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

