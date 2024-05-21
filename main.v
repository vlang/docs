module main

import os
import net.http
import markdown
import time
import json

const v_doc_path = 'https://raw.githubusercontent.com/vlang/v/master/doc/docs.md'
const output_path = 'output'
const template_path = 'templates'
const should_be_skipped = ['Table of Contents']

fn main() {
	os.chdir(os.dir(@FILE))!
	clean_output_directory()!
	create_output_directory()!

	response := http.get(v_doc_path)!
	commit_res := os.execute_or_exit('git ls-remote -h https://github.com/vlang/v.git refs/heads/master')
	latest_v_commit_hash := commit_res.output.all_before('\t')

	update_sass()

	mut ctx := Context{}
	ctx.generate_pages(response.body, latest_v_commit_hash)!
	copy_assets_to_output()!
	ctx.write_mapping()!
	write_output_file('assets/docs.md', response.body)!
}

struct Context {
mut:
	titles_to_fnames map[string]string
}

fn (mut ctx Context) write_mapping() ! {
	eprintln('> Total titles: ${ctx.titles_to_fnames.len}')
	write_output_file('assets/scripts/titles_to_fnames.js', 'const titles_to_fnames = ${json.encode_pretty(ctx.titles_to_fnames)};\n')!
}

fn (mut ctx Context) generate_pages(source string, vcommit string) ! {
	markdown_topics := split_source_by_topics(source, 2)
	markdown_first_topic := markdown_topics.first()

	topics := extract_topics_from_markdown_parts(markdown_topics, false)
	first_topic := topics.first()
	rest_topics := topics[1..]

	index_content := ctx.generate_page_from_template(rest_topics, first_topic, markdown_first_topic.text,
		Topic{}, topics[1], vcommit).replace_once('<head>', '<head><script>window.location.replace("introduction.html");</script>')
	write_output_file('index.html', index_content)!

	for index, topic in rest_topics {
		title := topic.title

		prev_topic := rest_topics[index - 1] or { first_topic }
		next_topic := rest_topics[index + 1] or { Topic{} }

		mut transformer := MarkdownTransformer{
			content: topic.markdown_content
		}
		content := ctx.generate_page_from_template(rest_topics, topic, transformer.process(),
			prev_topic, next_topic, vcommit)

		fname := '${title_to_filename(title)}.html'
		write_output_file(fname, content)!
		ctx.titles_to_fnames[title] = fname
	}
}

fn (mut ctx Context) generate_page_from_template(topics []Topic, main_topic Topic, markdown_content string, prev_topic Topic, next_topic Topic, vcommit string) string {
	markdown_subtopics := split_source_by_topics(markdown_content, 2)
	subtopics := extract_topics_from_markdown_parts(markdown_subtopics, true)
	title := main_topic.title
	update_time := time.now()
	update_commit_full := vcommit.clone()
	update_commit_short := vcommit#[..7]
	mut transformer := HTMLTransformer{
		content: markdown.to_html(markdown_content)
		topics: topics
	}
	content := transformer.process()
	for topic in topics {
		if topic.title == title {
			for subtopic in subtopics {
				ctx.titles_to_fnames[subtopic.title] = '${topic.url}#${subtopic.id}'
			}
		}
	}
	return $tmpl('templates/index.html')
}
