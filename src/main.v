module main

import net.http
import markdown

const (
	v_doc_path        = 'https://raw.githubusercontent.com/vlang/v/master/doc/docs.md'
	output_path       = 'output'
	template_path     = 'templates'
	should_be_skipped = ['Table of Contents']
)

fn main() {
	clean_output_directory()!
	create_output_directory()!

	response := http.get(v_doc_path)!

	generate_pages(response.body)!
	copy_assets_to_output()!
}

fn generate_pages(source string) ! {
	mut pages := []Page{}

	markdown_topics := split_source_by_topics(source, 2)
	index_topic := markdown_topics.first()
	rest_topics := markdown_topics[1..]
	topics := extract_topics_from_markdown_parts(rest_topics, false)

	index_html := markdown.to_html(index_topic)
	write_output_file('index.html', generate_page_from_template(topics, '', index_html))!

	for topic in rest_topics {
		title := extract_title_from_markdown_topic(topic) or { panic(err) }

		if check_page_should_be_skipped(title) {
			continue
		}

		pages << Page{
			title: title
			content: markdown.to_html(topic)
		}

		content := generate_page_from_template(topics, title, topic)

		write_output_file('${title_to_filename(title)}.html', content)!
	}
}

fn generate_page_from_template(topics []Topic, title string, markdown_content string) string {
	markdown_subtopics := split_source_by_topics(markdown_content, 3)
	subtopics := extract_topics_from_markdown_parts(markdown_subtopics, true)

	transformer := HTMLTransformer{
		content: markdown.to_html(markdown_content)
	}
	content := transformer.process()

	return $tmpl('../templates/index.html')
}
