module main

import regex
import markdown

struct TopicTitle {
	title string
	level int
}

struct Topic {
	title              string
	markdown_content   string
	id                 string
	url                string
	section_start_line int = 1
	subtopics          []Topic // for the ToC
	subsubtopics       []Topic // for the search/reverse mapping
	level              int
}

struct Section {
	start_line int
	text       string
}

fn split_source_by_topics(source string, topic_level int) []Section {
	mut sections := []Section{}
	mut current_section := ''
	mut section_start_line := 1
	for line_idx, line in source.split_into_lines() {
		if line.starts_with('${'#'.repeat(topic_level)} ') {
			sections << Section{
				text: current_section
				start_line: section_start_line
			}
			current_section = '${line}\n'
			section_start_line = line_idx + 1
		} else {
			current_section += '${line}\n'
		}
	}
	if current_section != '' {
		sections << Section{
			text: current_section
			start_line: section_start_line
		}
	}
	return sections
}

fn extract_topics_from_markdown_parts(parts []Section, skip_first bool) []Topic {
	mut topics := []Topic{}
	for index, part in parts {
		if skip_first && index == 0 {
			continue
		}

		topic_title := extract_title_from_markdown_topic(part.text) or { panic(err) }
		title := topic_title.title

		filename := if index == 0 { 'index' } else { title_to_filename(title) }
		if should_be_skipped.contains(title) {
			continue
		}
		plain_title := markdown.to_plain(title)
		// TODO: remove .html

		// Get subtopics for this topic
		subtopics := get_subtopics_for_level(part.text, topic_title.level + 1)

		mut subsubtopics := []Topic{}
		subsubtopics << get_subtopics_for_level(part.text, topic_title.level + 2)
		subsubtopics << get_subtopics_for_level(part.text, topic_title.level + 3)
		subsubtopics << get_subtopics_for_level(part.text, topic_title.level + 4)
		subsubtopics << get_subtopics_for_level(part.text, topic_title.level + 5)

		topics << Topic{
			id: title_to_filename(plain_title)
			title: plain_title
			markdown_content: part.text
			section_start_line: part.start_line
			url: '${filename}.html'
			level: topic_title.level
			subtopics: subtopics
			subsubtopics: subsubtopics
		}
	}
	return topics
}

fn get_subtopics_for_level(text string, level int) []Topic {
	markdown_subtopics := split_source_by_topics(text, level)
	return extract_topics_from_markdown_parts(markdown_subtopics, true)
}

fn extract_title_from_markdown_topic(source string) ?TopicTitle {
	mut title_re := regex.regex_opt(r'^#+') or { panic(err) }
	lines := source.split_into_lines()
	if lines.len > 0 {
		first_line := lines.first()
		title := title_re.replace(first_line, '')
		level := first_line.len - title.len
		if title != '' {
			return TopicTitle{title.trim_space(), level}
		}
	}
	return none
}

fn find_topic_by_filename(root Topic, filename string) ?Topic {
	if root.url == filename {
		return root
	}
	for subtopic in root.subtopics {
		if topic := find_topic_by_filename(subtopic, filename) {
			return topic
		}
	}
	return none
}
