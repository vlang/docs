const fileUrl = 'https://raw.githubusercontent.com/vlang/v/master/doc/docs.md';
let fileContent = null;

// Function to fetch and cache the file content
async function fetchFileContent() {
	try {
		const response = await fetch(fileUrl);
		if (!response.ok) {
			throw new Error('Network response was not ok ' + response.statusText);
		}
		fileContent = await response.text();
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
	if (!fileContent) {
		return 'File content not loaded. Please try again later.';
	}

	const sections = parseMarkdown(fileContent);
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
	return `${section.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}.html`;
}

async function handleSearch() {
	const query = document.getElementById('searchInput').value;
	const resultsElement = document.getElementById('searchResults');
	if (!fileContent) {
		await fetchFileContent();
	}
	const results = searchFileContent(query);
	resultsElement.innerHTML = createResultLinks(results);
}

// Initialize the search functionality when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('searchButton').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			handleSearch();
        }
    });
});
