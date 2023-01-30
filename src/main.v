module main

import os
import net.http
import markdown
import regex

const (
	v_doc_path  = 'https://raw.githubusercontent.com/vlang/v/master/doc/docs.md'
	output_path = 'output'
)

fn main() {
	clean_output_directory()!
	create_output_directory()!

	response := http.get(v_doc_path)!
	source := response.body

	generate_pages(source)!
}

fn clean_output_directory() ! {
	if os.exists(output_path) {
		os.rmdir_all(output_path)!
	}
}

fn create_output_directory() ! {
	if !os.exists(output_path) {
		os.mkdir(output_path)!
	}
}

fn generate_pages(source string) ! {
	topics := split_source_by_topics(source)

	index_page := topics.first()
	rest_pages := topics[1..]

	write_markdown_to_html('index.html', index_page)!

	for page in rest_pages {
		filename := filename_from_topic(page) or { panic(err) }

		write_markdown_to_html(filename, page)!
	}
}

fn split_source_by_topics(source string) []string {
	mut split_re := regex.regex_opt(r'^## ') or { panic(err) }

	return split_re.split(source)
}

fn filename_from_topic(source string) ?string {
	title := extract_title_from_markdown(source) or { panic(err) }

	if title == '' {
		return none
	}

	filename := title.replace_each([' ', '-', '`', '', '/', '', '\\', '']).to_lower()

	return '${filename}.html'
}

fn extract_title_from_markdown(source string) ?string {
	mut title_re := regex.regex_opt(r'^#+') or { panic(err) }
	lines := source.split_into_lines()

	if lines.len > 0 {
		first_line := lines.first()
		title := title_re.replace(first_line, '')

		if title != '' {
			return title
		}
	}

	return none
}

fn write_markdown_to_html(filename string, content string) ! {
	html := markdown.to_html(content)

	os.write_file(os.join_path(output_path, filename), html)!
}
