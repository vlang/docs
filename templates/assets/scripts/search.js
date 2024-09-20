const original_docs_md_url = 'https://github.com/vlang/v/blob/master/doc/docs.md';
const search_source_url = 'https://docs.vlang.io/assets/docs.md';
let file_content = null;

// Function to fetch and cache the file content
async function fetchFileContent() {
	try {
		const response = await fetch(search_source_url);
		if (!response.ok) {
			throw new Error('Network response was not ok ' + response.statusText);
		}
		file_content = await response.text();
	} catch (error) {
		console.error('Failed to fetch file content:', error);
	}
}

// Function to parse the markdown content and create a map of sections
function parseMarkdown(content) {
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
}

// Function to search through the cached file content and map results to sections
function searchFileContent(query) {
	if (!file_content) {
		return 'File content not loaded. Please try again later.';
	}

	const sections = parseMarkdown(file_content);
	const results = [];
	const regex = new RegExp(query, 'gi');

	for (const section in sections) {
		const sectionContent = sections[section].join('\n');
		const match = sectionContent.match(regex);
		if (match) {
			results.push({ section, snippet: getSnippet(sectionContent, match[0]) });
		}
	}

	// Filter out the "Table of Contents" section
	return results.filter(result => result.section.toLowerCase() !== 'table of contents');
}

// Function to get a snippet of text around the first match
function getSnippet(content, match) {
	const index = content.indexOf(match);
	const snippetLength = 100;
	const start = Math.max(index - snippetLength / 2, 0);
	const end = Math.min(index + snippetLength / 2, content.length);
	return content.substring(start, end).replace(/\n/g, ' ') + '...';
}

// Function to create links to the relevant sections in the docs
function createResultLinks(results) {
	if (typeof results === 'string') {
		return results;
	}

	return results.map(result => {
		const sectionLink = sectionToLink(result.section);
		return `
			<div class="result-item">
				<a href="${sectionLink}" class="result-link">${result.section}</a>
				<p>${result.snippet}</p>
			</div>
		`;
	}).join('');
}

// Helper function to convert section titles to links
function sectionToLink(section) {
	const fixed_url = titles_to_fnames[ section ];
	if (fixed_url) { return fixed_url; }
	const existing_html_page = fnames[ section ];
	if (existing_html_page) { return existing_html_page; }
	// try with a simpler normalized version of the section title:
	const slug = section.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
	const sfixed_url = titles_to_fnames[ slug ];
	if (sfixed_url) { return sfixed_url; }
	const sexisting_html_page = fnames[ slug ];
	if (sexisting_html_page) { return sexisting_html_page; }
	// probably a 3rd level or lower title, that currently has no reverse mapping; redirect to the main docs.md:
	return `${original_docs_md_url}#${slug}`;
}

function display_search_results(how) {
	document.getElementById('searchResults').style.display = how;
}

async function handleSearch() {
	const query = document.getElementById('searchInput').value;
	const resultsElement = document.getElementById('searchResults');
	if (!file_content) {
		await fetchFileContent();
	}
	const results = searchFileContent(query);
	resultsElement.innerHTML = createResultLinks(results);
	display_search_results("block");
}

// Initialize the search functionality when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
	const searchInput = document.getElementById('searchInput');
	const searchKeys = document.getElementById('searchKeys');
	searchKeys.innerHTML = (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl') + '&nbsp;K';
	document.addEventListener('keydown', (event) => {
		if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
			event.preventDefault();
			searchInput.focus();
		}
	});
	searchInput.onfocus = () => searchKeys.style.display = 'none';
	searchInput.onblur = () => searchKeys.style.display = 'block';
	searchInput.onkeydown = (event) => {
		if (event.key === 'Enter') {
			handleSearch();
		} else if (event.key === 'Escape') {
			if (document.getElementById('searchResults').style.display === 'none') {
				searchInput.blur();
				return
			}
			display_search_results("none");
		}
	};
	document.getElementById('searchButton').onclick(handleSearch);
});

window.onbeforeunload = function () {
	display_search_results("none");   	
}
