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
    "#PKGCONFIG": "v-and-c.html##pkgconfig",
    "#pkgconfig": "v-and-c.html##pkgconfig",
    "$COMPILE_ERROR AND $COMPILE_WARN": "conditional-compilation.html#$compile_error-and-$compile_warn",
    "$D": "conditional-compilation.html#$d",
    "$EMBED_FILE": "conditional-compilation.html#$embed_file",
    "$ENV": "conditional-compilation.html#$env",
    "$IF CONDITION": "conditional-compilation.html#$if-condition",
    "$TMPL FOR EMBEDDING AND PARSING V TEMPLATE FILES": "conditional-compilation.html#$tmpl-for-embedding-and-parsing-v-template-files",
    "$VML FOR COMPILING UI2 INTERFACES": "conditional-compilation.html#$vml-for-compiling-ui2-interfaces",
    "$compile_error and $compile_warn": "conditional-compilation.html#$compile_error-and-$compile_warn",
    "$compile_error-and-$compile_warn": "conditional-compilation.html#$compile_error-and-$compile_warn",
    "$d": "conditional-compilation.html#$d",
    "$embed_file": "conditional-compilation.html#$embed_file",
    "$env": "conditional-compilation.html#$env",
    "$if condition": "conditional-compilation.html#$if-condition",
    "$if-condition": "conditional-compilation.html#$if-condition",
    "$tmpl for embedding and parsing V template files": "conditional-compilation.html#$tmpl-for-embedding-and-parsing-v-template-files",
    "$tmpl for embedding and parsing v template files": "conditional-compilation.html#$tmpl-for-embedding-and-parsing-v-template-files",
    "$tmpl-for-embedding-and-parsing-v-template-files": "conditional-compilation.html#$tmpl-for-embedding-and-parsing-v-template-files",
    "$vml for compiling UI2 interfaces": "conditional-compilation.html#$vml-for-compiling-ui2-interfaces",
    "$vml for compiling ui2 interfaces": "conditional-compilation.html#$vml-for-compiling-ui2-interfaces",
    "$vml-for-compiling-ui2-interfaces": "conditional-compilation.html#$vml-for-compiling-ui2-interfaces",
    "-CFLAGS -MARCH=NATIVE": "performance-tuning.html#-cflags--march=native",
    "-COMPRESS": "performance-tuning.html#-compress",
    "-D NO_SEGFAULT_HANDLER": "performance-tuning.html#-d-no_segfault_handler",
    "-FAST-MATH": "performance-tuning.html#-fast-math",
    "-cflags -march=native": "performance-tuning.html#-cflags--march=native",
    "-cflags--march=native": "performance-tuning.html#-cflags--march=native",
    "-compress": "performance-tuning.html#-compress",
    "-d no_segfault_handler": "performance-tuning.html#-d-no_segfault_handler",
    "-d-no_segfault_handler": "performance-tuning.html#-d-no_segfault_handler",
    "-fast-math": "performance-tuning.html#-fast-math",
    ".ATTRIBUTES": "conditional-compilation.html#.attributes",
    ".FIELDS": "conditional-compilation.html#.fields",
    ".METHODS": "conditional-compilation.html#.methods",
    ".PARAMS": "conditional-compilation.html#.params",
    ".VALUES": "conditional-compilation.html#.values",
    ".VARIANTS": "conditional-compilation.html#.variants",
    ".attributes": "conditional-compilation.html#.attributes",
    ".fields": "conditional-compilation.html#.fields",
    ".methods": "conditional-compilation.html#.methods",
    ".params": "conditional-compilation.html#.params",
    ".values": "conditional-compilation.html#.values",
    ".variants": "conditional-compilation.html#.variants",
    "128-BIT INTEGERS": "v-types.html#128-bit-integers",
    "128-bit integers": "v-types.html#128-bit-integers",
    "128-bit-integers": "v-types.html#128-bit-integers",
    "@[ALIGNED]": "performance-tuning.html#@aligned",
    "@[DIRECT_ARRAY_ACCESS]": "performance-tuning.html#@direct_array_access",
    "@[INLINE]": "performance-tuning.html#@inline",
    "@[MINIFY]": "performance-tuning.html#@minify",
    "@[PACKED]": "performance-tuning.html#@packed",
    "@[aligned]": "performance-tuning.html#@aligned",
    "@[direct_array_access]": "performance-tuning.html#@direct_array_access",
    "@[inline]": "performance-tuning.html#@inline",
    "@[minify]": "performance-tuning.html#@minify",
    "@[packed]": "performance-tuning.html#@packed",
    "@aligned": "performance-tuning.html#@aligned",
    "@direct_array_access": "performance-tuning.html#@direct_array_access",
    "@inline": "performance-tuning.html#@inline",
    "@minify": "performance-tuning.html#@minify",
    "@packed": "performance-tuning.html#@packed",
    "ABOUT KEEPING STATES IN HOT RELOADING FUNCTIONS WITH V -LIVE RUN": "other-v-features.html#about-keeping-states-in-hot-reloading-functions-with-v--live-run",
    "ACCESS MODIFIERS": "structs.html#access-modifiers",
    "ANONYMOUS & HIGHER ORDER FUNCTIONS": "functions-2.html#anonymous-&-higher-order-functions",
    "ANONYMOUS STRUCTS": "structs.html#anonymous-structs",
    "ARRAY FIELDS": "v-types.html#array-fields",
    "ARRAY FOR": "statements-&-expressions.html#array-for",
    "ARRAY INITIALIZATION": "v-types.html#array-initialization",
    "ARRAY METHOD CHAINING": "v-types.html#array-method-chaining",
    "ARRAY METHODS": "v-types.html#array-methods",
    "ARRAY SLICES": "v-types.html#array-slices",
    "ARRAY TYPES": "v-types.html#array-types",
    "ARRAY UPDATE SYNTAX": "v-types.html#array-update-syntax",
    "ARRAYS": "v-types.html#arrays",
    "ASSERTS": "testing.html#asserts",
    "ASSERTS THAT DO NOT ABORT YOUR PROGRAM": "testing.html#asserts-that-do-not-abort-your-program",
    "ASSERTS WITH AN EXTRA MESSAGE": "testing.html#asserts-with-an-extra-message",
    "AWESOME V": "other-online-resources.html#awesome-v",
    "About keeping states in hot reloading functions with v -live run": "other-v-features.html#about-keeping-states-in-hot-reloading-functions-with-v--live-run",
    "Access modifiers": "structs.html#access-modifiers",
    "Anonymous & higher order functions": "functions-2.html#anonymous-&-higher-order-functions",
    "Anonymous structs": "structs.html#anonymous-structs",
    "Appendix I: Keywords": "appendix-i-keywords.html",
    "Appendix II: Operators": "appendix-ii-operators.html",
    "Array Fields": "v-types.html#array-fields",
    "Array Initialization": "v-types.html#array-initialization",
    "Array Slices": "v-types.html#array-slices",
    "Array Types": "v-types.html#array-types",
    "Array for": "statements-&-expressions.html#array-for",
    "Array method chaining": "v-types.html#array-method-chaining",
    "Array methods": "v-types.html#array-methods",
    "Array update syntax": "v-types.html#array-update-syntax",
    "Arrays": "v-types.html#arrays",
    "Asserts": "testing.html#asserts",
    "Asserts that do not abort your program": "testing.html#asserts-that-do-not-abort-your-program",
    "Asserts with an extra message": "testing.html#asserts-with-an-extra-message",
    "Atomics": "atomics.html",
    "Attributes": "attributes.html",
    "Awesome V": "other-online-resources.html#awesome-v",
    "BARE FOR": "statements-&-expressions.html#bare-for",
    "BUFFERED CHANNELS": "concurrency.html#buffered-channels",
    "Bare for": "statements-&-expressions.html#bare-for",
    "Buffered Channels": "concurrency.html#buffered-channels",
    "Builtin functions": "builtin-functions.html",
    "C BACKEND BINARIES (DEFAULT)": "debugging.html#c-backend-binaries-(default)",
    "C Backend binaries (Default)": "debugging.html#c-backend-binaries-(default)",
    "C DECLARATIONS": "v-and-c.html#c-declarations",
    "C Declarations": "v-and-c.html#c-declarations",
    "C FOR": "statements-&-expressions.html#c-for",
    "C TYPES": "v-and-c.html#c-types",
    "C for": "statements-&-expressions.html#c-for",
    "C types": "v-and-c.html#c-types",
    "CALLING C FROM V": "v-and-c.html#calling-c-from-v",
    "CALLING V FROM C": "v-and-c.html#calling-v-from-c",
    "CASTING AN INTERFACE": "type-declarations.html#casting-an-interface",
    "CHANNEL SELECT": "concurrency.html#channel-select",
    "CHANNELS": "concurrency.html#channels",
    "CHECKED INTEGER ARITHMETIC": "v-types.html#checked-integer-arithmetic",
    "CLEANUP FUNCTIONS": "modules.html#cleanup-functions",
    "CLOSING CHANNELS": "concurrency.html#closing-channels",
    "CLOSURES": "functions-2.html#closures",
    "COMPILE TIME CODE": "conditional-compilation.html#compile-time-code",
    "COMPILE TIME PSEUDO VARIABLES": "conditional-compilation.html#compile-time-pseudo-variables",
    "COMPILE TIME REFLECTION": "conditional-compilation.html#compile-time-reflection",
    "COMPILE TIME TYPES": "conditional-compilation.html#compile-time-types",
    "CONDITION FOR": "statements-&-expressions.html#condition-for",
    "CONSTRAINTS": "type-declarations.html#constraints",
    "CONTROL": "memory-management.html#control",
    "CONVENIENCE METHODS": "orm.html#convenience-methods",
    "CREATE MODULES": "modules.html#create-modules",
    "CROSS-PLATFORM SHELL SCRIPTS IN V": "other-v-features.html#cross-platform-shell-scripts-in-v",
    "CUSTOM ERROR TYPES": "type-declarations.html#custom-error-types",
    "CUSTOM ITERATORS": "statements-&-expressions.html#custom-iterators",
    "Call stack": "call-stack.html",
    "Calling C from V": "v-and-c.html#calling-c-from-v",
    "Calling V from C": "v-and-c.html#calling-v-from-c",
    "Casting an interface": "type-declarations.html#casting-an-interface",
    "Channel Select": "concurrency.html#channel-select",
    "Channels": "concurrency.html#channels",
    "Checked integer arithmetic": "v-types.html#checked-integer-arithmetic",
    "Closing Channels": "concurrency.html#closing-channels",
    "Closures": "functions-2.html#closures",
    "Comments": "comments.html",
    "Compile time code": "conditional-compilation.html#compile-time-code",
    "Compile time pseudo variables": "conditional-compilation.html#compile-time-pseudo-variables",
    "Compile time reflection": "conditional-compilation.html#compile-time-reflection",
    "Compile time types": "conditional-compilation.html#compile-time-types",
    "Compiling for iOS": "compiling-for-ios.html",
    "Concurrency": "concurrency.html",
    "Condition for": "statements-&-expressions.html#condition-for",
    "Conditional compilation": "conditional-compilation.html",
    "Constants": "constants.html",
    "Constraints": "type-declarations.html#constraints",
    "Control": "memory-management.html#control",
    "Convenience Methods": "orm.html#convenience-methods",
    "Create modules": "modules.html#create-modules",
    "Cross compilation": "cross-compilation.html",
    "Cross-platform shell scripts in V": "other-v-features.html#cross-platform-shell-scripts-in-v",
    "Custom error types": "type-declarations.html#custom-error-types",
    "Custom iterators": "statements-&-expressions.html#custom-iterators",
    "DECODING JSON": "json.html#decoding-json",
    "DEFAULT FIELD VALUES": "structs.html#default-field-values",
    "DEFER": "statements-&-expressions.html#defer",
    "DEFER IN LOOP SCOPES:": "statements-&-expressions.html#defer-in-loop-scopes",
    "DEFER(FN) {}": "statements-&-expressions.html#defer(fn)-{}",
    "DIFFERENCE BETWEEN CHANNELS AND SHARED OBJECTS": "concurrency.html#difference-between-channels-and-shared-objects",
    "DISABLING THE FORMATTING LOCALLY": "tools.html#disabling-the-formatting-locally",
    "DUMPING EXPRESSIONS AT RUNTIME": "builtin-functions.html#dumping-expressions-at-runtime",
    "DYNAMIC CASTS": "type-declarations.html#dynamic-casts",
    "Debugger": "debugger.html",
    "Debugging": "debugging.html",
    "Decoding JSON": "json.html#decoding-json",
    "Default field values": "structs.html#default-field-values",
    "Defer": "statements-&-expressions.html#defer",
    "Difference Between Channels and Shared Objects": "concurrency.html#difference-between-channels-and-shared-objects",
    "Disabling the formatting locally": "tools.html#disabling-the-formatting-locally",
    "Dumping expressions at runtime": "builtin-functions.html#dumping-expressions-at-runtime",
    "Dynamic casts": "type-declarations.html#dynamic-casts",
    "EMBEDDED INTERFACE": "type-declarations.html#embedded-interface",
    "EMBEDDED STRUCTS": "structs.html#embedded-structs",
    "EMBEDDING": "unions.html#embedding",
    "ENCODING JSON": "json.html#encoding-json",
    "ENUMS": "type-declarations.html#enums",
    "ENVIRONMENT SPECIFIC FILES": "conditional-compilation.html#environment-specific-files",
    "EXAMPLE OF SHARED OBJECTS": "concurrency.html#example-of-shared-objects",
    "EXPORT TO SHARED LIBRARY": "v-and-c.html#export-to-shared-library",
    "Embedded interface": "type-declarations.html#embedded-interface",
    "Embedded structs": "structs.html#embedded-structs",
    "Embedding": "unions.html#embedding",
    "Encoding JSON": "json.html#encoding-json",
    "Enums": "type-declarations.html#enums",
    "Environment specific files": "conditional-compilation.html#environment-specific-files",
    "Example of Shared Objects": "concurrency.html#example-of-shared-objects",
    "Export to shared library": "v-and-c.html#export-to-shared-library",
    "FIXED SIZE ARRAYS": "v-types.html#fixed-size-arrays",
    "FOR LOOP": "statements-&-expressions.html#for-loop",
    "FOR/IN": "statements-&-expressions.html#forin",
    "FUNCTION TYPES": "type-declarations.html#function-types",
    "Fixed size arrays": "v-types.html#fixed-size-arrays",
    "For loop": "statements-&-expressions.html#for-loop",
    "Function Types": "type-declarations.html#function-types",
    "Functions": "functions.html",
    "Functions 2": "functions-2.html",
    "GENERICS": "type-declarations.html#generics",
    "GIT PRE-COMMIT HOOK": "tools.html#git-pre-commit-hook",
    "GOTO": "statements-&-expressions.html#goto",
    "Generics": "type-declarations.html#generics",
    "Getting started": "getting-started.html",
    "Git pre-commit hook": "tools.html#git-pre-commit-hook",
    "Global Variables": "global-variables.html",
    "Goto": "statements-&-expressions.html#goto",
    "HANDLING OPTIONS/RESULTS": "type-declarations.html#handling-optionsresults",
    "HEAP STRUCTS": "structs.html#heap-structs",
    "HOISTING": "functions.html#hoisting",
    "HOT CODE RELOADING": "other-v-features.html#hot-code-reloading",
    "Handling options/results": "type-declarations.html#handling-optionsresults",
    "Heap structs": "structs.html#heap-structs",
    "Hello World": "hello-world.html",
    "Hoisting": "functions.html#hoisting",
    "Hot code reloading": "other-v-features.html#hot-code-reloading",
    "IF": "statements-&-expressions.html#if",
    "IF EXPRESSIONS": "statements-&-expressions.html#if-expressions",
    "IF UNWRAPPING": "statements-&-expressions.html#if-unwrapping",
    "IMMUTABLE FUNCTION ARGS BY DEFAULT": "functions-2.html#immutable-function-args-by-default",
    "IMPLEMENT AN INTERFACE": "type-declarations.html#implement-an-interface",
    "IMPLICITLY GENERATED OVERLOADS": "limited-operator-overloading.html#implicitly-generated-overloads",
    "IN OPERATOR": "statements-&-expressions.html#in-operator",
    "INCLUDING C CODE": "v-and-c.html#including-c-code",
    "INIT FUNCTIONS": "modules.html#init-functions",
    "INITIALIZATION VS ASSIGNMENT": "variables.html#initialization-vs-assignment",
    "INLINE ASSEMBLY": "other-v-features.html#inline-assembly",
    "INTERACTIVE SQLITE CLI": "orm.html#interactive-sqlite-cli",
    "INTERFACE METHOD DEFINITIONS": "type-declarations.html#interface-method-definitions",
    "INTERFACES": "type-declarations.html#interfaces",
    "If": "statements-&-expressions.html#if",
    "If expressions": "statements-&-expressions.html#if-expressions",
    "If unwrapping": "statements-&-expressions.html#if-unwrapping",
    "Immutable function args by default": "functions-2.html#immutable-function-args-by-default",
    "Implement an interface": "type-declarations.html#implement-an-interface",
    "Implicitly generated overloads": "limited-operator-overloading.html#implicitly-generated-overloads",
    "In operator": "statements-&-expressions.html#in-operator",
    "Including C code": "v-and-c.html#including-c-code",
    "Initialization vs assignment": "variables.html#initialization-vs-assignment",
    "Inline assembly": "other-v-features.html#inline-assembly",
    "Installing V from source": "installing-v-from-source.html",
    "Interactive SQLite CLI": "orm.html#interactive-sqlite-cli",
    "Interface method definitions": "type-declarations.html#interface-method-definitions",
    "Interfaces": "type-declarations.html#interfaces",
    "Introduction": "introduction.html",
    "JAVASCRIPT BACKEND": "debugging.html#javascript-backend",
    "JSON": "json.html",
    "Javascript Backend": "debugging.html#javascript-backend",
    "LABELLED BREAK & CONTINUE": "statements-&-expressions.html#labelled-break-&-continue",
    "LAMBDA EXPRESSIONS": "functions-2.html#lambda-expressions",
    "LOCKING DEPENDENCY REVISIONS": "package-management.html#locking-dependency-revisions",
    "Labelled break & continue": "statements-&-expressions.html#labelled-break-&-continue",
    "Lambda expressions": "functions-2.html#lambda-expressions",
    "Language specification": "language-specification.html",
    "Limited operator overloading": "limited-operator-overloading.html",
    "Locking dependency revisions": "package-management.html#locking-dependency-revisions",
    "MANUAL CONTROL FOR STACK AND HEAP": "memory-management.html#manual-control-for-stack-and-heap",
    "MAP FOR": "statements-&-expressions.html#map-for",
    "MAP UPDATE SYNTAX": "v-types.html#map-update-syntax",
    "MAPS": "v-types.html#maps",
    "MATCH": "statements-&-expressions.html#match",
    "MATCHING SUM TYPES": "type-declarations.html#matching-sum-types",
    "METHODS": "structs.html#methods",
    "MODULE ALIASES": "modules.html#module-aliases",
    "MODULE HIERARCHY": "module-imports.html#module-hierarchy",
    "MODULE IMPORT ALIASING": "module-imports.html#module-import-aliasing",
    "MULTIDIMENSIONAL ARRAYS": "v-types.html#multidimensional-arrays",
    "MUTABLE ARGUMENTS": "functions-2.html#mutable-arguments",
    "MUTABLE VARIABLES": "variables.html#mutable-variables",
    "Manual Control for Stack and Heap": "memory-management.html#manual-control-for-stack-and-heap",
    "Map for": "statements-&-expressions.html#map-for",
    "Map update syntax": "v-types.html#map-update-syntax",
    "Maps": "v-types.html#maps",
    "Match": "statements-&-expressions.html#match",
    "Matching sum types": "type-declarations.html#matching-sum-types",
    "Memory management": "memory-management.html",
    "Memory-unsafe code": "memory-unsafe-code.html",
    "Methods": "structs.html#methods",
    "Module aliases": "modules.html#module-aliases",
    "Module hierarchy": "module-imports.html#module-hierarchy",
    "Module import aliasing": "module-imports.html#module-import-aliasing",
    "Module imports": "module-imports.html",
    "Modules": "modules.html",
    "Multidimensional Arrays": "v-types.html#multidimensional-arrays",
    "Mutable arguments": "functions-2.html#mutable-arguments",
    "Mutable variables": "variables.html#mutable-variables",
    "NAMED VARIANTS": "type-declarations.html#named-variants",
    "NATIVE BACKEND BINARIES": "debugging.html#native-backend-binaries",
    "NEWLINES IN DOCUMENTATION COMMENTS": "writing-documentation.html#newlines-in-documentation-comments",
    "NUMBERS": "v-types.html#numbers",
    "Named variants": "type-declarations.html#named-variants",
    "Native Backend binaries": "debugging.html#native-backend-binaries",
    "Newlines in Documentation Comments": "writing-documentation.html#newlines-in-documentation-comments",
    "Numbers": "v-types.html#numbers",
    "OPTION/RESULT TYPES AND ERROR HANDLING": "type-declarations.html#optionresult-types-and-error-handling",
    "OPTIONS/RESULTS WHEN RETURNING MULTIPLE VALUES": "type-declarations.html#optionsresults-when-returning-multiple-values",
    "ORM": "orm.html",
    "OTHER RESTRICTIONS": "limited-operator-overloading.html#other-restrictions",
    "Option/Result types and error handling": "type-declarations.html#optionresult-types-and-error-handling",
    "Options/results when returning multiple values": "type-declarations.html#optionsresults-when-returning-multiple-values",
    "Other V Features": "other-v-features.html",
    "Other online resources": "other-online-resources.html",
    "Other restrictions": "limited-operator-overloading.html#other-restrictions",
    "PACKAGE COMMANDS": "package-management.html#package-commands",
    "PACKAGE NAMES AND IMPORT PATHS": "package-management.html#package-names-and-import-paths",
    "PARAMETER EVALUATION ORDER": "functions-2.html#parameter-evaluation-order",
    "PASSING C COMPILATION FLAGS": "v-and-c.html#passing-c-compilation-flags",
    "PER-FUNCTION RELOADING WITH @[LIVE]": "other-v-features.html#per-function-reloading-with-@live",
    "PGO (PROFILE-GUIDED OPTIMIZATION)": "performance-tuning.html#pgo-(profile-guided-optimization)",
    "PGO (Profile-Guided Optimization)": "performance-tuning.html#pgo-(profile-guided-optimization)",
    "PORTABLE C OUTPUT (-OS CROSS)": "cross-compilation.html#portable-c-output-(-os-cross)",
    "PRIMITIVE TYPES": "v-types.html#primitive-types",
    "PRINTING CUSTOM TYPES": "builtin-functions.html#printing-custom-types",
    "PRINTLN": "builtin-functions.html#println",
    "PROFILING": "tools.html#profiling",
    "PROFILING THE COMPILER": "tools.html#profiling-the-compiler",
    "PUBLISH PACKAGE": "package-management.html#publish-package",
    "Package commands": "package-management.html#package-commands",
    "Package management": "package-management.html",
    "Package names and import paths": "package-management.html#package-names-and-import-paths",
    "Packaging V for distribution": "packaging-v-for-distribution.html",
    "Parameter evaluation order": "functions-2.html#parameter-evaluation-order",
    "Passing C compilation flags": "v-and-c.html#passing-c-compilation-flags",
    "Per-function reloading with @[live]": "other-v-features.html#per-function-reloading-with-@live",
    "Performance tuning": "performance-tuning.html",
    "Portable C output (-os cross)": "cross-compilation.html#portable-c-output-(-os-cross)",
    "Primitive types": "v-types.html#primitive-types",
    "Printing custom types": "builtin-functions.html#printing-custom-types",
    "Profiling": "tools.html#profiling",
    "Profiling the compiler": "tools.html#profiling-the-compiler",
    "Project-local compiler versions with .vvmrc": "project-local-compiler-versions-with-.vvmrc.html",
    "Protocol Buffers": "protocol-buffers.html",
    "Publish package": "package-management.html#publish-package",
    "RACE DETECTOR": "concurrency.html#race-detector",
    "RANGE FOR": "statements-&-expressions.html#range-for",
    "RECOVERING FROM PANICS": "statements-&-expressions.html#recovering-from-panics",
    "REQUIRED FIELDS": "structs.html#required-fields",
    "REQUIRED MODULE PREFIX": "constants.html#required-module-prefix",
    "RESOLVING PACKAGE VERSIONS": "package-management.html#resolving-package-versions",
    "RESTRICTION": "limited-operator-overloading.html#restriction",
    "RETURNING MULTIPLE VALUES": "functions.html#returning-multiple-values",
    "RUNES": "v-types.html#runes",
    "RUNNING TESTS": "testing.html#running-tests",
    "Race Detector": "concurrency.html#race-detector",
    "Range for": "statements-&-expressions.html#range-for",
    "Recovering from panics": "statements-&-expressions.html#recovering-from-panics",
    "References": "references.html",
    "Required fields": "structs.html#required-fields",
    "Required module prefix": "constants.html#required-module-prefix",
    "Resolving package versions": "package-management.html#resolving-package-versions",
    "Restriction": "limited-operator-overloading.html#restriction",
    "Returning multiple values": "functions.html#returning-multiple-values",
    "Runes": "v-types.html#runes",
    "Running a project folder with several files": "running-a-project-folder-with-several-files.html",
    "Running tests": "testing.html#running-tests",
    "SELECTIVE IMPORTS": "module-imports.html#selective-imports",
    "SHADOWING A GLOBAL": "global-variables.html#shadowing-a-global",
    "SHARED OBJECTS": "concurrency.html#shared-objects",
    "SHORT STRUCT LITERAL SYNTAX": "structs.html#short-struct-literal-syntax",
    "SLICES WITH NEGATIVE INDEXES": "v-types.html#slices-with-negative-indexes",
    "SMART CASTING": "type-declarations.html#smart-casting",
    "SORTING ARRAYS": "v-types.html#sorting-arrays",
    "SOURCE LOCATIONS IN GENERATED CODE": "other-v-features.html#source-locations-in-generated-code",
    "SPAWNING CONCURRENT TASKS": "concurrency.html#spawning-concurrent-tasks",
    "SPECIAL CHANNEL FEATURES": "concurrency.html#special-channel-features",
    "SPECIAL CONSIDERATIONS FOR PROJECT FOLDERS": "modules.html#special-considerations-for-project-folders",
    "STACK AND HEAP": "memory-management.html#stack-and-heap",
    "STACK AND HEAP BASICS": "memory-management.html#stack-and-heap-basics",
    "STATIC TYPE METHODS": "structs.html#static-type-methods",
    "STRING INTERPOLATION": "v-types.html#string-interpolation",
    "STRING OPERATORS": "v-types.html#string-operators",
    "STRINGS": "v-types.html#strings",
    "STRUCT UPDATE SYNTAX": "structs.html#struct-update-syntax",
    "STRUCTURED GENERIC RECEIVER PATTERNS": "type-declarations.html#structured-generic-receiver-patterns",
    "SUM TYPES": "type-declarations.html#sum-types",
    "SYNTAX AND USAGE": "concurrency.html#syntax-and-usage",
    "Selective imports": "module-imports.html#selective-imports",
    "Shadowing a global": "global-variables.html#shadowing-a-global",
    "Shared Objects": "concurrency.html#shared-objects",
    "Short struct literal syntax": "structs.html#short-struct-literal-syntax",
    "Slices with negative indexes": "v-types.html#slices-with-negative-indexes",
    "Smart casting": "type-declarations.html#smart-casting",
    "Sorting Arrays": "v-types.html#sorting-arrays",
    "Source locations in generated code": "other-v-features.html#source-locations-in-generated-code",
    "Spawning Concurrent Tasks": "concurrency.html#spawning-concurrent-tasks",
    "Special Channel Features": "concurrency.html#special-channel-features",
    "Special considerations for project folders": "modules.html#special-considerations-for-project-folders",
    "Stack and Heap": "memory-management.html#stack-and-heap",
    "Stack and Heap Basics": "memory-management.html#stack-and-heap-basics",
    "Statements & expressions": "statements-&-expressions.html",
    "Static Variables": "static-variables.html",
    "Static type methods": "structs.html#static-type-methods",
    "String interpolation": "v-types.html#string-interpolation",
    "String operators": "v-types.html#string-operators",
    "Strings": "v-types.html#strings",
    "Struct update syntax": "structs.html#struct-update-syntax",
    "Structs": "structs.html",
    "Structs with reference fields": "structs-with-reference-fields.html",
    "Structured generic receiver patterns": "type-declarations.html#structured-generic-receiver-patterns",
    "Sum types": "type-declarations.html#sum-types",
    "Symbol visibility": "symbol-visibility.html",
    "Syntax and Usage": "concurrency.html#syntax-and-usage",
    "TEST COVERAGE": "testing.html#test-coverage",
    "TEST FILES": "testing.html#test-files",
    "THE V LANGUAGE DISCORD": "other-online-resources.html#the-v-language-discord",
    "THREAD-SAFE MAPS": "concurrency.html#thread-safe-maps",
    "TRAILING STRUCT LITERAL ARGUMENTS": "structs.html#trailing-struct-literal-arguments",
    "TRANSLATING C TO V": "v-and-c.html#translating-c-to-v",
    "TROUBLESHOOTING COMPILATION PROBLEMS WITH SQLITE": "orm.html#troubleshooting-compilation-problems-with-sqlite",
    "TUNING OPERATIONS DETAILS": "performance-tuning.html#tuning-operations-details",
    "TYPE ALIASES": "type-declarations.html#type-aliases",
    "TYPE CHECKS AND CASTS": "statements-&-expressions.html#type-checks-and-casts",
    "TYPE METADATA": "conditional-compilation.html#type-metadata",
    "TYPE RESTRICTIONS": "limited-operator-overloading.html#type-restrictions",
    "Test coverage": "testing.html#test-coverage",
    "Test files": "testing.html#test-files",
    "Testing": "testing.html",
    "The V language Discord": "other-online-resources.html#the-v-language-discord",
    "The default compiler": "the-default-compiler.html",
    "Thread-safe maps": "concurrency.html#thread-safe-maps",
    "Tools": "tools.html",
    "Trace": "trace.html",
    "Trailing struct literal arguments": "structs.html#trailing-struct-literal-arguments",
    "Translating C to V": "v-and-c.html#translating-c-to-v",
    "Troubleshooting compilation problems with SQLite": "orm.html#troubleshooting-compilation-problems-with-sqlite",
    "Tuning operations details": "performance-tuning.html#tuning-operations-details",
    "Type Declarations": "type-declarations.html",
    "Type aliases": "type-declarations.html#type-aliases",
    "Type checks and casts": "statements-&-expressions.html#type-checks-and-casts",
    "Type metadata": "conditional-compilation.html#type-metadata",
    "Type restrictions": "limited-operator-overloading.html#type-restrictions",
    "USING THE SQLITE VPM PACKAGE": "orm.html#using-the-sqlite-vpm-package",
    "Unions": "unions.html",
    "Upgrading V to latest version": "upgrading-v-to-latest-version.html",
    "Using the sqlite VPM package": "orm.html#using-the-sqlite-vpm-package",
    "V CLEAN": "tools.html#v-clean",
    "V CONTRIBUTING GUIDE": "other-online-resources.html#v-contributing-guide",
    "V ENV": "tools.html#v-env",
    "V FMT": "tools.html#v-fmt",
    "V LANGUAGE DOCUMENTATION": "other-online-resources.html#v-language-documentation",
    "V MCP": "tools.html#v-mcp",
    "V MOD WHY": "package-management.html#v-mod-why",
    "V ONLINE PLAYGROUND": "other-online-resources.html#v-online-playground",
    "V SHADER": "tools.html#v-shader",
    "V SKILLS": "tools.html#v-skills",
    "V STANDARD MODULE DOCUMENTATION": "other-online-resources.html#v-standard-module-documentation",
    "V TOOL": "tools.html#v-tool",
    "V Types": "v-types.html",
    "V and C": "v-and-c.html",
    "V contributing guide": "other-online-resources.html#v-contributing-guide",
    "V language documentation": "other-online-resources.html#v-language-documentation",
    "V online playground": "other-online-resources.html#v-online-playground",
    "V standard module documentation": "other-online-resources.html#v-standard-module-documentation",
    "V'S DEFAULT APPROACH": "memory-management.html#v's-default-approach",
    "V's default approach": "memory-management.html#v's-default-approach",
    "VARIABLE NUMBER OF ARGUMENTS": "functions-2.html#variable-number-of-arguments",
    "VSH SCRIPTS WITH NO EXTENSION": "other-v-features.html#vsh-scripts-with-no-extension",
    "Variable number of arguments": "functions-2.html#variable-number-of-arguments",
    "Variables": "variables.html",
    "Vsh scripts with no extension": "other-v-features.html#vsh-scripts-with-no-extension",
    "WARNINGS AND DECLARATION ERRORS": "variables.html#warnings-and-declaration-errors",
    "WHOLE-FUNCTION ASSEMBLY": "other-v-features.html#whole-function-assembly",
    "WHY USE UNIONS?": "unions.html#why-use-unions?",
    "WORKING AROUND C ISSUES": "v-and-c.html#working-around-c-issues",
    "Warnings and declaration errors": "variables.html#warnings-and-declaration-errors",
    "Whole-function assembly": "other-v-features.html#whole-function-assembly",
    "Why use unions?": "unions.html#why-use-unions?",
    "Working around C issues": "v-and-c.html#working-around-c-issues",
    "Writing Documentation": "writing-documentation.html",
    "[NOINIT] STRUCTS": "structs.html#noinit-structs",
    "[noinit] structs": "structs.html#noinit-structs",
    "_LIKELY_/_UNLIKELY_": "performance-tuning.html#_likely__unlikely_",
    "_likely_/_unlikely_": "performance-tuning.html#_likely__unlikely_",
    "_likely__unlikely_": "performance-tuning.html#_likely__unlikely_",
    "about keeping states in hot reloading functions with v -live run": "other-v-features.html#about-keeping-states-in-hot-reloading-functions-with-v--live-run",
    "about-keeping-states-in-hot-reloading-functions-with-v--live-run": "other-v-features.html#about-keeping-states-in-hot-reloading-functions-with-v--live-run",
    "access modifiers": "structs.html#access-modifiers",
    "access-modifiers": "structs.html#access-modifiers",
    "anonymous & higher order functions": "functions-2.html#anonymous-&-higher-order-functions",
    "anonymous structs": "structs.html#anonymous-structs",
    "anonymous-&-higher-order-functions": "functions-2.html#anonymous-&-higher-order-functions",
    "anonymous-structs": "structs.html#anonymous-structs",
    "array fields": "v-types.html#array-fields",
    "array for": "statements-&-expressions.html#array-for",
    "array initialization": "v-types.html#array-initialization",
    "array method chaining": "v-types.html#array-method-chaining",
    "array methods": "v-types.html#array-methods",
    "array slices": "v-types.html#array-slices",
    "array types": "v-types.html#array-types",
    "array update syntax": "v-types.html#array-update-syntax",
    "array-fields": "v-types.html#array-fields",
    "array-for": "statements-&-expressions.html#array-for",
    "array-initialization": "v-types.html#array-initialization",
    "array-method-chaining": "v-types.html#array-method-chaining",
    "array-methods": "v-types.html#array-methods",
    "array-slices": "v-types.html#array-slices",
    "array-types": "v-types.html#array-types",
    "array-update-syntax": "v-types.html#array-update-syntax",
    "arrays": "v-types.html#arrays",
    "asserts": "testing.html#asserts",
    "asserts that do not abort your program": "testing.html#asserts-that-do-not-abort-your-program",
    "asserts with an extra message": "testing.html#asserts-with-an-extra-message",
    "asserts-that-do-not-abort-your-program": "testing.html#asserts-that-do-not-abort-your-program",
    "asserts-with-an-extra-message": "testing.html#asserts-with-an-extra-message",
    "awesome v": "other-online-resources.html#awesome-v",
    "awesome-v": "other-online-resources.html#awesome-v",
    "bare for": "statements-&-expressions.html#bare-for",
    "bare-for": "statements-&-expressions.html#bare-for",
    "buffered channels": "concurrency.html#buffered-channels",
    "buffered-channels": "concurrency.html#buffered-channels",
    "c backend binaries (default)": "debugging.html#c-backend-binaries-(default)",
    "c declarations": "v-and-c.html#c-declarations",
    "c for": "statements-&-expressions.html#c-for",
    "c types": "v-and-c.html#c-types",
    "c-backend-binaries-(default)": "debugging.html#c-backend-binaries-(default)",
    "c-declarations": "v-and-c.html#c-declarations",
    "c-for": "statements-&-expressions.html#c-for",
    "c-types": "v-and-c.html#c-types",
    "calling c from v": "v-and-c.html#calling-c-from-v",
    "calling v from c": "v-and-c.html#calling-v-from-c",
    "calling-c-from-v": "v-and-c.html#calling-c-from-v",
    "calling-v-from-c": "v-and-c.html#calling-v-from-c",
    "casting an interface": "type-declarations.html#casting-an-interface",
    "casting-an-interface": "type-declarations.html#casting-an-interface",
    "channel select": "concurrency.html#channel-select",
    "channel-select": "concurrency.html#channel-select",
    "channels": "concurrency.html#channels",
    "checked integer arithmetic": "v-types.html#checked-integer-arithmetic",
    "checked-integer-arithmetic": "v-types.html#checked-integer-arithmetic",
    "cleanup functions": "modules.html#cleanup-functions",
    "cleanup-functions": "modules.html#cleanup-functions",
    "closing channels": "concurrency.html#closing-channels",
    "closing-channels": "concurrency.html#closing-channels",
    "closures": "functions-2.html#closures",
    "compile time code": "conditional-compilation.html#compile-time-code",
    "compile time pseudo variables": "conditional-compilation.html#compile-time-pseudo-variables",
    "compile time reflection": "conditional-compilation.html#compile-time-reflection",
    "compile time types": "conditional-compilation.html#compile-time-types",
    "compile-time-code": "conditional-compilation.html#compile-time-code",
    "compile-time-pseudo-variables": "conditional-compilation.html#compile-time-pseudo-variables",
    "compile-time-reflection": "conditional-compilation.html#compile-time-reflection",
    "compile-time-types": "conditional-compilation.html#compile-time-types",
    "condition for": "statements-&-expressions.html#condition-for",
    "condition-for": "statements-&-expressions.html#condition-for",
    "constraints": "type-declarations.html#constraints",
    "control": "memory-management.html#control",
    "convenience methods": "orm.html#convenience-methods",
    "convenience-methods": "orm.html#convenience-methods",
    "create modules": "modules.html#create-modules",
    "create-modules": "modules.html#create-modules",
    "cross-platform shell scripts in v": "other-v-features.html#cross-platform-shell-scripts-in-v",
    "cross-platform-shell-scripts-in-v": "other-v-features.html#cross-platform-shell-scripts-in-v",
    "custom error types": "type-declarations.html#custom-error-types",
    "custom iterators": "statements-&-expressions.html#custom-iterators",
    "custom-error-types": "type-declarations.html#custom-error-types",
    "custom-iterators": "statements-&-expressions.html#custom-iterators",
    "decoding json": "json.html#decoding-json",
    "decoding-json": "json.html#decoding-json",
    "default field values": "structs.html#default-field-values",
    "default-field-values": "structs.html#default-field-values",
    "defer": "statements-&-expressions.html#defer",
    "defer in loop scopes:": "statements-&-expressions.html#defer-in-loop-scopes",
    "defer(fn) {}": "statements-&-expressions.html#defer(fn)-{}",
    "defer(fn)-{}": "statements-&-expressions.html#defer(fn)-{}",
    "defer-in-loop-scopes": "statements-&-expressions.html#defer-in-loop-scopes",
    "difference between channels and shared objects": "concurrency.html#difference-between-channels-and-shared-objects",
    "difference-between-channels-and-shared-objects": "concurrency.html#difference-between-channels-and-shared-objects",
    "disabling the formatting locally": "tools.html#disabling-the-formatting-locally",
    "disabling-the-formatting-locally": "tools.html#disabling-the-formatting-locally",
    "dumping expressions at runtime": "builtin-functions.html#dumping-expressions-at-runtime",
    "dumping-expressions-at-runtime": "builtin-functions.html#dumping-expressions-at-runtime",
    "dynamic casts": "type-declarations.html#dynamic-casts",
    "dynamic-casts": "type-declarations.html#dynamic-casts",
    "embedded interface": "type-declarations.html#embedded-interface",
    "embedded structs": "structs.html#embedded-structs",
    "embedded-interface": "type-declarations.html#embedded-interface",
    "embedded-structs": "structs.html#embedded-structs",
    "embedding": "unions.html#embedding",
    "encoding json": "json.html#encoding-json",
    "encoding-json": "json.html#encoding-json",
    "enums": "type-declarations.html#enums",
    "environment specific files": "conditional-compilation.html#environment-specific-files",
    "environment-specific-files": "conditional-compilation.html#environment-specific-files",
    "example of shared objects": "concurrency.html#example-of-shared-objects",
    "example-of-shared-objects": "concurrency.html#example-of-shared-objects",
    "export to shared library": "v-and-c.html#export-to-shared-library",
    "export-to-shared-library": "v-and-c.html#export-to-shared-library",
    "fixed size arrays": "v-types.html#fixed-size-arrays",
    "fixed-size-arrays": "v-types.html#fixed-size-arrays",
    "for loop": "statements-&-expressions.html#for-loop",
    "for-loop": "statements-&-expressions.html#for-loop",
    "for/in": "statements-&-expressions.html#forin",
    "forin": "statements-&-expressions.html#forin",
    "function types": "type-declarations.html#function-types",
    "function-types": "type-declarations.html#function-types",
    "generics": "type-declarations.html#generics",
    "git pre-commit hook": "tools.html#git-pre-commit-hook",
    "git-pre-commit-hook": "tools.html#git-pre-commit-hook",
    "goto": "statements-&-expressions.html#goto",
    "handling options/results": "type-declarations.html#handling-optionsresults",
    "handling-optionsresults": "type-declarations.html#handling-optionsresults",
    "heap structs": "structs.html#heap-structs",
    "heap-structs": "structs.html#heap-structs",
    "hoisting": "functions.html#hoisting",
    "hot code reloading": "other-v-features.html#hot-code-reloading",
    "hot-code-reloading": "other-v-features.html#hot-code-reloading",
    "if": "statements-&-expressions.html#if",
    "if expressions": "statements-&-expressions.html#if-expressions",
    "if unwrapping": "statements-&-expressions.html#if-unwrapping",
    "if-expressions": "statements-&-expressions.html#if-expressions",
    "if-unwrapping": "statements-&-expressions.html#if-unwrapping",
    "immutable function args by default": "functions-2.html#immutable-function-args-by-default",
    "immutable-function-args-by-default": "functions-2.html#immutable-function-args-by-default",
    "implement an interface": "type-declarations.html#implement-an-interface",
    "implement-an-interface": "type-declarations.html#implement-an-interface",
    "implicitly generated overloads": "limited-operator-overloading.html#implicitly-generated-overloads",
    "implicitly-generated-overloads": "limited-operator-overloading.html#implicitly-generated-overloads",
    "in operator": "statements-&-expressions.html#in-operator",
    "in-operator": "statements-&-expressions.html#in-operator",
    "including c code": "v-and-c.html#including-c-code",
    "including-c-code": "v-and-c.html#including-c-code",
    "init functions": "modules.html#init-functions",
    "init-functions": "modules.html#init-functions",
    "initialization vs assignment": "variables.html#initialization-vs-assignment",
    "initialization-vs-assignment": "variables.html#initialization-vs-assignment",
    "inline assembly": "other-v-features.html#inline-assembly",
    "inline-assembly": "other-v-features.html#inline-assembly",
    "interactive sqlite cli": "orm.html#interactive-sqlite-cli",
    "interactive-sqlite-cli": "orm.html#interactive-sqlite-cli",
    "interface method definitions": "type-declarations.html#interface-method-definitions",
    "interface-method-definitions": "type-declarations.html#interface-method-definitions",
    "interfaces": "type-declarations.html#interfaces",
    "javascript backend": "debugging.html#javascript-backend",
    "javascript-backend": "debugging.html#javascript-backend",
    "labelled break & continue": "statements-&-expressions.html#labelled-break-&-continue",
    "labelled-break-&-continue": "statements-&-expressions.html#labelled-break-&-continue",
    "lambda expressions": "functions-2.html#lambda-expressions",
    "lambda-expressions": "functions-2.html#lambda-expressions",
    "likely/unlikely": "performance-tuning.html#_likely__unlikely_",
    "likelyunlikely": "performance-tuning.html#_likely__unlikely_",
    "locking dependency revisions": "package-management.html#locking-dependency-revisions",
    "locking-dependency-revisions": "package-management.html#locking-dependency-revisions",
    "manual control for stack and heap": "memory-management.html#manual-control-for-stack-and-heap",
    "manual-control-for-stack-and-heap": "memory-management.html#manual-control-for-stack-and-heap",
    "map for": "statements-&-expressions.html#map-for",
    "map update syntax": "v-types.html#map-update-syntax",
    "map-for": "statements-&-expressions.html#map-for",
    "map-update-syntax": "v-types.html#map-update-syntax",
    "maps": "v-types.html#maps",
    "match": "statements-&-expressions.html#match",
    "matching sum types": "type-declarations.html#matching-sum-types",
    "matching-sum-types": "type-declarations.html#matching-sum-types",
    "methods": "structs.html#methods",
    "module aliases": "modules.html#module-aliases",
    "module hierarchy": "module-imports.html#module-hierarchy",
    "module import aliasing": "module-imports.html#module-import-aliasing",
    "module-aliases": "modules.html#module-aliases",
    "module-hierarchy": "module-imports.html#module-hierarchy",
    "module-import-aliasing": "module-imports.html#module-import-aliasing",
    "multidimensional arrays": "v-types.html#multidimensional-arrays",
    "multidimensional-arrays": "v-types.html#multidimensional-arrays",
    "mutable arguments": "functions-2.html#mutable-arguments",
    "mutable variables": "variables.html#mutable-variables",
    "mutable-arguments": "functions-2.html#mutable-arguments",
    "mutable-variables": "variables.html#mutable-variables",
    "named variants": "type-declarations.html#named-variants",
    "named-variants": "type-declarations.html#named-variants",
    "native backend binaries": "debugging.html#native-backend-binaries",
    "native-backend-binaries": "debugging.html#native-backend-binaries",
    "newlines in documentation comments": "writing-documentation.html#newlines-in-documentation-comments",
    "newlines-in-documentation-comments": "writing-documentation.html#newlines-in-documentation-comments",
    "noinit-structs": "structs.html#noinit-structs",
    "numbers": "v-types.html#numbers",
    "option/result types and error handling": "type-declarations.html#optionresult-types-and-error-handling",
    "optionresult-types-and-error-handling": "type-declarations.html#optionresult-types-and-error-handling",
    "options/results when returning multiple values": "type-declarations.html#optionsresults-when-returning-multiple-values",
    "optionsresults-when-returning-multiple-values": "type-declarations.html#optionsresults-when-returning-multiple-values",
    "other restrictions": "limited-operator-overloading.html#other-restrictions",
    "other-restrictions": "limited-operator-overloading.html#other-restrictions",
    "package commands": "package-management.html#package-commands",
    "package names and import paths": "package-management.html#package-names-and-import-paths",
    "package-commands": "package-management.html#package-commands",
    "package-names-and-import-paths": "package-management.html#package-names-and-import-paths",
    "parameter evaluation order": "functions-2.html#parameter-evaluation-order",
    "parameter-evaluation-order": "functions-2.html#parameter-evaluation-order",
    "passing c compilation flags": "v-and-c.html#passing-c-compilation-flags",
    "passing-c-compilation-flags": "v-and-c.html#passing-c-compilation-flags",
    "per-function reloading with @[live]": "other-v-features.html#per-function-reloading-with-@live",
    "per-function-reloading-with-@live": "other-v-features.html#per-function-reloading-with-@live",
    "pgo (profile-guided optimization)": "performance-tuning.html#pgo-(profile-guided-optimization)",
    "pgo-(profile-guided-optimization)": "performance-tuning.html#pgo-(profile-guided-optimization)",
    "portable c output (-os cross)": "cross-compilation.html#portable-c-output-(-os-cross)",
    "portable-c-output-(-os-cross)": "cross-compilation.html#portable-c-output-(-os-cross)",
    "primitive types": "v-types.html#primitive-types",
    "primitive-types": "v-types.html#primitive-types",
    "printing custom types": "builtin-functions.html#printing-custom-types",
    "printing-custom-types": "builtin-functions.html#printing-custom-types",
    "println": "builtin-functions.html#println",
    "profiling": "tools.html#profiling",
    "profiling the compiler": "tools.html#profiling-the-compiler",
    "profiling-the-compiler": "tools.html#profiling-the-compiler",
    "publish package": "package-management.html#publish-package",
    "publish-package": "package-management.html#publish-package",
    "race detector": "concurrency.html#race-detector",
    "race-detector": "concurrency.html#race-detector",
    "range for": "statements-&-expressions.html#range-for",
    "range-for": "statements-&-expressions.html#range-for",
    "recovering from panics": "statements-&-expressions.html#recovering-from-panics",
    "recovering-from-panics": "statements-&-expressions.html#recovering-from-panics",
    "required fields": "structs.html#required-fields",
    "required module prefix": "constants.html#required-module-prefix",
    "required-fields": "structs.html#required-fields",
    "required-module-prefix": "constants.html#required-module-prefix",
    "resolving package versions": "package-management.html#resolving-package-versions",
    "resolving-package-versions": "package-management.html#resolving-package-versions",
    "restriction": "limited-operator-overloading.html#restriction",
    "returning multiple values": "functions.html#returning-multiple-values",
    "returning-multiple-values": "functions.html#returning-multiple-values",
    "runes": "v-types.html#runes",
    "running tests": "testing.html#running-tests",
    "running-tests": "testing.html#running-tests",
    "selective imports": "module-imports.html#selective-imports",
    "selective-imports": "module-imports.html#selective-imports",
    "shadowing a global": "global-variables.html#shadowing-a-global",
    "shadowing-a-global": "global-variables.html#shadowing-a-global",
    "shared objects": "concurrency.html#shared-objects",
    "shared-objects": "concurrency.html#shared-objects",
    "short struct literal syntax": "structs.html#short-struct-literal-syntax",
    "short-struct-literal-syntax": "structs.html#short-struct-literal-syntax",
    "sizeof and __offsetof": "sizeof-and-__offsetof.html",
    "slices with negative indexes": "v-types.html#slices-with-negative-indexes",
    "slices-with-negative-indexes": "v-types.html#slices-with-negative-indexes",
    "smart casting": "type-declarations.html#smart-casting",
    "smart-casting": "type-declarations.html#smart-casting",
    "sorting arrays": "v-types.html#sorting-arrays",
    "sorting-arrays": "v-types.html#sorting-arrays",
    "source locations in generated code": "other-v-features.html#source-locations-in-generated-code",
    "source-locations-in-generated-code": "other-v-features.html#source-locations-in-generated-code",
    "spawning concurrent tasks": "concurrency.html#spawning-concurrent-tasks",
    "spawning-concurrent-tasks": "concurrency.html#spawning-concurrent-tasks",
    "special channel features": "concurrency.html#special-channel-features",
    "special considerations for project folders": "modules.html#special-considerations-for-project-folders",
    "special-channel-features": "concurrency.html#special-channel-features",
    "special-considerations-for-project-folders": "modules.html#special-considerations-for-project-folders",
    "stack and heap": "memory-management.html#stack-and-heap",
    "stack and heap basics": "memory-management.html#stack-and-heap-basics",
    "stack-and-heap": "memory-management.html#stack-and-heap",
    "stack-and-heap-basics": "memory-management.html#stack-and-heap-basics",
    "static type methods": "structs.html#static-type-methods",
    "static-type-methods": "structs.html#static-type-methods",
    "string interpolation": "v-types.html#string-interpolation",
    "string operators": "v-types.html#string-operators",
    "string-interpolation": "v-types.html#string-interpolation",
    "string-operators": "v-types.html#string-operators",
    "strings": "v-types.html#strings",
    "struct update syntax": "structs.html#struct-update-syntax",
    "struct-update-syntax": "structs.html#struct-update-syntax",
    "structured generic receiver patterns": "type-declarations.html#structured-generic-receiver-patterns",
    "structured-generic-receiver-patterns": "type-declarations.html#structured-generic-receiver-patterns",
    "sum types": "type-declarations.html#sum-types",
    "sum-types": "type-declarations.html#sum-types",
    "syntax and usage": "concurrency.html#syntax-and-usage",
    "syntax-and-usage": "concurrency.html#syntax-and-usage",
    "test coverage": "testing.html#test-coverage",
    "test files": "testing.html#test-files",
    "test-coverage": "testing.html#test-coverage",
    "test-files": "testing.html#test-files",
    "the v language discord": "other-online-resources.html#the-v-language-discord",
    "the-v-language-discord": "other-online-resources.html#the-v-language-discord",
    "thread-safe maps": "concurrency.html#thread-safe-maps",
    "thread-safe-maps": "concurrency.html#thread-safe-maps",
    "trailing struct literal arguments": "structs.html#trailing-struct-literal-arguments",
    "trailing-struct-literal-arguments": "structs.html#trailing-struct-literal-arguments",
    "translating c to v": "v-and-c.html#translating-c-to-v",
    "translating-c-to-v": "v-and-c.html#translating-c-to-v",
    "troubleshooting compilation problems with sqlite": "orm.html#troubleshooting-compilation-problems-with-sqlite",
    "troubleshooting-compilation-problems-with-sqlite": "orm.html#troubleshooting-compilation-problems-with-sqlite",
    "tuning operations details": "performance-tuning.html#tuning-operations-details",
    "tuning-operations-details": "performance-tuning.html#tuning-operations-details",
    "type aliases": "type-declarations.html#type-aliases",
    "type checks and casts": "statements-&-expressions.html#type-checks-and-casts",
    "type metadata": "conditional-compilation.html#type-metadata",
    "type restrictions": "limited-operator-overloading.html#type-restrictions",
    "type-aliases": "type-declarations.html#type-aliases",
    "type-checks-and-casts": "statements-&-expressions.html#type-checks-and-casts",
    "type-metadata": "conditional-compilation.html#type-metadata",
    "type-restrictions": "limited-operator-overloading.html#type-restrictions",
    "using the sqlite vpm package": "orm.html#using-the-sqlite-vpm-package",
    "using-the-sqlite-vpm-package": "orm.html#using-the-sqlite-vpm-package",
    "v clean": "tools.html#v-clean",
    "v contributing guide": "other-online-resources.html#v-contributing-guide",
    "v env": "tools.html#v-env",
    "v fmt": "tools.html#v-fmt",
    "v language documentation": "other-online-resources.html#v-language-documentation",
    "v mcp": "tools.html#v-mcp",
    "v mod why": "package-management.html#v-mod-why",
    "v online playground": "other-online-resources.html#v-online-playground",
    "v shader": "tools.html#v-shader",
    "v skills": "tools.html#v-skills",
    "v standard module documentation": "other-online-resources.html#v-standard-module-documentation",
    "v tool": "tools.html#v-tool",
    "v's default approach": "memory-management.html#v's-default-approach",
    "v's-default-approach": "memory-management.html#v's-default-approach",
    "v-clean": "tools.html#v-clean",
    "v-contributing-guide": "other-online-resources.html#v-contributing-guide",
    "v-env": "tools.html#v-env",
    "v-fmt": "tools.html#v-fmt",
    "v-language-documentation": "other-online-resources.html#v-language-documentation",
    "v-mcp": "tools.html#v-mcp",
    "v-mod-why": "package-management.html#v-mod-why",
    "v-online-playground": "other-online-resources.html#v-online-playground",
    "v-shader": "tools.html#v-shader",
    "v-skills": "tools.html#v-skills",
    "v-standard-module-documentation": "other-online-resources.html#v-standard-module-documentation",
    "v-tool": "tools.html#v-tool",
    "variable number of arguments": "functions-2.html#variable-number-of-arguments",
    "variable-number-of-arguments": "functions-2.html#variable-number-of-arguments",
    "vsh scripts with no extension": "other-v-features.html#vsh-scripts-with-no-extension",
    "vsh-scripts-with-no-extension": "other-v-features.html#vsh-scripts-with-no-extension",
    "warnings and declaration errors": "variables.html#warnings-and-declaration-errors",
    "warnings-and-declaration-errors": "variables.html#warnings-and-declaration-errors",
    "whole-function assembly": "other-v-features.html#whole-function-assembly",
    "whole-function-assembly": "other-v-features.html#whole-function-assembly",
    "why use unions?": "unions.html#why-use-unions?",
    "why-use-unions?": "unions.html#why-use-unions?",
    "working around c issues": "v-and-c.html#working-around-c-issues",
    "working-around-c-issues": "v-and-c.html#working-around-c-issues"
};
	vdocs.fnames = {
    "appendix-i-keywords.html": "appendix-i-keywords.html",
    "appendix-ii-operators.html": "appendix-ii-operators.html",
    "atomics.html": "atomics.html",
    "attributes.html": "attributes.html",
    "builtin-functions.html": "builtin-functions.html",
    "call-stack.html": "call-stack.html",
    "comments.html": "comments.html",
    "compiling-for-ios.html": "compiling-for-ios.html",
    "concurrency.html": "concurrency.html",
    "conditional-compilation.html": "conditional-compilation.html",
    "constants.html": "constants.html",
    "cross-compilation.html": "cross-compilation.html",
    "debugger.html": "debugger.html",
    "debugging.html": "debugging.html",
    "functions-2.html": "functions-2.html",
    "functions.html": "functions.html",
    "getting-started.html": "getting-started.html",
    "global-variables.html": "global-variables.html",
    "hello-world.html": "hello-world.html",
    "index.html": "index.html",
    "installing-v-from-source.html": "installing-v-from-source.html",
    "introduction.html": "introduction.html",
    "json.html": "json.html",
    "language-specification.html": "language-specification.html",
    "limited-operator-overloading.html": "limited-operator-overloading.html",
    "memory-management.html": "memory-management.html",
    "memory-unsafe-code.html": "memory-unsafe-code.html",
    "module-imports.html": "module-imports.html",
    "modules.html": "modules.html",
    "orm.html": "orm.html",
    "other-online-resources.html": "other-online-resources.html",
    "other-v-features.html": "other-v-features.html",
    "package-management.html": "package-management.html",
    "packaging-v-for-distribution.html": "packaging-v-for-distribution.html",
    "performance-tuning.html": "performance-tuning.html",
    "project-local-compiler-versions-with-.vvmrc.html": "project-local-compiler-versions-with-.vvmrc.html",
    "protocol-buffers.html": "protocol-buffers.html",
    "references.html": "references.html",
    "running-a-project-folder-with-several-files.html": "running-a-project-folder-with-several-files.html",
    "sizeof-and-__offsetof.html": "sizeof-and-__offsetof.html",
    "statements-&-expressions.html": "statements-&-expressions.html",
    "static-variables.html": "static-variables.html",
    "structs-with-reference-fields.html": "structs-with-reference-fields.html",
    "structs.html": "structs.html",
    "symbol-visibility.html": "symbol-visibility.html",
    "testing.html": "testing.html",
    "the-default-compiler.html": "the-default-compiler.html",
    "tools.html": "tools.html",
    "trace.html": "trace.html",
    "type-declarations.html": "type-declarations.html",
    "unions.html": "unions.html",
    "upgrading-v-to-latest-version.html": "upgrading-v-to-latest-version.html",
    "v-and-c.html": "v-and-c.html",
    "v-types.html": "v-types.html",
    "variables.html": "variables.html",
    "writing-documentation.html": "writing-documentation.html"
};