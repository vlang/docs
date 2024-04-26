module main

import regex
import markdown

struct Topic {
	title              string
	markdown_content   string
	id                 string
	url                string
	section_start_line int = 1
}

struct Section {
	start_line int
	text string
}

fn split_source_by_topics(source string, topic_level int) []Section {
	mut sections := []Section{}
	mut current_section := ''
	mut section_start_line := 0
	for line_idx, line in source.split_into_lines() {
		if line.starts_with('${'#'.repeat(topic_level)} ') {
			section_start_line = line_idx
			sections << Section{ text: current_section, start_line: section_start_line}
			current_section = '${line}\n'
		} else {
			current_section += '${line}\n'			
		}
	}
	if current_section != '' {
		sections << Section{ text: current_section, start_line: section_start_line }
	}
	return sections
}

fn extract_topics_from_markdown_parts(parts []Section, skip_first bool) []Topic {
	mut topics := []Topic{}
	for index, part in parts {
		if skip_first && index == 0 {
			continue
		}
		title := extract_title_from_markdown_topic(part.text) or { panic(err) }
		filename := if index == 0 { 'index' } else { title_to_filename(title) }
		if should_be_skipped.contains(title) {
			continue
		}
		plain_title := markdown.to_plain(title)
		// TODO: remove .html
		topics << Topic{
			id: title_to_filename(plain_title)
			title: plain_title
			markdown_content: part.text
			section_start_line: part.start_line
			url: '${filename}.html'
		}
	}
	return topics
}

fn extract_title_from_markdown_topic(source string) ?string {
	mut title_re := regex.regex_opt(r'^#+') or { panic(err) }
	lines := source.split_into_lines()
	if lines.len > 0 {
		first_line := lines.first()
		title := title_re.replace(first_line, '')

		if title != '' {
			return title.trim_space()
		}
	}
	return none
}
